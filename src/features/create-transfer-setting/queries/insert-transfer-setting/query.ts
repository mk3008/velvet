import { queryMany, type FeatureQuerySource } from '#features/_shared/featureQueryExecutor.js';
import type { FeatureQueryExecutor } from '#features/_shared/featureQueryExecutor.js';
import { sql } from '@mk3008/serene';

export const insertTransferSettingSql = sql`insert into rawsql_transfer.setting(
    setting_name
    , description
    , source_sql_body
    , source_sql_hash
    , source_key_definition
    , source_sql_analysis_result
    , search_condition_analysis_result
    , source_sql_analysis_status
    , source_sql_analysis_error
    , is_enabled
    , note
)
values
    (:setting_name, :description, :source_sql_body, :source_sql_hash, cast(:source_key_definition as jsonb), cast(:source_sql_analysis_result as jsonb), cast(:search_condition_analysis_result as jsonb), :source_sql_analysis_status, :source_sql_analysis_error, :is_enabled, :note)
returning
    setting_id
    , setting_name
    , description
    , source_sql_body
    , source_sql_hash
    , source_key_definition
    , source_sql_analysis_result
    , search_condition_analysis_result
    , source_sql_analysis_status
    , source_sql_analysis_error
    , is_enabled
    , created_at
    , updated_at
    , note;
`;
export const insertTransferSettingQuery: FeatureQuerySource<InsertTransferSettingQueryParams, InsertTransferSettingQueryResult> = {
  id: 'insert-transfer-setting',
  path: 'src/features/create-transfer-setting/queries/insert-transfer-setting/query.ts',
  sql: insertTransferSettingSql,
};

export interface InsertTransferSettingQueryParams {
  setting_name: string;
  description: string | null;
  source_sql_body: string;
  source_sql_hash: string;
  source_key_definition: unknown;
  source_sql_analysis_result: unknown;
  search_condition_analysis_result: unknown;
  source_sql_analysis_status: string;
  source_sql_analysis_error: string | null;
  is_enabled: boolean;
  note: string | null;
}

export interface InsertTransferSettingQueryResult {
  created_at: string;
  description: string | null;
  is_enabled: boolean;
  note: string | null;
  search_condition_analysis_result: unknown;
  setting_id: string;
  setting_name: string;
  source_key_definition: unknown;
  source_sql_analysis_error: string | null;
  source_sql_analysis_result: unknown;
  source_sql_analysis_status: string;
  source_sql_body: string;
  source_sql_hash: string;
  updated_at: string;
}

export async function executeInsertTransferSettingQuery(
  executor: FeatureQueryExecutor,
  params: InsertTransferSettingQueryParams
): Promise<InsertTransferSettingQueryResult[]> {
  return queryMany(executor, insertTransferSettingQuery, params);
}
