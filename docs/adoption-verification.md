# 導入検証と既存DDL不具合の修正

対象: PR #2 の実装コミット `db5442697b050c1cdb48ee1cb5762604ad26460c`。
比較元: `e1a25ec9b871c10204c5f45b8fff3eb007204806`。

## 確認済み

- 移行した4つのSerene SQLリテラルは、比較元の正本 `.sql` と本文が完全一致する。
- AlderとRaw SQL Rulesのコピーは上流blobと一致する。
  - Alder: `1af50d44ce53083ff758b4c9ca7a808bb0568856`
  - Raw SQL Rules: `391f8195b48e45827bf4ec16e6219635aa0ec543`
- CIのpnpm 10.19.0によるfrozen-lockfileインストール、型検査、ビルドが成功した。
- DDL文書CLIの65テストとアプリケーションの26テストが成功した。
- ローカルの`pnpm verify:transfer-docs`が成功し、メタデータ検査はエラー・警告ともに0件。
- ローカルのSerene auditはordinary 4件、review-required 8件、violation 0件。

## SQL構築レビュー

4つの正本は固定リテラルであり、FeatureQuerySourceを通じて共通adapterに渡す。adapterはSereneのindexed出力をnode-postgresへ渡し、値をSQL本文へ埋め込まない。別ファイルの値を受け取る共通経路など8件は、ファイル単位解析では解決できないため追加レビュー対象のまま残す。

Destination登録の`SQL_SELECT_WITHOUT_WHERE`は、テーブルを読むSELECTではなく、名前付き値から1行を作る既存のINSERT SELECTに対する助言である。判定やシグナルは抑制していない。

## 初回のPostgreSQL結合検証で検出した既存不具合

[GitHub Actions実行](https://github.com/mk3008/velvet/actions/runs/34672835411)で、追加した結合テストが既存DDLの作成時に失敗した。

```text
function jsonb_object_length(jsonb) does not exist
```

該当箇所は`db/ddl/setting.sql`の`chk_setting_source_key_definition_object`。比較元にも同じ式があり、このPRではDDLを変更していない。リポジトリ内に当該関数の定義もない。PostgreSQL 18.6で、クエリ実行に到達する前に停止した。

再現はPRブランチでPostgreSQL 18の専用テストDBを指定し、`pnpm test`を実行する。Dockerが利用できれば既存Testcontainers経路も利用できる。

合計91テスト成功・1テスト失敗。DB結合テストは削除・スキップ・弱体化せず残す。既存障害の修正は導入作業に混ぜず、製造開始前のブロッカーとして報告する。これまでのテスト成功は、Velvetの正本DDL全体を実DBへ適用できることの証明ではなかった。

DDL修正後に、4クエリのDB実行を含む完全な`pnpm verify`を再実行する必要がある。

## 同一PR内での修正

ユーザー承認により、この既存不具合を移行完了に必要な修正としてPR #2内で扱う。DDLの変更は1行のみで、`jsonb_object_length(source_key_definition) > 0`を`source_key_definition <> '{}'::jsonb`へ置き換えた。既存のオブジェクト型判定とNOT NULLは維持する。

既存結合テストを維持し、同じ実DB経路で空オブジェクト・空/非空配列・文字列・数値・真偽値・JSON nullの拒否と、null値を持つ非空オブジェクトの受理を確認する。拒否は対象CHECK制約名とSQLSTATE `23514`で照合し、別の原因での失敗を成功扱いしない。

修正後の完全な`pnpm verify`をPR CIで実行する。
