-- Apply once to a Phase 4 schema, with transfer execution stopped.
begin;

alter table rawsql_transfer.destination_definition
  drop constraint chk_transfer_destination_transfer_model,
  add constraint chk_transfer_destination_transfer_model
    check (transfer_model in ('immutable', 'mutable', 'insert_only'));

alter table rawsql_transfer.work_item
  drop constraint chk_work_item_transfer_model,
  add constraint chk_work_item_transfer_model
    check (transfer_model in ('immutable', 'mutable', 'insert_only')),
  drop constraint chk_work_item_route_type,
  add constraint chk_work_item_route_type
    check (route_type in ('immutable', 'mutable', 'insert_only', 'skipped'));

comment on column rawsql_transfer.destination_definition.transfer_model is
  '転送モデル。immutable は訂正・取消を赤伝で履歴化し、mutable は現在snapshotへUPDATE/DELETE同期し、insert_only は初回追加後のsource変更・削除を同期しない。';

comment on column rawsql_transfer.work_item.transfer_model is
  '転送モデル。評価時点で使用する転送モデル。許可値は immutable, mutable, insert_only。';

comment on column rawsql_transfer.work_item.route_type is
  '転送ルート種別。許可値は immutable, mutable, insert_only, skipped。転送操作の実行経路を表す。';

commit;
