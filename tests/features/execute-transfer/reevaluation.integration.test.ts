import { readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { Client } from 'pg';
import { beforeAll, afterAll, beforeEach, describe, expect, test } from 'vitest';
import {
  executeTransfer as executeTransferImpl,
  TransferExecutionError,
  type TransferExecutionDefinition,
} from '../../../src/features/execute-transfer/boundary.js';

const enabled = process.env.ASHIBA_SKIP_DB_BACKED_TESTS !== '1';
describe.skipIf(!enabled).each(['row', 'routine'] as const)(
  'immutable snapshot reevaluation on PostgreSQL (%s)',
  (metadataMode) => {
    const executeTransfer: typeof executeTransferImpl = (client, definitions, input) =>
      executeTransferImpl(client, definitions, { ...input, metadataMode });
    let admin: Client;
    let db: Client;
    let created = false;
    const database = 'velvet_phase2_' + randomUUID().replaceAll('-', '');
    const definition: TransferExecutionDefinition = {
      settingId: '1',
      sourceSchema: 'public',
      sourceTable: 'source',
      sourceKeyDefinition: { keys: [{ column: 'logical_id', type: 'text' }] },
      resolveLogicalKey: (key) => ({ logical_id: key.id }),
    };
    const sourceSql = `select id as logical_id, id || '-' || version as row_id, amount,
    to_char(source_date, 'YYYY-MM-DD') as posting_date, null::text as original_date, memo
    from public.source`;
    const sourceWithOriginalSql = `select id as logical_id, id || '-' || version as row_id, amount,
    to_char(source_date, 'YYYY-MM-DD') as posting_date,
    to_char(source_date, 'YYYY-MM-DD') as original_date, memo from public.source`;
    // A shared DB function is the canonical correction; reevaluation does not preview a write.
    const insertSql = `insert into public.destination(row_id, amount, posting_date, original_date, memo)
    select :row_id, n.* from public.destination_values(:amount, :posting_date, :original_date, :memo) n
    returning row_id`;
    const reassessmentSql = `select
    (jsonb_build_object('row_id', :row_id::text) || to_jsonb(n))::text as current_values,
    to_jsonb(d)::text as active_values
    from public.destination d
    cross join public.destination_values(:amount, :posting_date, :original_date, :memo) n
    where d.row_id = (:velvet_active_destination_key::jsonb ->> 'row_id')`;
    const redSql = `insert into public.destination(row_id, amount, posting_date, original_date, memo)
    select 'red-' || nextval('public.red_sequence'), n.*
    from public.destination d
    cross join lateral public.destination_values(-d.amount, d.posting_date, d.original_date, d.memo) n
    where d.row_id = :row_id returning row_id`;
    const run = (client = db) => executeTransfer(client, [definition], { settingId: '1' });
    const dirty = (id = 'a') =>
      db.query(
        `insert into rawsql_transfer.dirty_key(source_schema_name, source_table_name, source_key_json)
    values ('public', 'source', jsonb_build_object('id', $1::text))`,
        [id],
      );
    const rows = async () =>
      (
        await db.query(`select row_id, amount::text, posting_date::text, original_date::text, memo
    from public.destination order by row_id`)
      ).rows;
    const active = async () =>
      (await db.query('select * from rawsql_transfer.active_black order by active_black_id')).rows;
    const results = async () =>
      (
        await db.query(
          'select processing_status, processing_result from rawsql_transfer.dirty_key_processing order by dirty_key_id',
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
      await db.query(`create table public.source(id text primary key, version integer not null default 1,
      amount numeric, source_date date not null, memo text);
      create table public.destination(row_id text primary key, amount numeric, posting_date date not null,
      original_date date, memo text);
      create sequence public.red_sequence;
      create function public.destination_values(input_amount numeric, input_date date, input_original date, input_memo text)
      returns table(amount numeric, posting_date date, original_date date, memo text)
      language sql stable as $$ select input_amount, greatest(input_date, date '2026-05-01'), input_original, input_memo $$`);
      // No test can accidentally pass by changing or removing the old destination row.
      await db.query(`create function public.reject_mutation() returns trigger language plpgsql as $$
      begin raise exception 'immutable destination row was mutated'; end $$;
      create trigger immutable_destination before update or delete on public.destination
      for each row execute function public.reject_mutation()`);
    });
    afterAll(async () => {
      await db?.end();
      if (created) await admin.query('drop database ' + database);
      await admin?.end();
    });
    beforeEach(async () => {
      await db.query(`truncate rawsql_transfer.setting, rawsql_transfer.destination_definition,
      rawsql_transfer.dirty_key, public.source, public.destination restart identity cascade;
      alter sequence public.red_sequence restart with 1`);
      await db.query(
        `insert into rawsql_transfer.destination_definition(destination_definition_id,
      destination_definition_name, destination_table_name, destination_columns, destination_key_columns,
      transfer_model, sign_inversion_columns, generated_red_transfer_sql_body, date_lower_bound_adjustments)
      values (1, 'target', 'public.destination',
      '{"columns":[{"name":"row_id","type":"text"},{"name":"amount","type":"numeric"},{"name":"posting_date","type":"date"},{"name":"original_date","type":"date"},{"name":"memo","type":"text"}]}',
      array['row_id'], 'immutable', array['amount'], $1,
      '{"posting_date":{"function":"public.destination_values","arguments":["amount","posting_date","original_date","memo"]}}')`,
        [redSql],
      );
      await db.query(
        `insert into rawsql_transfer.setting(setting_id, setting_name, source_sql_body, source_sql_hash, source_key_definition, source_sql_analysis_status)
      values (1, 'source', $1, 'trusted-config', $2, 'not_analyzed')`,
        [sourceSql, definition.sourceKeyDefinition],
      );
      await db.query(
        `insert into rawsql_transfer.destination_link(destination_link_id, setting_id, destination_definition_id,
      destination_link_name, execution_order, destination_key_mapping, mapping_definition, diff_compare_excluded_columns,
      generated_insert_transfer_sql_body, generated_reassessment_sql_body)
      values (1, 1, 1, 'target', 1, '{"sourceKey":["logical_id"],"destinationKey":[{"name":"row_id","sourceColumn":"row_id"}]}',
      '{"columns":{"row_id":"row_id","amount":"amount","posting_date":"posting_date","original_date":"original_date","memo":"memo"}}',
      '{"columns":["row_id","memo"]}', $1, $2)`,
        [insertSql, reassessmentSql],
      );
      await db.query(
        "insert into public.source(id,amount,source_date,memo) values ('a',100,'2026-04-10','initial')",
      );
      await dirty();
    });
    test('unchanged and ignored-only snapshots complete without changing destination, Active Black or Lineage', async () => {
      await run();
      const before = await rows();
      const activeBefore = await active();
      const lineageBefore = (await db.query('select * from rawsql_transfer.lineage')).rows;
      await dirty();
      expect(await run()).toMatchObject({ inserted: 0, skipped: 1 });
      await db.query("update public.source set memo = 'ignored', version = 2");
      await dirty();
      expect(await run()).toMatchObject({ inserted: 0, skipped: 1 });
      expect(await rows()).toEqual(before);
      expect(await active()).toEqual(activeBefore);
      expect((await db.query('select * from rawsql_transfer.lineage')).rows).toEqual(lineageBefore);
      expect(await results()).toEqual([
        { processing_status: 'succeeded', processing_result: 'black_insert' },
        { processing_status: 'skipped', processing_result: 'no_op' },
        { processing_status: 'skipped', processing_result: 'no_op' },
      ]);
      expect(
        (
          await db.query(`select route_type, skip_reason, requires_red_transfer, requires_black_insert_transfer,
      active_black_id, evaluated_destination_key_json from rawsql_transfer.work_item where skip_reason = 'no_op'`)
        ).rows,
      ).toEqual([
        {
          route_type: 'skipped',
          skip_reason: 'no_op',
          requires_red_transfer: false,
          requires_black_insert_transfer: false,
          active_black_id: activeBefore[0].active_black_id,
          evaluated_destination_key_json: { row_id: 'a-1' },
        },
        {
          route_type: 'skipped',
          skip_reason: 'no_op',
          requires_red_transfer: false,
          requires_black_insert_transfer: false,
          active_black_id: activeBefore[0].active_black_id,
          evaluated_destination_key_json: { row_id: 'a-1' },
        },
      ]);
      expect(await run()).toMatchObject({ inserted: 0, skipped: 0 });
    });
    test('correction inserts Red before new Black, preserves old row, records both lineages and retires old Active Black', async () => {
      await run();
      const old = (await rows())[0];
      const oldActive = (await active())[0];
      await dirty();
      await run(); // Preserve a prior no-op evaluation across retirement too.
      await db.query('update public.source set amount = 150, version = 2');
      await dirty();
      const result = await run();
      expect(result).toMatchObject({ inserted: 1, skipped: 0 });
      expect(await rows()).toEqual([
        old,
        { ...old, row_id: 'a-2', amount: '150' },
        { ...old, row_id: 'red-1', amount: '-100' },
      ]);
      expect((await active()).map((a) => a.destination_key_json)).toEqual([{ row_id: 'a-2' }]);
      expect((await active())[0].active_black_id).not.toBe(oldActive.active_black_id);
      expect(
        (
          await db.query(
            `select transfer_operation, source_kind, source_key_json, destination_key_json
      from rawsql_transfer.lineage where run_id = $1 order by lineage_id`,
            [result.runId],
          )
        ).rows,
      ).toEqual([
        {
          transfer_operation: 'red_insert',
          source_kind: 'reversed_destination_row',
          source_key_json: { row_id: 'a-1' },
          destination_key_json: { row_id: 'red-1' },
        },
        {
          transfer_operation: 'black_insert',
          source_kind: 'transfer_source',
          source_key_json: { logical_id: 'a' },
          destination_key_json: { row_id: 'a-2' },
        },
      ]);
      expect(
        (
          await db.query(`select active_black_id, evaluated_destination_key_json from rawsql_transfer.work_item
      where evaluated_destination_key_json is not null order by work_item_id`)
        ).rows,
      ).toEqual([
        { active_black_id: null, evaluated_destination_key_json: { row_id: 'a-1' } },
        { active_black_id: null, evaluated_destination_key_json: { row_id: 'a-1' } },
      ]);
      expect((await results()).at(-1)).toEqual({
        processing_status: 'succeeded',
        processing_result: 'red_then_black_insert',
      });
      await db.query('update public.source set amount = 180, version = 3');
      await dirty();
      await run();
      expect((await rows()).find((r) => r.row_id === 'red-2')?.amount).toBe('-150');
    });
    test('coalesces current state once and processes a new key in the same Run', async () => {
      await run();
      await db.query('update public.source set amount = 120, version = 2');
      await dirty();
      await db.query('update public.source set amount = 170, version = 3');
      await dirty();
      await db.query("insert into public.source values ('b',1,200,'2026-04-11','new')");
      await dirty('b');
      expect(await run()).toMatchObject({ inserted: 2, skipped: 1 });
      expect((await rows()).map((r) => [r.row_id, r.amount])).toEqual([
        ['a-1', '100'],
        ['a-3', '170'],
        ['b-1', '200'],
        ['red-1', '-100'],
      ]);
      expect((await results()).map((r) => r.processing_result)).toEqual([
        'black_insert',
        'red_then_black_insert',
        'duplicate_ignore',
        'black_insert',
      ]);
      expect(await run()).toMatchObject({ inserted: 0, skipped: 0 });
    });
    test('owner decision: April 10 to April 11 stays May 1 and is no-op without original_date', async () => {
      await run();
      const before = await rows();
      await db.query("update public.source set source_date = '2026-04-11', version = 2");
      await dirty();
      expect(await run()).toMatchObject({ inserted: 0, skipped: 1 });
      expect(await rows()).toEqual(before);
    });
    test('owner decision: explicitly retained original_date changes, while Red and Black stay in the open period', async () => {
      await db.query('update rawsql_transfer.setting set source_sql_body = $1', [
        sourceWithOriginalSql,
      ]);
      await run();
      await db.query("update public.source set source_date = '2026-04-11', version = 2");
      await dirty();
      expect(await run()).toMatchObject({ inserted: 1, skipped: 0 });
      expect((await rows()).map((r) => [r.row_id, r.posting_date, r.original_date])).toEqual([
        ['a-1', '2026-05-01', '2026-04-10'],
        ['a-2', '2026-05-01', '2026-04-11'],
        ['red-1', '2026-05-01', '2026-04-10'],
      ]);
      await db.query(
        `update rawsql_transfer.destination_link set diff_compare_excluded_columns = '{"columns":["row_id","memo","original_date"]}'`,
      );
      await db.query("update public.source set source_date = '2026-04-12', version = 3");
      await dirty();
      expect(await run()).toMatchObject({ inserted: 0, skipped: 1 });
    });
    test('compares NULLs and exact numeric values in PostgreSQL without JavaScript rounding', async () => {
      await db.query('update public.source set amount = null');
      await run();
      await dirty();
      expect(await run()).toMatchObject({ inserted: 0, skipped: 1 });
      await db.query('update public.source set amount = 9007199254740992, version = 2');
      await dirty();
      await run();
      await db.query('update public.source set amount = 9007199254740992.00, version = 3');
      await dirty();
      expect(await run()).toMatchObject({ inserted: 0, skipped: 1 });
      await db.query('update public.source set amount = 9007199254740993, version = 4');
      await dirty();
      expect(await run()).toMatchObject({ inserted: 1, skipped: 0 });
      expect((await rows()).find((r) => r.row_id === 'a-4')?.amount).toBe('9007199254740993');
      await db.query('update public.source set amount = null, version = 5');
      await dirty();
      expect(await run()).toMatchObject({ inserted: 1, skipped: 0 });
    });
    test.each(['red', 'black'] as const)(
      '%s failure rolls back all transfer changes and retains failed Run',
      async (failure) => {
        await run();
        const before = await rows();
        const activeBefore = await active();
        await db.query('update public.source set amount = 150, version = 2');
        await dirty();
        const query =
          failure === 'red'
            ? "insert into public.destination select :row_id, 1/0, date '2026-05-01', null, null returning row_id"
            : 'insert into public.destination select :row_id, :amount::numeric / 0, :posting_date::date, :original_date::date, :memo returning row_id';
        if (failure === 'red')
          await db.query(
            'update rawsql_transfer.destination_definition set generated_red_transfer_sql_body = $1',
            [query],
          );
        else
          await db.query(
            'update rawsql_transfer.destination_link set generated_insert_transfer_sql_body = $1',
            [query],
          );
        const error = await run().catch((error) => error);
        expect(error).toBeInstanceOf(TransferExecutionError);
        expect(error.cause.code).toBe('22012');
        expect(await rows()).toEqual(before);
        expect(await active()).toEqual(activeBefore);
        for (const table of [
          'rawsql_transfer.lineage',
          'rawsql_transfer.work_item',
          'rawsql_transfer.dirty_key_processing',
        ])
          expect((await db.query('select count(*) from ' + table)).rows[0].count).toBe('1');
        expect(
          (
            await db.query('select run_status from rawsql_transfer.run where run_id = $1', [
              error.runId,
            ])
          ).rows,
        ).toEqual([{ run_status: 'failed' }]);
        await db.query(
          'update rawsql_transfer.destination_definition set generated_red_transfer_sql_body = $1',
          [redSql],
        );
        await db.query(
          'update rawsql_transfer.destination_link set generated_insert_transfer_sql_body = $1',
          [insertSql],
        );
        expect(await run()).toMatchObject({ inserted: 1, skipped: 0 });
      },
    );
    test('coalesces no-op duplicates even without Red SQL', async () => {
      await run();
      await db.query(
        "update rawsql_transfer.destination_definition set generated_red_transfer_sql_body = ''",
      );
      await dirty();
      await dirty();
      expect(await run()).toMatchObject({ inserted: 0, skipped: 2 });
      expect((await results()).map((r) => r.processing_result)).toEqual([
        'black_insert',
        'no_op',
        'duplicate_ignore',
      ]);
    });
    test.each([
      ['missing SQL', ''],
      ['missing pair', 'select :velvet_active_destination_key::text as current_values'],
      [
        'missing comparison column',
        "select :velvet_active_destination_key::text as current_values, '{}'::text as active_values",
      ],
      [
        'JSON null',
        "select 'null'::text as current_values, :velvet_active_destination_key::text as active_values",
      ],
      [
        'unknown column',
        "select (:velvet_active_destination_key::jsonb || '{\"foreign_column\":1}')::text as current_values, '{}'::text as active_values",
      ],
      [
        'no original row',
        "select :velvet_active_destination_key::text current_values, '{}'::text active_values where false",
      ],
    ])('rejects invalid reassessment: %s without finalizing Dirty Key', async (_name, query) => {
      await run();
      const before = await rows();
      await dirty();
      await db.query(
        'update rawsql_transfer.destination_link set generated_reassessment_sql_body = $1',
        [query],
      );
      await expect(run()).rejects.toBeInstanceOf(TransferExecutionError);
      expect(await rows()).toEqual(before);
      expect(await results()).toHaveLength(1);
    });
    test('invalid exclusions cannot silently suppress changes', async () => {
      await run();
      await dirty();
      await db.query(
        `update rawsql_transfer.destination_link set diff_compare_excluded_columns = '{"columns":["unknown"]}'`,
      );
      await expect(run()).rejects.toThrow('Invalid comparison exclusions');
      expect(await results()).toHaveLength(1);
    });
    test('upgrades Phase 1 metadata and preserves existing evaluated references', async () => {
      await run();
      await dirty();
      await run();
      const original = await active();
      // Reconstruct only the two Phase 1 table differences in this disposable DB.
      await db.query(`alter table rawsql_transfer.destination_link drop column generated_reassessment_sql_body;
      alter table rawsql_transfer.work_item drop column evaluated_destination_key_json`);
      await db.query(
        await readFile(
          new URL('../../../db/upgrades/phase2-immutable-reevaluation.sql', import.meta.url),
          'utf8',
        ),
      );
      expect(await active()).toEqual(original);
      expect(
        (
          await db.query(`select evaluated_destination_key_json from rawsql_transfer.work_item
      where active_black_id is not null`)
        ).rows,
      ).toEqual([{ evaluated_destination_key_json: { row_id: 'a-1' } }]);
      expect(
        (
          await db.query(
            'select generated_reassessment_sql_body from rawsql_transfer.destination_link',
          )
        ).rows,
      ).toEqual([{ generated_reassessment_sql_body: '' }]);
      await db.query(
        'update rawsql_transfer.destination_link set generated_reassessment_sql_body = $1',
        [reassessmentSql],
      );
      await db.query('update public.source set amount = 190, version = 2');
      await dirty();
      expect(await run()).toMatchObject({ inserted: 1, skipped: 0 });
      expect(
        (
          await db.query(`select active_black_id, evaluated_destination_key_json from rawsql_transfer.work_item
      where skip_reason = 'no_op'`)
        ).rows,
      ).toEqual([{ active_black_id: null, evaluated_destination_key_json: { row_id: 'a-1' } }]);
    });
    test('a conflicting new Black key cannot replace an immutable row and rolls Red back', async () => {
      await run();
      const before = await rows();
      const activeBefore = await active();
      await db.query('update public.source set amount = 190');
      await dirty();
      const error = await run().catch((error) => error);
      expect(error).toBeInstanceOf(TransferExecutionError);
      expect(error.cause.code).toBe('23505');
      expect(await rows()).toEqual(before);
      expect(await active()).toEqual(activeBefore);
      expect(await results()).toHaveLength(1);
    });
    test('source disappearance records Red only and supports reappearance as a fresh Black', async () => {
      await run();
      const old = (await rows())[0];
      await db.query('delete from public.source');
      await dirty();
      // Cancellation has no current values to compare or map.
      await db.query(
        "update rawsql_transfer.destination_link set generated_reassessment_sql_body = ''",
      );
      const cancelled = await run();
      expect(cancelled).toMatchObject({ inserted: 0, skipped: 0 });
      expect(await rows()).toEqual([old, { ...old, row_id: 'red-1', amount: '-100' }]);
      expect(await active()).toEqual([]);
      expect((await results()).at(-1)).toEqual({
        processing_status: 'succeeded',
        processing_result: 'red',
      });
      expect(
        (
          await db.query(
            `select source_exists, requires_red_transfer, requires_black_insert_transfer,
      active_black_id, evaluated_destination_key_json from rawsql_transfer.work_item where run_id = $1`,
            [cancelled.runId],
          )
        ).rows,
      ).toEqual([
        {
          source_exists: false,
          requires_red_transfer: true,
          requires_black_insert_transfer: false,
          active_black_id: null,
          evaluated_destination_key_json: { row_id: 'a-1' },
        },
      ]);
      expect(
        (
          await db.query(
            `select transfer_operation, source_kind, source_key_json, destination_key_json
      from rawsql_transfer.lineage where run_id = $1`,
            [cancelled.runId],
          )
        ).rows,
      ).toEqual([
        {
          transfer_operation: 'red_insert',
          source_kind: 'reversed_destination_row',
          source_key_json: { row_id: 'a-1' },
          destination_key_json: { row_id: 'red-1' },
        },
      ]);
      expect(await run()).toMatchObject({ inserted: 0, skipped: 0 });
      await db.query("insert into public.source values ('a',2,130,'2026-05-10','returned')");
      await dirty();
      expect(await run()).toMatchObject({ inserted: 1, skipped: 0 });
      expect((await active()).map((a) => a.destination_key_json)).toEqual([{ row_id: 'a-2' }]);
      expect((await results()).map((r) => r.processing_result)).toEqual([
        'black_insert',
        'red',
        'black_insert',
      ]);
    });
    test('absence is determined by stored source SQL results, coalescing duplicate cancellation keys', async () => {
      await run();
      await db.query('update rawsql_transfer.setting set source_sql_body = $1', [
        sourceSql + " where id <> 'a'",
      ]);
      await dirty();
      await dirty();
      expect(await run()).toMatchObject({ inserted: 0, skipped: 1 });
      expect(await rows()).toHaveLength(2);
      expect(await active()).toEqual([]);
      expect((await results()).map((r) => r.processing_result)).toEqual([
        'black_insert',
        'red',
        'duplicate_ignore',
      ]);
      expect((await db.query('select count(*)::int n from public.source')).rows[0].n).toBe(1);
    });
    test('cancellation uses the currently permitted posting date without mutating the original', async () => {
      await run();
      const old = (await rows())[0];
      await db.query('delete from public.source');
      await dirty();
      const correction = (date: string) => `create or replace function public.destination_values(
      input_amount numeric, input_date date, input_original date, input_memo text)
      returns table(amount numeric, posting_date date, original_date date, memo text)
      language sql stable as $$ select input_amount, greatest(input_date, date '${date}'), input_original, input_memo $$`;
      try {
        await db.query(correction('2026-06-01'));
        await run();
        expect(await rows()).toEqual([
          old,
          { ...old, row_id: 'red-1', amount: '-100', posting_date: '2026-06-01' },
        ]);
      } finally {
        await db.query(correction('2026-05-01'));
      }
    });
    test('cancellation, correction, initial insertion and no-op commit together', async () => {
      await db.query(
        "insert into public.source(id,amount,source_date) values ('b',200,'2026-04-10'),('d',400,'2026-04-10')",
      );
      await dirty('b');
      await dirty('d');
      await run();
      await db.query(
        "delete from public.source where id = 'a'; update public.source set amount = 250, version = 2 where id = 'b'; insert into public.source(id,amount,source_date) values ('c',300,'2026-05-10')",
      );
      for (const id of ['a', 'b', 'c', 'd']) await dirty(id);
      const mixed = await run();
      expect(mixed).toMatchObject({ inserted: 2, skipped: 1 });
      expect((await results()).slice(-4).map((r) => r.processing_result)).toEqual([
        'red',
        'red_then_black_insert',
        'black_insert',
        'no_op',
      ]);
      expect((await active()).map((a) => a.destination_key_json.row_id).sort()).toEqual([
        'b-2',
        'c-1',
        'd-1',
      ]);
      expect(await rows()).toHaveLength(7);
      expect(
        (
          await db.query('select run_status from rawsql_transfer.run where run_id = $1', [
            mixed.runId,
          ])
        ).rows[0].run_status,
      ).toBe('succeeded');
    });
    test.each(['red', 'lineage', 'processing', 'finish'])(
      'cancellation failure at %s rolls back Red, retirement and all work, preserving cause',
      async (stage) => {
        await run();
        const before = await rows();
        const activeBefore = await active();
        await db.query('delete from public.source');
        await dirty();
        const marker = {
          red: 'insert into public.destination',
          lineage:
            metadataMode === 'routine'
              ? 'select rawsql_transfer.retire_active'
              : 'insert into rawsql_transfer.lineage',
          processing: 'insert into rawsql_transfer.dirty_key_processing',
          finish: 'update rawsql_transfer.run set run_status =',
        }[stage]!;
        const cause = new Error('injected cancellation ' + stage);
        let injected = false;
        const client = {
          query: async (text: string, values?: unknown[]) => {
            if (!injected && text.includes(marker)) {
              injected = true;
              throw cause;
            }
            return db.query(text, values);
          },
        };
        const error = await executeTransfer(client, [definition], { settingId: '1' }).catch(
          (e) => e,
        );
        expect(error).toBeInstanceOf(TransferExecutionError);
        expect(error.cause).toBe(cause);
        expect(await rows()).toEqual(before);
        expect(await active()).toEqual(activeBefore);
        expect(await results()).toHaveLength(1);
        expect(
          (await db.query('select count(*)::int n from rawsql_transfer.work_item')).rows[0].n,
        ).toBe(1);
        expect(
          (await db.query('select count(*)::int n from rawsql_transfer.lineage')).rows[0].n,
        ).toBe(1);
        expect(
          (
            await db.query(
              'select run_status, error_message from rawsql_transfer.run where run_id = $1',
              [error.runId],
            )
          ).rows[0],
        ).toEqual({ run_status: 'failed', error_message: cause.message });
        expect(await run()).toMatchObject({ inserted: 0, skipped: 0 });
        expect(await active()).toEqual([]);
      },
    );
    test.each(['before first Black', 'after cancellation'])(
      'absent source and Active Black complete no-op %s',
      async (stage) => {
        if (stage === 'after cancellation') {
          await run();
          await db.query('delete from public.source');
          await dirty();
          await run();
        } else await db.query('delete from public.source');
        const before = await rows();
        const lineageBefore = (
          await db.query('select * from rawsql_transfer.lineage order by lineage_id')
        ).rows;
        await dirty();
        const completed = await run();
        expect(completed).toMatchObject({
          inserted: 0,
          skipped: stage === 'after cancellation' ? 1 : 2,
        });
        expect(await rows()).toEqual(before);
        expect(await active()).toEqual([]);
        expect(
          (await db.query('select * from rawsql_transfer.lineage order by lineage_id')).rows,
        ).toEqual(lineageBefore);
        expect(
          (
            await db.query(
              `select processing_status, processing_result from rawsql_transfer.dirty_key_processing where run_id = $1 order by dirty_key_id`,
              [completed.runId],
            )
          ).rows,
        ).toEqual(
          stage === 'after cancellation'
            ? [{ processing_status: 'skipped', processing_result: 'no_op' }]
            : [
                { processing_status: 'skipped', processing_result: 'no_op' },
                { processing_status: 'skipped', processing_result: 'duplicate_ignore' },
              ],
        );
        expect(
          (
            await db.query(
              `select source_exists, route_type, skip_reason, requires_red_transfer,
      requires_black_insert_transfer, active_black_id, evaluated_destination_key_json
      from rawsql_transfer.work_item where run_id = $1 and skip_reason = 'no_op'`,
              [completed.runId],
            )
          ).rows,
        ).toEqual([
          {
            source_exists: false,
            route_type: 'skipped',
            skip_reason: 'no_op',
            requires_red_transfer: false,
            requires_black_insert_transfer: false,
            active_black_id: null,
            evaluated_destination_key_json: null,
          },
        ]);
        await db.query("insert into public.source values ('a',2,130,'2026-05-10','returned')");
        // The finalized keys cannot cause a transfer, even when the snapshot changes.
        expect(await run()).toMatchObject({ inserted: 0, skipped: 0 });
        expect(await rows()).toEqual(before);
        await dirty();
        expect(await run()).toMatchObject({ inserted: 1, skipped: 0 });
        expect((await active()).map((a) => a.destination_key_json)).toEqual([{ row_id: 'a-2' }]);
      },
    );
  },
);
