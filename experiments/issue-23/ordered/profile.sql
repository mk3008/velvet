-- Experimental, explicitly authored typed profile. Not an arbitrary-SQL translator.
-- The baseline and DB worker call these SAME source/destination functions.
create function public.scale_snapshot() returns table(
 logical_id text, amount text, memo text, allocation text,
 key1 text, key2 text, key3 text, role1 text, role2 text, role3 text)
language sql volatile as $$
 select id::text, amount::text, memo, nextval('public.scale_allocation')::text,
 nextval('public.scale_row')::text, nextval('public.scale_row')::text,
 nextval('public.scale_row')::text, '1'::text, '2'::text, '3'::text
 from public.scale_source
$$;

create function public.scale_insert(new_key text, logical_key text, new_amount numeric,
 new_memo text, new_allocation text, new_role text) returns table(row_id text)
language sql volatile as $$
 insert into public.scale_destination(row_id,logical_id,amount,memo,allocation,role)
 values(new_key,logical_key,new_amount,new_memo,new_allocation,new_role) returning row_id
$$;

create function public.scale_red(original_key text) returns table(row_id text)
language sql volatile as $$
 insert into public.scale_destination
 select nextval('public.scale_row')::text,logical_id,-amount,memo,allocation,role
 from public.scale_destination where row_id=original_key returning row_id
$$;

create function public.scale_compare(new_key text, logical_key text, new_amount numeric,
 new_memo text, new_allocation text, new_role text, active_key jsonb)
 returns table(current_values text, active_values text)
language sql stable as $$
 select jsonb_build_object('row_id',new_key,'logical_id',logical_key,'amount',new_amount,
 'memo',new_memo,'allocation',new_allocation,'role',new_role)::text, to_jsonb(d)::text
 from public.scale_destination d where row_id=active_key->>'row_id'
$$;

-- One work invocation; transaction control stays in the caller.
create function public.scale_ordered_work(owned_run bigint, owned_setting bigint, maximum_keys integer)
returns table(inserted integer, skipped integer, source_rows integer)
language plpgsql security invoker set search_path=pg_catalog as $$
declare item record; snapshot record; active record; comparison record;
 source_present boolean; is_duplicate boolean; no_op boolean; skip_reason text;
 source_key text; source_hash text; destination_key text; red_key text;
 fields jsonb; work_id bigint; result_kind text; rows_affected integer;
begin
 inserted:=0; skipped:=0; source_rows:=0;
 -- Explicit profile supports immutable text identity; caller checks the profile configuration.
 create temporary table velvet_ordered_pending on commit drop as
 with admitted as materialized (
  select dk.dirty_key_id,dk.source_key_json from rawsql_transfer.dirty_key dk
  where dk.source_schema_name='public' and dk.source_table_name='scale_source'
   and exists(select 1 from rawsql_transfer.destination_link l where l.setting_id=owned_setting
    and l.is_enabled and not exists(select 1 from rawsql_transfer.dirty_key_processing p
     where p.dirty_key_id=dk.dirty_key_id and p.destination_link_id=l.destination_link_id
     and p.processing_status in ('succeeded','skipped')))
  order by dk.dirty_key_id limit maximum_keys
 )
 select dk.*,l.destination_link_id,l.execution_order
 from admitted dk cross join rawsql_transfer.destination_link l
 where l.setting_id=owned_setting and l.is_enabled
 and not exists(select 1 from rawsql_transfer.dirty_key_processing p
  where p.dirty_key_id=dk.dirty_key_id and p.destination_link_id=l.destination_link_id
  and p.processing_status in ('succeeded','skipped'));
 if not exists(select 1 from pg_temp.velvet_ordered_pending) then return next; return; end if;
 -- Materialize ALL rows once, before any destination operation. Native typed relation.
 create temporary table velvet_ordered_source on commit drop as select * from public.scale_snapshot();
 get diagnostics source_rows=row_count;
 alter table pg_temp.velvet_ordered_source add primary key(logical_id);
 analyze pg_temp.velvet_ordered_source;
 create temporary table velvet_ordered_done(logical_id text,link bigint,primary key(logical_id,link)) on commit drop;
 for item in select * from pg_temp.velvet_ordered_pending order by dirty_key_id,execution_order loop
  if jsonb_typeof(item.source_key_json->'id') is distinct from 'string' then
   raise exception 'Profile requires textual dirty id';
  end if;
  source_key := '{"logical_id":' || to_jsonb(item.source_key_json->>'id')::text || '}';
  source_hash := encode(sha256(convert_to(source_key,'UTF8')),'hex');
  select * into snapshot from pg_temp.velvet_ordered_source where logical_id=item.source_key_json->>'id';
  source_present:=found;
  select exists(select 1 from pg_temp.velvet_ordered_done where logical_id=item.source_key_json->>'id'
    and link=item.destination_link_id) into is_duplicate;
  select null::bigint as active_black_id,null::jsonb as destination_key_json into active;
  if not is_duplicate then
   select active_black_id,destination_key_json into active from rawsql_transfer.active_black
   where destination_link_id=item.destination_link_id and source_key_json=source_key::jsonb for update;
  end if;
  no_op:=not source_present and active.active_black_id is null;
  if source_present then
   destination_key:=case item.execution_order when 1 then snapshot.key1 when 2 then snapshot.key2 when 3 then snapshot.key3 end;
  end if;
  if not is_duplicate and source_present and active.active_black_id is not null then
   select * into strict comparison from public.scale_compare(destination_key,snapshot.logical_id,snapshot.amount::numeric,
    snapshot.memo,snapshot.allocation,item.execution_order::text,active.destination_key_json);
   no_op:=(comparison.current_values::jsonb-array['row_id','allocation'])
      is not distinct from (comparison.active_values::jsonb-array['row_id','allocation']);
  end if;
  skip_reason:=case when is_duplicate then 'duplicate_ignore' when no_op then 'no_op' end;
  result_kind:=case when skip_reason is not null then skip_reason
   when active.active_black_id is not null then case when source_present then 'red_then_black_insert' else 'red' end
   else 'black_insert' end;
  fields:=jsonb_build_object('run',owned_run::text,'dirty',item.dirty_key_id::text,'setting',owned_setting::text,
   'link',item.destination_link_id::text,'key',source_key,'hash',source_hash,'model','immutable',
   'route',case when skip_reason is null then 'immutable' else 'skipped' end,'sourceExists',source_present,
   'insert',source_present and skip_reason is null,'update',false,'delete',false,'skip',skip_reason,
   'active',active.active_black_id,'evaluated',active.destination_key_json::text,
   'red',active.active_black_id is not null and skip_reason is null,
   'status',case when skip_reason is null then 'succeeded' else 'skipped' end,'result',result_kind);
  if skip_reason is not null then
   perform rawsql_transfer.record_skipped(fields); skipped:=skipped+1;
  else
   insert into rawsql_transfer.work_item(run_id,dirty_key_id,setting_id,destination_link_id,source_key_json,source_key_hash,
    source_exists,transfer_model,route_type,requires_black_insert_transfer,skip_reason,active_black_id,
    evaluated_destination_key_json,requires_red_transfer,requires_black_update_transfer,requires_physical_delete_transfer)
   values(owned_run,item.dirty_key_id,owned_setting,item.destination_link_id,source_key::jsonb,source_hash,
    source_present,'immutable','immutable',source_present,null,active.active_black_id,active.destination_key_json,
    active.active_black_id is not null,false,false) returning work_item_id into work_id;
   fields:=fields||jsonb_build_object('work',work_id::text,'table','public.scale_destination');
   if active.active_black_id is not null then
    select row_id into strict red_key from public.scale_red(active.destination_key_json->>'row_id');
    if red_key is null or red_key=active.destination_key_json->>'row_id' then raise exception 'Invalid Red key'; end if;
    perform rawsql_transfer.retire_active(fields||jsonb_build_object(
     'key','{"row_id":'||to_jsonb(active.destination_key_json->>'row_id')::text||'}',
     'hash',encode(sha256(convert_to('{"row_id":'||to_jsonb(active.destination_key_json->>'row_id')::text||'}','UTF8')),'hex'),
     'destination','{"row_id":'||to_jsonb(red_key)::text||'}',
     'destinationHash',encode(sha256(convert_to('{"row_id":'||to_jsonb(red_key)::text||'}','UTF8')),'hex')),true);
   end if;
   if source_present then
    select row_id into strict red_key from public.scale_insert(destination_key,snapshot.logical_id,snapshot.amount::numeric,
     snapshot.memo,snapshot.allocation,item.execution_order::text);
    if red_key is distinct from destination_key then raise exception 'Inserted destination key does not match mapping'; end if;
    perform rawsql_transfer.record_black(fields||jsonb_build_object('destination','{"row_id":'||to_jsonb(red_key)::text||'}',
     'destinationHash',encode(sha256(convert_to('{"row_id":'||to_jsonb(red_key)::text||'}','UTF8')),'hex')),true);
    inserted:=inserted+1;
   else
    insert into rawsql_transfer.dirty_key_processing(dirty_key_id,run_id,work_item_id,setting_id,destination_link_id,
     source_key_json,source_key_hash,processing_status,processing_result)
    values(item.dirty_key_id,owned_run,work_id,owned_setting,item.destination_link_id,source_key::jsonb,source_hash,'succeeded',result_kind);
   end if;
  end if;
  insert into pg_temp.velvet_ordered_done values(item.source_key_json->>'id',item.destination_link_id) on conflict do nothing;
 end loop;
 return next;
end $$;
