import assert from 'node:assert/strict';
import {sql,bind} from '@mk3008/serene';
import {materializeSource} from './materialize.mjs';

// An authored complete statement, shared with the ordered profile's reference.
export const sourceStatement = sql`select * from public.scale_snapshot()`;
const pending = sql`create temporary table pg_temp.velvet_phase_pending on commit drop as
 with admitted as materialized (
  select dk.dirty_key_id,dk.source_key_json from rawsql_transfer.dirty_key dk
  where dk.source_schema_name='public' and dk.source_table_name='scale_source'
  and exists(select 1 from rawsql_transfer.destination_link l where l.setting_id=:setting and l.is_enabled
   and not exists(select 1 from rawsql_transfer.dirty_key_processing p
    where p.dirty_key_id=dk.dirty_key_id and p.destination_link_id=l.destination_link_id
    and p.processing_status in ('succeeded','skipped')))
  order by dk.dirty_key_id limit :maximum
 ) select dk.*,l.destination_link_id,l.execution_order,
 row_number() over(partition by dk.source_key_json->>'id',l.destination_link_id order by dk.dirty_key_id) occurrence
 from admitted dk cross join rawsql_transfer.destination_link l
 where l.setting_id=:setting and l.is_enabled
 and not exists(select 1 from rawsql_transfer.dirty_key_processing p
  where p.dirty_key_id=dk.dirty_key_id and p.destination_link_id=l.destination_link_id
  and p.processing_status in ('succeeded','skipped'))`;

// Re-evaluated AFTER all phases of the preceding Link. Never freeze all Links'
// comparison against a state that predates their dependencies.
const decide = sql`create temporary table pg_temp.velvet_phase_decision on commit drop as
 with inputs as (
  select p.*,s.logical_id,s.amount::numeric amount,s.memo,s.allocation,
   case p.execution_order when 1 then s.key1 when 2 then s.key2 when 3 then s.key3 end black_key,
   s.logical_id is not null source_exists,
   ('{"logical_id":'||to_jsonb(p.source_key_json->>'id')::text||'}') source_key,
   a.active_black_id,a.destination_key_json evaluated,
   d.row_id old_key,d.logical_id old_logical_id,d.amount old_amount,d.memo old_memo,d.allocation old_allocation,d.role old_role
  from pg_temp.velvet_phase_pending p
  left join pg_temp.velvet_source_snapshot s on s.logical_id=p.source_key_json->>'id'
  left join rawsql_transfer.active_black a on p.occurrence=1
   and a.destination_link_id=p.destination_link_id
   and a.source_key_json=jsonb_build_object('logical_id',p.source_key_json->>'id')
  left join public.scale_destination d on d.row_id=a.destination_key_json->>'row_id'
  where p.destination_link_id=:link
 ), classified as (
  select *,case when occurrence>1 then 'duplicate_ignore'
   when not source_exists and active_black_id is null then 'no_op'
   when source_exists and active_black_id is not null and
    row(logical_id,amount,memo,execution_order::text) is not distinct from row(old_logical_id,old_amount,old_memo,old_role)
   then 'no_op' end skip
  from inputs
 ) select *,encode(sha256(convert_to(source_key,'UTF8')),'hex') source_hash,
  case when skip is null and active_black_id is not null then nextval('public.scale_row')::text end red_key
 from classified`;
const prepareWork = sql`insert into rawsql_transfer.work_item(
 run_id,dirty_key_id,setting_id,destination_link_id,source_key_json,source_key_hash,
 source_exists,transfer_model,route_type,requires_black_insert_transfer,skip_reason,
 active_black_id,evaluated_destination_key_json,requires_red_transfer,
 requires_black_update_transfer,requires_physical_delete_transfer)
 select :run,dirty_key_id,:setting,destination_link_id,source_key::jsonb,source_hash,
 source_exists,'immutable',case when skip is null then 'immutable' else 'skipped' end,
 source_exists and skip is null,skip,active_black_id,evaluated,
 active_black_id is not null and skip is null,false,false
 from pg_temp.velvet_phase_decision`;
const red = sql`insert into public.scale_destination(row_id,logical_id,amount,memo,allocation,role)
 select red_key,old_logical_id,-old_amount,old_memo,old_allocation,old_role
 from pg_temp.velvet_phase_decision where red_key is not null`;
const release = sql`update rawsql_transfer.work_item w set active_black_id=null
 from pg_temp.velvet_phase_decision d where d.red_key is not null
 and w.active_black_id=d.active_black_id and w.destination_link_id=d.destination_link_id`;
const retire = sql`delete from rawsql_transfer.active_black a using pg_temp.velvet_phase_decision d
 where d.red_key is not null and a.active_black_id=d.active_black_id and a.destination_link_id=d.destination_link_id`;
const redLineage = sql`insert into rawsql_transfer.lineage(
 run_id,setting_id,destination_link_id,work_item_id,transfer_operation,source_kind,
 source_key_json,source_key_hash,destination_table_name,destination_key_json,destination_key_hash)
 select w.run_id,w.setting_id,w.destination_link_id,w.work_item_id,'red_insert','reversed_destination_row',
 jsonb_build_object('row_id',d.old_key),
 encode(sha256(convert_to('{"row_id":'||to_jsonb(d.old_key)::text||'}','UTF8')),'hex'),
 'public.scale_destination',jsonb_build_object('row_id',d.red_key),
 encode(sha256(convert_to('{"row_id":'||to_jsonb(d.red_key)::text||'}','UTF8')),'hex')
 from pg_temp.velvet_phase_decision d join rawsql_transfer.work_item w
 on w.run_id=:run and w.dirty_key_id=d.dirty_key_id and w.destination_link_id=d.destination_link_id
 where d.red_key is not null`;
const black = sql`insert into public.scale_destination(row_id,logical_id,amount,memo,allocation,role)
 select d.black_key,d.logical_id,
 case when d.execution_order=1 then d.amount else journal.amount end,
 d.memo,d.allocation,d.execution_order::text
 from pg_temp.velvet_phase_decision d
 left join lateral (
  select j.amount from public.scale_destination j
  where j.logical_id=d.logical_id and j.role='1' and j.amount is not distinct from d.amount
  order by j.row_id::bigint desc limit 1
 ) journal on d.execution_order>1
 where d.source_exists and d.skip is null
 and (d.execution_order=1 or exists(select 1 from public.scale_destination j
  where j.logical_id=d.logical_id and j.role='1' and j.amount is not distinct from d.amount))`;
const active = sql`insert into rawsql_transfer.active_black(
 destination_link_id,source_key_json,source_key_hash,destination_key_json)
 select destination_link_id,source_key::jsonb,source_hash,jsonb_build_object('row_id',black_key)
 from pg_temp.velvet_phase_decision where source_exists and skip is null`;
const blackLineage = sql`insert into rawsql_transfer.lineage(
 run_id,setting_id,destination_link_id,work_item_id,transfer_operation,source_kind,
 source_key_json,source_key_hash,destination_table_name,destination_key_json,destination_key_hash)
 select w.run_id,w.setting_id,w.destination_link_id,w.work_item_id,'black_insert','transfer_source',
 d.source_key::jsonb,d.source_hash,'public.scale_destination',jsonb_build_object('row_id',d.black_key),
 encode(sha256(convert_to('{"row_id":'||to_jsonb(d.black_key)::text||'}','UTF8')),'hex')
 from pg_temp.velvet_phase_decision d join rawsql_transfer.work_item w
 on w.run_id=:run and w.dirty_key_id=d.dirty_key_id and w.destination_link_id=d.destination_link_id
 where d.source_exists and d.skip is null`;
const processing = sql`insert into rawsql_transfer.dirty_key_processing(
 dirty_key_id,run_id,work_item_id,setting_id,destination_link_id,source_key_json,source_key_hash,processing_status,processing_result)
 select d.dirty_key_id,w.run_id,w.work_item_id,w.setting_id,d.destination_link_id,d.source_key::jsonb,d.source_hash,
 case when d.skip is null then 'succeeded' else 'skipped' end,
 coalesce(d.skip,case when d.active_black_id is not null then
  case when d.source_exists then 'red_then_black_insert' else 'red' end else 'black_insert' end)
 from pg_temp.velvet_phase_decision d join rawsql_transfer.work_item w
 on w.run_id=:run and w.dirty_key_id=d.dirty_key_id and w.destination_link_id=d.destination_link_id`;

export async function phaseWork(client,run,setting,maximum,links) {
 const execute=async(statement,params={})=>{const b=bind(statement,params,'indexed');return client.query(b.text,b.values);};
 const admitted=await execute(pending,{setting,maximum:maximum??null});
 if(admitted.rowCount===0)return {inserted:0,skipped:0,source_rows:0};
 const invalid=await execute(sql`select count(*)::int n from pg_temp.velvet_phase_pending
  where jsonb_typeof(source_key_json->'id') is distinct from 'string'`);
 assert.equal(invalid.rows[0].n,0,'Profile requires textual dirty id');
 const source=materializeSource(sourceStatement);
 const sourceResult=await client.query(source.text,source.values);
 await execute(sql`alter table pg_temp.velvet_source_snapshot add primary key(logical_id)`);
 await execute(sql`analyze pg_temp.velvet_source_snapshot`);
 let inserted=0,skipped=0;
 for(const link of links){
  await execute(decide,{link:link.destination_link_id});
  const invalid=await execute(sql`select count(*)::int n from pg_temp.velvet_phase_decision
   where active_black_id is not null and old_key is null`);
  assert.equal(invalid.rows[0].n,0,'Active destination must exist');
  await execute(prepareWork,{run,setting});
  const expected=await execute(sql`select count(*) filter(where red_key is not null)::int red,
   count(*) filter(where source_exists and skip is null)::int black
   from pg_temp.velvet_phase_decision`);
  const redResult=await execute(red);
  assert.equal(redResult.rowCount,expected.rows[0].red,'Red cardinality');
  const redCheck=await execute(sql`select count(*)::int n from pg_temp.velvet_phase_decision d
   left join public.scale_destination t on t.row_id=d.red_key
   where d.red_key is not null and (t.row_id is null or
    row(t.logical_id,t.amount,t.memo,t.allocation,t.role) is distinct from
    row(d.old_logical_id,-d.old_amount,d.old_memo,d.old_allocation,d.old_role))`);
  assert.equal(redCheck.rows[0].n,0,'Red identity/content');
  await execute(release);
  assert.equal((await execute(retire)).rowCount,redResult.rowCount);
  await execute(redLineage,{run});
  const blackResult=await execute(black);inserted+=blackResult.rowCount;
  assert.equal(blackResult.rowCount,expected.rows[0].black,'Black cardinality');
  const blackCheck=await execute(sql`select count(*)::int n from pg_temp.velvet_phase_decision d
   left join public.scale_destination t on t.row_id=d.black_key
   where d.source_exists and d.skip is null and (t.row_id is null or
    row(t.logical_id,t.amount,t.memo,t.allocation,t.role) is distinct from
    row(d.logical_id,d.amount,d.memo,d.allocation,d.execution_order::text))`);
  assert.equal(blackCheck.rows[0].n,0,'Black identity/content');
  await execute(active);
  await execute(blackLineage,{run});
  await execute(processing,{run});
  const counts=await execute(sql`select count(*) filter(where skip is not null)::int n from pg_temp.velvet_phase_decision`);
  skipped+=counts.rows[0].n;
  await execute(sql`drop table pg_temp.velvet_phase_decision`);
 }
 return {inserted,skipped,source_rows:sourceResult.rowCount};
}
