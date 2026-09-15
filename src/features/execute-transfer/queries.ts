import { sql } from '@mk3008/serene';

export const settingSql = sql`select * from velvet.setting where setting_id = :id for update`;
export const linksSql = sql`select l.*, d.destination_table_name, d.destination_columns,
  d.destination_key_columns, d.transfer_model, d.sign_inversion_columns,
  d.generated_red_transfer_sql_body, d.date_lower_bound_adjustments, d.sequence_expression_definition,
  d.set_phase_definition as destination_set_phase_definition
  from velvet.destination_link l
  join velvet.destination_definition d using (destination_definition_id)
  where l.setting_id = :id order by l.execution_order for share of l, d`;
export const pendingSql = sql`select dk.dirty_key_id, dk.source_key_json, l.destination_link_id
  from velvet.dirty_key dk
  cross join velvet.destination_link l
  where l.setting_id = :setting and l.is_enabled
    and dk.source_schema_name = :schema and dk.source_table_name = :table
    and not exists (select 1 from velvet.dirty_key_processing p
      where p.dirty_key_id = dk.dirty_key_id and p.destination_link_id = l.destination_link_id
        and p.processing_status in ('succeeded', 'skipped'))
  order by dk.dirty_key_id, l.execution_order`;
export const runSql = sql`insert into velvet.run(setting_id, run_arguments, run_status, started_at)
  values (:setting, cast(:args as jsonb), 'running', current_timestamp) returning run_id`;
export const setPhaseRunSql = sql`insert into velvet.run(setting_id,run_arguments,run_status,started_at,execution_configuration)
 values(:setting,:args::jsonb,'running',current_timestamp,:configuration::jsonb) returning run_id`;
export const activeSql = sql`select active_black_id, destination_key_json from velvet.active_black
  where destination_link_id = :link and source_key_json = cast(:key as jsonb) for update`;
export const workSql = sql`insert into velvet.work_item(
  run_id, dirty_key_id, setting_id, destination_link_id, source_key_json, source_key_hash,
  source_exists, transfer_model, route_type, requires_black_insert_transfer, skip_reason,
  active_black_id, evaluated_destination_key_json, requires_red_transfer,
  requires_black_update_transfer, requires_physical_delete_transfer)
  values (:run, :dirty, :setting, :link, cast(:key as jsonb), :hash,
  :sourceExists, :model, :route, :insert, :skip, :active, cast(:evaluated as jsonb), :red,
  :update, :delete) returning work_item_id`;
export const activeInsertSql = sql`insert into velvet.active_black(
  destination_link_id, source_key_json, source_key_hash, destination_key_json)
  values (:link, cast(:key as jsonb), :hash, cast(:destination as jsonb))`;
export const lineageSql = sql`insert into velvet.lineage(
  run_id, setting_id, destination_link_id, work_item_id, transfer_operation, source_kind,
  source_key_json, source_key_hash, destination_table_name, destination_key_json, destination_key_hash)
  values (:run, :setting, :link, :work, 'black_insert', 'transfer_source',
  cast(:key as jsonb), :hash, :table, cast(:destination as jsonb), :destinationHash)`;
export const processingSql = sql`insert into velvet.dirty_key_processing(
  dirty_key_id, run_id, work_item_id, setting_id, destination_link_id, source_key_json, source_key_hash,
  processing_status, processing_result)
  values (:dirty, :run, :work, :setting, :link, cast(:key as jsonb), :hash, :status, :result)`;
export const finishSql = sql`update velvet.run set run_status = :status,
  finished_at = current_timestamp, updated_at = current_timestamp, error_message = :error where run_id = :run`;
// A rejected COMMIT response does not prove that the server rolled back.
export const failSql = sql`update velvet.run set run_status = 'failed',
  finished_at = current_timestamp, updated_at = current_timestamp, error_message = :error
  where run_id = :run and run_status = 'running'`;

export const compareSql = sql`with values_to_compare as (
  select cast(:current as jsonb) as current_values, cast(:previous as jsonb) as active_values
)
select jsonb_typeof(current_values) = 'object' and jsonb_typeof(active_values) = 'object'
  and current_values ?& cast(:columns as text[]) and active_values ?& cast(:columns as text[])
  and not exists (select 1 from jsonb_object_keys(current_values) k where not k = any(cast(:allColumns as text[])))
  and not exists (select 1 from jsonb_object_keys(active_values) k where not k = any(cast(:allColumns as text[]))) as valid,
  (current_values - cast(:excluded as text[])) is distinct from
  (active_values - cast(:excluded as text[])) as changed
from values_to_compare`;
export const activeDeleteSql = sql`delete from velvet.active_black
  where active_black_id = :active and destination_link_id = :link returning active_black_id`;
export const redLineageSql = sql`insert into velvet.lineage(
  run_id, setting_id, destination_link_id, work_item_id, transfer_operation, source_kind,
  source_key_json, source_key_hash, destination_table_name, destination_key_json, destination_key_hash)
  values (:run, :setting, :link, :work, 'red_insert', 'reversed_destination_row',
  cast(:key as jsonb), :hash, :table, cast(:destination as jsonb), :destinationHash)`;

export const releaseActiveReferencesSql = sql`update velvet.work_item
  set active_black_id = null
  where active_black_id = :active and destination_link_id = :link`;

// Optional, explicitly deployed sequential routines in db/runtime/execute-transfer-metadata.sql.
export const skippedMetadataSql = sql`select velvet.record_skipped(cast(:fields as jsonb)) as work_item_id`;
export const blackMetadataSql = sql`select velvet.record_black(cast(:fields as jsonb), :withLineage)`;
export const retireMetadataSql = sql`select velvet.retire_active(cast(:fields as jsonb), :withLineage)`;

// Select whole Dirty Keys with all eligible links, not a LIMIT on cross-product rows.
// No durable watermark: a late-committing lower ID remains eligible on the next Run.
export const boundedPendingSql = sql`with admitted as materialized (
  select dk.dirty_key_id, dk.source_key_json
  from velvet.dirty_key dk
  where dk.source_schema_name = :schema and dk.source_table_name = :table
    and exists (select 1 from velvet.destination_link l
      where l.setting_id = :setting and l.is_enabled
        and not exists (select 1 from velvet.dirty_key_processing p
          where p.dirty_key_id = dk.dirty_key_id and p.destination_link_id = l.destination_link_id
            and p.processing_status in ('succeeded', 'skipped')))
  order by dk.dirty_key_id limit :maximum
)
select dk.dirty_key_id, dk.source_key_json, l.destination_link_id
from admitted dk cross join velvet.destination_link l
where l.setting_id = :setting and l.is_enabled
  and not exists (select 1 from velvet.dirty_key_processing p
    where p.dirty_key_id = dk.dirty_key_id and p.destination_link_id = l.destination_link_id
      and p.processing_status in ('succeeded', 'skipped'))
order by dk.dirty_key_id, l.execution_order`;
