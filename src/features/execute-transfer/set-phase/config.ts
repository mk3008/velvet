import { createHash } from 'node:crypto';
import { z } from 'zod';
import { bindStoredSql } from '../trusted-sql.js';

const statement = z.object({ text: z.string().min(1), sha256: z.string().regex(/^[a-f0-9]{64}$/) }).strict();
const common = { version: z.literal(1), revision: z.string().trim().min(1) };
const settingSchema = z.object({ ...common, independentKeys: z.literal(true),
  maxDirtyKeys: z.number().int().positive().max(2147483647),
  sourceSchema: z.string().min(1), sourceTable: z.string().min(1),
  sourceSqlSha256: statement.shape.sha256, sourceIdentity: statement, dirtyIdentity: statement,
}).strict();
const linkSchema = z.object({ ...common, evaluate: statement, black: statement }).strict();
const destinationSchema = z.object({ ...common, redProjection: statement, red: statement, verify: statement }).strict();
type Master = Record<string, any>;
export type ReviewedStatement = z.infer<typeof statement>;
const reviewed = new WeakSet<object>();
const digest = (text: string) => createHash('sha256').update(text).digest('hex');

function accept(sql: ReviewedStatement): ReviewedStatement {
  if (digest(sql.text) !== sql.sha256) throw new Error('Set-phase stored SQL hash mismatch');
  // Deliberately narrow authoring subset, not a SQL parser or read-only proof.
  if (sql.text.includes(';')) throw new Error('Set-phase statements must not contain semicolons');
  Object.freeze(sql); reviewed.add(sql); return sql;
}
function columns(value: unknown): string[] {
  if (!Array.isArray(value) || !value.length || value.some(c => typeof c !== 'string' || !/^[A-Za-z_][A-Za-z_0-9]*$/.test(c)) || new Set(value).size !== value.length)
    throw new Error('Set-phase key/column names must be distinct ASCII identifiers');
  return value;
}

/** Only called on locked database master rows, never on invocation arguments. */
export function loadSetPhase(setting: Master, links: Master[]) {
  const profile = settingSchema.parse(setting.set_phase_definition);
  const sourceKeys = columns(setting.source_key_definition?.keys?.map((k: Master) => k.column));
  if (setting.source_key_definition.keys.some((k: Master) => k.type !== 'text'))
    throw new Error('Set-phase v1 requires canonical text source keys');
  const source = accept({ text: setting.source_sql_body, sha256: profile.sourceSqlSha256 });
  accept(profile.sourceIdentity); accept(profile.dirtyIdentity);
  const configured = links.map(link => {
    if (link.transfer_model !== 'immutable' || link.date_lower_bound_adjustments !== null)
      throw new Error('Set-phase v1 supports immutable destinations without date hooks only');
    const config = linkSchema.parse(link.set_phase_definition);
    const destination = destinationSchema.parse(link.destination_set_phase_definition);
    const allowed = columns(link.destination_columns?.columns?.map((c: Master) => c.name));
    const keys = columns(link.destination_key_columns);
    if (keys.some(k => !allowed.includes(k) || link.destination_columns.columns.find((c: Master) => c.name === k)?.type !== 'text'))
      throw new Error('Set-phase v1 requires canonical text destination keys');
    const excluded = link.diff_compare_excluded_columns === null ? [] : link.diff_compare_excluded_columns?.columns;
    if (!Array.isArray(excluded) || excluded.some((c: unknown) => typeof c !== 'string' || !allowed.includes(c)))
      throw new Error('Invalid set-phase comparison exclusions');
    accept(config.evaluate); accept(config.black); accept(destination.redProjection);
    accept(destination.red); accept(destination.verify);
    return { link, config, destination, allowed, keys, excluded };
  });
  // Durable evidence includes the precise master configuration, not an approval assertion.
  const evidence = { engine: 'immutable-set-v1', setting, links };
  return { profile, sourceKeys, source, configured, evidence };
}
export type SetPhase = ReturnType<typeof loadSetPhase>;

/** Explicit trusted-master exception; never manufactures Serene source identity. */
export function bindReviewed(sql: ReviewedStatement, values: Record<string, unknown>) {
  if (!reviewed.has(sql)) throw new Error('Expected validated database-master SQL');
  return bindStoredSql(sql.text, values);
}

// Finite outer forms. Only complete developer-owned statements enter these slots.
// pg_temp is the fixed current-session alias, never a caller-supplied schema/name.
const wrappers = {
  source: 'CREATE TEMPORARY TABLE pg_temp.velvet_source_snapshot ON COMMIT DROP AS\n',
  sourceRows: 'CREATE TEMPORARY TABLE pg_temp.velvet_source_rows ON COMMIT DROP AS\n',
  dirtyKeys: 'CREATE TEMPORARY TABLE pg_temp.velvet_dirty_identities ON COMMIT DROP AS\n',
  evaluation: 'CREATE TEMPORARY TABLE pg_temp.velvet_link_evaluation ON COMMIT DROP AS\n',
  redKeys: 'CREATE TEMPORARY TABLE pg_temp.velvet_red_projection ON COMMIT DROP AS\n',
  receipts: 'CREATE TEMPORARY TABLE pg_temp.velvet_write_receipts ON COMMIT DROP AS\n',
} as const;
export function materializeReviewed(slot: keyof typeof wrappers, sql: ReviewedStatement, values: Record<string, unknown>) {
  if (!Object.hasOwn(wrappers, slot)) throw new Error('Unknown fixed TEMP slot');
  const bound = bindReviewed(sql, values);
  return { text: wrappers[slot] + bound.text + '\n', values: bound.values };
}
