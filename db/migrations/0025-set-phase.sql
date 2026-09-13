-- Apply once before deploying Issue 25 runtime; existing rows remain unopted.
begin;
alter table rawsql_transfer.setting add column set_phase_definition jsonb null
 constraint chk_setting_set_phase_definition_object check(set_phase_definition is null or jsonb_typeof(set_phase_definition)='object');
alter table rawsql_transfer.destination_link add column set_phase_definition jsonb null
 constraint chk_destination_link_set_phase_definition_object check(set_phase_definition is null or jsonb_typeof(set_phase_definition)='object');
alter table rawsql_transfer.destination_definition add column set_phase_definition jsonb null
 constraint chk_destination_definition_set_phase_definition_object check(set_phase_definition is null or jsonb_typeof(set_phase_definition)='object');
alter table rawsql_transfer.run add column execution_configuration jsonb null
 constraint chk_run_execution_configuration_object check(execution_configuration is null or jsonb_typeof(execution_configuration)='object');
comment on column rawsql_transfer.setting.set_phase_definition is '集合phaseの明示opt-in。version、review revision、上限件数、転送元identityの完成SQLとSHA-256。NULLは従来経路。';
comment on column rawsql_transfer.destination_link.set_phase_definition is '集合phaseのLink側契約。評価SELECTとBlack INSERTの完成SQL、SHA-256、review revision。';
comment on column rawsql_transfer.destination_definition.set_phase_definition is '集合phaseの転送先側契約。Red採番・投影、Red INSERT、書込検証の完成SQL、SHA-256、review revision。';
comment on column rawsql_transfer.run.execution_configuration is '集合phaseで使用したロック済みmaster設定の固定記録。完成SQL、hash、revisionを保持する。従来経路ではNULL。';
commit;
