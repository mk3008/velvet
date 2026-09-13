// Reduced transport/allocation kernel, NOT an alternative Velvet executor.
// No Work Item, Active Black, Lineage, Red or Processing implementation here.
import assert from 'node:assert/strict';
import { sql, bind } from '@mk3008/serene';

export async function runTransportProbe(db) {
  const results=[];
  await db.query(`create table public.probe_source(id integer primary key,amount numeric,memo text);
    create table public.probe_previous(id integer,link integer,amount numeric,memo text,primary key(id,link));
    create table public.probe_sink(id integer,link integer,amount numeric,memo text,allocation bigint,primary key(id,link));
    create sequence public.probe_alloc;
    create function public.probe_guard() returns trigger language plpgsql as $$ begin
      if current_setting('velvet.probe_fail',true)=new.link::text then raise exception 'probe downstream failure'; end if;
      return new; end $$;
    create trigger probe_guard before insert on public.probe_sink for each row execute function public.probe_guard()`);
  let metrics;
  const q=async(statement,params={})=>{
    const p=bind(statement,params,'indexed');
    metrics.calls++; metrics.sqlBytes+=Buffer.byteLength(p.text);
    metrics.parameterBytes+=Buffer.byteLength(JSON.stringify(p.values));
    const r=await db.query(p.text,p.values); metrics.resultBytes+=Buffer.byteLength(JSON.stringify(r.rows)); return r;
  };
  const control=async text=>{metrics.calls++;metrics.sqlBytes+=Buffer.byteLength(text);return db.query(text)};
  // Fixed identifiers and explicit source SQL; no concatenated stored SQL/relation names.
  const source=sql`select id,amount::text,memo,nextval('public.probe_alloc')::text allocation from public.probe_source`;
  const tempEager=sql`create temp table probe_snapshot on commit drop as
    select id,amount,memo,nextval('public.probe_alloc') allocation from public.probe_source`;
  const tempLazy=sql`create temp table probe_snapshot on commit drop as
    select id,amount,memo,null::bigint allocation from public.probe_source`;
  for(const n of [1000,10000]) for(const links of [1,3]) for(const changedFraction of [1,0.01]) {
    for(const mode of ['memory_batch','temp_eager','temp_deferred']) {
      await db.query(`truncate public.probe_source,public.probe_previous,public.probe_sink; alter sequence public.probe_alloc restart with 1`);
      metrics={calls:0,sqlBytes:0,parameterBytes:0,resultBytes:0};
      await q(sql`insert into public.probe_source select id,100,repeat('m',128) from generate_series(1,:n::int) id`,{n});
      await q(sql`insert into public.probe_previous select id,l,case when id<=:changed then 90 else 100 end,repeat('m',128)
        from generate_series(1,:n::int) id cross join generate_series(1,:links::int) l`,{n,links,changed:n*changedFraction});
      metrics={calls:0,sqlBytes:0,parameterBytes:0,resultBytes:0};
      const start=performance.now(); await control('begin');
      if(mode==='memory_batch') {
        const snapshot=(await q(source)).rows;
        // A bounded batch preserves numeric text in JSON; one snapshot is reused across all links.
        for(let link=1;link<=links;link++) for(let offset=0;offset<snapshot.length;offset+=1000) {
          await q(sql`insert into public.probe_sink
            select s.id,:link,s.amount,s.memo,s.allocation from
            jsonb_to_recordset(:rows::jsonb) s(id int,amount numeric,memo text,allocation bigint)
            join public.probe_previous p on p.id=s.id and p.link=:link
            where (s.amount,s.memo) is distinct from (p.amount,p.memo)`,{link,rows:JSON.stringify(snapshot.slice(offset,offset+1000))});
        }
      } else {
        await q(mode==='temp_eager'?tempEager:tempLazy);
        await control('analyze pg_temp.probe_snapshot');
        // Decisions are independent by link. Allocation is shared only by new writes, not a business version.
        await q(sql`create temp table probe_decisions on commit drop as
          select s.id,p.link from pg_temp.probe_snapshot s join public.probe_previous p using(id)
          where (s.amount,s.memo) is distinct from (p.amount,p.memo)`);
        if(mode==='temp_deferred') await q(sql`update pg_temp.probe_snapshot s set allocation=nextval('public.probe_alloc')
          where exists(select 1 from pg_temp.probe_decisions d where d.id=s.id)`);
        for(let link=1;link<=links;link++) await q(sql`insert into public.probe_sink
          select s.id,d.link,s.amount,s.memo,s.allocation from pg_temp.probe_snapshot s
          join pg_temp.probe_decisions d using(id) where d.link=:link`,{link});
      }
      await control('commit');
      const elapsedMs=performance.now()-start;
      const count=Number((await db.query('select count(*) n from public.probe_sink')).rows[0].n);
      assert.equal(count,n*links*changedFraction);
      assert.equal((await db.query('select id from public.probe_sink group by id having count(distinct allocation)<>1')).rowCount,0);
      assert.equal((await db.query("select to_regclass('pg_temp.probe_snapshot') r")).rows[0].r,null);
      const allocated=Number((await db.query('select last_value from public.probe_alloc')).rows[0].last_value);
      assert.equal(allocated,mode==='temp_deferred'?n*changedFraction:n);
      results.push({n,links,changedFraction,mode,elapsedMs,allocated,...metrics});
    }
  }
  // Temp lifetime and atomic downstream failure, reusing the same dedicated connection.
  metrics={calls:0,sqlBytes:0,parameterBytes:0,resultBytes:0};
  await db.query("truncate public.probe_sink; set velvet.probe_fail='3'");
  await control('begin'); await q(tempEager);
  await q(sql`insert into public.probe_sink select id,1,amount,memo,allocation from pg_temp.probe_snapshot`);
  await assert.rejects(q(sql`insert into public.probe_sink select id,3,amount,memo,allocation from pg_temp.probe_snapshot`),/probe downstream failure/);
  await control('rollback');
  assert.equal((await db.query('select count(*)::int n from public.probe_sink')).rows[0].n,0);
  assert.equal((await db.query("select to_regclass('pg_temp.probe_snapshot') r")).rows[0].r,null);
  await db.query("set velvet.probe_fail=''");
  // Model an acknowledged-on-server COMMIT followed by a client-side lost response.
  await control('begin'); await q(tempEager);
  await q(sql`insert into public.probe_sink select id,1,amount,memo,allocation from pg_temp.probe_snapshot`);
  await assert.rejects((async()=>{await control('commit');throw new Error('lost commit response')})(),/lost commit response/);
  await control('rollback');
  assert.equal((await db.query("select to_regclass('pg_temp.probe_snapshot') r")).rows[0].r,null);
  assert.equal((await db.query('select count(*)::int n from public.probe_sink')).rows[0].n,10000);
  results.push({checks:'temp downstream rollback, connection reuse cleanup, committed-but-response-lost cleanup',passed:true});
  return results;
}
