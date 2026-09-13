import { bind, type Sql } from '@mk3008/serene';
import type { TransferExecutionClient } from '../boundary.js';
import { bindReviewed, materializeReviewed, type SetPhase, type ReviewedStatement } from './config.js';
import * as q from './queries.js';

function requireCount(actual: number | null | undefined, expected: number | null | undefined, context: string) {
  if (typeof actual !== 'number' || actual !== expected) throw new Error(`${context} cardinality mismatch`);
}

/** Called only inside the existing locked atomic work transaction. No row data leaves PostgreSQL. */
export async function executeSetPhase(
  client: TransferExecutionClient, config: SetPhase, run: string, setting: string,
  arguments_: Record<string, unknown>, maximum?: number,
) {
  let stage = 'admission';
  const query = (statement: Sql, params: Record<string, unknown> = {}) => {
    const b = bind(statement, params, 'indexed'); return client.query(b.text, b.values);
  };
  const materialize = (slot: Parameters<typeof materializeReviewed>[0], statement: ReviewedStatement, values: Record<string, unknown>) => {
    const b = materializeReviewed(slot, statement, values); return client.query(b.text, b.values);
  };
  const check = async (statement: Sql, params: Record<string, unknown> = {}) => {
    const result = await query(statement, params);
    if (result.rows[0]?.valid !== true) throw new Error('Invalid set-phase relation contract');
  };
  if (Object.keys(arguments_).some(k => k.startsWith('velvet_'))) throw new Error('Reserved set-phase argument name');
  const args = { ...arguments_, velvet_run_id: run, velvet_setting_id: setting };
  try {
    const admitted = await query(q.admit, { setting, schema: config.profile.sourceSchema,
      table: config.profile.sourceTable, maximum: Math.min(maximum ?? config.profile.maxDirtyKeys, config.profile.maxDirtyKeys) });
    if (admitted.rowCount === 0) return { inserted: 0, skipped: 0 };
    await query(q.pending, { setting });
    stage = 'complete source and identity';
    const source = await materialize('source', config.source, args);
    await materialize('sourceRows', config.profile.sourceIdentity, args);
    await query(q.sourceConstraint);
    await materialize('dirtyKeys', config.profile.dirtyIdentity, args);
    await query(q.dirtyConstraint);
    await check(q.identityCheck, { sourceRows: source.rowCount, keys: [...config.sourceKeys].sort() });
    await query(q.sourceAnalyze);
    let inserted = 0, skipped = 0;
    for (const c of config.configured) {
      const link = c.link.destination_link_id;
      const values = { ...args, velvet_link_id: link };
      stage = `Link ${link} evaluation`;
      await query(q.input, { link, mapping: JSON.stringify(c.link.mapping_definition.columns),
        keyMapping: JSON.stringify(c.link.destination_key_mapping.destinationKey) });
      await check(q.inputCheck, { mappedColumns: Object.values(c.link.mapping_definition.columns), keys: [...c.keys].sort() });
      await materialize('evaluation', c.config.evaluate, values);
      await query(q.evaluationConstraint);
      await check(q.evaluationCheck, { columns: c.allowed });
      const decisions = await query(q.decision, { excluded: c.excluded });
      stage = `Link ${link} Red key allocation`;
      await materialize('redKeys', c.destination.redProjection, values);
      await query(q.redConstraint);
      await check(q.redCheck, { keys: [...c.keys].sort(), columns: c.allowed });
      await query(q.attachRed);
      await check(q.collisionCheck);
      requireCount((await query(q.work, { run, setting, link })).rowCount, decisions.rowCount, 'Work');
      for (const operation of ['red_insert', 'black_insert'] as const) {
        stage = `Link ${link} ${operation}`;
        const targets = await query(q.writes, { run, link, operation });
        await query(q.writesConstraint);
        const sql = bindReviewed(operation === 'red_insert' ? c.destination.red : c.config.black, values);
        const result = await client.query(sql.text, sql.values);
        if (result.command !== 'INSERT' || !Array.isArray(result.rows) || result.rows.length !== 0)
          throw new Error('Set-phase write must be one INSERT without RETURNING');
        requireCount(result.rowCount, targets.rowCount, operation);
        await materialize('receipts', c.destination.verify, values);
        await query(q.receiptsConstraint);
        await check(q.receiptsCheck);
        if (operation === 'red_insert') {
          await query(q.release, { link });
          requireCount((await query(q.retire, { link })).rowCount, targets.rowCount, 'Active retirement');
        } else {
          requireCount((await query(q.active, { link })).rowCount, targets.rowCount, 'Active insertion');
        }
        requireCount((await query(q.lineage, { run, setting, link, table: c.link.destination_table_name })).rowCount, targets.rowCount, 'Lineage');
        await query(q.dropWrites);
      }
      requireCount((await query(q.processing, { run, setting, link })).rowCount, decisions.rowCount, 'Processing');
      const [counts] = (await query(q.counts)).rows;
      inserted += counts.inserted; skipped += counts.skipped;
      await query(q.dropLink);
    }
    return { inserted, skipped };
  } catch (error) {
    throw new Error(`Set-phase ${stage}: ${error instanceof Error ? error.message : String(error)}`, { cause: error });
  }
}
