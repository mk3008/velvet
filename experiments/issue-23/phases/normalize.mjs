import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';

// Compare identities through their relational meaning, not sequence interleaving.
// Check hashes and every surrogate reference BEFORE replacing IDs.
export function normalize(state) {
 const work=new Map((state.work??[]).map(w=>[w.work_item_id,`${w.run_id}/${w.dirty_key_id}/${w.destination_link_id}`]));
 const destination=new Map((state.lineage??[]).map(l=>[l.destination_key_json.row_id,
  `${work.get(l.work_item_id)}/${l.transfer_operation}`]));
 const active=new Map((state.active??[]).map(a=>[a.active_black_id,destination.get(a.destination_key_json.row_id)]));
 const identity=key=>{if(key?.row_id){assert(destination.has(key.row_id));key.row_id=destination.get(key.row_id);}};
 for(const [table,rows] of Object.entries(state)){
  if(table==='observations')continue;
  for(const row of rows??[]){
   for(const prefix of ['source','destination'])if(row[prefix+'_key_hash']){
    const json=row[prefix+'_key_json'];
    const canonical=JSON.stringify(json,Object.keys(json).sort());
    assert.equal(row[prefix+'_key_hash'],createHash('sha256').update(canonical).digest('hex'));
    delete row[prefix+'_key_hash'];
   }
   if(row.work_item_id!==undefined){assert(work.has(row.work_item_id));row.work_item_id=work.get(row.work_item_id);}
   if(row.active_black_id!=null){assert(active.has(row.active_black_id));row.active_black_id=active.get(row.active_black_id);}
   if(row.row_id){assert(destination.has(row.row_id));row.row_id=destination.get(row.row_id);}
   identity(row.source_key_json);identity(row.destination_key_json);identity(row.evaluated_destination_key_json);
   delete row.lineage_id;delete row.dirty_key_processing_id;
  }
  rows?.sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b)));
 }
 // Total cross-key trigger order/counts is deliberately not this profile's contract.
 delete state.observations;
 return state;
}
