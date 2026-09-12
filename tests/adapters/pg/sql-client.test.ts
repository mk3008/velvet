import { sql } from '@mk3008/serene';
import { describe, expect, test } from 'vitest';

import { fromPg } from '../../../src/adapters/pg/sql-client.js';
import type { FeatureQuerySource } from '../../../src/features/_shared/featureQueryExecutor.js';

describe('fromPg', () => {
  test('prepares named parameters before application-owned node-postgres execution', async () => {
    const calls: Array<{ text: string; values?: readonly unknown[] }> = [];
    const client = fromPg({
      async query(text, values) {
        calls.push({ text, values });
        return { rows: [{ destination_definition_id: '1' }] };
      },
    });

    const statement = sql`select * from transfer_destination_definition where destination_definition_name = any(:names) and is_enabled = :enabled`;
    const query: FeatureQuerySource<
      { names: string[]; enabled: boolean },
      { destination_definition_id: string }
    > = {
      id: 'resolve-transfer-destination-definitions',
      path: 'resolve-transfer-destination-definitions.sql',
      sql: statement,
    };

    const rows = await client.query(query, {
      names: ['journal', 'ledger'],
      enabled: true,
    });

    expect(rows).toEqual([{ destination_definition_id: '1' }]);
    expect(calls).toEqual([
      {
        text: 'select * from transfer_destination_definition where destination_definition_name = any($1) and is_enabled = $2',
        values: [['journal', 'ledger'], true],
      },
    ]);
  });
});

test('keeps repeated names, null and SQL-looking values separate from the statement', async () => {
  const calls: Array<{ text: string; values: readonly unknown[] }> = [];
  const executor = fromPg({ async query(text, values) { calls.push({ text, values }); return { rows: [] }; } });
  const query: FeatureQuerySource<{ value: string; optional: null }> = {
    id: 'binding-regression', path: 'tests/adapters/pg/sql-client.test.ts',
    sql: sql`select cast(:value as text), cast(:optional as text), cast(:value as text)`,
  };
  const value = "'); drop table example; --";
  await executor.query(query, { optional: null, value });
  expect(calls).toEqual([{
    text: 'select cast($1 as text), cast($2 as text), cast($1 as text)',
    values: [value, null],
  }]);
});

test('rejects unusable bindings before calling the driver', async () => {
  let calls = 0;
  const executor = fromPg({ async query() { calls++; return { rows: [] }; } });
  const query: FeatureQuerySource<{ value: unknown }> = {
    id: 'binding-rejection', path: 'tests/adapters/pg/sql-client.test.ts', sql: sql`select :value`,
  };
  await expect(executor.query(query, { value: undefined })).rejects.toThrow();
  expect(calls).toBe(0);
});
