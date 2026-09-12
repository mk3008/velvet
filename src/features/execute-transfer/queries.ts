import { sql } from '@mk3008/serene';

export const settingSql = sql`select * from rawsql_transfer.setting where setting_id = :id for update`;
export const linksSql = sql`select l.*, d.destination_table_name, d.destination_columns,
  d.destination_key_columns, d.transfer_model
  from rawsql_transfer.destination_link l
  join rawsql_transfer.destination_definition d using (destination_definition_id)
  where l.setting_id = :id order by l.execution_order for share of l, d`;
export const pendingSql = sql`select dk.dirty_key_id, dk.source_key_json, l.destination_link_id
  from rawsql_transfer.dirty_key dk
  cross join rawsql_transfer.destination_link l
  where l.setting_id = :setting and l.is_enabled
    and dk.source_schema_name = :schema and dk.source_table_name = :table
    and not exists (select 1 from rawsql_transfer.dirty_key_processing p
      where p.dirty_key_id = dk.dirty_key_id and p.destination_link_id = l.destination_link_id
        and p.processing_status in ('succeeded', 'skipped'))
  order by dk.dirty_key_id, l.execution_order`;
export const runSql = sql`insert into rawsql_transfer.run(setting_id, run_arguments, run_status, started_at)
  values (:setting, cast(:args as jsonb), 'running', current_timestamp) returning run_id`;
export const activeSql = sql`select active_black_id from rawsql_transfer.active_black
  where destination_link_id = :link and source_key_json = cast(:key as jsonb)`;
export const workSql = sql`insert into rawsql_transfer.work_item(
  run_id, dirty_key_id, setting_id, destination_link_id, source_key_json, source_key_hash,
  source_exists, transfer_model, route_type, requires_black_insert_transfer, skip_reason)
  values (:run, :dirty, :setting, :link, cast(:key as jsonb), :hash,
  true, 'immutable', :route, :insert, :skip) returning work_item_id`;
export const activeInsertSql = sql`insert into rawsql_transfer.active_black(
  destination_link_id, source_key_json, source_key_hash, destination_key_json)
  values (:link, cast(:key as jsonb), :hash, cast(:destination as jsonb))`;
export const lineageSql = sql`insert into rawsql_transfer.lineage(
  run_id, setting_id, destination_link_id, work_item_id, transfer_operation, source_kind,
  source_key_json, source_key_hash, destination_table_name, destination_key_json, destination_key_hash)
  values (:run, :setting, :link, :work, 'black_insert', 'transfer_source',
  cast(:key as jsonb), :hash, :table, cast(:destination as jsonb), :destinationHash)`;
export const processingSql = sql`insert into rawsql_transfer.dirty_key_processing(
  dirty_key_id, run_id, work_item_id, setting_id, destination_link_id, source_key_json, source_key_hash,
  processing_status, processing_result)
  values (:dirty, :run, :work, :setting, :link, cast(:key as jsonb), :hash, :status, :result)`;
export const finishSql = sql`update rawsql_transfer.run set run_status = :status,
  finished_at = current_timestamp, updated_at = current_timestamp, error_message = :error where run_id = :run`;
// A rejected COMMIT response does not prove that the server rolled back.
export const failSql = sql`update rawsql_transfer.run set run_status = 'failed',
  finished_at = current_timestamp, updated_at = current_timestamp, error_message = :error
  where run_id = :run and run_status = 'running'`;
