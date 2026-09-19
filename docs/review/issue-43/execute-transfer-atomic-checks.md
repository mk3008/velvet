# execute-transfer：Atomic Check 再検証（Issue 43）

**人間レビュー前のたたき台。** Issue #39 / PR #40 の複合Checkを、Alder Issue #66 / PR #67で更新されたAtomic Check形式へ小さく再整理した。製品コード・テスト・Business Designは変更していない。

- Velvet基準: `6b64e3b99845a315a394fee8e500564c3631e2af`（PR #40 merge）
- Alder基準: `03115d3d289329172f0a6b80ed5a5af9c7209c99`
- Functional Interface F1〜F5はPR #40の人間レビュー結果をそのまま維持する。
- 主表示では **1 Check = 1つの観測可能な期待結果** を優先する。
- 人間は主に **タイトル → 期待結果** を読み、必要に応じて条件を確認する。
- 条件は実装・システム寄りの用語を含んでよい。タイトルと期待結果は業務上の意味を短く表す。
- タイトルの付け方はまだ研究途中であり、今回の人間レビューで修正してよい。
- レビュー状態は検査項目そのものの人間確認状況を表し、テスト証拠の有無とは分離する。
- 根拠・テスト証拠・実装箇所は後段へ退避する。
- 全Check / 全コード行の完全matrixではない。

## 主表示

レビュー状態:

- **未レビュー**: AI初稿。人間が項目内容をまだ確認していない
- **要確認**: 人間判断が必要な意味・期待結果が残る
- **確認済み**: 人間がタイトル・条件・期待結果をこの内容で確認した
- **要修正**: 人間レビューで修正が必要と判明した

テスト証拠が不足していても、検査項目の意味自体が確認済みならレビュー状態は「確認済み」になり得る。逆にテストが十分でも、人間未レビューなら「未レビュー」のままとする。

### F1 — 実行文脈を作る

| ID | タイトル | 条件 | 期待結果 | レビュー状態 |
| --- | --- | --- | --- | --- |
| A01 | 実行条件をRunに記録する | 有効なSettingと実行引数で開始 | どの設定をどの条件で実行したかを後から確認できる | 未レビュー |
| A02 | 不正な設定では転送を開始しない | 実行前にmappingが不正 | 転送を開始せず、Runや転送先に中途半端な結果を残さない | 未レビュー |

### F2 — 今回の評価対象を固定する

| ID | タイトル | 条件 | 期待結果 | レビュー状態 |
| --- | --- | --- | --- | --- |
| A03 | 対象がなければ何も転送しない | 未処理Dirty Keyが0件 | 新しい転送処理を発生させず終了できる | 未レビュー |
| A04 | 処理済みの通知を再処理しない | 同じDirty Keyが既に同じLink文脈で処理済み | 同じ通知をもう一度転送しない | 未レビュー |
| A05 | 重複通知を二重転送しない | 同じlogical keyのDirty Keyが同一Run内で重複 | 同じ対象を二重転送せず、重複した通知も処理結果として区別できる | 未レビュー |
| A06 | 1つのDirty Keyを途中で分割しない | maxDirtyKeysで1つのDirty Keyを採用 | そのDirty Keyに必要な転送先をまとめて処理対象にする | 未レビュー |
| A07 | 遅れて届いたDirty Keyを取りこぼさない | eligibility確定後に小さいIDのDirty Keyが遅れてcommit | 今回対象外でも、後続Runで処理できる状態に残る | 未レビュー |

### F3 — 現在状態から転送要否を決める

| ID | タイトル | 条件 | 期待結果 | レビュー状態 |
| --- | --- | --- | --- | --- |
| A08 | 変更がなければ転送しない | immutableで比較対象列に差分がない | 新しい転送を発生させずno-opとして扱う | 未レビュー |
| A09 | 転送元も既存転送もなければ何もしない | source現在値なし、Active Blackなし | 取消や削除を新たに発生させずno-opとして扱う | 未レビュー |
| A10 | 転送元が消えた履歴型データを取り消す | immutableでsource現在値なし、Active Blackあり | 現在有効な転送結果をRedで取り消す | 未レビュー |
| A11 | 転送元が消えた現行型データを削除する | mutableでsource現在値なし、Active Blackあり | 現在の転送先行を削除する | 未レビュー |
| A12 | 初回登録型データを再転送しない | insert_onlyでActive Blackあり | 転送元の変更や消失があっても、初回転送済みの対象を再転送しない | 未レビュー |
| A13 | 曖昧な転送元を処理しない | row経路のsource SQLが同一logical keyを複数行返す | どちらかを勝手に採用せず、実行を失敗として扱う | 未レビュー |

### F4 — 選択した転送と結果追跡を成立させる

| ID | タイトル | 条件 | 期待結果 | レビュー状態 |
| --- | --- | --- | --- | --- |
| A14 | 履歴型の訂正を履歴として残す | immutable訂正 | 元の履歴を残したまま取消と新しい転送を記録し、現在有効な結果を新しいものへ切り替える | 未レビュー |
| A15 | 現行型の変更を同じ対象へ反映する | mutable更新 | 同じ転送先対象を更新し、対象の同一性を維持する | 未レビュー |
| A16 | 現行型の削除で現在状態を消す | mutable削除 | 対象行を削除し、その対象を現在有効なものとして扱わなくする | 未レビュー |
| A17 | 現行型の変更を履歴として記録しない | mutableの更新・削除 | immutable用のLineageを新たに作らない | 未レビュー |
| A18 | Dirty Keyの履歴を書き換えない | 成功またはno-opでDirty Keyを処理 | 元の変更検知履歴の内容を変更せず、処理結果は別の記録に残す | 未レビュー |

### F5 — 実行結果を確定し再試行へつなぐ

| ID | タイトル | 条件 | 期待結果 | レビュー状態 |
| --- | --- | --- | --- | --- |
| A19 | 途中失敗で中途半端な転送を残さない | work途中または後続Linkで失敗 | 途中までの転送結果を確定させず、失敗した実行として記録し、未処理分を再試行できる | 未レビュー |
| A20 | 成功済みの実行を失敗に戻さない | work COMMITは成功したが応答だけ失う | 保存済みの成功結果を、応答喪失だけを理由に失敗へ変更しない | 未レビュー |

## 補足：根拠・検証証拠

主一覧を読むために全テスト名を覚える必要はない。詳細確認時だけ以下へ戻る。

- **根拠**: なぜこのCheckが必要なのかをBusiness Design / Concept / Decisionから示す
- **検証証拠**: 現在のテスト・実装がそのCheckをどこまで裏付けているかを示す
- **レビュー状態**とは別物。証拠不足でもCheckの意味は人間確認済みにできる

| Check | 根拠 | 検証証拠（代表テスト / 実装） |
| --- | --- | --- |
| A01 | Transfer Run / Transfer Execution | E `completes a run and records exact source/link/destination lineage; rerun inserts nothing` / `executeTransfer`, `runSql` |
| A02 | Decision 0002 | E `invalid mapping is rejected before a Run or destination write` / `assertDestinationLinkMapping` |
| A03〜A05 | Work Item / Dirty Key Processing | E `coalesces repeated dirty keys in one snapshot without duplicate insertion`、初回→rerun / `pendingSql`, `completed` |
| A06〜A07 | Dirty Key / Decision 0013 | D `bounded Runs admit whole keys...`、`bounded admission does not lose a lower ID...` / `boundedPendingSql` |
| A08 | Transfer Target Decision | R `unchanged and ignored-only snapshots...` / `compareSql` |
| A09〜A10 | Transfer Target Decision / Red Transfer | R `source disappearance records Red only and supports reappearance as a fresh Black` |
| A11 | Physical Delete Transfer | M `insert, unchanged/excluded-only no-op, update, delete...` |
| A12 | insert_only Decision | I `repeat/change/disappearance short-circuit to no-op...` |
| A13 | Decision 0002/0013での曖昧状態fail-closed、row実装契約 | `executeRowTransfer` の `current.has(key)`。通知重複テストは代用しない。#41で直接証拠を追加予定 |
| A14 | Red / Black / Active / Lineage | R `correction inserts Red before new Black...` |
| A15〜A17 | mutable Black Update / Physical Delete / Lineage境界 | M lifecycle、identity guard、UPDATE key move rollback |
| A18 | Dirty Key / Dirty Key Processing | 成功系は件数保持、失敗系snapshotは全行保持。成功/no-op全列比較は#42で追加予定 |
| A19 | Run lifecycle / Decisions 0002/0008/0013 | E/D/Sのdownstream failure rollback + retry |
| A20 | Run lifecycle / commit ambiguity | E `a lost work COMMIT response cannot relabel committed success as failed`、S lost commit test |

略号: E=execution、R=reevaluation、M=mutable、I=insert-only、D=multi-destination、S=set-phase integration tests。

## G1 / G2 / G3が新形式でどう見えるか

### G1

旧C12では「Processingへ結果を書く」「Dirty Keyを変更しない」が同じ行に入っていた。

新形式では **A18 = Dirty Keyを変更しない** だけを単独で判断できる。証拠状態も `partial test evidence` と一目で分かる。後続は #42。

### G2

旧C02の「Dirty Key通知の重複」と、source SQLが同一logical keyを複数行返すことは別条件だった。

新形式では **A05 = 通知重複** と **A13 = source現在値の重複** を分離した。A13だけが `missing direct test evidence`。後続は #41。

### G3

`cancelled` Run状態はBusiness Design上の現在要求ではなく、Conceptにある状態例。したがって **Atomic Checkを作らない**。

これは「漏れ」ではなく、要求されていない機能をmissing implementationとして発明しないという前回の人間判断を維持する。

## 旧形式との比較

旧PR #40のC01〜C13は、証拠をまとめて探索するには便利だった一方、1行に複数の採否判断が混ざっていた。

代表例:

| 旧 | 新 |
| --- | --- |
| C02: 0/1/複数、既処理、重複通知を1行 | A03、A04、A05へ分離 |
| C05: source消失時のimmutable/mutable/両方なし/再出現を1行 | A09、A10、A11へ分離。再出現は必要時に別Check化できる |
| C08: mutable更新・削除・identity・Lineageなしを1行 | A15、A16、A17へ分離 |
| C12: Processing記録とDirty Key不変を1行 | A18へ不変条件を独立 |
| C13: commit ambiguity | A20として1つの観測結果なのでほぼそのまま |

**項目数が増えたこと自体を改善とは扱わない。** 改善点は、人間が各行を独立して採用・修正・削除でき、証拠不足も対象Checkだけへ限定できること。

## 人間レビューで見てほしい点

1. **タイトルと期待結果だけを先に読んで**、何を保証したいCheckか理解できるか。
2. タイトルが分かりにくい項目はどれか。条件・期待結果を変えず、タイトルだけ直せば十分なものはどれか。
3. 条件はシステム寄りの表現でも、タイトル・期待結果との対応が分かるか。
4. A03/A04/A05、A09/A10/A11、A15/A16/A17の分割は細かすぎないか。
5. A18とA13が独立したことで、#41/#42の必要性が理解しやすくなったか。
6. G3をCheckにしない判断が自然に見えるか。
7. 「未レビュー / 要確認 / 確認済み / 要修正」の状態で、AI初稿を人間と反復して完成させる現在地が分かるか。
8. 根拠・検証証拠・コード詳細を主表示から外しても、必要時に追えるか。

今回のタイトルは初稿であり、タイトル付けの一般ルールはまだAlderへ固定しない。人間レビューで「何が読みやすいタイトルか」の具体例を集めてから、上流promptへ戻すか判断する。

この人間レビューで読みやすさが改善したと確認できれば、Velvetでは常設の巨大matrixを作らず、必要時にこのAtomic Check形式で再生成・照合する運用を候補とする。
