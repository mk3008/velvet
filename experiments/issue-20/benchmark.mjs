// Isolated evaluation only: the production executor is imported, never copied.
import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { Client } from 'pg';
import { sql, bind } from '@mk3008/serene';
import { executeTransfer, TransferExecutionError } from '../../dist/src/features/execute-transfer/boundary.js';
import { runTransportProbe } from './transport.mjs';

if (!process.env.ASHIBA_DB_URL) throw new Error('ASHIBA_DB_URL must allow creation of an isolated database');
const admin = new Client({ connectionString: process.env.ASHIBA_DB_URL });
const database = 'velvet_scale_' + randomUUID().replaceAll('-', '');
let db;
const report = { base: '58c0182', node: process.version, trials: [], transport: [] };
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
      values(:role,1,1,:name,:role,:keys::jsonb,:mapping::jsonb,'{"columns":["row_id","allocation"]}',:insert,:compare)`,
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
async function measure(n, links, scenario, expectedChanged, fail = false) {
  const counts = {}, timings = {};
  let calls=0, sqlBytes=0, parameterBytes=0, resultBytes=0, sourceEvaluations=0, maxParameterBytes=0;
  const allocationBefore = (await db.query('select last_value,is_called from public.scale_allocation')).rows[0];
  const sequenceBefore = (await db.query('select last_value,is_called from public.scale_row')).rows[0];
  const before = fail ? await state() : null;
  const start = performance.now();
  let workStart, workMs;
  let begins = 0;
  const client = { async query(text, values) {
    calls++; sqlBytes+=Buffer.byteLength(text);
    const payload=Buffer.byteLength(JSON.stringify(values ?? [])); parameterBytes+=payload; maxParameterBytes=Math.max(maxParameterBytes,payload);
    if(text===source) sourceEvaluations++;
    if(text==='begin' && ++begins===2) workStart=performance.now();
    const category = text===source ? 'source' : text.replace(/\s+/g,' ').trim().slice(0,85);
    counts[category]=(counts[category]??0)+1;
    const t=performance.now();
    try { const result=await db.query(text,values); resultBytes+=Buffer.byteLength(JSON.stringify(result.rows)); return result; }
    finally { timings[category]=(timings[category]??0)+performance.now()-t;
      if(workStart && workMs===undefined && (text==='commit'||text==='rollback')) workMs=performance.now()-workStart; }
  }};
  let result;
  try { result=await executeTransfer(client,[definition],{settingId:'1'}); assert.equal(fail,false); }
  catch(error) {
    if(!fail) throw error;
    assert(error instanceof TransferExecutionError); assert.match(error.cause.message,/scale downstream failure/);
    assert.deepEqual(error.recoveryErrors,[]); result={runId:error.runId};
  }
  const elapsedMs=performance.now()-start;
  assert.equal(sourceEvaluations,1);
  if(fail) {
    assert.equal(await state(),before);
    assert.equal((await execute(sql`select run_status from rawsql_transfer.run where run_id=:run`,{run:result.runId})).rows[0].run_status,'failed');
  } else {
    assert.equal(result.inserted,expectedChanged); assert.equal(result.skipped,n*links-expectedChanged);
    const outcomes=(await execute(sql`select processing_result,count(*)::int n from rawsql_transfer.dirty_key_processing where run_id=:run group by processing_result`,{run:result.runId})).rows;
    assert.equal(outcomes.reduce((s,r)=>s+r.n,0),n*links);
    result.outcomes=outcomes;
  }
  const allocationAfter=Number((await db.query('select last_value from public.scale_allocation')).rows[0].last_value);
  const rowAfter=Number((await db.query('select last_value from public.scale_row')).rows[0].last_value);
  const record={n,links,scenario,elapsedMs,workMs,calls,sqlBytes,parameterBytes,resultBytes,maxParameterBytes,sourceEvaluations,
    allocationConsumed:allocationAfter-(allocationBefore.is_called?Number(allocationBefore.last_value):0),
    rowIdsConsumed:rowAfter-(sequenceBefore.is_called?Number(sequenceBefore.last_value):0),counts,timings,result};
  report.trials.push(record); console.log(JSON.stringify(record));
}
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
  await db.query(`create table public.scale_source(id integer primary key,amount numeric,memo text);
    create sequence public.scale_allocation; create sequence public.scale_row;
    create table public.scale_destination(row_id text primary key,logical_id text,amount numeric,memo text,allocation text,role text);
    create function public.scale_guard() returns trigger language plpgsql as $$ begin
      if current_setting('velvet.scale_fail',true)=new.role then raise exception 'scale downstream failure'; end if;
      return new; end $$;
    create trigger scale_guard before insert on public.scale_destination for each row execute function public.scale_guard()`);
  for(const n of [1000,10000]) for(const links of [1,3]) {
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
  report.transport=await runTransportProbe(db);
} finally {
  await writeFile(process.env.VELVET_BENCH_OUTPUT ?? 'tmp/issue-20-results.json',JSON.stringify(report,null,2)+'\n');
  await db?.end(); await admin.query('drop database if exists '+database); await admin.end();
}
