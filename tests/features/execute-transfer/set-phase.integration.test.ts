import { readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { Client } from 'pg';
import { beforeAll, afterAll, beforeEach, describe, expect, test } from 'vitest';
import { executeTransfer } from '../../../src/features/execute-transfer/boundary.js';
import * as f from '../../support/set-phase-fixture.js';

describe.skipIf(process.env.ASHIBA_SKIP_DB_BACKED_TESTS === '1')('DB-managed immutable set phases', () => {
 let admin: Client, db: Client;
 const database='velvet_set_'+randomUUID().replaceAll('-','');
 const run=()=>executeTransfer(db,[],{settingId:'1',arguments:{owner:'1'}});
 beforeAll(async()=>{
  admin=new Client({connectionString:process.env.ASHIBA_DB_URL});await admin.connect();await admin.query('create database '+database);
  const url=new URL(process.env.ASHIBA_DB_URL!);url.pathname='/'+database;
  db=new Client({connectionString:url.toString()});await db.connect();
  const root=new URL('../../../db/ddl/',import.meta.url);
  for(const file of JSON.parse(await readFile(new URL('order.json',root),'utf8')).order)
   await db.query(await readFile(new URL(file,root),'utf8'));
  await f.install(db);
 });
 afterAll(async()=>{await db?.end();await admin?.query('drop database if exists '+database+' with (force)');await admin?.end();});
 beforeEach(async()=>{await f.setup(db);await f.enable(db);});
 test('ordered real writes, no-op, asymmetric exclusions, correction, disappearance and reappearance',async()=>{
  await db.query("set velvet.observe='on'");
  await f.dirty(db);expect((await run()).inserted).toBe(15);
  await f.dirty(db);expect((await run()).skipped).toBe(15);
  await db.query("update product_source set memo='changed' where id='1'");await f.dirty(db,'1');
  const memo=await run();expect(memo.inserted).toBe(1);expect(memo.skipped).toBe(2);
  await db.query("update product_source set amount=123.000000000000000000000001 where id='1'");await f.dirty(db,'1');
  expect((await run()).inserted).toBe(3);
  await f.dirty(db,'1');await db.query("delete from product_source where id='1'");await run();
  expect((await db.query("select count(*)::int n from rawsql_transfer.active_black where source_key_json->>'logical_id'='1'")).rows[0].n).toBe(0);
  await db.query("insert into product_source values('1',null,null)");await f.dirty(db,'1');expect((await run()).inserted).toBe(3);
  await f.dirty(db,'1');expect((await run()).skipped).toBe(3);
  expect((await db.query('select execution_configuration->>\'engine\' engine from rawsql_transfer.run')).rows.every(r=>r.engine==='immutable-set-v1')).toBe(true);
 });
 test('whole-key cap, duplicates, complete source once and empty retry cleanup',async()=>{
  await f.enable(db,2);await f.dirty(db,'1');await f.dirty(db,'1');await f.dirty(db,'2');
  const first=await run();expect(first.inserted).toBe(3);expect(first.skipped).toBe(3);
  expect((await db.query('select last_value::int n from product_allocation')).rows[0].n).toBe(5);
  expect((await run()).inserted).toBe(3);
  expect((await db.query('select last_value::int n from product_allocation')).rows[0].n).toBe(10);
  expect((await run()).inserted).toBe(0);
  expect((await db.query('select last_value::int n from product_allocation')).rows[0].n).toBe(10);
  expect((await db.query("select count(*)::int n from pg_class where relnamespace=pg_my_temp_schema() and relname like 'velvet_%'")).rows[0].n).toBe(0);
 });
 test('enabling over existing row history preserves exact old keys and retires historical references',async()=>{
  await db.query('update rawsql_transfer.setting set set_phase_definition=null');await f.dirty(db);
  await executeTransfer(db,[f.definition()],{settingId:'1',arguments:{owner:'1'}});
  const old=(await db.query('select destination_key_json from rawsql_transfer.active_black order by active_black_id')).rows;
  await f.enable(db);await f.dirty(db);expect((await run()).skipped).toBe(15);
  expect((await db.query('select destination_key_json from rawsql_transfer.active_black order by active_black_id')).rows).toEqual(old);
  await db.query('update product_source set amount=200');await f.dirty(db);expect((await run()).inserted).toBe(15);
  expect((await db.query('select count(*)::int n from rawsql_transfer.work_item where active_black_id is not null')).rows[0].n).toBe(0);
 });
 test('downstream failure rolls back destination and metadata, retains failed Run, then retries',async()=>{
  await f.dirty(db);await run();await db.query('update product_source set amount=200');await f.dirty(db);
  const before=await f.snapshot(db);await db.query("set velvet.fail_role='3'");await expect(run()).rejects.toThrow();
  expect(await f.snapshot(db)).toEqual(before);
  expect((await db.query('select run_status from rawsql_transfer.run order by run_id desc limit 1')).rows[0].run_status).toBe('failed');
  await db.query("set velvet.fail_role=''");expect((await run()).inserted).toBe(15);
 });
 test.each(['drop_write','rewrite_key'])('rejects actual INSERT mismatch: %s',async(mode)=>{
  await f.dirty(db);const before=await f.snapshot(db);await db.query('set velvet.'+mode+"='on'");
  await expect(run()).rejects.toThrow();expect(await f.snapshot(db)).toEqual(before);
 });
 test('explicit misconfiguration never falls back to row SQL',async()=>{
  await f.dirty(db);await db.query('update rawsql_transfer.destination_link set set_phase_definition=null where destination_link_id=10');
  await expect(run()).rejects.toThrow();expect((await db.query('select count(*)::int n from product_destination')).rows[0].n).toBe(0);
 });
 test('lost successful COMMIT response remains durable and retry does no work',async()=>{
  await f.dirty(db);let commits=0;
  const client={query:async(text:string,values?:unknown[])=>{const result=await db.query(text,values);if(text.trim().toLowerCase()==='commit'&&++commits===2)throw new Error('lost commit response');return result;}};
  await expect(executeTransfer(client,[],{settingId:'1',arguments:{owner:'1'}})).rejects.toThrow();
  expect((await db.query('select run_status from rawsql_transfer.run order by run_id desc limit 1')).rows[0].run_status).toBe('succeeded');
  expect((await run()).inserted).toBe(0);
 });
});
