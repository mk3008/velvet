import { queryMany, type FeatureQuerySource } from '#features/_shared/featureQueryExecutor.js';
import type { FeatureQueryExecutor } from '#features/_shared/featureQueryExecutor.js';
import { sql } from '@mk3008/serene';

export const insertTransferSettingDestinationDefinitionSql = sql`insert into rawsql_transfer.destination_link(
    setting_id
    , destination_definition_id
    , destination_link_name
    , execution_order
    , destination_key_mapping
    , mapping_definition
    , diff_compare_excluded_columns
    , generated_insert_transfer_sql_body
    , generated_update_transfer_sql_body
    , generated_delete_transfer_sql_body
    , generated_sql_status
    , generated_sql_error
    , is_enabled
    , note
)
values
    (:setting_id, :destination_definition_id, :destination_link_name, :execution_order, cast(:destination_key_mapping as jsonb), cast(:mapping_definition as jsonb), cast(:diff_compare_excluded_columns as jsonb), '', '', '', 'not_generated', null, :is_enabled, :note)
returning
    destination_link_id
    , setting_id
    , destination_definition_id
    , execution_order
    , destination_key_mapping
    , mapping_definition
    , diff_compare_excluded_columns
    , generated_insert_transfer_sql_body
    , generated_update_transfer_sql_body
    , generated_delete_transfer_sql_body
    , generated_sql_status
    , generated_sql_error
    , is_enabled
    , created_at
    , updated_at
    , note;
`;
export const insertTransferSettingDestinationDefinitionQuery: FeatureQuerySource<InsertTransferSettingDestinationDefinitionQueryParams, InsertTransferSettingDestinationDefinitionQueryResult> = {
  id: 'insert-transfer-setting-destination-definition',
  path: 'src/features/create-transfer-setting/queries/insert-transfer-setting-destination-definition/query.ts',
  sql: insertTransferSettingDestinationDefinitionSql,
};

export interface InsertTransferSettingDestinationDefinitionQueryParams {
  setting_id: string;
  destination_definition_id: string;
  destination_link_name: string;
  execution_order: number;
  destination_key_mapping: unknown;
  mapping_definition: unknown;
  diff_compare_excluded_columns: unknown;
  is_enabled: boolean;
  note: string | null;
}

export interface InsertTransferSettingDestinationDefinitionQueryResult {
  created_at: string;
  destination_definition_id: string;
  destination_key_mapping: unknown;
  destination_link_id: string;
  diff_compare_excluded_columns: unknown;
  execution_order: number;
  generated_delete_transfer_sql_body: string;
  generated_insert_transfer_sql_body: string;
  generated_sql_error: string | null;
  generated_sql_status: string;
  generated_update_transfer_sql_body: string;
  is_enabled: boolean;
  mapping_definition: unknown;
  note: string | null;
  setting_id: string;
  updated_at: string;
}

export async function executeInsertTransferSettingDestinationDefinitionQuery(
  executor: FeatureQueryExecutor,
  params: InsertTransferSettingDestinationDefinitionQueryParams
): Promise<InsertTransferSettingDestinationDefinitionQueryResult[]> {
  return queryMany(executor, insertTransferSettingDestinationDefinitionQuery, params);
}
