import { isDeepStrictEqual } from 'node:util';

type Row = Record<string, any>;

function object(value: unknown): value is Row {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/** Checks already loaded mapping values; the caller owns locks and pre-Run timing. */
export function assertDestinationLinkMapping(link: Row, keyColumns: string[]): void {
  const mapping = link.mapping_definition?.columns;
  const allowed = link.destination_columns?.columns?.map((c: Row) => c.name);
  const keys = link.destination_key_mapping;
  if (
    !object(mapping) ||
    !Object.keys(mapping).length ||
    !Array.isArray(allowed) ||
    Object.entries(mapping).some(
      ([target, source]) => !allowed.includes(target) || typeof source !== 'string' || !source,
    ) ||
    !isDeepStrictEqual(keys?.sourceKey, keyColumns) ||
    !Array.isArray(keys?.destinationKey) ||
    !keys.destinationKey.length ||
    !isDeepStrictEqual(
      keys.destinationKey.map((k: Row) => k.name).sort(),
      [...link.destination_key_columns].sort(),
    ) ||
    keys.destinationKey.some((k: Row) => mapping[k.name] !== k.sourceColumn)
  )
    throw new Error('Invalid Destination Link mapping');
}
