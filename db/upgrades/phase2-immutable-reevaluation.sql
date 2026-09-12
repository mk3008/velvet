-- Apply once to a Phase 1 schema, with transfer execution stopped.
begin;

alter table rawsql_transfer.destination_link
add column generated_reassessment_sql_body text not null default '';

alter table rawsql_transfer.work_item
add column evaluated_destination_key_json jsonb null,
add constraint chk_work_item_evaluated_destination_key_object check (
  evaluated_destination_key_json is null
  or jsonb_typeof (evaluated_destination_key_json) = 'object'
);

update rawsql_transfer.work_item w
set
  evaluated_destination_key_json = a.destination_key_json
from
  rawsql_transfer.active_black a
where
  w.active_black_id = a.active_black_id;

comment on column rawsql_transfer.destination_link.generated_reassessment_sql_body is '再評価SQL。現在snapshotの補正後転送先値と既存黒伝の保存値を、それぞれcurrent_valuesとactive_valuesのJSON objectを表すtextとして1行返す。既存黒伝キーはvelvet_active_destination_keyで受ける。';

comment on column rawsql_transfer.work_item.active_black_id is '有効黒伝ID。評価時に参照した黒伝への現在状態参照。未存在または退役後はnull。評価時の転送先キーはevaluated_destination_key_jsonに保存する。';

comment on column rawsql_transfer.work_item.evaluated_destination_key_json is '評価時にActive Blackが指していた転送先キーの固定記録。Active Black退役後も評価対象を保持する。未存在ならnull。';

commit;
