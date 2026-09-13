// Isolated evaluation only: the production executor is imported, never copied.
import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { Client } from 'pg';
import { sql, bind } from '@mk3008/serene';
import { executeTransfer, TransferExecutionError } from '../../dist/src/features/execute-transfer/boundary.js';
import { pathToFileURL } from 'node:url';
import { PerformanceObserver } from 'node:perf_hooks';
import { setTimeout as delay } from 'node:timers/promises';

if (!process.env.ASHIBA_DB_URL) throw new Error('ASHIBA_DB_URL must allow creation of an isolated database');
const admin = new Client({ connectionString: process.env.ASHIBA_DB_URL });
const database = 'velvet_scale_' + randomUUID().replaceAll('-', '');
let db;
const mode=process.env.VELVET_MODE ?? 'routine';
const size=Number(process.env.VELVET_ROWS ?? 1000), linkCount=Number(process.env.VELVET_LINKS ?? 3);
const rttMs=Number(process.env.VELVET_RTT_MS ?? 0);
const maximum=process.env.VELVET_MAX_DIRTY ? Number(process.env.VELVET_MAX_DIRTY) : undefined;
const report = { commit:process.env.GITHUB_SHA ?? 'local', node:process.version, mode, rttMs, maximum,
  trials:[], completed:false, assumptions:{ sourceMemoBytes:128, injectedRtt:'additional delay per awaited driver call; not real network',
    invocationBudgetMs:60000, safetyBudgetMs:45000, productionAdoption:'unresolved' } };
let gcMs=0, gcCount=0;
const observer=new PerformanceObserver(list=>{for(const e of list.getEntries()){gcMs+=e.duration;gcCount++;}});
observer.observe({entryTypes:['gc']});

const execute = async (statement, params = {}) => {
  const p = bind(statement, params, 'indexed');
  return db.query(p.text, p.values);
};
const definition = { settingId: '1', sourceSchema: 'public', sourceTable: 'scale_source',
  sourceKeyDefinition: { keys: [{ column: 'logical_id', type: 'text' }] },
  resolveLogicalKey: k => ({ logical_id: k.id }) };
// These are trusted configuration payloads, installed into the canonical Setting/Link fields.
const source = `select id::text logical_id, amount::text amount, memo,
 nextval('public.scale_allocation')::text allocation,
 nextval('public.scale_row')::text key1, nextval('public.scale_row')::text key2,
 nextval('public.scale_row')::text key3,
 '1'::text role1, '2'::text role2, '3'::text role3 from public.scale_source`;
const insert = `insert into public.scale_destination(row_id,logical_id,amount,memo,allocation,role)
 values(:row_id,:logical_id,:amount,:memo,:allocation,:role) returning row_id`;
const compare = `select jsonb_build_object('row_id',:row_id::text,'logical_id',:logical_id::text,
 'amount',:amount::numeric,'memo',:memo::text,'allocation',:allocation::text,'role',:role::text)::text current_values,
 to_jsonb(d)::text active_values from public.scale_destination d
 where row_id=(:velvet_active_destination_key::jsonb->>'row_id')`;
const red = `insert into public.scale_destination
 select nextval('public.scale_row')::text,logical_id,-amount,memo,allocation,role
 from public.scale_destination where row_id=:row_id returning row_id`;
const dirty = () => execute(sql`insert into rawsql_transfer.dirty_key(source_schema_name,source_table_name,source_key_json)
 select 'public','scale_source',jsonb_build_object('id',id::text) from public.scale_source`);
async function setup(n, links) {
  await db.query(`truncate rawsql_transfer.setting,rawsql_transfer.destination_definition,
    rawsql_transfer.dirty_key,public.scale_source,public.scale_destination restart identity cascade;
    alter sequence public.scale_allocation restart with 1; alter sequence public.scale_row restart with 1;
    set velvet.scale_fail = ''`);
  await execute(sql`insert into public.scale_source select i,100,repeat('m',128) from generate_series(1,:n::int) i`, { n });
  await execute(sql`insert into rawsql_transfer.destination_definition(destination_definition_id,destination_definition_name,
    destination_table_name,destination_columns,destination_key_columns,transfer_model,sign_inversion_columns,generated_red_transfer_sql_body)
    values(1,'scale','public.scale_destination',:columns::jsonb,array['row_id'],'immutable',array['amount'],:red)`,
    { columns: JSON.stringify({columns:['row_id','logical_id','amount','memo','allocation','role'].map(name=>({name,type:name==='amount'?'numeric':'text'}))}), red });
  await execute(sql`insert into rawsql_transfer.setting(setting_id,setting_name,source_sql_body,source_sql_hash,source_key_definition,source_sql_analysis_status)
    values(1,'scale',:source,'trusted',:keys::jsonb,'not_analyzed')`, {source,keys:JSON.stringify(definition.sourceKeyDefinition)});
  for (let role=1; role<=links; role++) {
    await execute(sql`insert into rawsql_transfer.destination_link(destination_link_id,setting_id,destination_definition_id,destination_link_name,
      execution_order,destination_key_mapping,mapping_definition,diff_compare_excluded_columns,generated_insert_transfer_sql_body,generated_reassessment_sql_body)
      values(:role::int,1,1,:name,:role::int,:keys::jsonb,:mapping::jsonb,'{"columns":["row_id","allocation"]}',:insert,:compare)`,
      { role, name:'role'+role, keys:JSON.stringify({sourceKey:['logical_id'],destinationKey:[{name:'row_id',sourceColumn:'key'+role}]}),
        mapping:JSON.stringify({columns:{row_id:'key'+role,logical_id:'logical_id',amount:'amount',memo:'memo',allocation:'allocation',role:'role'+role}}),insert,compare });
  }
}
const state = async () => (await db.query(`select jsonb_build_object(
 'destination',(select jsonb_agg(to_jsonb(d) order by row_id) from public.scale_destination d),
 'active',(select jsonb_agg(to_jsonb(a) order by active_black_id) from rawsql_transfer.active_black a),
 'lineage',(select jsonb_agg(to_jsonb(l) order by lineage_id) from rawsql_transfer.lineage l),
 'work',(select jsonb_agg(to_jsonb(w) order by work_item_id) from rawsql_transfer.work_item w),
 'processing',(select jsonb_agg(to_jsonb(p) order by dirty_key_processing_id) from rawsql_transfer.dirty_key_processing p),
 'dirty',(select jsonb_agg(to_jsonb(k) order by dirty_key_id) from rawsql_transfer.dirty_key k),
 'success',(select jsonb_agg(to_jsonb(r) order by run_id) from rawsql_transfer.run r where run_status='succeeded'))::text snapshot`)).rows[0].snapshot;
async function measure(n, links, scenario, expectedChanged, fail = false, settingId = '1') {
  const counts = {}, timings = {};
  let calls=0, sqlBytes=0, parameterBytes=0, resultBytes=0, sourceEvaluations=0, maxParameterBytes=0;
  const allocationBefore = (await db.query('select last_value,is_called from public.scale_allocation')).rows[0];
  const sequenceBefore = (await db.query('select last_value,is_called from public.scale_row')).rows[0];
  const before = fail ? await state() : null;
  const memoryStart=process.memoryUsage(), peak={...memoryStart};
  const sample=()=>{const m=process.memoryUsage();for(const key of Object.keys(m))peak[key]=Math.max(peak[key],m[key]);};
  const timer=setInterval(sample,10);timer.unref();
  const cpuStart=process.cpuUsage(), gcStart={gcMs,gcCount};
  await db.query('select pg_stat_force_next_flush()');
  await db.query('select pg_stat_clear_snapshot()');
  const dbBefore=(await db.query('select * from pg_stat_database where datname=current_database()')).rows[0];
  const walBefore=(await db.query('select pg_current_wal_insert_lsn() lsn')).rows[0].lsn;
  const start = performance.now();
  let workStart, workMs;
  let begins = 0;
  const client = { async query(text, values) {
    sample();
    calls++; sqlBytes+=Buffer.byteLength(text);
    const payload=Buffer.byteLength(JSON.stringify(values ?? [])); parameterBytes+=payload; maxParameterBytes=Math.max(maxParameterBytes,payload);
    if(text===source) sourceEvaluations++;
    if(text==='begin' && ++begins===2) workStart=performance.now();
    const category = text===source ? 'source' : text.replace(/\s+/g,' ').trim().slice(0,85);
    counts[category]=(counts[category]??0)+1;
    const t=performance.now();
    try { if(rttMs) await delay(rttMs); const result=await db.query(text,values); sample(); resultBytes+=Buffer.byteLength(JSON.stringify(result.rows)); return result; }
    finally { timings[category]=(timings[category]??0)+performance.now()-t;
      if(workStart && workMs===undefined && (text==='commit'||text==='rollback')) workMs=performance.now()-workStart; }
  }};
  let result;
  try { result=await executeTransfer(client,[{...definition,settingId}],{settingId, metadataMode:mode, maxDirtyKeys:maximum}); assert.equal(fail,false); }
  catch(error) {
    if(!fail) throw error;
    assert(error instanceof TransferExecutionError); assert.match(error.cause.message,/scale downstream failure/);
    assert.deepEqual(error.recoveryErrors,[]); result={runId:error.runId};
  }
  const elapsedMs=performance.now()-start;
  clearInterval(timer);sample();
  const appCpuMicros=process.cpuUsage(cpuStart);
  await db.query('select pg_stat_force_next_flush()');
  await db.query('select pg_stat_clear_snapshot()');
  const dbAfter=(await db.query('select * from pg_stat_database where datname=current_database()')).rows[0];
  const walBytes=Number((await db.query('select pg_wal_lsn_diff(pg_current_wal_insert_lsn(),$1) bytes',[walBefore])).rows[0].bytes);
  const databaseDelta=Object.fromEntries(['xact_commit','xact_rollback','blks_read','blks_hit','tup_returned','tup_fetched','tup_inserted','tup_updated','tup_deleted','temp_files','temp_bytes','blk_read_time','blk_write_time','deadlocks'].map(k=>[k,Number(dbAfter[k])-Number(dbBefore[k])]));
  assert.equal(sourceEvaluations,1);
  if(fail) {
    assert.equal(await state(),before);
    assert.equal((await execute(sql`select run_status from rawsql_transfer.run where run_id=:run`,{run:result.runId})).rows[0].run_status,'failed');
  } else {
    if(expectedChanged!==null) assert.equal(result.inserted,expectedChanged);
    if(n!==null && expectedChanged!==null) assert.equal(result.skipped,n*links-expectedChanged);
    const outcomes=(await execute(sql`select processing_result,count(*)::int n from rawsql_transfer.dirty_key_processing where run_id=:run group by processing_result`,{run:result.runId})).rows;
    assert.equal(outcomes.reduce((s,r)=>s+r.n,0),result.inserted+result.skipped);
    if(n!==null) assert.equal(result.inserted+result.skipped,n*links);
    result.outcomes=outcomes;
  }
  const allocationAfter=Number((await db.query('select last_value from public.scale_allocation')).rows[0].last_value);
  const rowAfter=Number((await db.query('select last_value from public.scale_row')).rows[0].last_value);
  const record={n,links,settingId,scenario,elapsedMs,workMs,calls,memoryStart,peak,appCpuMicros,gc:{ms:gcMs-gcStart.gcMs,count:gcCount-gcStart.gcCount},databaseDelta,walBytes,sqlBytes,parameterBytes,resultBytes,maxParameterBytes,sourceEvaluations,
    allocationConsumed:allocationAfter-(allocationBefore.is_called?Number(allocationBefore.last_value):0),
    rowIdsConsumed:rowAfter-(sequenceBefore.is_called?Number(sequenceBefore.last_value):0),counts,timings,result};
  report.trials.push(record); console.log(JSON.stringify(record));
  return record;
}
export async function withFixture(action) {
await admin.connect();
try {
  // Database name is exclusively an internally generated UUID identifier; lifecycle DDL exception.
  await admin.query('create database '+database);
  const url=new URL(process.env.ASHIBA_DB_URL); url.pathname='/'+database;
  db=new Client({connectionString:url.toString()}); await db.connect();
  report.postgres=(await db.query('select version()')).rows[0].version;
  report.settings=(await db.query("select name,setting,unit from pg_settings where name in ('shared_buffers','work_mem','temp_buffers','fsync','synchronous_commit')")).rows;
  const root=new URL('../../db/ddl/',import.meta.url);
  for(const file of JSON.parse(await readFile(new URL('order.json',root),'utf8')).order) await db.query(await readFile(new URL(file,root),'utf8'));
  await db.query(await readFile(new URL('../../db/runtime/execute-transfer-metadata.sql',import.meta.url),'utf8'));
  await db.query(`create table public.scale_source(id integer primary key,amount numeric,memo text);
    create sequence public.scale_allocation; create sequence public.scale_row;
    create table public.scale_destination(row_id text primary key,logical_id text,amount numeric,memo text,allocation text,role text);
    create function public.scale_guard() returns trigger language plpgsql as $$ begin
      if current_setting('velvet.scale_fail',true)=new.role then raise exception 'scale downstream failure'; end if;
      return new; end $$;
    create trigger scale_guard before insert on public.scale_destination for each row execute function public.scale_guard()`);
  await action();
  observer.disconnect();
  report.completed=true;
} finally {
  try {
    await writeFile(process.env.VELVET_BENCH_OUTPUT ?? 'tmp/issue-23-results.json',JSON.stringify(report,null,2)+'\n');
  } finally {
    try {
      await db?.end();
    } finally {
      try { await admin.query('drop database if exists '+database); } finally { await admin.end(); }
    }
  }
}

}
export {setup, dirty, measure, execute, report, definition};
export const databaseClient=()=>db;

if(process.argv[1] && import.meta.url===pathToFileURL(process.argv[1]).href) {
  if(maximum!==undefined) throw new Error("Use recovery.mjs for bounded measurements");
  await withFixture(async()=>{
  for(let repetition=0;repetition<2;repetition++) for(const n of [size]) for(const links of [linkCount]) {
    await setup(n,links); await dirty(); await measure(n,links,'initial',n*links);
    await dirty(); await measure(n,links,'all_no_op',0);
    await execute(sql`update public.scale_source set amount=120 where id<=:changed`,{changed:n/100});
    await dirty(); await measure(n,links,'mostly_no_op',n/100*links);
    await db.query('update public.scale_source set amount=140');
    await dirty(); await measure(n,links,'all_changed',n*links);
    if(links===3) {
      await db.query("update public.scale_source set amount=160; set velvet.scale_fail='3'");
      await dirty(); await measure(n,links,'downstream_failure',0,true);
      await db.query("set velvet.scale_fail=''");
      await measure(n,links,'retry',n*links);
    }
  }

  });
}
