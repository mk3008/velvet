import { readFile } from 'node:fs/promises';
import { Client } from 'pg';
import { sql } from '@mk3008/serene';
import { expect, test } from 'vitest';
import { fromPg } from '../../../src/adapters/pg/sql-client.js';
import { executeCreateTransferDestinationDefinitionEntrySpec } from '../../../src/features/create-transfer-destination-definition/boundary.js';
import { execute } from '../../../src/features/create-transfer-setting/boundary.js';

// Canonical DDL and rows are rolled back together in an isolated test database.
test.skipIf(process.env.ASHIBA_SKIP_DB_BACKED_TESTS === '1')(
  'registers a destination and setting through all four Serene queries on PostgreSQL',
  async () => {
    const client = new Client({ connectionString: process.env.ASHIBA_DB_URL });
    await client.connect();
    try {
      await client.query('begin');
      const ddlRoot = new URL('../../../db/ddl/', import.meta.url);
      for (const name of ['schema.sql', 'destination_definition.sql', 'setting.sql', 'destination_link.sql']) {
        await client.query(await readFile(new URL(name, ddlRoot), 'utf8'));
      }
      const executor = fromPg(client);
      executor.transaction = async (operation) => {
        await client.query('savepoint feature_work');
        try {
          const result = await operation(executor);
          await client.query('release savepoint feature_work');
          return result;
        } catch (error) {
          await client.query('rollback to savepoint feature_work');
          throw error;
        }
      };
      const destination = await executeCreateTransferDestinationDefinitionEntrySpec(executor, {
        name: 'journal', destinationTableName: 'public.journal',
        destinationColumns: { columns: [{ name: 'journal_id', type: 'bigint' }, { name: 'amount', type: 'numeric' }] },
        destinationKeyColumns: ['journal_id'], transferModel: 'immutable', signInversionColumns: ['amount'],
      });
      expect(destination.destinationKeyColumns).toEqual(['journal_id']);
      expect(destination.signInversionColumns).toEqual(['amount']);
      expect(destination.description).toBeNull();
      expect(destination.generatedRedTransferSqlStatus).toBe('not_generated');
      const sourceSqlBody = "select ':unused', 'quote''s', 1 as journal_id; -- stored as data";
      const input = {
        name: 'sales_transfer', sourceSqlBody,
        sourceKeyDefinition: { keys: [{ column: 'journal_id', type: 'bigint' }] },
        destinations: [{
          destinationDefinitionName: 'journal', executionOrder: 1,
          destinationKeyMapping: { sourceKey: ['journal_id'], destinationKey: [{ name: 'journal_id', sourceColumn: 'journal_id' }] },
          mappingDefinition: { columns: { journal_id: 'journal_id', amount: 'amount' } },
        }],
      };
      const result = await execute(executor, input);
      expect(result.transferSetting.sourceSqlBody).toBe(sourceSqlBody);
      expect(result.transferSetting.sourceKeyDefinition).toEqual(input.sourceKeyDefinition);
      expect(result.transferSetting.sourceSqlAnalysisResult).toBeNull();
      expect(result.transferSetting.sourceSqlAnalysisStatus).toBe('not_analyzed');
      expect(result.destinations[0]?.transferDestinationDefinitionId).toBe(destination.transferDestinationDefinitionId);
      expect(result.destinations[0]?.destinationKeyMapping).toEqual(input.destinations[0]?.destinationKeyMapping);
      expect(result.destinations[0]?.generatedSqlStatus).toBe('not_generated');
      expect(result.destinations[0]?.diffCompareExcludedColumns).toBeNull();
      // Exercise the DDL directly: application validation must not mask CHECK behavior.
      const updateDefinition = {
        id: 'verify-source-key-definition', path: 'tests/adapters/pg/features.integration.test.ts',
        sql: sql`update rawsql_transfer.setting
          set source_key_definition = cast(:definition as jsonb)
          where setting_id = :id returning source_key_definition`,
      };
      for (const invalid of [{}, [], ['key'], 'key', 1, true, null]) {
        await client.query('savepoint invalid_definition');
        await expect(executor.query(updateDefinition, {
          definition: JSON.stringify(invalid), id: result.transferSetting.transferSettingId,
        })).rejects.toMatchObject({
          code: '23514', constraint: 'chk_setting_source_key_definition_object',
        });
        await client.query('rollback to savepoint invalid_definition');
        await client.query('release savepoint invalid_definition');
      }
      const accepted = await executor.query(updateDefinition, {
        definition: JSON.stringify({ key: null }), id: result.transferSetting.transferSettingId,
      });
      expect(accepted).toEqual([{ source_key_definition: { key: null } }]);
      await expect(execute(executor, input)).rejects.toThrow();
      await expect(execute(executor, {
        ...input, name: 'unknown_destination',
        destinations: [{ ...input.destinations[0]!, destinationDefinitionName: 'missing' }],
      })).rejects.toThrow(/Unknown transfer destination definitions/);
    } finally {
      await client.query('rollback');
      await client.end();
    }
  },
);
