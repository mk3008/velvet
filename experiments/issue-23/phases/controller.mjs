// Experimental transaction/profile controller, preserving the ordered candidate's lifecycle.
import assert from 'node:assert/strict';
import {sql,bind} from '@mk3008/serene';
import {TransferExecutionError} from '../../../dist/src/features/execute-transfer/boundary.js';
import * as q from '../../../dist/src/features/execute-transfer/queries.js';
import {definition} from '../benchmark.mjs';
const source='select * from public.scale_snapshot()';
const insert=`select row_id from public.scale_insert(:row_id::text,:logical_id::text,:amount::numeric,:memo::text,:allocation::text,:role::text)`;
const red=`select row_id from public.scale_red(:row_id::text)`;
const compare=`select * from public.scale_compare(:row_id::text,:logical_id::text,:amount::numeric,:memo::text,:allocation::text,:role::text,:velvet_active_destination_key::jsonb)`;
async function query(client,statement,params={}){const b=bind(statement,params,'indexed');return (await client.query(b.text,b.values)).rows;}
export async function configure(db){
 await query(db,sql`update velvet.setting set source_sql_body=:source where setting_id=1`,{source});
 await query(db,sql`update velvet.destination_link set generated_insert_transfer_sql_body=:insert,generated_reassessment_sql_body=:compare where setting_id=1`,{insert,compare});
 await query(db,sql`update velvet.destination_definition set generated_red_transfer_sql_body=:red where destination_definition_id=1`,{red});
}
export async function executeProfile(client,maximum,settingId='1',work){
 let runId, persisted=false;
 await client.query('begin');
 try{
  const [setting]=await query(client,q.settingSql,{id:settingId});
  const profileLinks=await query(client,q.linksSql,{id:settingId});
  assert.equal(setting.source_sql_body,source);assert.equal(setting.is_enabled,true);
  assert.deepEqual(setting.source_key_definition,definition.sourceKeyDefinition);
  for(const [i,l] of profileLinks.entries()){
   assert.equal(l.execution_order,i+1);assert.equal(l.is_enabled,true);
   assert.equal(l.transfer_model,'immutable');assert.equal(l.date_lower_bound_adjustments,null);
   assert.equal(l.destination_table_name,'public.scale_destination');
   assert.deepEqual(l.destination_columns,{columns:['row_id','logical_id','amount','memo','allocation','role'].map(name=>({name,type:name==='amount'?'numeric':'text'}))});
   assert.equal(l.generated_insert_transfer_sql_body,insert);assert.equal(l.generated_reassessment_sql_body,compare);
   assert.equal(l.generated_red_transfer_sql_body,red);
   assert.deepEqual(l.destination_key_columns,['row_id']);
   assert.deepEqual(l.diff_compare_excluded_columns,{columns:['row_id','allocation']});
   assert.deepEqual(l.mapping_definition,{columns:{row_id:'key'+(i+1),logical_id:'logical_id',amount:'amount',memo:'memo',allocation:'allocation',role:'role'+(i+1)}});
   assert.deepEqual(l.destination_key_mapping,{sourceKey:['logical_id'],destinationKey:[{name:'row_id',sourceColumn:'key'+(i+1)}]});
  }
  assert(profileLinks.length>0&&profileLinks.length<=3);
  [{run_id:runId}]=await query(client,q.runSql,{setting:settingId,args:'{}'});
  await client.query('commit');persisted=true;await client.query('begin');
  assert.deepEqual((await query(client,q.settingSql,{id:settingId}))[0],setting);
  assert.deepEqual(await query(client,q.linksSql,{id:settingId}),profileLinks);
  const result=await work(client,runId,settingId,maximum,profileLinks);
  await query(client,q.finishSql,{run:runId,status:'succeeded',error:null});
  await client.query('commit');return {runId,...result};
 }catch(error){
  const recoveryErrors=[];let discarded=false;
  try{await client.query('rollback');discarded=true;}catch(e){recoveryErrors.push(e);}
  if(persisted&&discarded)try{
   await client.query('begin');await query(client,q.failSql,{run:runId,error:error.message});await client.query('commit');
  }catch(e){recoveryErrors.push(e);try{await client.query('rollback');}catch(e){recoveryErrors.push(e);}}
  if(runId)throw new TransferExecutionError(error.message,runId,error,recoveryErrors);throw error;
 }
}
