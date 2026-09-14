import { readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { Client } from 'pg';
import { bind, sql, type Sql } from '@mk3008/serene';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';

describe.skipIf(process.env.ASHIBA_SKIP_DB_BACKED_TESTS === '1')(
  'persistent transfer invariants',
  () => {
    let admin: Client, db: Client;
    const database = 'velvet_invariants_' + randomUUID().replaceAll('-', '');
    const query = (statement: Sql, params: Record<string, unknown> = {}) => {
      const b = bind(statement, params, 'indexed');
      return db.query(b.text, b.values);
    };
    beforeAll(async () => {
      admin = new Client({ connectionString: process.env.ASHIBA_DB_URL });
      await admin.connect();
      await admin.query('create database ' + database);
      const url = new URL(process.env.ASHIBA_DB_URL!);
      url.pathname = '/' + database;
      db = new Client({ connectionString: url.toString() });
      await db.connect();
      const root = new URL('../../../db/ddl/', import.meta.url);
      for (const file of JSON.parse(await readFile(new URL('order.json', root), 'utf8')).order)
        await db.query(await readFile(new URL(file, root), 'utf8'));
      await db.query(`insert into rawsql_transfer.setting
      (setting_id,setting_name,source_sql_body,source_sql_hash,source_key_definition,source_sql_analysis_status)
      values(1,'schema-test','select 1','test','{"keys":[{"column":"id","type":"text"}]}','not_analyzed');
      insert into rawsql_transfer.destination_definition
      (destination_definition_id,destination_definition_name,destination_table_name,destination_columns,destination_key_columns,transfer_model,sign_inversion_columns)
      values(1,'schema-test','public.destination','{}',array['id'],'immutable',array['amount']);
      insert into rawsql_transfer.destination_link
      (destination_link_id,setting_id,destination_definition_id,destination_link_name,execution_order,destination_key_mapping,mapping_definition)
      values(1,1,1,'schema-test',1,'{}','{}');
      insert into rawsql_transfer.dirty_key(dirty_key_id,source_schema_name,source_table_name,source_key_json)
      values(1,'public','source','{"physical_id":"1"}');
      insert into rawsql_transfer.run(run_id,setting_id,run_status) values(1,1,'running');`);
    });
    afterAll(async () => {
      await db?.end();
      await admin?.query('drop database if exists ' + database + ' with (force)');
      await admin?.end();
    });
    const work = sql`insert into rawsql_transfer.work_item
    (run_id,dirty_key_id,setting_id,destination_link_id,source_key_json,source_key_hash,
     transfer_model,route_type,source_exists,requires_red_transfer,requires_black_insert_transfer,
     requires_black_update_transfer,requires_physical_delete_transfer,skip_reason,evaluated_destination_key_json)
    values(1,1,1,1,'{"id":"1"}','test',:model,:route,:source,:red,:insert,:update,:delete,:skip,:evaluated::jsonb)
    returning work_item_id`;
    const initial = {
      model: 'immutable',
      route: 'immutable',
      source: true,
      red: false,
      insert: true,
      update: false,
      delete: false,
      skip: null,
      evaluated: null,
    };
    async function isolated(operation: () => Promise<void>) {
      await db.query('begin');
      try {
        await operation();
      } finally {
        await db.query('rollback');
      }
    }
    async function rejected(operation: () => Promise<unknown>, constraint: string) {
      await db.query('savepoint invalid_state');
      await expect(operation()).rejects.toMatchObject({ code: '23514', constraint });
      await db.query('rollback to savepoint invalid_state');
      await db.query('release savepoint invalid_state');
    }
    test('accepts each supported route, skips, and retired historical evaluation keys', async () => {
      const previous = JSON.stringify({ id: 'old' });
      for (const change of [
        {},
        { red: true, evaluated: previous },
        { source: false, red: true, insert: false, evaluated: previous },
        { model: 'mutable', route: 'mutable' },
        { model: 'mutable', route: 'mutable', insert: false, update: true, evaluated: previous },
        {
          model: 'mutable',
          route: 'mutable',
          source: false,
          insert: false,
          delete: true,
          evaluated: previous,
        },
        { model: 'insert_only', route: 'insert_only' },
        ...['immutable', 'mutable', 'insert_only'].flatMap((model) =>
          ['no_op', 'duplicate_ignore'].flatMap((skip) =>
            [true, false].map((source) => ({
              model,
              route: 'skipped',
              insert: false,
              skip,
              source,
            })),
          ),
        ),
      ])
        await isolated(async () => {
          const result = await query(work, { ...initial, ...change });
          expect(result.rowCount).toBe(1);
          // Current Destination is immutable; historical models are independent snapshots.
          // A retired Active Black is NULL even when Red/UPDATE/DELETE history retains its key.
          expect(
            (await db.query('select active_black_id from rawsql_transfer.work_item')).rows[0]
              .active_black_id,
          ).toBeNull();
        });
    });
    test('rejects impossible Work INSERTs and UPDATEs directly', async () =>
      isolated(async () => {
        for (const change of [{ route: 'mutable' }, { route: 'insert_only' }])
          await rejected(() => query(work, { ...initial, ...change }), 'chk_work_item_route_model');
        for (const change of [
          { model: 'mutable', route: 'mutable', red: true },
          { model: 'insert_only', route: 'insert_only', red: true },
          { update: true },
          { delete: true },
          { source: false },
          { model: 'insert_only', route: 'insert_only', insert: false, update: true },
          {
            model: 'insert_only',
            route: 'insert_only',
            source: false,
            insert: false,
            delete: true,
          },
          { model: 'mutable', route: 'mutable', insert: false, source: false, update: true },
          { model: 'mutable', route: 'mutable', insert: false, delete: true },
          { model: 'mutable', route: 'mutable', update: true },
        ])
          await rejected(
            () => query(work, { ...initial, ...change }),
            'chk_work_item_operation_model',
          );
        await query(work, initial);
        await rejected(
          () => db.query("update rawsql_transfer.work_item set route_type='mutable'"),
          'chk_work_item_route_model',
        );
        await rejected(
          () =>
            db.query('update rawsql_transfer.work_item set requires_black_update_transfer=true'),
          'chk_work_item_operation_model',
        );
      }));
    const processing = sql`insert into rawsql_transfer.dirty_key_processing
    (dirty_key_id,run_id,work_item_id,setting_id,destination_link_id,source_key_json,source_key_hash,processing_status,processing_result,error_message)
    values(1,1,:work,1,1,'{"id":"1"}','test',:status,:result,:error)`;
    test('protects final Processing meaning without inventing a failed-attempt contract', async () =>
      isolated(async () => {
        const w = (await query(work, initial)).rows[0].work_item_id;
        for (const result of [
          'no_op',
          'duplicate_ignore',
          'red_then_black_insert',
          'black_insert',
          'red',
          'black_update',
          'physical_delete',
        ]) {
          const skipped = ['no_op', 'duplicate_ignore'].includes(result);
          await rejected(
            () =>
              query(processing, {
                work: w,
                result,
                status: skipped ? 'succeeded' : 'skipped',
                error: null,
              }),
            'chk_dirty_key_processing_final_result',
          );
          await query(processing, {
            work: w,
            result,
            status: skipped ? 'skipped' : 'succeeded',
            error: null,
          });
          await rejected(
            () =>
              db.query(
                "update rawsql_transfer.dirty_key_processing set processing_status=case processing_status when 'skipped' then 'succeeded' else 'skipped' end",
              ),
            'chk_dirty_key_processing_final_result',
          );
          await db.query('delete from rawsql_transfer.dirty_key_processing');
          // Failed attempts are not finalized, and can carry a nullable diagnostic.
          await query(processing, { work: w, result, status: 'failed', error: null });
          await query(processing, { work: w, result, status: 'failed', error: 'diagnostic' });
          await db.query('delete from rawsql_transfer.dirty_key_processing');
        }
      }));
    const lineage = sql`insert into rawsql_transfer.lineage
    (run_id,setting_id,destination_link_id,work_item_id,transfer_operation,source_kind,source_key_json,source_key_hash,destination_table_name,destination_key_json,destination_key_hash)
    values(1,1,1,null,:operation,:kind,'{"id":"old"}','test','public.destination','{"id":"new"}','test')`;
    test('protects Black and Red provenance with optional Work references', async () =>
      isolated(async () => {
        for (const [operation, kind, wrong] of [
          ['black_insert', 'transfer_source', 'reversed_destination_row'],
          ['red_insert', 'reversed_destination_row', 'transfer_source'],
        ]) {
          await rejected(
            () => query(lineage, { operation, kind: wrong }),
            'chk_lineage_operation_source_kind',
          );
          await query(lineage, { operation, kind });
          await rejected(
            () => query(sql`update rawsql_transfer.lineage set source_kind=:wrong`, { wrong }),
            'chk_lineage_operation_source_kind',
          );
          await db.query('delete from rawsql_transfer.lineage');
        }
      }));
    test('upgrade validates existing rows atomically and matches canonical CHECKs', async () => {
      const definitions = () =>
        db.query(`select conname,pg_get_constraintdef(oid) definition from pg_constraint
      where connamespace='rawsql_transfer'::regnamespace and conname in
      ('chk_work_item_route_model','chk_work_item_operation_model','chk_dirty_key_processing_final_result','chk_lineage_operation_source_kind') order by conname`);
      const canonical = (await definitions()).rows;
      expect(canonical).toHaveLength(4);
      await db.query(`alter table rawsql_transfer.work_item drop constraint chk_work_item_route_model, drop constraint chk_work_item_operation_model;
      alter table rawsql_transfer.dirty_key_processing drop constraint chk_dirty_key_processing_final_result;
      alter table rawsql_transfer.lineage drop constraint chk_lineage_operation_source_kind;`);
      await query(work, initial);
      await query(lineage, { operation: 'red_insert', kind: 'transfer_source' });
      const migration = await readFile(
        new URL('../../../db/migrations/0018-schema-invariants.sql', import.meta.url),
        'utf8',
      );
      await expect(db.query(migration)).rejects.toThrow(/chk_lineage_operation_source_kind/);
      await db.query('rollback');
      expect((await definitions()).rows).toEqual([]);
      expect((await db.query('select source_kind from rawsql_transfer.lineage')).rows).toEqual([
        { source_kind: 'transfer_source' },
      ]);
      // Test-owned legacy row is corrected explicitly; the migration never rewrites evidence.
      await db.query("update rawsql_transfer.lineage set source_kind='reversed_destination_row'");
      const before = (await db.query('select to_jsonb(w) value from rawsql_transfer.work_item w'))
        .rows;
      await db.query(migration);
      expect((await definitions()).rows).toEqual(canonical);
      expect(
        (await db.query('select to_jsonb(w) value from rawsql_transfer.work_item w')).rows,
      ).toEqual(before);
      await isolated(async () => {
        await rejected(
          () => db.query('update rawsql_transfer.work_item set source_exists=false'),
          'chk_work_item_operation_model',
        );
        await rejected(
          () => db.query("update rawsql_transfer.lineage set source_kind='transfer_source'"),
          'chk_lineage_operation_source_kind',
        );
      });
    });
  },
);
