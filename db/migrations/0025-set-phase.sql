-- Apply once before deploying Issue 25 runtime; existing rows remain unopted.
begin;
alter table rawsql_transfer.setting add column set_phase_definition jsonb null
 check(set_phase_definition is null or jsonb_typeof(set_phase_definition)='object');
alter table rawsql_transfer.destination_link add column set_phase_definition jsonb null
 check(set_phase_definition is null or jsonb_typeof(set_phase_definition)='object');
alter table rawsql_transfer.destination_definition add column set_phase_definition jsonb null
 check(set_phase_definition is null or jsonb_typeof(set_phase_definition)='object');
alter table rawsql_transfer.run add column execution_configuration jsonb null
 check(execution_configuration is null or jsonb_typeof(execution_configuration)='object');
commit;
