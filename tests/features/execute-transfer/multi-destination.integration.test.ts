import { readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { Client } from 'pg';
import { beforeAll, afterAll, beforeEach, describe, expect, test } from 'vitest';
import {
  executeTransfer,
  TransferExecutionError,
  type TransferExecutionClient,
  type TransferExecutionDefinition,
} from '../../../src/features/execute-transfer/boundary.js';

const enabled = process.env.ASHIBA_SKIP_DB_BACKED_TESTS !== '1';
describe.skipIf(!enabled)('three correlated destination links on PostgreSQL', () => {
  let admin: Client;
  let db: Client;
  let created = false;
  const database = 'velvet_multi_' + randomUUID().replaceAll('-', '');
  const definition: TransferExecutionDefinition = {
    settingId: '1',
    sourceSchema: 'public',
    sourceTable: 'source',
    sourceKeyDefinition: { keys: [{ column: 'logical_id', type: 'text' }] },
    resolveLogicalKey: (key) => ({ logical_id: key.id }),
  };
  // Business version identifies the accounting fact. Allocation values are only new-Black candidates.
  const sourceSql = `with snapshot as materialized (
    select id as logical_id, id || '-' || version as journal_key,
      nextval('public.allocation_sequence')::text as allocation,
      nextval('public.row_sequence')::text as journal_id,
      nextval('public.row_sequence')::text as debit_id,
      nextval('public.row_sequence')::text as credit_id,
      debit_account, credit_account, amount, -amount as credit_amount,
      posting_date::text, journal_memo, null::text as ledger_memo,
      'journal'::text as journal_role, 'debit'::text as debit_role, 'credit'::text as credit_role
    from public.source
  ) select * from snapshot`;
  const journalInsert = `insert into public.journal(row_id,journal_key,allocation,role,account,counter_account,amount,posting_date,memo)
    values (:row_id,:journal_key,:allocation,:role,:account,:counter_account,:amount,:posting_date,:memo) returning row_id`;
  // This stored SQL actually reads earlier writes in this transaction; it does not consume RETURNING.
  const ledgerInsert = `insert into public.general_ledger(row_id,journal_key,allocation,role,account,counter_account,amount,posting_date,memo)
    select :row_id,:journal_key,:allocation,:role,:account,:counter_account,:amount,:posting_date,:memo
    where exists (select 1 from public.journal where journal_key=:journal_key and amount > 0)
    returning row_id`;
  const journalCompare = `select jsonb_build_object('row_id',:row_id::text,'journal_key',:journal_key::text,
    'allocation',:allocation::text,'role',:role::text,'account',:account::text,'counter_account',:counter_account::text,
    'amount',:amount::numeric,'posting_date',:posting_date::date,'memo',:memo::text)::text current_values,
    to_jsonb(d)::text active_values from public.journal d where row_id=(:velvet_active_destination_key::jsonb->>'row_id')`;
  const ledgerCompare = `select jsonb_build_object('row_id',:row_id::text,'journal_key',:journal_key::text,
    'allocation',:allocation::text,'role',:role::text,'account',:account::text,'counter_account',:counter_account::text,
    'amount',:amount::numeric,'posting_date',:posting_date::date,'memo',:memo::text)::text current_values,
    to_jsonb(d)::text active_values from public.general_ledger d where row_id=(:velvet_active_destination_key::jsonb->>'row_id')`;
  const journalRed = `insert into public.journal
    select nextval('public.row_sequence')::text,journal_key,allocation,role,account,counter_account,-amount,posting_date,memo
    from public.journal where row_id=:row_id returning row_id`;
  const ledgerRed = `insert into public.general_ledger
    select nextval('public.row_sequence')::text,journal_key,allocation,role,account,counter_account,-amount,posting_date,memo
    from public.general_ledger where row_id=:row_id returning row_id`;
  const run = (client: TransferExecutionClient = db) =>
    executeTransfer(client, [definition], { settingId: '1' });
  const dirty = () =>
    db.query(`insert into rawsql_transfer.dirty_key(source_schema_name,source_table_name,source_key_json)
    values ('public','source','{"id":"J100"}')`);
  const results = async (runId: string) =>
    (
      await db.query(
        `select p.destination_link_id, p.processing_result,
    p.processing_status, p.dirty_key_id, w.source_key_json
    from rawsql_transfer.dirty_key_processing p join rawsql_transfer.work_item w using(work_item_id)
    join rawsql_transfer.destination_link l on l.destination_link_id=p.destination_link_id
    where p.run_id=$1 order by l.execution_order`,
        [runId],
      )
    ).rows;
  const state = async () => {
    // Full row snapshots include old Work Item references, not just row counts.
    const queries = [
      'select * from public.journal order by row_id',
      'select * from public.general_ledger order by row_id',
      'select * from public.write_log order by position',
      'select * from rawsql_transfer.active_black order by active_black_id',
      'select * from rawsql_transfer.lineage order by lineage_id',
      'select * from rawsql_transfer.work_item order by work_item_id',
      'select * from rawsql_transfer.dirty_key_processing order by dirty_key_processing_id',
      'select * from rawsql_transfer.dirty_key order by dirty_key_id',
      "select * from rawsql_transfer.run where run_status='succeeded' order by run_id",
    ];
    const rows = [];
    for (const query of queries) rows.push((await db.query(query)).rows);
    return rows;
  };
  const writes = async () =>
    (
      await db.query(
        'select role,amount::text,journal_key,allocation from public.write_log order by position',
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
    await db.query(`create table public.source(id text primary key,version integer not null default 1,
      debit_account text,credit_account text,amount numeric,posting_date date,journal_memo text);
      create sequence public.allocation_sequence;
      create sequence public.row_sequence;
      create table public.journal(row_id text primary key,journal_key text,allocation text,role text,
        account text,counter_account text,amount numeric,posting_date date,memo text);
      create table public.general_ledger(like public.journal including all);
      create table public.write_log(position bigint generated always as identity,role text,amount numeric,journal_key text,allocation text);
      create function public.observe_write() returns trigger language plpgsql as $$
      begin
        if current_setting('velvet.fail_role',true)=new.role then raise exception 'rejected % write',new.role; end if;
        insert into public.write_log(role,amount,journal_key,allocation) values(new.role,new.amount,new.journal_key,new.allocation);
        return new;
      end $$;
      create trigger observe_journal before insert on public.journal for each row execute function public.observe_write();
      create trigger observe_ledger before insert on public.general_ledger for each row execute function public.observe_write();
      create function public.reject_mutation() returns trigger language plpgsql as $$
      begin raise exception 'immutable row mutated'; end $$;
      create trigger immutable_journal before update or delete on public.journal for each row execute function public.reject_mutation();
      create trigger immutable_ledger before update or delete on public.general_ledger for each row execute function public.reject_mutation()`);
  });
  afterAll(async () => {
    await db?.end();
    if (created) await admin.query('drop database ' + database);
    await admin?.end();
  });
  beforeEach(async () => {
    await db.query(`truncate rawsql_transfer.setting,rawsql_transfer.destination_definition,rawsql_transfer.dirty_key,
      public.source,public.journal,public.general_ledger,public.write_log restart identity cascade;
      alter sequence public.allocation_sequence restart with 1;
      alter sequence public.row_sequence restart with 1;
      set velvet.fail_role=''`);
    const columns = {
      columns: [
        'row_id',
        'journal_key',
        'allocation',
        'role',
        'account',
        'counter_account',
        'amount',
        'posting_date',
        'memo',
      ].map((name) => ({
        name,
        type: name === 'amount' ? 'numeric' : name === 'posting_date' ? 'date' : 'text',
      })),
    };
    for (const [id, name, red] of [
      [1, 'journal', journalRed],
      [2, 'general_ledger', ledgerRed],
    ] as const) {
      await db.query(
        `insert into rawsql_transfer.destination_definition(destination_definition_id,destination_definition_name,
        destination_table_name,destination_columns,destination_key_columns,transfer_model,sign_inversion_columns,
        generated_red_transfer_sql_body,sequence_expression_definition)
        values ($1,$2,$3,$4,array['row_id'],'immutable',array['amount'],$5,$6)`,
        [
          id,
          name,
          'public.' + name,
          columns,
          red,
          { row_id: "nextval('public.row_sequence')::text" },
        ],
      );
    }
    await db.query(
      `insert into rawsql_transfer.setting(setting_id,setting_name,source_sql_body,source_sql_hash,
      source_key_definition,source_sql_analysis_status) values(1,'journal source',$1,'trusted',$2,'not_analyzed')`,
      [sourceSql, definition.sourceKeyDefinition],
    );
    // IDs and registration order deliberately disagree with execution_order.
    for (const [id, order, role, destination, key] of [
      [10, 3, 'credit', 2, 'credit_id'],
      [30, 1, 'journal', 1, 'journal_id'],
      [20, 2, 'debit', 2, 'debit_id'],
    ] as const) {
      const mapping = {
        row_id: key,
        journal_key: 'journal_key',
        allocation: 'allocation',
        role: role + '_role',
        account: role === 'credit' ? 'credit_account' : 'debit_account',
        counter_account: role === 'credit' ? 'debit_account' : 'credit_account',
        amount: role === 'credit' ? 'credit_amount' : 'amount',
        posting_date: 'posting_date',
        memo: role === 'journal' ? 'journal_memo' : 'ledger_memo',
      };
      await db.query(
        `insert into rawsql_transfer.destination_link(destination_link_id,setting_id,destination_definition_id,
        destination_link_name,execution_order,destination_key_mapping,mapping_definition,diff_compare_excluded_columns,
        generated_insert_transfer_sql_body,generated_reassessment_sql_body)
        values($1,1,$2,$3,$4,$5,$6,'{"columns":["row_id","allocation"]}',$7,$8)`,
        [
          id,
          destination,
          role,
          order,
          { sourceKey: ['logical_id'], destinationKey: [{ name: 'row_id', sourceColumn: key }] },
          { columns: mapping },
          role === 'journal' ? journalInsert : ledgerInsert,
          role === 'journal' ? journalCompare : ledgerCompare,
        ],
      );
    }
    await db.query(
      "insert into public.source values('J100',1,'receivable','sales',100,'2026-09-13','initial')",
    );
    await dirty();
  });
  test('one evaluated source snapshot shares allocation, mappings and write order across all three links', async () => {
    let evaluations = 0;
    const client: TransferExecutionClient = {
      async query(text, values) {
        if (text === sourceSql) evaluations++;
        return db.query(text, values);
      },
    };
    const initial = await run(client);
    expect(initial).toMatchObject({ inserted: 3, skipped: 0 });
    expect(evaluations).toBe(1);
    expect(await writes()).toEqual([
      { role: 'journal', amount: '100', journal_key: 'J100-1', allocation: '1' },
      { role: 'debit', amount: '100', journal_key: 'J100-1', allocation: '1' },
      { role: 'credit', amount: '-100', journal_key: 'J100-1', allocation: '1' },
    ]);
    expect(
      (
        await db.query(`select row_id,role,account,counter_account,amount::text,posting_date::text
      from public.general_ledger order by row_id`)
      ).rows,
    ).toEqual([
      {
        row_id: '2',
        role: 'debit',
        account: 'receivable',
        counter_account: 'sales',
        amount: '100',
        posting_date: '2026-09-13',
      },
      {
        row_id: '3',
        role: 'credit',
        account: 'sales',
        counter_account: 'receivable',
        amount: '-100',
        posting_date: '2026-09-13',
      },
    ]);
    const processing = await results(initial.runId);
    expect(processing.map((p) => p.destination_link_id)).toEqual(['30', '20', '10']);
    expect(
      processing.every(
        (p) =>
          p.processing_result === 'black_insert' &&
          p.processing_status === 'succeeded' &&
          p.source_key_json.logical_id === 'J100',
      ),
    ).toBe(true);
    expect(new Set(processing.map((p) => p.dirty_key_id)).size).toBe(1);
    const before = await state();
    await dirty();
    const unchanged = await run(client);
    expect(unchanged).toMatchObject({ inserted: 0, skipped: 3 });
    expect(evaluations).toBe(2);
    expect(
      (await db.query('select last_value::text from public.allocation_sequence')).rows[0]
        .last_value,
    ).toBe('2');
    expect(
      (await db.query('select last_value::text from public.row_sequence')).rows[0].last_value,
    ).toBe('6');
    expect((await state()).slice(0, 5)).toEqual(before.slice(0, 5));
    expect((await results(unchanged.runId)).map((p) => p.processing_result)).toEqual([
      'no_op',
      'no_op',
      'no_op',
    ]);
  });
  test('100 to 120 correction retains original Red provenance and correlates all new Blacks', async () => {
    await run();
    const old = await state();
    await db.query('update public.source set amount=120,version=2');
    await dirty();
    const corrected = await run();
    expect(corrected).toMatchObject({ inserted: 3, skipped: 0 });
    expect((await results(corrected.runId)).map((p) => p.processing_result)).toEqual([
      'red_then_black_insert',
      'red_then_black_insert',
      'red_then_black_insert',
    ]);
    expect((await writes()).slice(3)).toEqual([
      { role: 'journal', amount: '-100', journal_key: 'J100-1', allocation: '1' },
      { role: 'journal', amount: '120', journal_key: 'J100-2', allocation: '2' },
      { role: 'debit', amount: '-100', journal_key: 'J100-1', allocation: '1' },
      { role: 'debit', amount: '120', journal_key: 'J100-2', allocation: '2' },
      { role: 'credit', amount: '100', journal_key: 'J100-1', allocation: '1' },
      { role: 'credit', amount: '-120', journal_key: 'J100-2', allocation: '2' },
    ]);
    const after = await state();
    for (const row of old[0]) expect(after[0]).toContainEqual(row);
    for (const row of old[1]) expect(after[1]).toContainEqual(row);
    expect(after[3].map((a) => a.destination_key_json.row_id).sort()).toEqual(['4', '5', '6']);
    const lineage = (
      await db.query(
        `select destination_link_id,source_kind,source_key_json,destination_key_json
      from rawsql_transfer.lineage where run_id=$1 order by lineage_id`,
        [corrected.runId],
      )
    ).rows;
    expect(lineage).toEqual([
      {
        destination_link_id: '30',
        source_kind: 'reversed_destination_row',
        source_key_json: { row_id: '1' },
        destination_key_json: { row_id: '7' },
      },
      {
        destination_link_id: '30',
        source_kind: 'transfer_source',
        source_key_json: { logical_id: 'J100' },
        destination_key_json: { row_id: '4' },
      },
      {
        destination_link_id: '20',
        source_kind: 'reversed_destination_row',
        source_key_json: { row_id: '2' },
        destination_key_json: { row_id: '8' },
      },
      {
        destination_link_id: '20',
        source_kind: 'transfer_source',
        source_key_json: { logical_id: 'J100' },
        destination_key_json: { row_id: '5' },
      },
      {
        destination_link_id: '10',
        source_kind: 'reversed_destination_row',
        source_key_json: { row_id: '3' },
        destination_key_json: { row_id: '9' },
      },
      {
        destination_link_id: '10',
        source_kind: 'transfer_source',
        source_key_json: { logical_id: 'J100' },
        destination_key_json: { row_id: '6' },
      },
    ]);
  });
  test('one Dirty Key changes only the journal memo while both ledger links independently no-op', async () => {
    await run();
    const before = await state();
    await db.query("update public.source set journal_memo='corrected description'");
    await dirty();
    const changed = await run();
    expect(changed).toMatchObject({ inserted: 1, skipped: 2 });
    const processing = await results(changed.runId);
    expect(processing.map((p) => p.processing_result)).toEqual([
      'red_then_black_insert',
      'no_op',
      'no_op',
    ]);
    expect(new Set(processing.map((p) => p.dirty_key_id)).size).toBe(1);
    expect((await state())[1]).toEqual(before[1]);
    expect((await state())[3].filter((a) => a.destination_link_id !== '30')).toEqual(
      before[3].filter((a) => a.destination_link_id !== '30'),
    );
    expect((await writes()).slice(3).map((w) => [w.role, w.journal_key])).toEqual([
      ['journal', 'J100-1'],
      ['journal', 'J100-1'],
    ]);
  });
  test.each([
    ['initial', 'debit'],
    ['initial', 'credit'],
    ['correction', 'debit'],
    ['correction', 'credit'],
  ])(
    '%s: a failing %s write rolls back earlier links and all work, then retry succeeds',
    async (phase, role) => {
      // Existing work makes rollback also prove that retired Active Blacks and cleared references return.
      if (phase === 'correction') {
        await run();
        await dirty();
        const unchanged = await run();
        expect(
          (
            await db.query(
              'select active_black_id from rawsql_transfer.work_item where run_id=$1',
              [unchanged.runId],
            )
          ).rows.every((w) => w.active_black_id !== null),
        ).toBe(true);
        await db.query('update public.source set amount=120,version=2');
        await dirty();
      }
      const before = await state();
      await db.query("select set_config('velvet.fail_role',$1,false)", [role]);
      let observedRoles: string[] = [];
      const client: TransferExecutionClient = {
        async query(text, values) {
          const result = await db.query(text, values);
          if (text.startsWith('insert into public.'))
            observedRoles = (await writes()).slice(before[2].length).map((w) => w.role);
          return result;
        },
      };
      const error = await run(client).catch((e) => e);
      const preceding = role === 'debit' ? ['journal'] : ['journal', 'debit'];
      expect(observedRoles).toEqual(
        phase === 'correction' ? preceding.flatMap((r) => [r, r]) : preceding,
      );
      expect(error).toBeInstanceOf(TransferExecutionError);
      expect(error.cause.message).toBe('rejected ' + role + ' write');
      expect(error.recoveryErrors).toEqual([]);
      expect(await state()).toEqual(before);
      expect(
        (
          await db.query(
            'select run_status,error_message from rawsql_transfer.run where run_id=$1',
            [error.runId],
          )
        ).rows,
      ).toEqual([{ run_status: 'failed', error_message: 'rejected ' + role + ' write' }]);
      expect(
        (await db.query('select run_status from rawsql_transfer.run order by run_id')).rows,
      ).toEqual(
        phase === 'correction'
          ? [{ run_status: 'succeeded' }, { run_status: 'succeeded' }, { run_status: 'failed' }]
          : [{ run_status: 'failed' }],
      );
      await db.query("set velvet.fail_role=''");
      const retried = await run();
      expect(retried).toMatchObject({ inserted: 3, skipped: 0 });
      expect((await results(retried.runId)).map((p) => p.processing_result)).toEqual(
        Array(3).fill(phase === 'correction' ? 'red_then_black_insert' : 'black_insert'),
      );
    },
  );
});
