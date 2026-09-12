import { queryMany, type FeatureQuerySource } from '#features/_shared/featureQueryExecutor.js';
import type { FeatureQueryExecutor } from '#features/_shared/featureQueryExecutor.js';
import { sql } from '@mk3008/serene';

export const resolveTransferDestinationDefinitionsSql = sql`select
    destination_definition_id
    , destination_definition_name
from
    rawsql_transfer.destination_definition
where
    destination_definition_name = any(cast(:destination_definition_names as text[]))
order by
    destination_definition_name;
`;
export const resolveTransferDestinationDefinitionsQuery: FeatureQuerySource<ResolveTransferDestinationDefinitionsQueryParams, ResolveTransferDestinationDefinitionsQueryResult> = {
  id: 'resolve-transfer-destination-definitions',
  path: 'src/features/create-transfer-setting/queries/resolve-transfer-destination-definitions/query.ts',
  sql: resolveTransferDestinationDefinitionsSql,
};

export interface ResolveTransferDestinationDefinitionsQueryParams {
  destination_definition_names: string[];
}

export interface ResolveTransferDestinationDefinitionsQueryResult {
  destination_definition_id: string;
  destination_definition_name: string;
}

export async function executeResolveTransferDestinationDefinitionsQuery(
  executor: FeatureQueryExecutor,
  params: ResolveTransferDestinationDefinitionsQueryParams
): Promise<ResolveTransferDestinationDefinitionsQueryResult[]> {
  return queryMany(executor, resolveTransferDestinationDefinitionsQuery, params);
}
