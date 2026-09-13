import { readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { Client } from 'pg';
import { afterAll, beforeAll, beforeEach, describe, expect, test } from 'vitest';
import {
  executeTransfer as executeTransferImpl,
  TransferExecutionError,
  type TransferExecutionClient,
  type TransferExecutionDefinition,
} from '../../../src/features/execute-transfer/boundary.js';

const enabled = process.env.ASHIBA_SKIP_DB_BACKED_TESTS !== '1';
describe.skipIf(!enabled).each(['row', 'routine'] as const)(
  'insert-only transfer on PostgreSQL (%s)',
  (metadataMode) => {
    const executeTransfer: typeof executeTransferImpl = (client, definitions, input) =>
      executeTransferImpl(client, definitions, { ...input, metadataMode });
    let admin: Client;
    let db: Client;
    let created = false;
    const database = 'velvet_phase5_' + randomUUID().replaceAll('-', '');
    const definition: TransferExecutionDefinition = {
      settingId: '1',
      sourceSchema: 'public',
      sourceTable: 'customer_source',
      sourceKeyDefinition: {
        keys: [
          { column: 'source_system', type: 'text' },
          { column: 'external_id', type: 'text' },
        ],
      },
      resolveLogicalKey: (key) => ({
        source_system: key.system,
        external_id: key.id,
      }),
    };
    // Use the same existing first-transfer convention as other Destinations: source SQL exposes
    // the destination key value and ordinary mapping/Insert SQL consumes it.
    const sourceSql = `select
      nextval('public.accounting_customer_id_seq')::bigint as accounting_id,
      source_system, external_id, label, amount
    from public.customer_source
    where visible
    order by source_system desc, external_id`;
    const insertSql = `insert into public.customer_map(accounting_id, source_system, external_id, label)
    values (:accounting_id, :source_system, :external_id, :label) returning accounting_id`;
    const run = (client: TransferExecutionClient = db) =>
      executeTransfer(client, [definition], { settingId: '1' });
    const dirty = (system = 'consumer', id = 'C-001') =>
      db.query(
        `insert into rawsql_transfer.dirty_key(source_schema_name, source_table_name, source_key_json)
       values ('public', 'customer_source', jsonb_build_object('system', $1::text, 'id', $2::text))`,
        [system, id],
      );
    const mappings = async () =>
      (
        await db.query(
          `select accounting_id, source_system, external_id, label
         from public.customer_map order by accounting_id`,
        )
      ).rows;
    const active = async () =>
      (await db.query('select * from rawsql_transfer.active_black order by active_black_id')).rows;
    const processing = async (runId: string) =>
      (
        await db.query(
          `select processing_status, processing_result
         from rawsql_transfer.dirty_key_processing where run_id = $1 order by dirty_key_id`,
          [runId],
        )
      ).rows;

    beforeAll(async () => {
      admin = new Client({ connectionString: process.env.ASHIBA_DB_URL });
      await admin.connect();
      await admin.query('create database ' + database);
      created = true;
      const url = new URL(process.env.ASHIBA_DB_URL!);
      url.pathname = '/' + database;
      db = new Client({ connectionString: url.toString() });
      await db.connect();
      const root = new URL('../../../db/ddl/', import.meta.url);
      const order = JSON.parse(await readFile(new URL('order.json', root), 'utf8')).order;
      for (const file of order) await db.query(await readFile(new URL(file, root), 'utf8'));
      await db.query(
        await readFile(
          new URL('../../../db/runtime/execute-transfer-metadata.sql', import.meta.url),
          'utf8',
        ),
      );
      await db.query(`
      create sequence public.accounting_customer_id_seq;
      create table public.customer_source(
        source_system text not null,
        external_id text not null,
        label text,
        amount numeric,
        visible boolean not null default true,
        primary key(source_system, external_id)
      );
      create table public.customer_map(
        accounting_id bigint primary key,
        source_system text not null,
        external_id text not null,
        label text,
        unique(source_system, external_id)
      );
    `);
    });

    afterAll(async () => {
      await db?.end();
      if (created) await admin.query('drop database ' + database);
      await admin?.end();
    });

    beforeEach(async () => {
      await db.query(`
      truncate rawsql_transfer.setting, rawsql_transfer.destination_definition,
        rawsql_transfer.dirty_key, public.customer_source, public.customer_map restart identity cascade;
      alter sequence public.accounting_customer_id_seq restart with 1;
      insert into rawsql_transfer.destination_definition(
        destination_definition_id, destination_definition_name, destination_table_name,
        destination_columns, destination_key_columns, sequence_expression_definition, transfer_model)
      values (
        1, 'customer-map', 'public.customer_map',
        '{"columns":[{"name":"accounting_id","type":"bigint"},{"name":"source_system","type":"text"},{"name":"external_id","type":"text"},{"name":"label","type":"text"}]}',
        array['accounting_id'], '{"accounting_id":"nextval(''public.accounting_customer_id_seq'')"}', 'insert_only'
      );
    `);
      await db.query(
        `insert into rawsql_transfer.setting(
        setting_id, setting_name, source_sql_body, source_sql_hash,
        source_key_definition, source_sql_analysis_status)
       values (1, 'customers', $1, 'trusted', $2, 'not_analyzed')`,
        [sourceSql, definition.sourceKeyDefinition],
      );
      await db.query(
        `insert into rawsql_transfer.destination_link(
        destination_link_id, setting_id, destination_definition_id, destination_link_name,
        execution_order, destination_key_mapping, mapping_definition,
        generated_insert_transfer_sql_body)
       values (1, 1, 1, 'customer-map', 1,
        '{"sourceKey":["source_system","external_id"],"destinationKey":[{"name":"accounting_id","sourceColumn":"accounting_id"}]}',
        '{"columns":{"accounting_id":"accounting_id","source_system":"source_system","external_id":"external_id","label":"label"}}', $1)`,
        [insertSql],
      );
      await db.query(
        `insert into public.customer_source(source_system, external_id, label, amount)
       values ('consumer', 'C-001', 'first', 10)`,
      );
      await dirty();
    });

    test('first materialization uses ordinary Black Insert, Active Black and Lineage', async () => {
      const first = await run();
      expect(first).toMatchObject({ inserted: 1, skipped: 0 });
      expect(await mappings()).toEqual([
        { accounting_id: '1', source_system: 'consumer', external_id: 'C-001', label: 'first' },
      ]);
      const initialActive = await active();
      expect(initialActive).toHaveLength(1);
      expect(initialActive[0].source_key_json).toEqual({
        source_system: 'consumer',
        external_id: 'C-001',
      });
      expect(initialActive[0].destination_key_json).toEqual({ accounting_id: '1' });
      const lineage = (await db.query('select * from rawsql_transfer.lineage')).rows;
      expect(lineage).toHaveLength(1);
      expect(lineage[0].destination_key_json).toEqual({ accounting_id: '1' });
      expect(await processing(first.runId)).toEqual([
        { processing_status: 'succeeded', processing_result: 'black_insert' },
      ]);
    });

    test('repeat/change/disappearance short-circuit to no-op without replacing the first row', async () => {
      await run();
      const initialActive = await active();

      await dirty();
      const repeated = await run();
      expect(repeated).toMatchObject({ inserted: 0, skipped: 1 });
      expect(await processing(repeated.runId)).toEqual([
        { processing_status: 'skipped', processing_result: 'no_op' },
      ]);

      await db.query("update public.customer_source set label = 'changed', amount = 99");
      await dirty();
      const changed = await run();
      expect(changed).toMatchObject({ inserted: 0, skipped: 1 });
      expect(await processing(changed.runId)).toEqual([
        { processing_status: 'skipped', processing_result: 'no_op' },
      ]);
      expect(await mappings()).toEqual([
        { accounting_id: '1', source_system: 'consumer', external_id: 'C-001', label: 'first' },
      ]);
      expect(await active()).toEqual(initialActive);

      await db.query('delete from public.customer_source');
      await dirty();
      const absent = await run();
      expect(absent).toMatchObject({ inserted: 0, skipped: 1 });
      expect(await processing(absent.runId)).toEqual([
        { processing_status: 'skipped', processing_result: 'no_op' },
      ]);
      expect(await mappings()).toHaveLength(1);
      expect(await active()).toEqual(initialActive);
      expect(
        (await db.query('select count(*)::int n from rawsql_transfer.lineage')).rows[0].n,
      ).toBe(1);
    });

    test('absent before materialization is no-op and later appearance needs a new Dirty Key', async () => {
      await db.query('delete from public.customer_source');
      const absent = await run();
      expect(absent).toMatchObject({ inserted: 0, skipped: 1 });
      expect(await mappings()).toEqual([]);
      expect(await active()).toEqual([]);

      await db.query(
        `insert into public.customer_source(source_system, external_id, label)
       values ('consumer', 'C-001', 'appeared')`,
      );
      expect(await run()).toMatchObject({ inserted: 0, skipped: 0 });
      await dirty();
      expect(await run()).toMatchObject({ inserted: 1, skipped: 0 });
      expect(await mappings()).toEqual([
        { accounting_id: '1', source_system: 'consumer', external_id: 'C-001', label: 'appeared' },
      ]);
    });

    test('coalesces repeated Dirty Keys and keeps composite source identities distinct', async () => {
      await dirty();
      await db.query(
        `insert into public.customer_source(source_system, external_id, label)
       values ('corporate', 'C-001', 'corporate')`,
      );
      await dirty('corporate', 'C-001');
      const result = await run();
      expect(result).toMatchObject({ inserted: 2, skipped: 1 });
      expect(await mappings()).toEqual([
        {
          accounting_id: '1',
          source_system: 'corporate',
          external_id: 'C-001',
          label: 'corporate',
        },
        { accounting_id: '2', source_system: 'consumer', external_id: 'C-001', label: 'first' },
      ]);
      expect((await processing(result.runId)).map((row) => row.processing_result)).toEqual([
        'black_insert',
        'duplicate_ignore',
        'black_insert',
      ]);
    });

    test('failure during ordinary first-transfer work rolls back materialization and records failed Run', async () => {
      const cause = new Error('processing unavailable');
      const client: TransferExecutionClient = {
        async query(text, values) {
          if (
            text.startsWith('insert into rawsql_transfer.dirty_key_processing') ||
            text.startsWith('select rawsql_transfer.record_black')
          )
            throw cause;
          return db.query(text, values);
        },
      };
      const error = await run(client).catch((value) => value);
      expect(error).toBeInstanceOf(TransferExecutionError);
      expect(error.cause).toBe(cause);
      expect(await mappings()).toEqual([]);
      expect(await active()).toEqual([]);
      expect((await db.query('select * from rawsql_transfer.lineage')).rows).toEqual([]);
      expect(
        (
          await db.query('select run_status from rawsql_transfer.run where run_id = $1', [
            error.runId,
          ])
        ).rows[0].run_status,
      ).toBe('failed');
    });

    test('insert-only can execute with immutable and mutable links in the same Run', async () => {
      await db.query(`
      create table if not exists public.mutable_target(
        source_system text, external_id text, amount numeric,
        primary key(source_system, external_id)
      );
      create table if not exists public.immutable_target(
        source_system text, external_id text, amount numeric,
        primary key(source_system, external_id)
      );
      truncate public.mutable_target, public.immutable_target;
      insert into rawsql_transfer.destination_definition(
        destination_definition_id, destination_definition_name, destination_table_name,
        destination_columns, destination_key_columns, transfer_model, sign_inversion_columns)
      values
        (2, 'mutable-target', 'public.mutable_target',
         '{"columns":[{"name":"source_system","type":"text"},{"name":"external_id","type":"text"},{"name":"amount","type":"numeric"}]}',
         array['source_system','external_id'], 'mutable', null),
        (3, 'immutable-target', 'public.immutable_target',
         '{"columns":[{"name":"source_system","type":"text"},{"name":"external_id","type":"text"},{"name":"amount","type":"numeric"}]}',
         array['source_system','external_id'], 'immutable', array['amount']);
    `);
      const oldModelMapping =
        '{"sourceKey":["source_system","external_id"],"destinationKey":[{"name":"source_system","sourceColumn":"source_system"},{"name":"external_id","sourceColumn":"external_id"}]}';
      const valueMapping =
        '{"columns":{"source_system":"source_system","external_id":"external_id","amount":"amount"}}';
      await db.query(
        `insert into rawsql_transfer.destination_link(
        destination_link_id, setting_id, destination_definition_id, destination_link_name,
        execution_order, destination_key_mapping, mapping_definition, generated_insert_transfer_sql_body)
       values
        (2,1,2,'mutable-target',2,$1,$2,
         'insert into public.mutable_target(source_system,external_id,amount) values (:source_system,:external_id,:amount) returning source_system,external_id'),
        (3,1,3,'immutable-target',3,$1,$2,
         'insert into public.immutable_target(source_system,external_id,amount) values (:source_system,:external_id,:amount) returning source_system,external_id')`,
        [oldModelMapping, valueMapping],
      );
      const result = await run();
      expect(result).toMatchObject({ inserted: 3, skipped: 0 });
      expect((await db.query('select count(*)::int n from public.customer_map')).rows[0].n).toBe(1);
      expect((await db.query('select count(*)::int n from public.mutable_target')).rows[0].n).toBe(
        1,
      );
      expect(
        (await db.query('select count(*)::int n from public.immutable_target')).rows[0].n,
      ).toBe(1);
      expect(
        (await db.query('select count(*)::int n from rawsql_transfer.lineage')).rows[0].n,
      ).toBe(2);
    });

    test('Phase 5 upgrade widens only the transfer-model route constraints', async () => {
      await db.query(`
      truncate rawsql_transfer.setting, rawsql_transfer.destination_definition,
        rawsql_transfer.dirty_key restart identity cascade;
      alter table rawsql_transfer.destination_definition drop constraint chk_transfer_destination_transfer_model;
      alter table rawsql_transfer.destination_definition add constraint chk_transfer_destination_transfer_model
        check (transfer_model in ('immutable','mutable'));
      alter table rawsql_transfer.work_item drop constraint chk_work_item_transfer_model;
      alter table rawsql_transfer.work_item add constraint chk_work_item_transfer_model
        check (transfer_model in ('immutable','mutable'));
      alter table rawsql_transfer.work_item drop constraint chk_work_item_route_type;
      alter table rawsql_transfer.work_item add constraint chk_work_item_route_type
        check (route_type in ('immutable','mutable','skipped'));
    `);
      const upgrade = await readFile(
        new URL('../../../db/upgrades/phase5-insert-only.sql', import.meta.url),
        'utf8',
      );
      await db.query(upgrade);
      const defs = (
        await db.query(
          `select conname, pg_get_constraintdef(oid) definition
         from pg_constraint
         where conname in ('chk_transfer_destination_transfer_model','chk_work_item_transfer_model','chk_work_item_route_type')
         order by conname`,
        )
      ).rows;
      expect(defs).toHaveLength(3);
      expect(defs.every((row) => row.definition.includes('insert_only'))).toBe(true);
    });
  },
);
