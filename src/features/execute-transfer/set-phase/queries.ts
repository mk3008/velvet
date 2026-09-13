import { sql } from '@mk3008/serene';

export const admit = sql`create temporary table pg_temp.velvet_pending_keys on commit drop as
 select dk.dirty_key_id,dk.source_key_json from rawsql_transfer.dirty_key dk
 where dk.source_schema_name=:schema and dk.source_table_name=:table
 and exists(select 1 from rawsql_transfer.destination_link l where l.setting_id=:setting and l.is_enabled
  and not exists(select 1 from rawsql_transfer.dirty_key_processing p
   where p.dirty_key_id=dk.dirty_key_id and p.destination_link_id=l.destination_link_id
   and p.processing_status in ('succeeded','skipped')))
 order by dk.dirty_key_id limit :maximum`;
export const pending = sql`create temporary table pg_temp.velvet_pending_links on commit drop as
 select k.dirty_key_id,l.destination_link_id from pg_temp.velvet_pending_keys k
 cross join rawsql_transfer.destination_link l where l.setting_id=:setting and l.is_enabled
 and not exists(select 1 from rawsql_transfer.dirty_key_processing p
  where p.dirty_key_id=k.dirty_key_id and p.destination_link_id=l.destination_link_id
  and p.processing_status in ('succeeded','skipped'))`;
export const sourceConstraint = sql`alter table pg_temp.velvet_source_rows add primary key(source_key)`;
export const dirtyConstraint = sql`alter table pg_temp.velvet_dirty_identities add primary key(dirty_key_id)`;
export const identityCheck = sql`select
 (select count(*) from pg_temp.velvet_source_rows)=:sourceRows::bigint
 and (select count(*) from pg_temp.velvet_dirty_identities)=(select count(*) from pg_temp.velvet_pending_keys)
 and not exists(select 1 from pg_temp.velvet_dirty_identities i left join pg_temp.velvet_pending_keys k using(dirty_key_id) where k.dirty_key_id is null)
 and not exists(select 1 from pg_temp.velvet_source_rows where source_values is null or jsonb_typeof(source_values)<>'object')
 and not exists(select 1 from (
  select source_key from pg_temp.velvet_source_rows union all select source_key from pg_temp.velvet_dirty_identities
 ) keys where case when source_key is null or jsonb_typeof(source_key)<>'object' then true else
  array(select k from jsonb_object_keys(source_key) k order by k collate "C")<>:keys::text[]
  or exists(select 1 from jsonb_each(source_key) e where jsonb_typeof(e.value)<>'string') end) valid`;
export const sourceAnalyze = sql`analyze pg_temp.velvet_source_rows`;

export const input = sql`create temporary table pg_temp.velvet_phase_input on commit drop as
 with admitted as (
  select p.dirty_key_id,i.source_key,
   row_number() over(partition by i.source_key order by p.dirty_key_id) occurrence
  from pg_temp.velvet_pending_links p join pg_temp.velvet_dirty_identities i using(dirty_key_id)
  where p.destination_link_id=:link
 ), mapped as (
  select k.*,s.source_key is not null source_exists,s.source_values,
   (select jsonb_object_agg(m.key,s.source_values->m.value) from jsonb_each_text(:mapping::jsonb) m) mapped_values,
   (select jsonb_object_agg(m->>'name',s.source_values->(m->>'sourceColumn')) from jsonb_array_elements(:keyMapping::jsonb) m) black_key,
   a.active_black_id,a.destination_key_json active_key
  from admitted k left join pg_temp.velvet_source_rows s using(source_key)
  left join rawsql_transfer.active_black a on k.occurrence=1 and a.destination_link_id=:link and a.source_key_json=k.source_key
 ) select *,encode(sha256(convert_to((select '{'||string_agg(to_jsonb(e.key)::text||':'||e.value::text,',' order by e.key collate "C")||'}'
 from jsonb_each(source_key) e),'UTF8')),'hex') source_hash from mapped`;
export const inputCheck = sql`select not exists(select 1 from pg_temp.velvet_phase_input i
 where (i.source_exists and i.occurrence=1 and not i.source_values ?& :mappedColumns::text[])
 or exists(select 1 from (values(i.active_key),(case when i.source_exists and i.occurrence=1 then i.black_key end)) k(value)
  where k.value is not null and case when jsonb_typeof(k.value)<>'object' then true else
   array(select k from jsonb_object_keys(k.value) k order by k collate "C")<>:keys::text[]
   or exists(select 1 from jsonb_each(k.value) e where jsonb_typeof(e.value)<>'string') end)) valid`;
export const evaluationConstraint = sql`alter table pg_temp.velvet_link_evaluation add primary key(dirty_key_id)`;
export const evaluationCheck = sql`select
 (select count(*) from pg_temp.velvet_link_evaluation)=(select count(*) from pg_temp.velvet_phase_input where occurrence=1)
 and not exists(select 1 from pg_temp.velvet_link_evaluation e left join pg_temp.velvet_phase_input i using(dirty_key_id)
  where i.dirty_key_id is null or i.occurrence<>1)
 and not exists(select 1 from pg_temp.velvet_phase_input i join pg_temp.velvet_link_evaluation e using(dirty_key_id)
  cross join lateral (values(i.source_exists,e.current_values,i.black_key),(i.active_black_id is not null,e.active_values,i.active_key)) v(required,data,key)
  where v.required and case when v.data is null or jsonb_typeof(v.data)<>'object' then true else
   not v.data ?& :columns::text[] or not v.data @> v.key
   or exists(select 1 from jsonb_object_keys(v.data) k where not k=any(:columns::text[])) end) valid`;
export const decision = sql`create temporary table pg_temp.velvet_phase_decision on commit drop as
 with classified as (
  select i.*,e.current_values,e.active_values,case when i.occurrence>1 then 'duplicate_ignore'
   when not i.source_exists and i.active_black_id is null then 'no_op'
   when i.source_exists and i.active_black_id is not null and
    e.current_values-:excluded::text[] is not distinct from e.active_values-:excluded::text[] then 'no_op' end skip
  from pg_temp.velvet_phase_input i left join pg_temp.velvet_link_evaluation e using(dirty_key_id)
 ) select *,skip is null and active_black_id is not null requires_red,
  skip is null and source_exists requires_black,null::jsonb red_key,null::jsonb red_values
 from classified`;
export const redConstraint = sql`alter table pg_temp.velvet_red_projection add primary key(dirty_key_id)`;
export const redCheck = sql`select
 (select count(*) from pg_temp.velvet_red_projection)=(select count(*) from pg_temp.velvet_phase_decision where requires_red)
 and not exists(select 1 from pg_temp.velvet_red_projection r left join pg_temp.velvet_phase_decision d using(dirty_key_id)
  where d.dirty_key_id is null or not d.requires_red or r.red_key=d.active_key
  or case when r.red_key is null or jsonb_typeof(r.red_key)<>'object' then true else
   array(select k from jsonb_object_keys(r.red_key) k order by k collate "C")<>:keys::text[]
   or exists(select 1 from jsonb_each(r.red_key) e where jsonb_typeof(e.value)<>'string') end
  or case when r.red_values is null or jsonb_typeof(r.red_values)<>'object' then true else
   not r.red_values ?& :columns::text[] or not r.red_values @> r.red_key
   or exists(select 1 from jsonb_object_keys(r.red_values) k where not k=any(:columns::text[])) end) valid`;
export const attachRed = sql`update pg_temp.velvet_phase_decision d set red_key=r.red_key,red_values=r.red_values
 from pg_temp.velvet_red_projection r where r.dirty_key_id=d.dirty_key_id`;
export const collisionCheck = sql`select not exists(select 1 from pg_temp.velvet_phase_decision
 where requires_black and (black_key=active_key or black_key=red_key)) valid`;
export const work = sql`insert into rawsql_transfer.work_item(
 run_id,dirty_key_id,setting_id,destination_link_id,source_key_json,source_key_hash,source_exists,
 transfer_model,route_type,requires_red_transfer,requires_black_insert_transfer,skip_reason,active_black_id,evaluated_destination_key_json)
 select :run,dirty_key_id,:setting,:link,source_key,source_hash,source_exists,'immutable',
 case when skip is null then 'immutable' else 'skipped' end,requires_red,requires_black,skip,active_black_id,active_key
 from pg_temp.velvet_phase_decision`;
export const writes = sql`create temporary table pg_temp.velvet_phase_writes on commit drop as
 select d.dirty_key_id,w.work_item_id,:operation::text operation,
  case when :operation='red_insert' then d.red_key else d.black_key end destination_key,
  case when :operation='red_insert' then d.red_values else d.current_values end destination_values
 from pg_temp.velvet_phase_decision d join rawsql_transfer.work_item w
 on w.run_id=:run and w.dirty_key_id=d.dirty_key_id and w.destination_link_id=:link
 where case when :operation='red_insert' then d.requires_red else d.requires_black end`;
export const writesConstraint = sql`alter table pg_temp.velvet_phase_writes add primary key(destination_key)`;
export const receiptsConstraint = sql`alter table pg_temp.velvet_write_receipts add primary key(destination_key)`;
export const receiptsCheck = sql`select
 (select count(*) from pg_temp.velvet_write_receipts)=(select count(*) from pg_temp.velvet_phase_writes)
 and not exists(select 1 from pg_temp.velvet_phase_writes w full join pg_temp.velvet_write_receipts r using(destination_key)
 where w.destination_key is null or r.destination_key is null or w.operation is distinct from r.operation
 or w.destination_values is distinct from r.destination_values) valid`;
export const lineage = sql`insert into rawsql_transfer.lineage(
 run_id,setting_id,destination_link_id,work_item_id,transfer_operation,source_kind,
 source_key_json,source_key_hash,destination_table_name,destination_key_json,destination_key_hash)
 select :run,:setting,:link,w.work_item_id,w.operation,
 case when w.operation='red_insert' then 'reversed_destination_row' else 'transfer_source' end,
 case when w.operation='red_insert' then d.active_key else d.source_key end,
 encode(sha256(convert_to((select '{'||string_agg(to_jsonb(e.key)::text||':'||e.value::text,',' order by e.key collate "C")||'}'
  from jsonb_each(case when w.operation='red_insert' then d.active_key else d.source_key end) e),'UTF8')),'hex'),
 :table,w.destination_key,
 encode(sha256(convert_to((select '{'||string_agg(to_jsonb(e.key)::text||':'||e.value::text,',' order by e.key collate "C")||'}'
  from jsonb_each(w.destination_key) e),'UTF8')),'hex')
 from pg_temp.velvet_phase_writes w join pg_temp.velvet_phase_decision d using(dirty_key_id)`;
export const release = sql`update rawsql_transfer.work_item w set active_black_id=null
 from pg_temp.velvet_phase_decision d where d.requires_red and w.active_black_id=d.active_black_id and w.destination_link_id=:link`;
export const retire = sql`delete from rawsql_transfer.active_black a using pg_temp.velvet_phase_decision d
 where d.requires_red and a.active_black_id=d.active_black_id and a.destination_link_id=:link`;
export const active = sql`insert into rawsql_transfer.active_black(destination_link_id,source_key_json,source_key_hash,destination_key_json)
 select :link,source_key,source_hash,black_key from pg_temp.velvet_phase_decision where requires_black`;
export const processing = sql`insert into rawsql_transfer.dirty_key_processing(
 dirty_key_id,run_id,work_item_id,setting_id,destination_link_id,source_key_json,source_key_hash,processing_status,processing_result)
 select d.dirty_key_id,:run,w.work_item_id,:setting,:link,d.source_key,d.source_hash,
 case when d.skip is null then 'succeeded' else 'skipped' end,
 coalesce(d.skip,case when d.requires_red then case when d.requires_black then 'red_then_black_insert' else 'red' end else 'black_insert' end)
 from pg_temp.velvet_phase_decision d join rawsql_transfer.work_item w
 on w.run_id=:run and w.dirty_key_id=d.dirty_key_id and w.destination_link_id=:link`;
export const counts = sql`select count(*) filter(where requires_black)::int inserted,
 count(*) filter(where skip is not null)::int skipped from pg_temp.velvet_phase_decision`;
export const dropWrites = sql`drop table pg_temp.velvet_phase_writes,pg_temp.velvet_write_receipts`;
export const dropLink = sql`drop table pg_temp.velvet_phase_input,pg_temp.velvet_link_evaluation,
 pg_temp.velvet_phase_decision,pg_temp.velvet_red_projection`;
