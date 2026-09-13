-- Optional execution candidate, installed explicitly at deployment/test setup.
-- SECURITY INVOKER, fully qualified relations, no dynamic SQL, no registration side effects.
-- These sequential statements preserve visibility across the next trusted SQL boundary.
-- The row reference remains in queries.ts for paired correctness/performance experiments.
create or replace function rawsql_transfer.record_skipped(fields jsonb) returns bigint
language plpgsql security invoker set search_path = pg_catalog as $body$
declare new_work bigint;
begin
  insert into rawsql_transfer.work_item(
  run_id, dirty_key_id, setting_id, destination_link_id, source_key_json, source_key_hash,
  source_exists, transfer_model, route_type, requires_black_insert_transfer, skip_reason,
  active_black_id, evaluated_destination_key_json, requires_red_transfer,
  requires_black_update_transfer, requires_physical_delete_transfer)
  values ((fields->>'run')::bigint, (fields->>'dirty')::bigint, (fields->>'setting')::bigint, (fields->>'link')::bigint, cast((fields->>'key') as jsonb), (fields->>'hash'),
  (fields->>'sourceExists')::boolean, (fields->>'model'), (fields->>'route'), (fields->>'insert')::boolean, (fields->>'skip'), (fields->>'active')::bigint, cast((fields->>'evaluated') as jsonb), (fields->>'red')::boolean,
  (fields->>'update')::boolean, (fields->>'delete')::boolean) returning work_item_id into new_work;
  fields := fields || jsonb_build_object('work',new_work::text);
  insert into rawsql_transfer.dirty_key_processing(
  dirty_key_id, run_id, work_item_id, setting_id, destination_link_id, source_key_json, source_key_hash,
  processing_status, processing_result)
  values ((fields->>'dirty')::bigint, (fields->>'run')::bigint, (fields->>'work')::bigint, (fields->>'setting')::bigint, (fields->>'link')::bigint, cast((fields->>'key') as jsonb), (fields->>'hash'), (fields->>'status'), (fields->>'result'));
  return new_work;
end
$body$;

create or replace function rawsql_transfer.record_black(fields jsonb, with_lineage boolean) returns void
language plpgsql security invoker set search_path = pg_catalog as $body$
begin
  insert into rawsql_transfer.active_black(
  destination_link_id, source_key_json, source_key_hash, destination_key_json)
  values ((fields->>'link')::bigint, cast((fields->>'key') as jsonb), (fields->>'hash'), cast((fields->>'destination') as jsonb));
  if with_lineage then
    insert into rawsql_transfer.lineage(
  run_id, setting_id, destination_link_id, work_item_id, transfer_operation, source_kind,
  source_key_json, source_key_hash, destination_table_name, destination_key_json, destination_key_hash)
  values ((fields->>'run')::bigint, (fields->>'setting')::bigint, (fields->>'link')::bigint, (fields->>'work')::bigint, 'black_insert', 'transfer_source',
  cast((fields->>'key') as jsonb), (fields->>'hash'), (fields->>'table'), cast((fields->>'destination') as jsonb), (fields->>'destinationHash'));
  end if;
  insert into rawsql_transfer.dirty_key_processing(
  dirty_key_id, run_id, work_item_id, setting_id, destination_link_id, source_key_json, source_key_hash,
  processing_status, processing_result)
  values ((fields->>'dirty')::bigint, (fields->>'run')::bigint, (fields->>'work')::bigint, (fields->>'setting')::bigint, (fields->>'link')::bigint, cast((fields->>'key') as jsonb), (fields->>'hash'), (fields->>'status'), (fields->>'result'));
end
$body$;

create or replace function rawsql_transfer.retire_active(fields jsonb, with_lineage boolean) returns void
language plpgsql security invoker set search_path = pg_catalog as $body$
declare retired integer;
begin
  update rawsql_transfer.work_item
  set active_black_id = null
  where active_black_id = (fields->>'active')::bigint and destination_link_id = (fields->>'link')::bigint;
  delete from rawsql_transfer.active_black
  where active_black_id = (fields->>'active')::bigint and destination_link_id = (fields->>'link')::bigint;
  get diagnostics retired = row_count;
  if retired <> 1 then raise exception 'Active Black retirement failed'; end if;
  if with_lineage then
    insert into rawsql_transfer.lineage(
  run_id, setting_id, destination_link_id, work_item_id, transfer_operation, source_kind,
  source_key_json, source_key_hash, destination_table_name, destination_key_json, destination_key_hash)
  values ((fields->>'run')::bigint, (fields->>'setting')::bigint, (fields->>'link')::bigint, (fields->>'work')::bigint, 'red_insert', 'reversed_destination_row',
  cast((fields->>'key') as jsonb), (fields->>'hash'), (fields->>'table'), cast((fields->>'destination') as jsonb), (fields->>'destinationHash'));
  end if;
end
$body$;
