import { createHash } from 'node:crypto';
import { bind, type Sql } from '@mk3008/serene';
import { isDeepStrictEqual } from 'node:util';
import { bindStoredSql } from './trusted-sql.js';
import * as queries from './queries.js';

type Row = Record<string, any>;
export interface TransferExecutionClient {
  query(text: string, values?: unknown[]): Promise<{ rows: Row[]; rowCount?: number | null }>;
}
/** Application-owned configuration, not per-run rows or a second SQL registry. */
export interface TransferExecutionDefinition {
  settingId: string;
  sourceSchema: string;
  sourceTable: string;
  sourceKeyDefinition: { keys: Array<{ column: string; type: string }> };
  resolveLogicalKey(dirtyKey: Readonly<Record<string, unknown>>): Record<string, unknown>;
}
export class TransferExecutionError extends Error {
  constructor(
    message: string,
    readonly runId: string,
  ) {
    super(message);
  }
}

function object(value: unknown): value is Row {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
function keyText(value: unknown): string {
  if (value === null || typeof value === 'string' || typeof value === 'boolean')
    return JSON.stringify(value);
  if (typeof value === 'number' && Number.isFinite(value)) return JSON.stringify(value);
  if (
    typeof value !== 'object' ||
    (!Array.isArray(value) &&
      Object.getPrototypeOf(value) !== Object.prototype &&
      Object.getPrototypeOf(value) !== null)
  ) {
    throw new Error('Keys must contain only JSON-compatible values');
  }
  if (Array.isArray(value)) return '[' + Array.from(value, keyText).join(',') + ']';
  return (
    '{' +
    Object.keys(value)
      .sort()
      .map((k) => JSON.stringify(k) + ':' + keyText((value as Row)[k]))
      .join(',') +
    '}'
  );
}
const hash = (text: string) => createHash('sha256').update(text).digest('hex');
function projection(row: Row, columns: string[]): Row {
  return Object.fromEntries(
    columns.map((column) => {
      if (!Object.hasOwn(row, column) || row[column] === undefined || row[column] === null)
        throw new Error(`Missing key column: ${column}`);
      return [column, row[column]];
    }),
  );
}

/** Owns one transaction on an idle, dedicated PostgreSQL client. */
export async function executeTransfer(
  client: TransferExecutionClient,
  definitions: readonly TransferExecutionDefinition[],
  input: { settingId: string; arguments?: Record<string, unknown> },
): Promise<{ runId: string; inserted: number; skipped: number }> {
  const definitionsForSetting = definitions.filter((d) => d.settingId === input.settingId);
  if (definitionsForSetting.length !== 1)
    throw new Error('Exactly one execution definition is required for the Setting');
  const definition = definitionsForSetting[0];
  const args = input.arguments ?? {};
  if (!object(args) || !definition.sourceSchema || !definition.sourceTable)
    throw new Error('Invalid execution definition or arguments');
  const query = async (statement: Sql, params: Record<string, unknown>) => {
    const prepared = bind(statement, params, 'indexed');
    return (await client.query(prepared.text, prepared.values)).rows;
  };
  let runId: string | undefined;
  await client.query('begin');
  try {
    // The Setting lock serializes runs of this Setting without locking Dirty Key intake.
    const [setting] = await query(queries.settingSql, { id: input.settingId });
    if (!setting?.is_enabled) throw new Error('Setting is missing or disabled');
    if (!isDeepStrictEqual(setting.source_key_definition, definition.sourceKeyDefinition))
      throw new Error('Execution definition does not match Setting source key');
    const keyColumns = definition.sourceKeyDefinition.keys.map((k) => k.column);
    if (!keyColumns.length || new Set(keyColumns).size !== keyColumns.length)
      throw new Error('Invalid source key definition');
    const links = (await query(queries.linksSql, { id: input.settingId })).filter(
      (l) => l.is_enabled,
    );
    if (!links.length) throw new Error('Setting has no enabled Destination Link');
    for (const link of links) {
      if (link.transfer_model !== 'immutable')
        throw new Error('Phase 1 requires enabled immutable destinations');
      if (!link.generated_insert_transfer_sql_body.trim())
        throw new Error('Destination Link has no stored Black Insert SQL');
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
    const pending = await query(queries.pendingSql, {
      setting: input.settingId,
      schema: definition.sourceSchema,
      table: definition.sourceTable,
    });
    // Freeze the explicit logical identity before looking at source current values.
    const work = pending.map((item): Row & { key: string } => {
      const key = definition.resolveLogicalKey(Object.freeze({ ...item.source_key_json }));
      if (!object(key) || !isDeepStrictEqual(Object.keys(key).sort(), [...keyColumns].sort()))
        throw new Error('Logical key does not match Setting');
      projection(key, keyColumns);
      return { ...item, key: keyText(key) };
    });
    [{ run_id: runId }] = await query(queries.runSql, {
      setting: input.settingId,
      args: JSON.stringify(args),
    });
    await client.query('savepoint transfer_work');
    try {
      // Explicit exception: execute the developer-owned DB source, never a mirrored literal.
      const source = work.length
        ? await client.query(...storedArguments(setting.source_sql_body, args))
        : { rows: [] };
      if (!Array.isArray(source.rows)) throw new Error('Source SQL must return one rowset');
      const current = new Map<string, Row>();
      for (const row of source.rows) {
        const key = keyText(projection(row, keyColumns));
        if (current.has(key)) throw new Error('Source SQL returned duplicate logical keys');
        current.set(key, row);
      }
      let inserted = 0;
      let skipped = 0;
      const completed = new Set<string>();
      for (const item of work) {
        const link = links.find((l) => l.destination_link_id === item.destination_link_id)!;
        const row = current.get(item.key);
        if (!row) throw new Error('Source current row is absent; this route is outside Phase 1');
        const context = JSON.stringify([link.destination_link_id, item.key]);
        const duplicate = completed.has(context);
        if (
          !duplicate &&
          (await query(queries.activeSql, { link: link.destination_link_id, key: item.key })).length
        ) {
          throw new Error('Existing Active Black requires a route outside Phase 1');
        }
        const common = {
          run: runId,
          dirty: item.dirty_key_id,
          setting: input.settingId,
          link: link.destination_link_id,
          key: item.key,
          hash: hash(item.key),
        };
        const [{ work_item_id: workId }] = await query(queries.workSql, {
          ...common,
          route: duplicate ? 'skipped' : 'immutable',
          insert: !duplicate,
          skip: duplicate ? 'duplicate_ignore' : null,
        });
        if (!duplicate) {
          const mapped = Object.fromEntries(
            Object.entries(link.mapping_definition.columns).map(([target, source]) => {
              if (!Object.hasOwn(row, source as string) || row[source as string] === undefined)
                throw new Error(`Missing mapping source: ${source}`);
              return [target, row[source as string]];
            }),
          );
          const prepared = bindStoredSql(link.generated_insert_transfer_sql_body, mapped);
          // Every mapped column must actually be bound by the stored insertion statement.
          if (Object.keys(mapped).some((name) => !prepared.names.includes(name)))
            throw new Error('Stored Insert SQL does not consume mapping');
          const result = await client.query(prepared.text, prepared.values);
          if (result.rows?.length !== 1 || result.rowCount !== 1)
            throw new Error('Black Insert must return exactly one destination row');
          const destination = projection(result.rows[0], link.destination_key_columns);
          const expected = Object.fromEntries(
            link.destination_key_mapping.destinationKey.map((k: Row) => [
              k.name,
              row[k.sourceColumn],
            ]),
          );
          if (!isDeepStrictEqual(destination, expected))
            throw new Error('Inserted destination key does not match mapping');
          const destinationText = keyText(destination);
          await query(queries.activeInsertSql, {
            link: common.link,
            key: common.key,
            hash: common.hash,
            destination: destinationText,
          });
          await query(queries.lineageSql, {
            run: common.run,
            setting: common.setting,
            link: common.link,
            work: workId,
            key: common.key,
            hash: common.hash,
            table: link.destination_table_name,
            destination: destinationText,
            destinationHash: hash(destinationText),
          });
          inserted++;
          completed.add(context);
        } else skipped++;
        await query(queries.processingSql, {
          ...common,
          work: workId,
          status: duplicate ? 'skipped' : 'succeeded',
          result: duplicate ? 'duplicate_ignore' : 'black_insert',
        });
      }
      await query(queries.finishSql, { run: runId, status: 'succeeded', error: null });
      await client.query('commit');
      return { runId: runId!, inserted, skipped };
    } catch (error) {
      await client.query('rollback to savepoint transfer_work');
      const message = error instanceof Error ? error.message : String(error);
      await query(queries.finishSql, { run: runId, status: 'failed', error: message });
      await client.query('commit');
      throw new TransferExecutionError(message, runId!);
    }
  } catch (error) {
    if (!(error instanceof TransferExecutionError)) await client.query('rollback');
    throw error;
  }
}
function storedArguments(text: string, params: Record<string, unknown>): [string, unknown[]] {
  const prepared = bindStoredSql(text, params);
  return [prepared.text, prepared.values];
}
