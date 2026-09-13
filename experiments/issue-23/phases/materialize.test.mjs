import assert from 'node:assert/strict';
import {sql,bind} from '@mk3008/serene';
import {materializeSource} from './materialize.mjs';
import {contentReview} from './content-review.mjs';

const statement=sql`select :value::text value, :value::text repeated`;
const value="'; DROP TABLE permanent_table; --";
const result=materializeSource(statement,{value});
assert.deepEqual(result.values,[value]);
assert(!result.text.includes(value));
assert(result.text.includes('$1::text value, $1::text repeated'));
for(const bad of [statement.sourceText,{sourceText:statement.sourceText},bind(statement,{value})])
 assert.throws(()=>materializeSource(bad,{value}));
assert.throws(()=>materializeSource(sql`select 1; select 2`));
assert.throws(()=>materializeSource(sql`select 1;`));
assert.throws(()=>materializeSource(sql`select ';'`));
assert.throws(()=>materializeSource(statement,{value,unused:1}));
assert.deepEqual(contentReview('CREATE TEMP TABLE t ON COMMIT DROP AS SELECT 1').map(s=>s.priority),['advisory']);
assert.deepEqual(contentReview('CREATE UNLOGGED TABLE t(id int)').map(s=>s.priority),['elevated']);
assert.deepEqual(contentReview('CREATE TEMPORARY TABLE t ON COMMIT DROP AS SELECT 1; CREATE TABLE p(id int); DROP TABLE p')
 .map(s=>s.code),['SQL_CREATE_TEMP','SQL_CREATE_TABLE','SQL_DROP']);
if(process.env.ASHIBA_DB_URL){
 const {Client}=await import('pg');
 const client=new Client({connectionString:process.env.ASHIBA_DB_URL});await client.connect();
 try{
  for(const finish of ['commit','rollback']){
   await client.query('begin');await client.query(result.text,result.values);
   assert.deepEqual((await client.query('select * from pg_temp.velvet_source_snapshot')).rows,[{value,repeated:value}]);
   await client.query(finish);
   assert.equal((await client.query("select to_regclass('pg_temp.velvet_source_snapshot') relation")).rows[0].relation,null);
  }
  await client.query('begin');
  const invalid=materializeSource(sql`select missing_column from missing_table`);
  await assert.rejects(client.query(invalid.text,invalid.values));
  await client.query('rollback');
 }finally{await client.end();}
}
console.log('TEMP composition identity/binding/subset checks passed; database checks run when ASHIBA_DB_URL is set');
