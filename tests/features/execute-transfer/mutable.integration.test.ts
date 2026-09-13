import { readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { Client } from 'pg';
import { beforeAll, afterAll, beforeEach, describe, expect, test } from 'vitest';
import {
  executeTransfer as executeTransferImpl,
  TransferExecutionError,
  type TransferExecutionClient,
  type TransferExecutionDefinition,
} from '../../../src/features/execute-transfer/boundary.js';

const enabled = process.env.ASHIBA_SKIP_DB_BACKED_TESTS !== '1';
describe.skipIf(!enabled).each(['row', 'routine'] as const)(
  'mutable snapshot lifecycle on PostgreSQL (%s)',
  (metadataMode) => {
    const executeTransfer: typeof executeTransferImpl = (client, definitions, input) =>
      executeTransferImpl(client, definitions, { ...input, metadataMode });
    let admin: Client;
    let db: Client;
    let created = false;
    const database = 'velvet_phase4_' + randomUUID().replaceAll('-', '');
    const definition: TransferExecutionDefinition = {
      settingId: '1',
      sourceSchema: 'public',
      sourceTable: 'source',
      sourceKeyDefinition: {
        keys: [
          { column: 'tenant', type: 'text' },
          { column: 'logical_id', type: 'text' },
        ],
      },
      resolveLogicalKey: (key) => ({ tenant: key.tenant, logical_id: key.id }),
    };
    const sourceSql = `select tenant, id as logical_id, id as row_id, id || '-' || version as history_id,
    amount, memo from public.source where visible`;
    const insertSql = `insert into public.destination(tenant, row_id, amount, memo)
    values (:tenant, :row_id, :amount, :memo) returning tenant, row_id`;
    const reassessmentSql = `select jsonb_build_object('tenant', :tenant::text, 'row_id', :row_id::text,
      'amount', :amount::numeric, 'memo', :memo::text)::text current_values,
    to_jsonb(d)::text active_values from public.destination d
    where d.tenant = (:velvet_active_destination_key::jsonb ->> 'tenant')
      and d.row_id = (:velvet_active_destination_key::jsonb ->> 'row_id') for update of d`;
    const updateSql = `update public.destination set tenant = :tenant, row_id = :row_id,
    amount = :amount, memo = :memo
    where tenant = (:velvet_active_destination_key::jsonb ->> 'tenant')
      and row_id = (:velvet_active_destination_key::jsonb ->> 'row_id') returning tenant, row_id`;
    const deleteSql = `delete from public.destination
    where tenant = (:velvet_active_destination_key::jsonb ->> 'tenant')
      and row_id = (:velvet_active_destination_key::jsonb ->> 'row_id') returning tenant, row_id`;
    const run = (client: TransferExecutionClient = db) =>
      executeTransfer(client, [definition], { settingId: '1' });
    const dirty = (id = 'a', tenant = 't') =>
      db.query(
        `insert into rawsql_transfer.dirty_key
    (source_schema_name, source_table_name, source_key_json)
    values ('public', 'source', jsonb_build_object('tenant', $1::text, 'id', $2::text))`,
        [tenant, id],
      );
    const rows = async () =>
      (
        await db.query(
          'select tenant, row_id, amount::text, memo from public.destination order by tenant, row_id',
        )
      ).rows;
    const active = async () =>
      (await db.query('select * from rawsql_transfer.active_black order by active_black_id')).rows;
    const results = async (runId: string) =>
      (
        await db.query(
          `select processing_status, processing_result,
    destination_link_id from rawsql_transfer.dirty_key_processing where run_id = $1 order by dirty_key_id, destination_link_id`,
          [runId],
        )
      ).rows;
    const state = async () => ({
      rows: await rows(),
      active: await active(),
      work: (await db.query('select * from rawsql_transfer.work_item order by work_item_id')).rows,
      processing: (
        await db.query(
          'select * from rawsql_transfer.dirty_key_processing order by dirty_key_processing_id',
        )
      ).rows,
      lineage: (await db.query('select * from rawsql_transfer.lineage order by lineage_id')).rows,
    });
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
      await db.query(`create table public.source(tenant text, id text, amount numeric, memo text,
      visible boolean not null default true, version integer not null default 1, primary key(tenant,id));
      create table public.destination(tenant text, row_id text, amount numeric, memo text, primary key(tenant,row_id));
      create table public.history(tenant text, row_id text, amount numeric, memo text, primary key(tenant,row_id));
      create sequence public.red_sequence;
      create function public.reject_history_mutation() returns trigger language plpgsql as $$
      begin raise exception 'immutable history was mutated'; end $$;
      create trigger immutable_history before update or delete on public.history
      for each row execute function public.reject_history_mutation();
      create function public.reject_mutation() returns trigger language plpgsql as $$
      begin
        if current_setting('velvet.reject_mutation', true) = 'on' then raise exception 'destination mutation rejected'; end if;
        if TG_OP = 'DELETE' then return OLD; end if;
        return NEW;
      end $$;
      create trigger destination_mutation before update or delete on public.destination
      for each row execute function public.reject_mutation()`);
    });
    afterAll(async () => {
      await db?.end();
      if (created) await admin.query('drop database ' + database);
      await admin?.end();
    });
    beforeEach(async () => {
      await db.query(`truncate rawsql_transfer.setting, rawsql_transfer.destination_definition,
      rawsql_transfer.dirty_key, public.source, public.destination, public.history restart identity cascade;
      alter sequence public.red_sequence restart with 1; set velvet.reject_mutation = 'off'`);
      await db.query(`insert into rawsql_transfer.destination_definition(destination_definition_id,
      destination_definition_name, destination_table_name, destination_columns, destination_key_columns, transfer_model)
      values (1, 'mutable', 'public.destination',
      '{"columns":[{"name":"tenant","type":"text"},{"name":"row_id","type":"text"},{"name":"amount","type":"numeric"},{"name":"memo","type":"text"}]}',
      array['tenant','row_id'], 'mutable')`);
      await db.query(
        `insert into rawsql_transfer.setting(setting_id,setting_name,source_sql_body,source_sql_hash,source_key_definition,source_sql_analysis_status)
      values (1,'source',$1,'trusted',$2,'not_analyzed')`,
        [sourceSql, definition.sourceKeyDefinition],
      );
      await db.query(
        `insert into rawsql_transfer.destination_link(destination_link_id,setting_id,destination_definition_id,
      destination_link_name,execution_order,destination_key_mapping,mapping_definition,diff_compare_excluded_columns,
      generated_insert_transfer_sql_body,generated_reassessment_sql_body,generated_update_transfer_sql_body,generated_delete_transfer_sql_body)
      values (1,1,1,'mutable',1,
      '{"sourceKey":["tenant","logical_id"],"destinationKey":[{"name":"tenant","sourceColumn":"tenant"},{"name":"row_id","sourceColumn":"row_id"}]}',
      '{"columns":{"tenant":"tenant","row_id":"row_id","amount":"amount","memo":"memo"}}', '{"columns":["memo"]}', $1,$2,$3,$4)`,
        [insertSql, reassessmentSql, updateSql, deleteSql],
      );
      await db.query(
        "insert into public.source(tenant,id,amount,memo) values ('t','a',100,'initial')",
      );
      await dirty();
    });
    test('insert, unchanged/excluded-only no-op, update, delete, absent no-op, and reappearance preserve current identity', async () => {
      const initial = await run();
      expect(initial).toMatchObject({ inserted: 1, skipped: 0 });
      expect(await results(initial.runId)).toEqual([
        {
          processing_status: 'succeeded',
          processing_result: 'black_insert',
          destination_link_id: '1',
        },
      ]);
      const first = await active();
      expect(first).toHaveLength(1);
      expect(first[0]).toMatchObject({ destination_key_json: { tenant: 't', row_id: 'a' } });
      const before = await rows();
      await dirty();
      expect(await run()).toMatchObject({ inserted: 0, skipped: 1 });
      await db.query("update public.source set memo = 'excluded-only'");
      await dirty();
      const ignored = await run();
      expect(await results(ignored.runId)).toEqual([
        { processing_status: 'skipped', processing_result: 'no_op', destination_link_id: '1' },
      ]);
      expect(await rows()).toEqual(before);
      expect(await active()).toEqual(first);
      await db.query("update public.source set amount = 150, memo = 'current'");
      await dirty();
      const updated = await run();
      expect(updated).toMatchObject({ inserted: 0, skipped: 0 });
      expect(await results(updated.runId)).toEqual([
        {
          processing_status: 'succeeded',
          processing_result: 'black_update',
          destination_link_id: '1',
        },
      ]);
      expect(await rows()).toEqual([{ tenant: 't', row_id: 'a', amount: '150', memo: 'current' }]);
      expect(await active()).toEqual(first);
      const work = (
        await db.query('select * from rawsql_transfer.work_item where run_id=$1', [updated.runId])
      ).rows[0];
      expect(work).toMatchObject({
        transfer_model: 'mutable',
        route_type: 'mutable',
        source_exists: true,
        requires_red_transfer: false,
        requires_black_insert_transfer: false,
        requires_black_update_transfer: true,
        requires_physical_delete_transfer: false,
        active_black_id: first[0].active_black_id,
        evaluated_destination_key_json: { tenant: 't', row_id: 'a' },
      });
      await db.query('delete from public.source');
      await dirty();
      const deleted = await run();
      expect(await results(deleted.runId)).toEqual([
        {
          processing_status: 'succeeded',
          processing_result: 'physical_delete',
          destination_link_id: '1',
        },
      ]);
      expect(await rows()).toEqual([]);
      expect(await active()).toEqual([]);
      expect(
        (await db.query('select * from rawsql_transfer.work_item where run_id=$1', [deleted.runId]))
          .rows[0],
      ).toMatchObject({
        transfer_model: 'mutable',
        source_exists: false,
        active_black_id: null,
        requires_physical_delete_transfer: true,
        requires_red_transfer: false,
        requires_black_insert_transfer: false,
        requires_black_update_transfer: false,
        evaluated_destination_key_json: { tenant: 't', row_id: 'a' },
      });
      expect(
        (await db.query('select active_black_id from rawsql_transfer.work_item')).rows.every(
          (w) => w.active_black_id === null,
        ),
      ).toBe(true);
      await dirty();
      const absent = await run();
      expect(await results(absent.runId)).toEqual([
        { processing_status: 'skipped', processing_result: 'no_op', destination_link_id: '1' },
      ]);
      await db.query("insert into public.source(tenant,id,amount) values ('t','a',200)");
      expect(await run()).toMatchObject({ inserted: 0, skipped: 0 });
      expect(await rows()).toEqual([]);
      await dirty();
      expect(await run()).toMatchObject({ inserted: 1, skipped: 0 });
      expect(await rows()).toEqual([{ tenant: 't', row_id: 'a', amount: '200', memo: null }]);
      expect((await db.query('select * from rawsql_transfer.lineage')).rows).toEqual([]);
    });
    test('source identity change is deletion plus insertion; composite locator does not touch another tenant', async () => {
      await db.query("insert into public.source(tenant,id,amount) values ('other','a',900)");
      await dirty('a', 'other');
      await run();
      await db.query("update public.source set id = 'b', amount = 200 where tenant = 't'");
      await dirty('a');
      await dirty('b');
      const moved = await run();
      expect((await results(moved.runId)).map((r) => r.processing_result)).toEqual([
        'physical_delete',
        'black_insert',
      ]);
      expect(await rows()).toEqual([
        { tenant: 'other', row_id: 'a', amount: '900', memo: null },
        { tenant: 't', row_id: 'b', amount: '200', memo: 'initial' },
      ]);
    });
    test('source SQL filtering triggers delete without source mapping or reassessment', async () => {
      await run();
      await db.query('update public.source set visible = false');
      await db.query(
        "update rawsql_transfer.destination_link set generated_reassessment_sql_body = ''",
      );
      await dirty();
      expect((await results((await run()).runId))[0].processing_result).toBe('physical_delete');
      expect(await rows()).toEqual([]);
    });
    test('mixed mutable routes and repeated Dirty Keys use one current snapshot per logical key', async () => {
      await db.query(
        "insert into public.source(tenant,id,amount) values ('t','delete',50),('t','same',60)",
      );
      await dirty('delete');
      await dirty('same');
      await run();
      await db.query(
        "update public.source set amount=110 where id='a'; delete from public.source where id='delete'; insert into public.source(tenant,id,amount) values ('t','new',70)",
      );
      for (const id of [
        'a',
        'a',
        'delete',
        'delete',
        'same',
        'same',
        'new',
        'new',
        'absent',
        'absent',
      ])
        await dirty(id);
      const mixed = await run();
      expect(mixed).toMatchObject({ inserted: 1, skipped: 7 });
      expect((await results(mixed.runId)).map((r) => r.processing_result)).toEqual([
        'black_update',
        'duplicate_ignore',
        'physical_delete',
        'duplicate_ignore',
        'no_op',
        'duplicate_ignore',
        'black_insert',
        'duplicate_ignore',
        'no_op',
        'duplicate_ignore',
      ]);
      expect(await rows()).toEqual([
        { tenant: 't', row_id: 'a', amount: '110', memo: 'initial' },
        { tenant: 't', row_id: 'new', amount: '70', memo: null },
        { tenant: 't', row_id: 'same', amount: '60', memo: null },
      ]);
      expect((await db.query('select * from rawsql_transfer.lineage')).rows).toEqual([]);
    });
    test('mutable and immutable links share the snapshot and retain all immutable routes', async () => {
      const historyInsert = `insert into public.history(tenant,row_id,amount,memo) values (:tenant,:row_id,:amount,:memo) returning tenant,row_id`;
      const historyCompare = `select jsonb_build_object('tenant',:tenant::text,'row_id',:row_id::text,'amount',:amount::numeric,'memo',:memo::text)::text current_values,
      to_jsonb(d)::text active_values from public.history d where d.tenant=(:velvet_active_destination_key::jsonb->>'tenant') and d.row_id=(:velvet_active_destination_key::jsonb->>'row_id')`;
      const red = `insert into public.history(tenant,row_id,amount,memo) select tenant,'red-'||nextval('public.red_sequence'),-amount,memo from public.history where tenant=:tenant and row_id=:row_id returning tenant,row_id`;
      await db.query(
        `insert into rawsql_transfer.destination_definition(destination_definition_id,destination_definition_name,destination_table_name,destination_columns,destination_key_columns,transfer_model,sign_inversion_columns,generated_red_transfer_sql_body)
      select 2,'history','public.history',destination_columns,destination_key_columns,'immutable',array['amount'],$1 from rawsql_transfer.destination_definition where destination_definition_id=1`,
        [red],
      );
      await db.query(
        `insert into rawsql_transfer.destination_link(destination_link_id,setting_id,destination_definition_id,destination_link_name,execution_order,destination_key_mapping,mapping_definition,diff_compare_excluded_columns,generated_insert_transfer_sql_body,generated_reassessment_sql_body)
      values(2,1,2,'history',2,'{"sourceKey":["tenant","logical_id"],"destinationKey":[{"name":"tenant","sourceColumn":"tenant"},{"name":"row_id","sourceColumn":"history_id"}]}',
      '{"columns":{"tenant":"tenant","row_id":"history_id","amount":"amount","memo":"memo"}}','{"columns":["row_id","memo"]}',$1,$2)`,
        [historyInsert, historyCompare],
      );
      await db.query(
        "insert into public.source(tenant,id,amount) values ('t','delete',50),('t','same',60)",
      );
      await dirty('delete');
      await dirty('same');
      expect(await run()).toMatchObject({ inserted: 6, skipped: 0 });
      await db.query(
        "update public.source set amount=110,version=2 where id='a'; delete from public.source where id='delete'; insert into public.source(tenant,id,amount) values ('t','new',70)",
      );
      for (const id of ['a', 'delete', 'same', 'new', 'absent']) await dirty(id);
      const mixed = await run();
      expect(mixed).toMatchObject({ inserted: 3, skipped: 4 });
      expect((await results(mixed.runId)).map((r) => r.processing_result)).toEqual([
        'black_update',
        'red_then_black_insert',
        'physical_delete',
        'red',
        'no_op',
        'no_op',
        'black_insert',
        'black_insert',
        'no_op',
        'no_op',
      ]);
      expect(
        (await db.query('select row_id,amount::text from public.history order by row_id')).rows,
      ).toEqual([
        { row_id: 'a-1', amount: '100' },
        { row_id: 'a-2', amount: '110' },
        { row_id: 'delete-1', amount: '50' },
        { row_id: 'new-1', amount: '70' },
        { row_id: 'red-1', amount: '-100' },
        { row_id: 'red-2', amount: '-50' },
        { row_id: 'same-1', amount: '60' },
      ]);
      expect(
        (await db.query('select distinct destination_link_id from rawsql_transfer.lineage')).rows,
      ).toEqual([{ destination_link_id: '2' }]);
    });
    test('NULL and exact large numeric values compare in PostgreSQL', async () => {
      await db.query('update public.source set amount=9007199254740993.00000001');
      await run();
      await dirty();
      expect(await run()).toMatchObject({ skipped: 1 });
      await db.query('update public.source set amount=9007199254740993.00000002');
      await dirty();
      expect((await results((await run()).runId))[0].processing_result).toBe('black_update');
      expect((await rows())[0].amount).toBe('9007199254740993.00000002');
      await db.query('update public.source set amount=null');
      await dirty();
      await run();
      await dirty();
      expect(await run()).toMatchObject({ skipped: 1 });
    });
    test('rejects mutable date lower-bound configuration before any Run or destination write', async () => {
      await db.query(
        `update rawsql_transfer.destination_definition set date_lower_bound_adjustments='{"posting_date":{"function":"public.correct_date","arguments":["posting_date"]}}'`,
      );
      await expect(run()).rejects.toThrow(
        'Mutable destinations cannot require posting-date lower-bound control',
      );
      expect(await rows()).toEqual([]);
      expect((await db.query('select * from rawsql_transfer.run')).rows).toEqual([]);
    });
    test('rejects inconsistent mapped identity even if key columns are excluded', async () => {
      await run();
      await dirty();
      await db.query('update rawsql_transfer.setting set source_sql_body=$1', [
        sourceSql.replace('id as row_id', "id || '-moved' as row_id"),
      ]);
      await db.query(
        `update rawsql_transfer.destination_link set diff_compare_excluded_columns='{"columns":["tenant","row_id","memo"]}'`,
      );
      const before = await state();
      await expect(run()).rejects.toThrow('Mutable destination key does not match Active Black');
      expect(await state()).toEqual(before);
    });
    test('an UPDATE SQL that moves the destination key is rolled back', async () => {
      await run();
      await db.query('update public.source set amount=200');
      await dirty();
      await db.query(
        'update rawsql_transfer.destination_link set generated_update_transfer_sql_body=$1',
        [updateSql.replace('row_id = :row_id,', "row_id = :row_id || '-moved',")],
      );
      const before = await state();
      await expect(run()).rejects.toThrow(
        'Black Update destination key does not match Active Black',
      );
      expect(await state()).toEqual(before);
    });
    for (const operation of ['update', 'delete'] as const) {
      const prepare = async () => {
        await run();
        await db.query(
          operation === 'update'
            ? 'update public.source set amount=200'
            : 'delete from public.source',
        );
        await dirty();
      };
      test.each(
        operation === 'delete'
          ? ['statement', 'retirement', 'processing', 'finalization', 'commit']
          : ['statement', 'processing', 'finalization', 'commit'],
      )(`${operation} failure at %s rolls back work and records failed Run`, async (point) => {
        await prepare();
        const before = await state();
        const original = new Error('injected ' + point);
        let workCommit = 0;
        const client: TransferExecutionClient = {
          async query(text, values) {
            const matches =
              point === 'statement'
                ? text.startsWith(operation + ' public.destination') ||
                  (text.startsWith('delete from public.destination') && operation === 'delete')
                : point === 'retirement'
                  ? text.startsWith('delete from rawsql_transfer.active_black') ||
                    text.startsWith('select rawsql_transfer.retire_active')
                  : point === 'processing'
                    ? text.startsWith('insert into rawsql_transfer.dirty_key_processing')
                    : point === 'finalization'
                      ? text.startsWith('update rawsql_transfer.run set run_status = $')
                      : text === 'commit' && ++workCommit === 2;
            if (matches) {
              if (point === 'statement') await db.query(text, values);
              throw original;
            }
            return db.query(text, values);
          },
        };
        const error = await run(client).catch((e) => e);
        expect(error).toBeInstanceOf(TransferExecutionError);
        expect(error.cause).toBe(original);
        expect(await state()).toEqual(before);
        expect(
          (
            await db.query('select run_status from rawsql_transfer.run where run_id=$1', [
              error.runId,
            ])
          ).rows,
        ).toEqual([{ run_status: 'failed' }]);
      });
      test(`${operation} database failure rolls back and secondary recovery errors preserve the cause`, async () => {
        await prepare();
        const before = await state();
        await db.query("set velvet.reject_mutation = 'on'");
        const recovery = new Error('failure recording unavailable');
        const client: TransferExecutionClient = {
          async query(text, values) {
            if (text.startsWith("update rawsql_transfer.run set run_status = 'failed'"))
              throw recovery;
            return db.query(text, values);
          },
        };
        const error = await run(client).catch((e) => e);
        expect(error).toBeInstanceOf(TransferExecutionError);
        expect(error.cause.message).toBe('destination mutation rejected');
        expect(error.recoveryErrors).toEqual([recovery]);
        expect(await state()).toEqual(before);
        expect(
          (
            await db.query('select run_status from rawsql_transfer.run where run_id=$1', [
              error.runId,
            ])
          ).rows[0].run_status,
        ).toBe('running');
      });
      test.each([
        'missing SQL',
        'missing locator',
        'no rows',
        'multiple rows',
        'missing key',
        'wrong key',
      ])(`${operation} rejects %s atomically`, async (invalid) => {
        await prepare();
        const valid = operation === 'update' ? updateSql : deleteSql;
        const bad =
          invalid === 'missing SQL'
            ? ''
            : invalid === 'missing locator'
              ? 'select 1'
              : invalid === 'no rows'
                ? valid.replace(' returning', ' and false returning')
                : invalid === 'multiple rows'
                  ? `with changed as (${valid}) select * from changed union all select * from changed`
                  : invalid === 'missing key'
                    ? valid.replace('returning tenant, row_id', 'returning tenant')
                    : valid.replace(
                        'returning tenant, row_id',
                        "returning tenant, 'wrong'::text as row_id",
                      );
        if (operation === 'update')
          await db.query(
            'update rawsql_transfer.destination_link set generated_update_transfer_sql_body=$1',
            [bad],
          );
        else
          await db.query(
            'update rawsql_transfer.destination_link set generated_delete_transfer_sql_body=$1',
            [bad],
          );
        const before = await state();
        const error = await run().catch((e) => e);
        expect(error).toBeInstanceOf(TransferExecutionError);
        expect(await state()).toEqual(before);
        expect(
          (
            await db.query('select run_status from rawsql_transfer.run where run_id=$1', [
              error.runId,
            ])
          ).rows[0].run_status,
        ).toBe('failed');
      });
      test(`${operation} COMMIT response loss preserves committed success and original failure`, async () => {
        await prepare();
        let commits = 0;
        const original = new Error('COMMIT response lost');
        const client: TransferExecutionClient = {
          async query(text, values) {
            const result = await db.query(text, values);
            if (text === 'commit' && ++commits === 2) throw original;
            return result;
          },
        };
        const error = await run(client).catch((e) => e);
        expect(error.cause).toBe(original);
        expect(
          (
            await db.query('select run_status from rawsql_transfer.run where run_id=$1', [
              error.runId,
            ])
          ).rows[0].run_status,
        ).toBe('succeeded');
        expect((await results(error.runId))[0].processing_result).toBe(
          operation === 'update' ? 'black_update' : 'physical_delete',
        );
        expect(await rows()).toEqual(
          operation === 'update'
            ? [{ tenant: 't', row_id: 'a', amount: '200', memo: 'initial' }]
            : [],
        );
      });
    }
  },
);
