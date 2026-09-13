-- Same key-local prior-journal read as work.mjs's INSERT SELECT, for the row oracle.
-- Link 2/3 cannot run before Link 1 has written a journal with the current amount.
-- A no-op journal remains usable: preallocated-but-unused keys are NOT dependencies.
create index phase_journal_lookup on public.scale_destination(logical_id,role);
create or replace function public.scale_insert(new_key text, logical_key text, new_amount numeric,
 new_memo text, new_allocation text, new_role text) returns table(row_id text)
language sql volatile as $$
 insert into public.scale_destination(row_id,logical_id,amount,memo,allocation,role)
 select new_key,logical_key,case when new_role='1' then new_amount else journal.amount end,
 new_memo,new_allocation,new_role
 from (select 1) seed left join lateral (
  select j.amount from public.scale_destination j
  where j.logical_id=logical_key and j.role='1' and j.amount is not distinct from new_amount
  order by j.row_id::bigint desc limit 1
 ) journal on new_role<>'1'
 where new_role='1' or exists(select 1 from public.scale_destination j
  where j.logical_id=logical_key and j.role='1' and j.amount is not distinct from new_amount)
 returning row_id
$$;

-- The authored profile promises key-local observers only. Test the per-key causal
-- boundary without requiring the old executor's total cross-key write order.
create function public.phase_causality() returns trigger language plpgsql as $$
declare current_work record;
begin
 if current_setting('velvet.phase_causality',true)='on' and not exists(
  select 1 from rawsql_transfer.work_item w
  join rawsql_transfer.destination_link l using(destination_link_id)
  where w.run_id=(select max(run_id) from rawsql_transfer.run)
   and w.source_key_json=jsonb_build_object('logical_id',new.logical_id)
   and l.execution_order=new.role::int and w.route_type='immutable'
 ) then raise exception 'Work must precede destination'; end if;
 if current_setting('velvet.phase_causality',true)='on' then
  select w.* into strict current_work from rawsql_transfer.work_item w
  join rawsql_transfer.destination_link l using(destination_link_id)
  where w.run_id=(select max(run_id) from rawsql_transfer.run)
   and w.source_key_json=jsonb_build_object('logical_id',new.logical_id)
   and l.execution_order=new.role::int and w.route_type='immutable';
  -- These fixture amounts are positive; negative rows are reversals.
  if new.amount>=0 and current_work.requires_red_transfer then
   if exists(select 1 from rawsql_transfer.active_black a
    where a.destination_link_id=current_work.destination_link_id
     and a.source_key_json=current_work.source_key_json) then
    raise exception 'Old Active must retire before replacement Black'; end if;
   if not exists(select 1 from rawsql_transfer.lineage l
    where l.work_item_id=current_work.work_item_id and l.transfer_operation='red_insert') then
    raise exception 'Red Lineage must precede replacement Black'; end if;
  end if;
  if new.role::int>1 and not exists(
   select 1 from rawsql_transfer.dirty_key_processing p
   join rawsql_transfer.destination_link l using(destination_link_id)
   where p.run_id=current_work.run_id and p.dirty_key_id=current_work.dirty_key_id
    and l.execution_order=new.role::int-1
  ) then raise exception 'Prior Link Processing must precede next Link write'; end if;
 end if;
 if current_setting('velvet.phase_rewrite',true)='drop' then return null; end if;
 if current_setting('velvet.phase_rewrite',true)='key' then new.row_id:='rewritten'; end if;
 return new;
end $$;
create trigger phase_causality before insert on public.scale_destination
 for each row execute function public.phase_causality();
