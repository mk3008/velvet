create table velvet.lineage (
  lineage_id bigserial primary key,
  run_id bigint not null references velvet.run (run_id),
  setting_id bigint not null references velvet.setting (setting_id),
  destination_link_id bigint not null references velvet.destination_link (destination_link_id),
  work_item_id bigint null references velvet.work_item (work_item_id),
  transfer_operation text not null,
  source_kind text not null,
  source_key_json jsonb not null,
  source_key_hash text not null,
  destination_table_name text not null,
  destination_key_json jsonb not null,
  destination_key_hash text not null,
  created_at timestamptz not null default current_timestamp,
  note text null,
  constraint chk_lineage_operation check (
    transfer_operation in ('black_insert', 'red_insert')
  ),
  constraint chk_lineage_source_kind check (
    source_kind in ('transfer_source', 'reversed_destination_row')
  ),
  constraint chk_lineage_operation_source_kind check (
    (
      transfer_operation = 'black_insert'
      and source_kind = 'transfer_source'
    )
    or (
      transfer_operation = 'red_insert'
      and source_kind = 'reversed_destination_row'
    )
  ),
  constraint chk_lineage_source_key_json_object check (jsonb_typeof (source_key_json) = 'object'),
  constraint chk_lineage_source_key_hash_not_blank check (btrim (source_key_hash) <> ''),
  constraint chk_lineage_destination_table_name_not_blank check (btrim (destination_table_name) <> ''),
  constraint chk_lineage_destination_table_name_qualified check (
    position('.' in btrim (destination_table_name)) > 1
    and split_part (btrim (destination_table_name), '.', 1) <> ''
    and split_part (btrim (destination_table_name), '.', 2) <> ''
    and btrim (destination_table_name) = split_part (btrim (destination_table_name), '.', 1) || '.' || split_part (btrim (destination_table_name), '.', 2)
    and right (btrim (destination_table_name), 1) <> '.'
  ),
  constraint chk_lineage_destination_key_json_object check (jsonb_typeof (destination_key_json) = 'object'),
  constraint chk_lineage_destination_key_hash_not_blank check (btrim (destination_key_hash) <> ''),
  constraint uq_lineage_destination_row unique (destination_table_name, destination_key_json),
  constraint fk_lineage_run_setting foreign key (run_id, setting_id) references velvet.run (run_id, setting_id),
  constraint fk_lineage_setting_destination_link foreign key (setting_id, destination_link_id) references velvet.destination_link (setting_id, destination_link_id),
  constraint fk_lineage_work_item_context foreign key (
    work_item_id,
    run_id,
    setting_id,
    destination_link_id
  ) references velvet.work_item (
    work_item_id,
    run_id,
    setting_id,
    destination_link_id
  )
);

create index idx_lineage_destination_lookup on velvet.lineage (destination_table_name, destination_key_hash);

create index idx_lineage_destination_source on velvet.lineage (destination_link_id, source_key_hash, lineage_id);

create index idx_lineage_run on velvet.lineage (run_id, lineage_id);

create index idx_lineage_work_item on velvet.lineage (work_item_id)
where
  work_item_id is not null;

comment on table velvet.lineage is 'リネージュ。転送先行と、その転送先行の転送元キーまたは反転元転送先行を紐づける由来追跡情報。';

comment on column velvet.lineage.lineage_id is 'リネージュID。シーケンスで採番するサロゲートキー。';

comment on column velvet.lineage.run_id is '転送実行ID。このリネージュを作成した転送実行を参照する。';

comment on column velvet.lineage.setting_id is '転送設定ID。このリネージュが属する転送設定を参照する。';

comment on column velvet.lineage.destination_link_id is 'Destination Link ID。このリネージュが属する宛先別の転送単位を参照する。';

comment on column velvet.lineage.work_item_id is '転送作業対象ID。このリネージュの元になった作業対象を参照する。存在しない場合はnull。';

comment on column velvet.lineage.transfer_operation is '転送操作種別。許可値は black_insert, red_insert。転送先行を生成した操作を表す。';

comment on column velvet.lineage.source_kind is '転送元種別。許可値は transfer_source, reversed_destination_row。転送元キーが表す対象の種類を示す。';

comment on column velvet.lineage.source_key_json is '転送元キーJSON。転送先行の元ネタを識別するキーをJSONBで保持する。';

comment on column velvet.lineage.source_key_hash is '転送元キーハッシュ。転送元キーJSONの検索・比較を高速化するための補助値。';

comment on column velvet.lineage.destination_table_name is '転送先テーブル名。転送先行が存在する完全修飾テーブル名。';

comment on column velvet.lineage.destination_key_json is '転送先キーJSON。転送先行を識別するキーをJSONBで保持する。';

comment on column velvet.lineage.destination_key_hash is '転送先キーハッシュ。転送先キーJSONの検索・比較を高速化するための補助値。';

comment on column velvet.lineage.created_at is '作成日時。レコード作成時刻。';

comment on column velvet.lineage.note is '備考。運用上の補足を記録する。';
