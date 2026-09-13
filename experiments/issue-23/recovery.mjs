import assert from 'node:assert/strict';
import { setTimeout as delay } from 'node:timers/promises';
import { Client } from 'pg';
import { sql } from '@mk3008/serene';
import { executeTransfer } from '../../dist/src/features/execute-transfer/boundary.js';
import { withFixture, setup, execute, measure, report, databaseClient, definition } from './benchmark.mjs';

const cap=Number(process.env.VELVET_MAX_DIRTY);
assert(Number.isSafeInteger(cap) && cap>0);
const sourceRows=10000, backlog=600, arrivalPerSecond=2, safetyMs=45000;
report.recovery={sourceRows,backlog,arrivalPerSecond,mode:'routine',cap,
  outageSeconds:[60,300,600].map(seconds=>({seconds,modeledBacklog:seconds*arrivalPerSecond})),
  observedOutageBacklog:backlog,observedOutageEquivalentSeconds:backlog/arrivalPerSecond,
  timeline:[],neighbor:{}, completed:false};
await withFixture(async()=>{
  const db=databaseClient();
  await setup(sourceRows,3);
  const database=(await db.query('select current_database() name')).rows[0].name;
  const url=new URL(process.env.ASHIBA_DB_URL);url.pathname='/'+database;
  const producer=new Client({connectionString:url.toString()});
  const neighbor=new Client({connectionString:url.toString()});
  const other=new Client({connectionString:url.toString()});
  const monitor=new Client({connectionString:url.toString()});
  await Promise.all([producer.connect(),neighbor.connect(),other.connect(),monitor.connect()]);
  let stop=false, producerTask, neighborTask, monitorTask, phase='idle';
  const neighborSamples=[], activity=[];
  let arrivals=0, arrivalId=backlog;
  const enqueue=async(count)=>{
    await execute(sql`insert into rawsql_transfer.dirty_key(source_schema_name,source_table_name,source_key_json)
      select 'public','scale_source',jsonb_build_object('id',id::text) from public.scale_source where id<=:count`,{count});
  };
  const pending=async(setting='1')=>Number((await producer.query(`select count(*) n from rawsql_transfer.dirty_key k
    where exists(select 1 from rawsql_transfer.destination_link l where l.setting_id=$1 and l.is_enabled
      and not exists(select 1 from rawsql_transfer.dirty_key_processing p where p.dirty_key_id=k.dirty_key_id
        and p.destination_link_id=l.destination_link_id and p.processing_status in ('succeeded','skipped')))`,[setting])).rows[0].n);
  const neighbors=async()=>{
    while(!stop){
      const p=phase,t=performance.now();
      await neighbor.query('update public.neighbor set value=value+1 where id=1 returning value');
      neighborSamples.push({phase:p,ms:performance.now()-t});
      await delay(20);
    }
  };
  const activityLoop=async()=>{
    while(!stop){
      const rows=(await monitor.query(`select state,wait_event_type,wait_event,count(*)::int n,
        max(extract(epoch from clock_timestamp()-xact_start))::float8 transaction_age_seconds
        from pg_stat_activity where datname=current_database() and pid<>pg_backend_pid()
        group by state,wait_event_type,wait_event`)).rows;
      activity.push({phase,at:performance.now(),rows});await delay(100);
    }
  };
  try{
    await db.query('create table public.neighbor(id integer primary key,value bigint);insert into public.neighbor values(1,0)');
    neighborTask=neighbors();monitorTask=activityLoop();
    await delay(2000); // Unrelated workload without transfer pressure, not a serverless invocation.
    phase='outage';await enqueue(backlog);
    await db.query("set velvet.scale_fail='3'");
    const failed=await measure(null,3,'outage_downstream_failure',null,true);
    assert.equal(await pending(),backlog);
    assert(failed.elapsedMs<safetyMs);
    await db.query("set velvet.scale_fail=''");
    // Second Setting uses distinct links and the same physical Destination/DB/source.
    await db.query(`insert into rawsql_transfer.setting(setting_id,setting_name,source_sql_body,source_sql_hash,source_key_definition,source_sql_analysis_status)
      select 2,'independent',source_sql_body,source_sql_hash,source_key_definition,source_sql_analysis_status from rawsql_transfer.setting where setting_id=1;
      insert into rawsql_transfer.destination_link(destination_link_id,setting_id,destination_definition_id,destination_link_name,execution_order,
        destination_key_mapping,mapping_definition,diff_compare_excluded_columns,generated_insert_transfer_sql_body,generated_reassessment_sql_body)
      select destination_link_id+3,2,destination_definition_id,destination_link_name,execution_order,destination_key_mapping,mapping_definition,
        diff_compare_excluded_columns,generated_insert_transfer_sql_body,generated_reassessment_sql_body from rawsql_transfer.destination_link where setting_id=1`);
    phase='recovery';
    producerTask=(async()=>{
      while(!stop){await delay(1000/arrivalPerSecond);if(stop)break;
        arrivalId=arrivalId%sourceRows+1;
        await producer.query(`insert into rawsql_transfer.dirty_key(source_schema_name,source_table_name,source_key_json)
          values('public','scale_source',jsonb_build_object('id',$1::text))`,[String(arrivalId)]);arrivals++;
      }
    })();
    const otherRuns=[];
    const otherClient={async query(text,values){if(Number(process.env.VELVET_RTT_MS))await delay(Number(process.env.VELVET_RTT_MS));return other.query(text,values);}};
    const catchupStart=performance.now();
    for(let attempt=0;attempt<50;attempt++){
      const before=await pending();if(before<=5)break;
      // A bounded independent Setting progresses concurrently; no global mutex.
      const independent=(async()=>{const t=performance.now();const result=await executeTransfer(otherClient,[{...definition,settingId:'2'}],{settingId:'2',metadataMode:'routine',maxDirtyKeys:cap});
        const ms=performance.now()-t;assert(ms<safetyMs);otherRuns.push({ms,...result});})();
      const trial=await measure(null,3,'catchup',null);
      await independent;
      assert(trial.elapsedMs<safetyMs);
      assert(trial.result.inserted+trial.result.skipped<=cap*3);
      report.recovery.timeline.push({before,after:await pending(),arrivals,ms:trial.elapsedMs,processedPairs:trial.result.inserted+trial.result.skipped});
    }
    const catchupMs=performance.now()-catchupStart;
    assert(await pending()<=5,'Finite backlog did not recover to the illustrative normal level');
    const caughtUpArrivals=arrivals,caughtUpRemaining=await pending();
    phase='steady';
    for(let iteration=0;iteration<5;iteration++){
      await delay(1000);
      if(await pending()>0){const trial=await measure(null,3,'steady',null);assert(trial.elapsedMs<safetyMs);}
      assert(await pending()<=5,'Steady arrival outran this tested configuration');
    }
    report.recovery.catchupMs=catchupMs;
    report.recovery.arrivalsDuringCatchup=caughtUpArrivals;
    report.recovery.grossKeysPerSecond=(backlog+caughtUpArrivals-caughtUpRemaining)/(catchupMs/1000);
    report.recovery.otherRuns=otherRuns;
    report.recovery.remaining=await pending();
    report.recovery.completed=true;
  }finally{
    stop=true;
    await Promise.allSettled([producerTask,neighborTask,monitorTask].filter(Boolean));
    report.recovery.arrivals=arrivals;
    for(const name of ['idle','outage','recovery','steady']){
      const samples=neighborSamples.filter(s=>s.phase===name).map(s=>s.ms).sort((a,b)=>a-b);
      report.recovery.neighbor[name]={n:samples.length,medianMs:samples[Math.floor(samples.length*.5)],p95Ms:samples[Math.floor(samples.length*.95)],maxMs:samples.at(-1)};
    }
    report.recovery.activity=activity;
    await Promise.all([producer.end(),neighbor.end(),other.end(),monitor.end()]);
  }
});
