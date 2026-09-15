// Explicit typed-profile feasibility evaluation. No arbitrary SQL or JS callback translation.
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {setTimeout as delay} from 'node:timers/promises';
import {sql,bind} from '@mk3008/serene';
import {executeTransfer,TransferExecutionError} from '../../../dist/src/features/execute-transfer/boundary.js';
import * as q from '../../../dist/src/features/execute-transfer/queries.js';
import {withFixture,setup,dirty,databaseClient,definition} from '../benchmark.mjs';

const mode=process.env.ORDERED_MODE??'ordered';
const size=Number(process.env.VELVET_ROWS??1000),links=Number(process.env.VELVET_LINKS??3);
const rtt=Number(process.env.ORDERED_RTT??5);
assert(['ordered','routine'].includes(mode));
const report={mode,size,links,rtt,commit:process.env.GITHUB_SHA??'local',completed:false,trials:[],
 scope:'Explicit immutable typed profile; not arbitrary SQL or Phase 1–5 equivalence',
 assumptions:{invocationMs:60000,safetyMs:45000,arrivalPerSecond:2,backlog:10000}};
const source='select * from public.scale_snapshot()';
const insert=`select row_id from public.scale_insert(:row_id::text,:logical_id::text,:amount::numeric,:memo::text,:allocation::text,:role::text)`;
const red=`select row_id from public.scale_red(:row_id::text)`;
const compare=`select * from public.scale_compare(:row_id::text,:logical_id::text,:amount::numeric,:memo::text,:allocation::text,:role::text,:velvet_active_destination_key::jsonb)`;
let db;
async function query(client,statement,params={}){const b=bind(statement,params,'indexed');return (await client.query(b.text,b.values)).rows;}
async function configure(){
 await query(db,sql`update velvet.setting set source_sql_body=:source where setting_id=1`,{source});
 await query(db,sql`update velvet.destination_link set generated_insert_transfer_sql_body=:insert,generated_reassessment_sql_body=:compare where setting_id=1`,{insert,compare});
 await query(db,sql`update velvet.destination_definition set generated_red_transfer_sql_body=:red where destination_definition_id=1`,{red});
}
async function ordered(client,maximum,settingId='1'){
 let runId, persisted=false;
 await client.query('begin');
 try{
  const [setting]=await query(client,q.settingSql,{id:settingId});
  const profileLinks=await query(client,q.linksSql,{id:settingId});
  assert.equal(setting.source_sql_body,source);assert.equal(setting.is_enabled,true);
  assert.deepEqual(setting.source_key_definition,definition.sourceKeyDefinition);
  for(const [i,l] of profileLinks.entries()){
   assert.equal(l.execution_order,i+1);assert.equal(l.is_enabled,true);
   assert.equal(l.transfer_model,'immutable');assert.equal(l.date_lower_bound_adjustments,null);
   assert.equal(l.destination_table_name,'public.scale_destination');
   assert.deepEqual(l.destination_columns,{columns:['row_id','logical_id','amount','memo','allocation','role'].map(name=>({name,type:name==='amount'?'numeric':'text'}))});
   assert.equal(l.generated_insert_transfer_sql_body,insert);assert.equal(l.generated_reassessment_sql_body,compare);
   assert.equal(l.generated_red_transfer_sql_body,red);
   assert.deepEqual(l.destination_key_columns,['row_id']);
   assert.deepEqual(l.diff_compare_excluded_columns,{columns:['row_id','allocation']});
   assert.deepEqual(l.mapping_definition,{columns:{row_id:'key'+(i+1),logical_id:'logical_id',amount:'amount',memo:'memo',allocation:'allocation',role:'role'+(i+1)}});
   assert.deepEqual(l.destination_key_mapping,{sourceKey:['logical_id'],destinationKey:[{name:'row_id',sourceColumn:'key'+(i+1)}]});
  }
  assert(profileLinks.length>0&&profileLinks.length<=3);
  [{run_id:runId}]=await query(client,q.runSql,{setting:settingId,args:'{}'});
  await client.query('commit');persisted=true;await client.query('begin');
  assert.deepEqual((await query(client,q.settingSql,{id:settingId}))[0],setting);
  assert.deepEqual(await query(client,q.linksSql,{id:settingId}),profileLinks);
  const [result]=await query(client,sql`select * from public.scale_ordered_work(:run::bigint,:setting::bigint,:maximum::integer)`,{run:runId,setting:settingId,maximum:maximum??null});
  await query(client,q.finishSql,{run:runId,status:'succeeded',error:null});
  await client.query('commit');return {runId,...result};
 }catch(error){
  const recoveryErrors=[];let discarded=false;
  try{await client.query('rollback');discarded=true;}catch(e){recoveryErrors.push(e);}
  if(persisted&&discarded)try{
   await client.query('begin');await query(client,q.failSql,{run:runId,error:error.message});await client.query('commit');
  }catch(e){recoveryErrors.push(e);try{await client.query('rollback');}catch(e){recoveryErrors.push(e);}}
  if(runId)throw new TransferExecutionError(error.message,runId,error,recoveryErrors);throw error;
 }
}
const snapshot=async()=> (await db.query(`select jsonb_build_object(
 'observations',(select jsonb_agg(to_jsonb(d) order by position) from public.ordered_write_observation d),
 'destination',(select jsonb_agg(to_jsonb(d) order by row_id) from public.scale_destination d),
 'active',(select jsonb_agg(to_jsonb(d) order by active_black_id) from velvet.active_black d),
 'work',(select jsonb_agg(to_jsonb(d) order by work_item_id) from velvet.work_item d),
 'lineage',(select jsonb_agg(to_jsonb(d) order by lineage_id) from velvet.lineage d),
 'processing',(select jsonb_agg(to_jsonb(d) order by dirty_key_processing_id) from velvet.dirty_key_processing d))::text value`)).rows[0].value;
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
  assert.equal((await query(db,sql`select run_status from velvet.run where run_id=:run`,{run:result.runId}))[0].run_status,loseCommit?'succeeded':'failed');
 }else{if(error)throw error;if(expected!==undefined)assert.equal(result.inserted,expected);}
 const row={scenario,elapsedMs,calls,parameterBytes:bytes,peak,cpu:process.cpuUsage(cpu),databaseDelta,walBytes,result};report.trials.push(row);console.log(JSON.stringify(row));
 if(mode==='ordered'){
  assert.equal((await db.query("select count(*)::int n from pg_class where relnamespace=pg_my_temp_schema() and relname like 'velvet_ordered_%'")).rows[0].n,0);
  if(!fail&&!loseCommit)assert.equal(calls,11);
 }
 return row;
}
await withFixture(async()=>{
 db=databaseClient();
 try{
  await db.query(await readFile(new URL('profile.sql',import.meta.url),'utf8'));
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
   semanticStates.push(state);
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
  const outcomes=(await db.query("select processing_result,count(*)::int n from velvet.dirty_key_processing where run_id=(select max(run_id) from velvet.run) group by processing_result")).rows;
  assert.deepEqual(Object.fromEntries(outcomes.map(r=>[r.processing_result,r.n])),{no_op:5*links,duplicate_ignore:5*links});
  await db.query('update public.scale_source set amount=180');await dirty();const before=await snapshot();
  await query(db,sql`select set_config('velvet.scale_fail',:role,false),set_config('velvet.scale_fail_id','3',false)`,{role:String(links)});await measured('failure',{fail:true,latency:0});assert.equal(await snapshot(),before);
  await db.query("set velvet.scale_fail='';set velvet.scale_fail_id=''");await measured('retry',{expected:5*links,latency:0});
  await dirty();await measured('lost_commit',{loseCommit:true,latency:0});
  await measured('retry_after_lost_commit',{expected:0,latency:0});
  await dirty();await db.query('delete from public.scale_source where id=1');
  await measured('source_absent',{expected:0,latency:0});
  assert.equal((await query(db,sql`select count(*)::int n from velvet.active_black where source_key_json=:key::jsonb`,{key:'{"logical_id":"1"}'}))[0].n,0);
  if(mode==='ordered'&&size===10000&&links===3){
   await setup(size,links);await configure();
   const {recover}=await import('./recovery.mjs');
   report.recovery=await recover({db,ordered,measured,dirty,rtt});
  }
  report.completed=true;
 }finally{await writeFile(process.env.ORDERED_OUTPUT??'tmp/ordered-results.json',JSON.stringify(report,null,2)+'\n');}
});
