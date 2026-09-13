import assert from 'node:assert/strict';
import {Client} from 'pg';
import {setTimeout as delay} from 'node:timers/promises';
import {sql,bind} from '@mk3008/serene';

export async function recover({db,ordered,measured,dirty,rtt}){
 const name=(await db.query('select current_database() name')).rows[0].name;
 const url=new URL(process.env.ASHIBA_DB_URL);url.pathname='/'+name;
 const [producer,neighbor,other,monitor,primary]=Array.from({length:5},()=>new Client({connectionString:url.toString()}));
 const report={primaryStartsOnFreshConnection:true,backlog:10000,cap:1000,targetArrivalPerSecond:2,rtt,completed:false,timeline:[],otherRuns:[],neighbor:[],activity:[]};
 let stopped=false,error,phase='idle',arrivals=0;const tasks=[];
 const background=fn=>{const p=fn().catch(e=>{error??=e;stopped=true;});tasks.push(p);};
 const query=async(client,statement,params={})=>{const b=bind(statement,params,'indexed');return (await client.query(b.text,b.values)).rows;};
 const pending=async(setting='1')=>(await query(producer,sql`select count(*)::int n from rawsql_transfer.dirty_key k
  where exists(select 1 from rawsql_transfer.destination_link l where l.setting_id=:setting and l.is_enabled
   and not exists(select 1 from rawsql_transfer.dirty_key_processing p where p.dirty_key_id=k.dirty_key_id
    and p.destination_link_id=l.destination_link_id and p.processing_status in ('succeeded','skipped')))`,{setting}))[0].n;
 const otherClient={async query(text,values){if(rtt)await delay(rtt);return other.query(text,values);}};
 try{
  const connected=await Promise.allSettled([producer.connect(),neighbor.connect(),other.connect(),monitor.connect(),primary.connect()]);
  const rejected=connected.find(r=>r.status==='rejected');if(rejected)throw rejected.reason;
  await db.query('create table public.ordered_neighbor(id int primary key,value bigint);insert into public.ordered_neighbor values(1,0)');
  background(async()=>{while(!stopped){const t=performance.now(),label=phase;
   await neighbor.query('update public.ordered_neighbor set value=value+1 where id=1');
   report.neighbor.push({phase:label,ms:performance.now()-t});await delay(20);}});
  background(async()=>{while(!stopped){report.activity.push({phase,rows:(await monitor.query(`select state,wait_event_type,wait_event,
   max(extract(epoch from clock_timestamp()-xact_start))::float8 transaction_age_seconds,count(*)::int n
   from pg_stat_activity where datname=current_database() and pid<>pg_backend_pid() group by state,wait_event_type,wait_event`)).rows});await delay(100);}});
  await delay(1000);await dirty();phase='outage';
  await primary.query("set velvet.scale_fail='3'");assert((await measured('outage',{maximum:1000,fail:true,latency:rtt,database:primary})).elapsedMs<45000);
  assert.equal(await pending(),10000);await primary.query("set velvet.scale_fail=''");
  await db.query(`insert into rawsql_transfer.setting(setting_id,setting_name,source_sql_body,source_sql_hash,source_key_definition,source_sql_analysis_status)
   select 2,'independent',source_sql_body,source_sql_hash,source_key_definition,source_sql_analysis_status from rawsql_transfer.setting where setting_id=1;
   insert into rawsql_transfer.destination_link(destination_link_id,setting_id,destination_definition_id,destination_link_name,execution_order,
    destination_key_mapping,mapping_definition,diff_compare_excluded_columns,generated_insert_transfer_sql_body,generated_reassessment_sql_body)
   select destination_link_id+3,2,destination_definition_id,destination_link_name,execution_order,destination_key_mapping,mapping_definition,
    diff_compare_excluded_columns,generated_insert_transfer_sql_body,generated_reassessment_sql_body from rawsql_transfer.destination_link where setting_id=1`);
  phase='recovery';const start=performance.now();
  background(async()=>{while(!stopped){await delay(500);if(stopped)break;
   await query(producer,sql`insert into rawsql_transfer.dirty_key(source_schema_name,source_table_name,source_key_json)
    values('public','scale_source',jsonb_build_object('id',:id::text))`,{id:String(arrivals%10000+1)});arrivals++;}});
  while(await pending()>5){
   if(error)throw error;assert(performance.now()-start<180000,'Recovery evaluation ceiling exceeded');
   const independent=(async()=>{const t=performance.now();const result=await ordered(otherClient,1000,'2');assert.equal(result.source_rows,10000);
    const elapsedMs=performance.now()-t;assert(elapsedMs<45000);report.otherRuns.push({elapsedMs,...result});})();
   const outcomes=await Promise.allSettled([measured('catch_up',{maximum:1000,latency:rtt,database:primary}),independent]);
   const rejected=outcomes.find(r=>r.status==='rejected');if(rejected)throw rejected.reason;
   const row=outcomes[0].value;assert(row.elapsedMs<45000);assert.equal(row.result.source_rows,10000);
   report.timeline.push({elapsedMs:row.elapsedMs,remaining:await pending(),arrivals,processedPairs:row.result.inserted+row.result.skipped,sourceRows:row.result.source_rows});
  }
  report.catchupMs=performance.now()-start;assert(report.catchupMs<180000);report.arrivalsDuringCatchup=arrivals;report.remaining=await pending();report.otherRemaining=await pending('2');assert(report.otherRemaining<=5);
  report.grossKeysPerSecond=(10000+arrivals-report.remaining)/(report.catchupMs/1000);
  phase='steady';
  for(let i=0;i<5;i++){await delay(1000);if(error)throw error;
   if(await pending())assert((await measured('steady',{maximum:1000,latency:rtt,database:primary})).elapsedMs<45000);
   assert(await pending()<=5);}
  phase='correction';await db.query('update public.scale_source set amount=200');await dirty();
  assert((await measured('bounded_correction',{maximum:1000,latency:rtt,database:primary})).elapsedMs<45000);
  if(error)throw error;report.completed=true;
 }finally{
  stopped=true;await Promise.allSettled(tasks);report.arrivals=arrivals;
  await Promise.allSettled([producer.end(),neighbor.end(),other.end(),monitor.end(),primary.end()]);
 }
 if(error)throw error;return report;
}
