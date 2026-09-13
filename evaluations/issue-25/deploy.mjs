// Deployment gate for the production DB-managed route, not an algorithm tournament.
import { readFile,writeFile,mkdir } from 'node:fs/promises';
import { Client } from 'pg';
import { executeTransfer } from '../../dist/src/features/execute-transfer/boundary.js';
import * as f from '../../dist/tests/support/set-phase-fixture.js';
const db=new Client({connectionString:process.env.ASHIBA_DB_URL});await db.connect();
const root=new URL('../../db/ddl/',import.meta.url);
for(const file of JSON.parse(await readFile(new URL('order.json',root),'utf8')).order) await db.query(await readFile(new URL(file,root),'utf8'));
await f.install(db);
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
let calls=0;
const client={query:async(text,values)=>{calls++;await sleep(5);return db.query(text,values);}};
const results=[];
async function run(){calls=0;const start=performance.now();let peak=process.memoryUsage().rss;const timer=setInterval(()=>{peak=Math.max(peak,process.memoryUsage().rss);},10);
 try{const result=await executeTransfer(client,[],{settingId:'1',arguments:{owner:'1'}});return {result,calls,seconds:(performance.now()-start)/1000,peakRssBytes:peak};}finally{clearInterval(timer);}}
for(const links of [1,3]) for(const n of [1000,10000]) {
 await f.setup(db,n,links);await f.enable(db,1000);await f.dirty(db);const initial=await run();
 // A second admission demonstrates full source size with the same bounded Dirty Keys.
 results.push({scenario:'initial',sourceRows:n,links,...initial});
 if(initial.seconds>45)throw new Error('45s bounded work envelope exceeded');
}
for(const links of [1,3]){
 await f.setup(db,10000,links);await f.enable(db,1000);await f.dirty(db);
 const start=performance.now(), runs=[];let arrivals=0;
 while(true){
  // Persist continuing arrivals at 2/s between bounded Runs; backlog recovery includes them.
  const due=Math.floor((performance.now()-start)/1000*2);
  if(due>arrivals){await db.query("insert into rawsql_transfer.dirty_key(source_schema_name,source_table_name,source_key_json) select 'public','product_source',jsonb_build_object('id','1') from generate_series(1,$1::int)",[due-arrivals]);arrivals=due;}
  const current=await run();runs.push(current);
  if(current.seconds>45)throw new Error('45s bounded work envelope exceeded');
  const remaining=(await db.query("select count(*)::int n from rawsql_transfer.dirty_key d where exists(select 1 from rawsql_transfer.destination_link l where not exists(select 1 from rawsql_transfer.dirty_key_processing p where p.dirty_key_id=d.dirty_key_id and p.destination_link_id=l.destination_link_id))")).rows[0].n;
  if(!remaining)break;
  if(performance.now()-start>180000)throw new Error('180s recovery envelope exceeded');
 }
 results.push({scenario:'recovery',links,sourceRows:10000,arrivals,seconds:(performance.now()-start)/1000,runs});
}
await mkdir('artifacts',{recursive:true});await writeFile('artifacts/issue-25.json',JSON.stringify({addedRoundTripMs:5,cap:1000,results},null,2));
console.log(JSON.stringify(results));await db.end();
