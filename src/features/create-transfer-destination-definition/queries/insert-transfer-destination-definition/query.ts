import { queryMany, type FeatureQuerySource } from '#features/_shared/featureQueryExecutor.js';
import type { FeatureQueryExecutor } from '#features/_shared/featureQueryExecutor.js';
import { sql } from '@mk3008/serene';

export const insertTransferDestinationDefinitionSql = sql`insert into rawsql_transfer.destination_definition(
    destination_definition_name
    , description
    , destination_table_name
    , destination_columns
    , destination_key_columns
    , sequence_expression_definition
    , transfer_model
    , sign_inversion_columns
    , note
)
select
    :destination_definition_name
    , :description
    , :destination_table_name
    , cast(:destination_columns as jsonb)
    , cast(:destination_key_columns as text[])
    , cast(:sequence_expression_definition as jsonb)
    , :transfer_model
    , cast(:sign_inversion_columns as text[])
    , :note
returning
    destination_definition_id
    , destination_definition_name
    , description
    , destination_table_name
    , destination_columns
    , destination_key_columns
    , sequence_expression_definition
    , transfer_model
    , sign_inversion_columns
    , generated_red_transfer_sql_body
    , generated_red_transfer_sql_status
    , generated_red_transfer_sql_error
    , created_at
    , updated_at
    , note;
`;
export const insertTransferDestinationDefinitionQuery: FeatureQuerySource<InsertTransferDestinationDefinitionQueryParams, InsertTransferDestinationDefinitionQueryResult> = {
  id: 'insert-transfer-destination-definition',
  path: 'src/features/create-transfer-destination-definition/queries/insert-transfer-destination-definition/query.ts',
  sql: insertTransferDestinationDefinitionSql,
};

export interface InsertTransferDestinationDefinitionQueryParams {
  destination_definition_name: unknown;
  description: unknown;
  destination_table_name: unknown;
  destination_columns: unknown;
  destination_key_columns: string[];
  sequence_expression_definition: unknown;
  transfer_model: unknown;
  sign_inversion_columns: string[];
  note: unknown;
}

export interface InsertTransferDestinationDefinitionQueryResult {
  created_at: string;
  description: string | null;
  destination_columns: unknown;
  destination_definition_id: string;
  destination_definition_name: string;
  destination_key_columns: string[];
  destination_table_name: string;
  generated_red_transfer_sql_body: string;
  generated_red_transfer_sql_error: string | null;
  generated_red_transfer_sql_status: string;
  note: string | null;
  sequence_expression_definition: unknown;
  sign_inversion_columns: string[] | null;
  transfer_model: string;
  updated_at: string;
}

export async function executeInsertTransferDestinationDefinitionQuery(
  executor: FeatureQueryExecutor,
  params: InsertTransferDestinationDefinitionQueryParams
): Promise<InsertTransferDestinationDefinitionQueryResult[]> {
  return queryMany(executor, insertTransferDestinationDefinitionQuery, params);
}
