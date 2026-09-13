import { z } from 'zod';
import { sql } from '@mk3008/serene';
import type { QuerySource } from '#features/_shared/query-executor.js';

import type { QueryExecutor } from '#features/_shared/query-executor.js';

const QueryParamsSchema = z.object({
  destination_definition_names: z.array(z.string().min(1)).min(1)
}).strict();

export type ResolveTransferDestinationDefinitionsQueryParams = z.infer<typeof QueryParamsSchema>;

const RowSchema = z.object({
  destination_definition_id: z.coerce.string(),
  destination_definition_name: z.string()
}).strict();

const QueryResultSchema = z.object({
  items: z.array(RowSchema)
}).strict();

export type ResolveTransferDestinationDefinitionsQueryResult = z.infer<typeof QueryResultSchema>;
export type ResolveTransferDestinationDefinitionsRow = z.infer<typeof RowSchema>;

function parseQueryParams(raw: unknown): ResolveTransferDestinationDefinitionsQueryParams {
  return QueryParamsSchema.parse(raw);
}

export async function executeResolveTransferDestinationDefinitionsQuerySpec(
  executor: QueryExecutor,
  rawParams: unknown
): Promise<ResolveTransferDestinationDefinitionsQueryResult> {
  const params = parseQueryParams(rawParams);
  const rows = await executor.query(resolveTransferDestinationDefinitionsQuery, params);
  return mapResolveTransferDestinationDefinitionsRowsToResult(rows);
}

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
export const resolveTransferDestinationDefinitionsQuery: QuerySource<ResolveTransferDestinationDefinitionsQueryParams, ResolveTransferDestinationDefinitionsRow> = {
  id: 'resolve-transfer-destination-definitions',
  path: 'src/features/create-transfer-setting/queries/resolve-transfer-destination-definitions.ts',
  sql: resolveTransferDestinationDefinitionsSql,
};


function mapResolveTransferDestinationDefinitionsRowsToResult(rows: ResolveTransferDestinationDefinitionsRow[]): ResolveTransferDestinationDefinitionsQueryResult {
  const items = new Array<ResolveTransferDestinationDefinitionsQueryResult['items'][number]>(rows.length);
  for (let index = 0; index < rows.length; index += 1) {
    const row = rows[index];
    items[index] = {
      "destination_definition_id": row["destination_definition_id"],
      "destination_definition_name": row["destination_definition_name"],
    };
  }
  return { items };
}
