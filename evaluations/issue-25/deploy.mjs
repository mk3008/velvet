// Deployment gate for the production DB-managed route, not an algorithm tournament.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { Client } from 'pg';
import { executeTransfer } from '../../dist/src/features/execute-transfer/boundary.js';
import * as f from '../../dist/tests/support/set-phase-fixture.js';
const db = new Client({ connectionString: process.env.ASHIBA_DB_URL });
await db.connect();
const root = new URL('../../db/ddl/', import.meta.url);
for (const file of JSON.parse(await readFile(new URL('order.json', root), 'utf8')).order)
  await db.query(await readFile(new URL(file, root), 'utf8'));
await f.install(db);
await db.query("set statement_timeout='40s'");
await mkdir('artifacts', { recursive: true });
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
let calls = 0;
let timings = [];
const client = {
  query: async (text, values) => {
    calls++;
    await sleep(5);
    const start = performance.now();
    try {
      return await db.query(text, values);
    } finally {
      const seconds = (performance.now() - start) / 1000;
      timings.push({ sql: text.slice(0, 150), seconds });
      if (seconds > 5) console.log('slow phase', timings.at(-1));
    }
  },
};
const results = [];
const stats = async () => {
  await db.query('select pg_stat_force_next_flush()');
  return (
    await db.query(
      'select temp_files,temp_bytes,blks_read,blks_hit,tup_inserted,tup_updated,tup_deleted,pg_database_size(current_database()) database_bytes from pg_stat_database where datname=current_database()',
    )
  ).rows[0];
};
async function run() {
  calls = 0;
  timings = [];
  const start = performance.now();
  let peak = process.memoryUsage().rss;
  const timer = setInterval(() => {
    peak = Math.max(peak, process.memoryUsage().rss);
  }, 10);
  try {
    const result = await executeTransfer(client, [], { settingId: '1', arguments: { owner: '1' } });
    const measured = {
      result,
      calls,
      seconds: (performance.now() - start) / 1000,
      peakRssBytes: peak,
      slowestPhases: timings.toSorted((a, b) => b.seconds - a.seconds).slice(0, 4),
    };
    console.log('run', JSON.stringify(measured));
    return measured;
  } finally {
    clearInterval(timer);
  }
}
for (const links of [1, 3])
  for (const n of [1000, 10000]) {
    await f.setup(db, n, links);
    await f.enable(db, 1000);
    await f.dirty(db);
    const initial = await run();
    // A second admission demonstrates full source size with the same bounded Dirty Keys.
    results.push({
      scenario: 'initial',
      sourceRows: n,
      links,
      ...initial,
      database: await stats(),
    });
    await writeFile(
      'artifacts/issue-25.json',
      JSON.stringify({ addedRoundTripMs: 5, cap: 1000, results }, null, 2),
    );
    if (
      results.some(
        (r) => r.scenario === 'initial' && r.links === links && r.calls !== initial.calls,
      )
    )
      throw new Error('row-dependent call count');
    if (initial.seconds > 45) throw new Error('45s bounded work envelope exceeded');
    while ((await run()).result.inserted > 0) {}
    await db.query('update product_source set amount=200');
    await f.dirty(db);
    const correction = await run();
    results.push({
      scenario: 'correction',
      sourceRows: n,
      links,
      ...correction,
      database: await stats(),
    });
    if (correction.calls !== initial.calls) throw new Error('route-dependent nonempty call count');
    if (correction.seconds > 45) throw new Error('45s correction envelope exceeded');
  }
for (const links of [1, 3]) {
  await f.setup(db, 10000, links);
  await f.enable(db, 1000);
  await f.dirty(db);
  const start = performance.now(),
    runs = [];
  let arrivals = 0,
    stop = false;
  const producer = new Client({ connectionString: process.env.ASHIBA_DB_URL });
  await producer.connect();
  const incoming = (async () => {
    while (!stop) {
      await sleep(500);
      if (stop) break;
      await f.dirty(producer, '1');
      arrivals++;
    }
  })();
  try {
    while (true) {
      const current = await run();
      runs.push(current);
      if (current.seconds > 45) throw new Error('45s bounded work envelope exceeded');
      const remaining = (
        await db.query(
          'select count(*)::int n from rawsql_transfer.dirty_key d where exists(select 1 from rawsql_transfer.destination_link l where not exists(select 1 from rawsql_transfer.dirty_key_processing p where p.dirty_key_id=d.dirty_key_id and p.destination_link_id=l.destination_link_id))',
        )
      ).rows[0].n;
      if (!remaining) break;
      if (performance.now() - start > 180000) throw new Error('180s recovery envelope exceeded');
    }
  } finally {
    stop = true;
    await incoming;
    await producer.end();
  }
  if (performance.now() - start > 180000) throw new Error('180s recovery envelope exceeded');
  results.push({
    scenario: 'recovery',
    links,
    sourceRows: 10000,
    arrivals,
    seconds: (performance.now() - start) / 1000,
    runs,
    database: await stats(),
  });
  await writeFile(
    'artifacts/issue-25.json',
    JSON.stringify({ addedRoundTripMs: 5, cap: 1000, results }, null, 2),
  );
}
await mkdir('artifacts', { recursive: true });
await writeFile(
  'artifacts/issue-25.json',
  JSON.stringify({ addedRoundTripMs: 5, cap: 1000, results }, null, 2),
);
console.log(JSON.stringify(results));
await db.end();
