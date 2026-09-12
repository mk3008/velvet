import type { ResolveTransferDestinationDefinitionsQueryResult, ResolveTransferDestinationDefinitionsRow } from './boundary.js';

export function mapResolveTransferDestinationDefinitionsRowsToResult(rows: ResolveTransferDestinationDefinitionsRow[]): ResolveTransferDestinationDefinitionsQueryResult {
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
