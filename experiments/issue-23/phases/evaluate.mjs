// Explicit typed-profile feasibility evaluation. No arbitrary SQL or JS callback translation.
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {setTimeout as delay} from 'node:timers/promises';
import {configure as configureProfile,executeProfile} from './controller.mjs';
import {phaseWork} from './work.mjs';
import {normalize} from './normalize.mjs';
import {sql,bind} from '@mk3008/serene';
import {executeTransfer,TransferExecutionError} from '../../../dist/src/features/execute-transfer/boundary.js';
import * as q from '../../../dist/src/features/execute-transfer/queries.js';
import {withFixture,setup,dirty,databaseClient,definition} from '../benchmark.mjs';

const mode='ordered';
const size=Number(process.env.VELVET_ROWS??1000),links=Number(process.env.VELVET_LINKS??3);
const rtt=Number(process.env.ORDERED_RTT??5);
assert(['ordered','routine'].includes(mode));
const report={mode,size,links,rtt,commit:process.env.GITHUB_SHA??'local',completed:false,trials:[],
 scope:'Set-based immutable typed profile; independent keys, ordered Links; legacy Phase 1–5 remains unchanged',
 assumptions:{invocationMs:60000,safetyMs:45000,arrivalPerSecond:2,backlog:10000}};
let db;
const configure=()=>configureProfile(db);
const ordered=(client,maximum,setting='1')=>executeProfile(client,maximum,setting,phaseWork);
async function query(client,statement,params={}){const b=bind(statement,params,'indexed');return (await client.query(b.text,b.values)).rows;}
const snapshot=async()=> (await db.query(`select jsonb_build_object(
 'observations',(select jsonb_agg(to_jsonb(d) order by position) from public.ordered_write_observation d),
 'destination',(select jsonb_agg(to_jsonb(d) order by row_id) from public.scale_destination d),
 'active',(select jsonb_agg(to_jsonb(d) order by active_black_id) from rawsql_transfer.active_black d),
 'work',(select jsonb_agg(to_jsonb(d) order by work_item_id) from rawsql_transfer.work_item d),
 'lineage',(select jsonb_agg(to_jsonb(d) order by lineage_id) from rawsql_transfer.lineage d),
 'processing',(select jsonb_agg(to_jsonb(d) order by dirty_key_processing_id) from rawsql_transfer.dirty_key_processing d))::text value`)).rows[0].value;
async function measured(scenario,{maximum,expected,fail=false,latency=rtt,loseCommit=false,database=db}={}){
 const db=database;
 await db.query('select pg_stat_force_next_flush()');await db.query('select pg_stat_clear_snapshot()');
 const dbBefore=(await db.query('select * from pg_stat_database where datname=current_database()')).rows[0];
 const walBefore=(await db.query('select pg_current_wal_insert_lsn() lsn')).rows[0].lsn;
 let calls=0,bytes=0;const peak={...process.memoryUsage()};
 const sample=()=>{for(const[k,v]of Object.entries(process.memoryUsage()))peak[k]=Math.max(peak[k],v);};
 const timer=setInterval(sample,10);timer.unref();const cpu=process.cpuUsage();const t=performance.now();
 let commits=0,result,error;
 const client={async query(text,values){calls++;bytes+=Buffer.byteLength(JSON.stringify(values??[]));if(latency)await delay(latency);
  const result=await db.query(text,values);sample();
  if(loseCommit&&text==='commit'&&++commits===2)throw new Error('simulated lost COMMIT response');return result;}};
 try{result= mode==='ordered'?await ordered(client,maximum):await executeTransfer(client,[definition],{settingId:'1',metadataMode:'routine',maxDirtyKeys:maximum});}
 catch(e){error=e;}finally{clearInterval(timer);sample();}
 const elapsedMs=performance.now()-t;
 await db.query('select pg_stat_force_next_flush()');await db.query('select pg_stat_clear_snapshot()');
 const dbAfter=(await db.query('select * from pg_stat_database where datname=current_database()')).rows[0];
 const databaseDelta=Object.fromEntries(['blks_read','blks_hit','tup_inserted','tup_updated','tup_deleted','temp_files','temp_bytes','deadlocks'].map(k=>[k,Number(dbAfter[k])-Number(dbBefore[k])]));
 const walBytes=Number((await query(db,sql`select pg_wal_lsn_diff(pg_current_wal_insert_lsn(),:before) n`,{before:walBefore}))[0].n);
 if(fail||loseCommit){assert(error instanceof TransferExecutionError);assert.equal(error.recoveryErrors.length,0);
  assert.match(error.message,loseCommit?/lost COMMIT/:/scale downstream failure/);result={runId:error.runId};
  assert.equal((await query(db,sql`select run_status from rawsql_transfer.run where run_id=:run`,{run:result.runId}))[0].run_status,loseCommit?'succeeded':'failed');
 }else{if(error)throw error;if(expected!==undefined)assert.equal(result.inserted,expected);}
 const row={scenario,elapsedMs,calls,parameterBytes:bytes,peak,cpu:process.cpuUsage(cpu),databaseDelta,walBytes,result};report.trials.push(row);console.log(JSON.stringify(row));
 if(mode==='ordered'){
  assert.equal((await db.query("select count(*)::int n from pg_class where relnamespace=pg_my_temp_schema() and (relname like 'velvet_phase_%' or relname='velvet_source_snapshot')")).rows[0].n,0);
  if(!fail&&!loseCommit&&result.source_rows>0)assert.equal(calls,15+16*links);
 }
 return row;
}
await withFixture(async()=>{
 db=databaseClient();
 try{
  await db.query(await readFile(new URL('../ordered/profile.sql',import.meta.url),'utf8'));
  report.postgres=(await db.query('select version()')).rows[0].version;
  // Differential semantic oracle before capacity sampling, with all metadata and history.
  const semanticStates=[];
  for(const backend of ['reference','ordered']){
   await setup(5,links);await configure();
   await db.query("truncate public.ordered_write_observation restart identity;set velvet.ordered_oracle='on'");
   const run=()=>backend==='ordered'?ordered(db):executeTransfer(db,[definition],{settingId:'1',metadataMode:'row'});
   await dirty();await run();await dirty();await run();
   await db.query('update public.scale_source set amount=121 where id=2');await dirty();await run();
   await dirty();await dirty();await run();
   await dirty();await db.query('delete from public.scale_source where id=1');await run();
   const state=JSON.parse(await snapshot());
   for(const rows of Object.values(state))for(const row of rows??[]){delete row.created_at;delete row.updated_at;delete row.activated_at;}
   semanticStates.push(normalize(state));
  }
  assert.deepEqual(semanticStates[1],semanticStates[0]);report.differentialState='passed';
  await db.query("set velvet.ordered_oracle='off'");
  // Pair the same canonical profile on both paths; localhost route observations first.
  for(let repetition=0;repetition<2;repetition++){
   await setup(size,links);await configure();await dirty();
   await measured('initial',{expected:size*links,latency:0});
   await dirty();await measured('all_no_op',{expected:0,latency:0});
   await db.query('update public.scale_source set amount=120 where id%100=0');
   await dirty();await measured('mostly_no_op',{expected:size/100*links,latency:0});
   await db.query('update public.scale_source set amount=140');await dirty();
   await measured('correction',{expected:size*links,latency:0});
  }
  // Small correctness checks avoid the large whole-state oracle contaminating capacity samples.
  await setup(5,links);await configure();await dirty();await measured('small_initial',{expected:5*links,latency:0});
  await dirty();await dirty();await measured('duplicates',{expected:0,latency:0});
  const outcomes=(await db.query("select processing_result,count(*)::int n from rawsql_transfer.dirty_key_processing where run_id=(select max(run_id) from rawsql_transfer.run) group by processing_result")).rows;
  assert.deepEqual(Object.fromEntries(outcomes.map(r=>[r.processing_result,r.n])),{no_op:5*links,duplicate_ignore:5*links});
  await db.query('update public.scale_source set amount=180');await dirty();const before=await snapshot();
  await query(db,sql`select set_config('velvet.scale_fail',:role,false),set_config('velvet.scale_fail_id','3',false)`,{role:String(links)});await measured('failure',{fail:true,latency:0});assert.equal(await snapshot(),before);
  await db.query("set velvet.scale_fail='';set velvet.scale_fail_id=''");await measured('retry',{expected:5*links,latency:0});
  await dirty();await measured('lost_commit',{loseCommit:true,latency:0});
  await measured('retry_after_lost_commit',{expected:0,latency:0});
  await dirty();await db.query('delete from public.scale_source where id=1');
  await measured('source_absent',{expected:0,latency:0});
  assert.equal((await query(db,sql`select count(*)::int n from rawsql_transfer.active_black where source_key_json=:key::jsonb`,{key:'{"logical_id":"1"}'}))[0].n,0);
  if(mode==='ordered'&&size===10000&&links===3){
   await setup(size,links);await configure();
   const {recover}=await import('../ordered/recovery.mjs');
   report.recovery=await recover({db,ordered,measured,dirty,rtt});
  }
  report.completed=true;
 }finally{await writeFile(process.env.ORDERED_OUTPUT??'tmp/ordered-results.json',JSON.stringify(report,null,2)+'\n');}
});
