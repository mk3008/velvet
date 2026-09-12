import { readFile } from 'node:fs/promises';
import { Client } from 'pg';
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
