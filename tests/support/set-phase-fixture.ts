import { createHash } from 'node:crypto';
import { bind, sql } from '@mk3008/serene';
import type { Client } from 'pg';
import type { TransferExecutionDefinition } from '../../src/features/execute-transfer/boundary.js';

export const reviewed = (text: string) => ({
  text,
  sha256: createHash('sha256').update(text).digest('hex'),
});
export const sourceSql = `select id logical_id,amount,memo,:owner::text owner,
 nextval('public.product_allocation')::text allocation,
 nextval('public.product_key')::text key1,nextval('public.product_key')::text key2,
 nextval('public.product_key')::text key3,'1'::text role1,'2'::text role2,'3'::text role3
 from public.product_source`;
const sourceIdentity = `select jsonb_build_object('logical_id',s.logical_id) source_key,to_jsonb(s) source_values
 from pg_temp.velvet_source_snapshot s`;
const dirtyIdentity = `select dirty_key_id,jsonb_build_object('logical_id',source_key_json->'id') source_key
 from pg_temp.velvet_pending_keys`;
const evaluate = `select i.dirty_key_id,
 case when i.source_exists then to_jsonb(v) end current_values,to_jsonb(d) active_values
 from pg_temp.velvet_phase_input i
 left join public.product_destination d on d.row_id=i.active_key->>'row_id'
 cross join lateral public.product_values(i.mapped_values->>'row_id',i.mapped_values->>'logical_id',
 (i.mapped_values->>'amount')::numeric,i.mapped_values->>'memo',i.mapped_values->>'allocation',
 i.mapped_values->>'role',i.mapped_values->>'owner') v where i.occurrence=1`;
const redProjection = `with keys as materialized (
 select dirty_key_id,nextval('public.product_key')::text red_id
 from pg_temp.velvet_phase_decision where requires_red)
 select k.dirty_key_id,jsonb_build_object('row_id',k.red_id) red_key,
 to_jsonb(d)||jsonb_build_object('row_id',k.red_id,'amount',-d.amount) red_values
 from keys k join pg_temp.velvet_phase_decision i using(dirty_key_id)
 join public.product_destination d on d.row_id=i.active_key->>'row_id'`;
const red = `insert into public.product_destination
 select destination_values->>'row_id',destination_values->>'logical_id',
 (destination_values->>'amount')::numeric,destination_values->>'memo',destination_values->>'allocation',
 destination_values->>'role',destination_values->>'owner',destination_values->>'journal_key'
 from pg_temp.velvet_phase_writes`;
const black = `insert into public.product_destination select v.* from pg_temp.velvet_phase_writes w
 cross join lateral public.product_values(w.destination_values->>'row_id',w.destination_values->>'logical_id',
 (w.destination_values->>'amount')::numeric,w.destination_values->>'memo',w.destination_values->>'allocation',
 w.destination_values->>'role',w.destination_values->>'owner') v`;
const verify = `select w.operation,jsonb_build_object('row_id',d.row_id) destination_key,to_jsonb(d) destination_values
 from pg_temp.velvet_phase_writes w join public.product_destination d on d.row_id=w.destination_key->>'row_id'`;
const rowInsert = `insert into public.product_destination select v.* from public.product_values(
 :row_id::text,:logical_id::text,:amount::numeric,:memo::text,:allocation::text,:role::text,:owner::text) v
 where :journal_key::text is not null returning row_id`;
const rowCompare = `select to_jsonb(v)::text current_values,to_jsonb(d)::text active_values
 from public.product_destination d cross join lateral public.product_values(
 :row_id::text,:logical_id::text,:amount::numeric,:memo::text,:allocation::text,:role::text,:owner::text) v
 where d.row_id=:velvet_active_destination_key::jsonb->>'row_id'`;
const rowRed = `insert into public.product_destination
 select nextval('public.product_key')::text,logical_id,-amount,memo,allocation,role,owner,journal_key
 from public.product_destination where row_id=:row_id returning row_id`;
export const definition = (settingId = '1'): TransferExecutionDefinition => ({
  settingId,
  sourceSchema: 'public',
  sourceTable: 'product_source',
  sourceKeyDefinition: { keys: [{ column: 'logical_id', type: 'text' }] },
  resolveLogicalKey: (k) => ({ logical_id: k.id }),
});
export async function install(db: Client) {
  await db.query(`create table public.product_source(id text primary key,amount numeric,memo text);
 create sequence public.product_key; create sequence public.product_allocation;
 create table public.product_destination(row_id text primary key,logical_id text,amount numeric,memo text,
 allocation text,role text,owner text,journal_key text not null references public.product_destination(row_id));
 create index product_journal on public.product_destination(owner,logical_id,role);
 create function public.product_values(k text,id text,a numeric,m text,alloc text,r text,o text)
 returns table(row_id text,logical_id text,amount numeric,memo text,allocation text,role text,owner text,journal_key text)
 language sql stable as $$ select k,id,a,m,alloc,r,o,
 case when r='1' then k else (select d.row_id from rawsql_transfer.destination_link l
 join rawsql_transfer.active_black b on b.destination_link_id=l.destination_link_id
  and b.source_key_json=jsonb_build_object('logical_id',id)
 join public.product_destination d on d.row_id=b.destination_key_json->>'row_id'
 where l.setting_id=o::bigint and l.execution_order=1 and d.owner=o and d.logical_id=id and d.role='1') end $$;
 create function public.product_guard() returns trigger language plpgsql as $$
 declare w record;
 begin
 if current_setting('velvet.fail_role',true)=new.role then raise exception 'downstream failure'; end if;
 if current_setting('velvet.drop_write',true)='on' then return null; end if;
 if current_setting('velvet.rewrite_key',true)='on' then new.row_id:='rewritten'; end if;
 if current_setting('velvet.observe',true)='on' then
  select wi.* into strict w from rawsql_transfer.work_item wi
  join rawsql_transfer.destination_link l using(destination_link_id)
  where wi.run_id=(select max(run_id) from rawsql_transfer.run where setting_id=new.owner::bigint)
   and wi.source_key_json=jsonb_build_object('logical_id',new.logical_id)
   and wi.skip_reason is null and l.execution_order=new.role::int;
  if new.amount>=0 and w.requires_red_transfer then
   if exists(select 1 from rawsql_transfer.active_black where destination_link_id=w.destination_link_id and source_key_json=w.source_key_json)
    then raise exception 'Active not retired'; end if;
   if not exists(select 1 from rawsql_transfer.lineage where work_item_id=w.work_item_id and transfer_operation='red_insert')
    then raise exception 'Red Lineage missing'; end if;
  end if;
  if new.role::int>1 and not exists(select 1 from rawsql_transfer.dirty_key_processing p
   join rawsql_transfer.destination_link l using(destination_link_id)
   where p.run_id=w.run_id and p.dirty_key_id=w.dirty_key_id and l.execution_order=new.role::int-1)
   then raise exception 'Prior Processing missing'; end if;
 end if;
 return new;
 end $$;
 create trigger product_guard before insert on public.product_destination for each row execute function public.product_guard();`);
}

export async function setup(db: Client, n = 5, links = 3) {
  await db.query(`truncate rawsql_transfer.setting,rawsql_transfer.destination_definition,rawsql_transfer.dirty_key,
 public.product_source,public.product_destination restart identity cascade;
 alter sequence public.product_key restart with 1;alter sequence public.product_allocation restart with 1;
 set velvet.fail_role='';set velvet.drop_write='';set velvet.rewrite_key=''`);
  const exec = async (s: ReturnType<typeof sql>, p: Record<string, unknown>) => {
    const b = bind(s, p, 'indexed');
    return db.query(b.text, b.values);
  };
  await exec(
    sql`insert into public.product_source select i::text,100,repeat('m',128) from generate_series(1,:n::int) i`,
    { n },
  );
  await exec(
    sql`insert into rawsql_transfer.destination_definition(destination_definition_id,destination_definition_name,
 destination_table_name,destination_columns,destination_key_columns,transfer_model,sign_inversion_columns,generated_red_transfer_sql_body)
 values(1,'product','public.product_destination',:columns::jsonb,array['row_id'],'immutable',array['amount'],:red)`,
    {
      columns: JSON.stringify({
        columns: [
          'row_id',
          'logical_id',
          'amount',
          'memo',
          'allocation',
          'role',
          'owner',
          'journal_key',
        ].map((name) => ({ name, type: name === 'amount' ? 'numeric' : 'text' })),
      }),
      red: rowRed,
    },
  );
  await exec(
    sql`insert into rawsql_transfer.setting(setting_id,setting_name,source_sql_body,source_sql_hash,source_key_definition,source_sql_analysis_status)
 values(1,'product',:source,:hash,:keys::jsonb,'not_analyzed')`,
    {
      source: sourceSql,
      hash: reviewed(sourceSql).sha256,
      keys: JSON.stringify(definition().sourceKeyDefinition),
    },
  );
  for (let role = 1; role <= links; role++) {
    const mapping = {
      row_id: 'key' + role,
      logical_id: 'logical_id',
      amount: 'amount',
      memo: 'memo',
      allocation: 'allocation',
      role: 'role' + role,
      owner: 'owner',
      journal_key: 'key1',
    };
    await exec(
      sql`insert into rawsql_transfer.destination_link(destination_link_id,setting_id,destination_definition_id,destination_link_name,
   execution_order,destination_key_mapping,mapping_definition,diff_compare_excluded_columns,generated_insert_transfer_sql_body,generated_reassessment_sql_body)
   values(:id,1,1,:name,:role,:keys::jsonb,:mapping::jsonb,:excluded::jsonb,:insert,:compare)`,
      {
        id: [20, 10, 30][role - 1],
        name: 'role' + role,
        role,
        keys: JSON.stringify({
          sourceKey: ['logical_id'],
          destinationKey: [{ name: 'row_id', sourceColumn: 'key' + role }],
        }),
        mapping: JSON.stringify({ columns: mapping }),
        excluded: JSON.stringify({
          columns: ['row_id', 'allocation', 'journal_key', ...(role > 1 ? ['memo'] : [])],
        }),
        insert: rowInsert,
        compare: rowCompare,
      },
    );
  }
}

export async function enable(db: Client, cap = 1000) {
  const s = {
    version: 1,
    revision: 'fixture-reviewed-v1',
    independentKeys: true,
    maxDirtyKeys: cap,
    sourceSchema: 'public',
    sourceTable: 'product_source',
    sourceSqlSha256: reviewed(sourceSql).sha256,
    sourceIdentity: reviewed(sourceIdentity),
    dirtyIdentity: reviewed(dirtyIdentity),
  };
  const l = {
    version: 1,
    revision: 'fixture-reviewed-v1',
    evaluate: reviewed(evaluate),
    black: reviewed(black),
  };
  const d = {
    version: 1,
    revision: 'fixture-reviewed-v1',
    redProjection: reviewed(redProjection),
    red: reviewed(red),
    verify: reviewed(verify),
  };
  for (const [statement, value] of [
    [sql`update rawsql_transfer.setting set set_phase_definition=:value::jsonb`, s],
    [sql`update rawsql_transfer.destination_link set set_phase_definition=:value::jsonb`, l],
    [sql`update rawsql_transfer.destination_definition set set_phase_definition=:value::jsonb`, d],
  ] as const) {
    const b = bind(statement, { value: JSON.stringify(value) }, 'indexed');
    await db.query(b.text, b.values);
  }
}
export async function dirty(db: Client, id?: string) {
  const b = bind(
    sql`insert into rawsql_transfer.dirty_key(source_schema_name,source_table_name,source_key_json)
 select 'public','product_source',jsonb_build_object('id',id) from public.product_source where :id::text is null or id=:id`,
    { id: id ?? null },
    'indexed',
  );
  await db.query(b.text, b.values);
}

export async function snapshot(db: Client) {
  const result = await db.query(`select jsonb_build_object(
 'destination',(select jsonb_agg(to_jsonb(d)||jsonb_build_object('amount',d.amount::text) order by row_id) from public.product_destination d),
 'active',(select jsonb_agg(to_jsonb(d) order by active_black_id) from rawsql_transfer.active_black d),
 'work',(select jsonb_agg(to_jsonb(d) order by work_item_id) from rawsql_transfer.work_item d),
 'lineage',(select jsonb_agg(to_jsonb(d) order by lineage_id) from rawsql_transfer.lineage d),
 'processing',(select jsonb_agg(to_jsonb(d) order by dirty_key_processing_id) from rawsql_transfer.dirty_key_processing d),
 'dirty',(select jsonb_agg(to_jsonb(d) order by dirty_key_id) from rawsql_transfer.dirty_key d)) state`);
  return result.rows[0].state;
}
