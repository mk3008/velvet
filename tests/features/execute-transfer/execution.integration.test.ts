import { readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { Client } from 'pg';
import { beforeAll, afterAll, beforeEach, describe, expect, test } from 'vitest';
import {
  executeTransfer,
  TransferExecutionError,
  type TransferExecutionDefinition,
} from '../../../src/features/execute-transfer/boundary.js';

const enabled = process.env.ASHIBA_SKIP_DB_BACKED_TESTS !== '1';
describe.skipIf(!enabled)('immutable Black Insert on PostgreSQL', () => {
  let admin: Client;
  let db: Client;
  let databaseCreated = false;
  const database = 'velvet_phase1_' + randomUUID().replaceAll('-', '');
  const definition: TransferExecutionDefinition = {
    settingId: '1',
    sourceSchema: 'public',
    sourceTable: 'phase1_source',
    sourceKeyDefinition: { keys: [{ column: 'logical_id', type: 'text' }] },
    resolveLogicalKey: (key) => ({ logical_id: key.id }),
  };
  const sourceSql =
    'select id as logical_id, id as row_id, amount from public.phase1_source where (:branch::text is null or branch = :branch)';
  const insertSql =
    'insert into public.phase1_destination(row_id, amount) values (:row_id, :amount) returning row_id';
  beforeAll(async () => {
    admin = new Client({ connectionString: process.env.ASHIBA_DB_URL });
    await admin.connect();
    // Infrastructure identifier from our own random hex, never application input.
    await admin.query('create database ' + database);
    databaseCreated = true;
    const url = new URL(process.env.ASHIBA_DB_URL!);
    url.pathname = '/' + database;
    db = new Client({ connectionString: url.toString() });
    await db.connect();
    const root = new URL('../../../db/ddl/', import.meta.url);
    const order = JSON.parse(await readFile(new URL('order.json', root), 'utf8')).order as string[];
    for (const file of order) await db.query(await readFile(new URL(file, root), 'utf8'));
    await db.query(
      'create table public.phase1_source(id text primary key, amount integer not null, branch text)',
    );
    await db.query(
      'create table public.phase1_destination(row_id text primary key, amount integer not null)',
    );
    await db.query(
      'create table public.phase1_other(row_id text primary key, amount integer not null)',
    );
  });
  afterAll(async () => {
    await db?.end();
    if (databaseCreated) await admin.query('drop database ' + database);
    await admin?.end();
  });
  beforeEach(async () => {
    await db.query(
      'truncate rawsql_transfer.setting, rawsql_transfer.destination_definition, rawsql_transfer.dirty_key, public.phase1_source, public.phase1_destination, public.phase1_other restart identity cascade',
    );
    await db.query(`insert into rawsql_transfer.destination_definition(destination_definition_id, destination_definition_name, destination_table_name, destination_columns, destination_key_columns, transfer_model, sign_inversion_columns)
      values (1, 'target', 'public.phase1_destination', '{"columns":[{"name":"row_id","type":"text"},{"name":"amount","type":"integer"}]}', array['row_id'], 'immutable', array['amount'])`);
    await db.query(
      `insert into rawsql_transfer.setting(setting_id, setting_name, source_sql_body, source_sql_hash, source_key_definition, source_sql_analysis_status)
      values (1, 'setting', $1, 'not-an-approval', $2, 'not_analyzed')`,
      [sourceSql, definition.sourceKeyDefinition],
    );
    await db.query(
      `insert into rawsql_transfer.destination_link(destination_link_id, setting_id, destination_definition_id, destination_link_name, execution_order, destination_key_mapping, mapping_definition, generated_insert_transfer_sql_body)
      values (1, 1, 1, 'target', 1, '{"sourceKey":["logical_id"],"destinationKey":[{"name":"row_id","sourceColumn":"row_id"}]}', '{"columns":{"row_id":"row_id","amount":"amount"}}', $1)`,
      [insertSql],
    );
    await db.query("insert into public.phase1_source values ('a', 100, 'north')");
    await db.query(
      "insert into rawsql_transfer.dirty_key(source_schema_name, source_table_name, source_key_json) values ('public','phase1_source','{\"id\":\"a\"}')",
    );
  });
  const run = () =>
    executeTransfer(db, [definition], { settingId: '1', arguments: { branch: 'north' } });
  test('completes a run and records exact source/link/destination lineage; rerun inserts nothing', async () => {
    const first = await run();
    expect(first).toMatchObject({ inserted: 1, skipped: 0 });
    expect((await db.query('select * from public.phase1_destination')).rows).toEqual([
      { row_id: 'a', amount: 100 },
    ]);
    const record = (
      await db.query(`select r.run_arguments, r.run_status, w.source_key_json, w.setting_id, w.destination_link_id,
      w.requires_black_insert_transfer, p.processing_status, p.processing_result, a.destination_key_json,
      l.transfer_operation, l.source_kind, l.destination_table_name
      from rawsql_transfer.run r join rawsql_transfer.work_item w using (run_id)
      join rawsql_transfer.dirty_key_processing p using (work_item_id)
      join rawsql_transfer.lineage l using (work_item_id)
      join rawsql_transfer.active_black a on a.destination_link_id = w.destination_link_id`)
    ).rows[0];
    expect(record).toMatchObject({
      run_arguments: { branch: 'north' },
      run_status: 'succeeded',
      source_key_json: { logical_id: 'a' },
      setting_id: '1',
      destination_link_id: '1',
      requires_black_insert_transfer: true,
      processing_status: 'succeeded',
      processing_result: 'black_insert',
      destination_key_json: { row_id: 'a' },
      transfer_operation: 'black_insert',
      source_kind: 'transfer_source',
      destination_table_name: 'public.phase1_destination',
    });
    expect(await run()).toMatchObject({ inserted: 0, skipped: 0 });
    expect((await db.query('select count(*) from rawsql_transfer.lineage')).rows[0].count).toBe(
      '1',
    );
    expect((await db.query('select count(*) from rawsql_transfer.dirty_key')).rows[0].count).toBe(
      '1',
    );
  });
  test('coalesces repeated dirty keys in one snapshot without duplicate insertion', async () => {
    await db.query(
      "insert into rawsql_transfer.dirty_key(source_schema_name, source_table_name, source_key_json) values ('public','phase1_source','{\"id\":\"a\"}')",
    );
    expect(await run()).toMatchObject({ inserted: 1, skipped: 1 });
    expect(
      (
        await db.query(
          'select processing_result from rawsql_transfer.dirty_key_processing order by dirty_key_id',
        )
      ).rows,
    ).toEqual([{ processing_result: 'black_insert' }, { processing_result: 'duplicate_ignore' }]);
  });
  test('does not accept an unregistered, disabled or mismatching Setting', async () => {
    await expect(executeTransfer(db, [], { settingId: '1' })).rejects.toThrow(/definition/);
    await expect(
      executeTransfer(
        db,
        [{ ...definition, sourceKeyDefinition: { keys: [{ column: 'other', type: 'text' }] } }],
        { settingId: '1' },
      ),
    ).rejects.toThrow(/does not match/);
    await db.query('update rawsql_transfer.setting set is_enabled = false');
    await expect(run()).rejects.toThrow(/disabled/);
    expect((await db.query('select count(*) from rawsql_transfer.run')).rows[0].count).toBe('0');
  });
  test('isolates schema/table, Setting and Destination Link contexts', async () => {
    await db.query(
      "insert into rawsql_transfer.dirty_key(source_schema_name, source_table_name, source_key_json) values ('other','phase1_source','{\"id\":\"a\"}'), ('public','other','{\"id\":\"a\"}')",
    );
    await db.query(
      "insert into rawsql_transfer.destination_definition select 2, 'other', null, 'public.phase1_other', destination_columns, destination_key_columns, null, transfer_model, sign_inversion_columns, null, '', 'not_generated', null, now(), now(), null from rawsql_transfer.destination_definition where destination_definition_id=1",
    );
    await db.query(
      "insert into rawsql_transfer.setting select 2,'other',source_sql_body,source_sql_hash,source_key_definition,null,null,'not_analyzed',null,true,now(),now(),null from rawsql_transfer.setting where setting_id=1",
    );
    await db.query(
      `insert into rawsql_transfer.destination_link(destination_link_id, setting_id, destination_definition_id, destination_link_name, execution_order, destination_key_mapping, mapping_definition, generated_insert_transfer_sql_body)
      select 2,2,2,'other',1,destination_key_mapping,mapping_definition,$1 from rawsql_transfer.destination_link where destination_link_id=1`,
      [
        'insert into public.phase1_other(row_id, amount) values (:row_id, :amount) returning row_id',
      ],
    );
    await run();
    expect((await db.query('select count(*) from public.phase1_other')).rows[0].count).toBe('0');
    expect(
      await executeTransfer(db, [{ ...definition, settingId: '2' }], {
        settingId: '2',
        arguments: { branch: 'north' },
      }),
    ).toMatchObject({ inserted: 1 });
    expect(
      (
        await db.query(
          'select dirty_key_id, setting_id, destination_link_id from rawsql_transfer.work_item order by setting_id',
        )
      ).rows,
    ).toEqual([
      { dirty_key_id: '1', setting_id: '1', destination_link_id: '1' },
      { dirty_key_id: '1', setting_id: '2', destination_link_id: '2' },
    ]);
  });
  test('invalid mapping is rejected before a Run or destination write', async () => {
    await db.query(
      `update rawsql_transfer.destination_link set mapping_definition = '{"columns":{"not_a_column":"amount"}}'`,
    );
    await expect(run()).rejects.toThrow(/mapping/);
    expect((await db.query('select count(*) from rawsql_transfer.run')).rows[0].count).toBe('0');
  });
  test('failure after an earlier insertion rolls back destination and processing but retains failed Run', async () => {
    await db.query(
      "insert into rawsql_transfer.dirty_key(source_schema_name, source_table_name, source_key_json) values ('public','phase1_source','{\"id\":\"missing\"}')",
    );
    await expect(run()).rejects.toBeInstanceOf(TransferExecutionError);
    expect((await db.query('select run_status from rawsql_transfer.run')).rows).toEqual([
      { run_status: 'failed' },
    ]);
    for (const table of [
      'public.phase1_destination',
      'rawsql_transfer.active_black',
      'rawsql_transfer.lineage',
      'rawsql_transfer.work_item',
      'rawsql_transfer.dirty_key_processing',
    ]) {
      expect((await db.query('select count(*) from ' + table)).rows[0].count).toBe('0');
    }
  });
});
