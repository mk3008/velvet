# execute-transfer：Atomic Check 再検証（Issue 43）

**人間レビュー前のたたき台。** Issue #39 / PR #40 の複合Checkを、Alder Issue #66 / PR #67で更新されたAtomic Check形式へ小さく再整理した。製品コード・テスト・Business Designは変更していない。

- Velvet基準: `6b64e3b99845a315a394fee8e500564c3631e2af`（PR #40 merge）
- Alder基準: `03115d3d289329172f0a6b80ed5a5af9c7209c99`
- Functional Interface F1〜F5はPR #40の人間レビュー結果をそのまま維持する。
- 主表示では **1 Check = 1つの観測可能な期待結果** を優先する。
- 根拠・テスト名・実装箇所は後段へ退避する。
- 全Check / 全コード行の完全matrixではない。

## 主表示

### F1 — 実行文脈を作る

| ID | 条件 | 期待結果 | 証拠状態 |
| --- | --- | --- | --- |
| A01 | 有効なSettingと実行引数で開始 | Runに対象Setting・引数・実行状態が記録される | mapped |
| A02 | 実行前にmappingが不正 | RunもDestination書込も作らず拒否する | mapped |

### F2 — 今回の評価対象を固定する

| ID | 条件 | 期待結果 | 証拠状態 |
| --- | --- | --- | --- |
| A03 | 未処理Dirty Keyが0件 | 転送Workを作らず、追加転送を行わない | mapped |
| A04 | 同じDirty Keyが既に同じLink文脈で処理済み | 再転送しない | mapped |
| A05 | 同じlogical keyのDirty Keyが同一Run内で重複 | 1件を処理し、残りはduplicate_ignoreとして記録する | mapped |
| A06 | maxDirtyKeysで1つのDirty Keyを採用 | そのDirty Keyに属する対象Linkを途中で切らずまとめて扱う | mapped |
| A07 | eligibility確定後に小さいIDのDirty Keyが遅れてcommit | 後続Runで処理対象に残る | mapped |

### F3 — 現在状態から転送要否を決める

| ID | 条件 | 期待結果 | 証拠状態 |
| --- | --- | --- | --- |
| A08 | immutableで比較対象列に差分がない | no_opにする | mapped |
| A09 | source現在値なし、Active Blackなし | no_opにする | mapped |
| A10 | immutableでsource現在値なし、Active Blackあり | Redのみを選ぶ | mapped |
| A11 | mutableでsource現在値なし、Active Blackあり | Physical Deleteを選ぶ | mapped |
| A12 | insert_onlyでActive Blackあり | sourceの変更・消失にかかわらずno_opにする | mapped |
| A13 | row経路のsource SQLが同一logical keyを複数行返す | 曖昧な現在値を採用せず実行を失敗させる | missing direct test evidence / #41 |

### F4 — 選択した転送と結果追跡を成立させる

| ID | 条件 | 期待結果 | 証拠状態 |
| --- | --- | --- | --- |
| A14 | immutable訂正 | 元Blackを残し、Red→新Blackを作り、Activeを新Blackへ移す | mapped |
| A15 | mutable更新 | 同じDestination keyの行を更新し、Active identityを維持する | mapped |
| A16 | mutable削除 | 対象行を削除し、対応Activeを退役させる | mapped |
| A17 | mutableの更新・削除 | immutable用Lineageを新規作成しない | mapped |
| A18 | 成功またはno-opでDirty Keyを処理 | engine-owned処理は既存Dirty Key行の内容を書き換えない | partial test evidence / #42 |

### F5 — 実行結果を確定し再試行へつなぐ

| ID | 条件 | 期待結果 | 証拠状態 |
| --- | --- | --- | --- |
| A19 | work途中または後続Linkで失敗 | workの途中結果をrollbackし、Runをfailedとして残し、未処理通知を再試行可能にする | mapped |
| A20 | work COMMITは成功したが応答だけ失う | 保存済みsuccessをfailedへ上書きしない | mapped |

## 補足：根拠・代表証拠

主一覧を読むために全テスト名を覚える必要はない。詳細確認時だけ以下へ戻る。

| Check | 主な意味根拠 | 代表テスト / 実装 |
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

1. A01〜A20は、旧C01〜C13より「何をテストするか」が一読で分かるか。
2. A03/A04/A05、A09/A10/A11、A15/A16/A17の分割は細かすぎないか。
3. A18とA13が独立したことで、#41/#42の必要性が理解しやすくなったか。
4. G3をCheckにしない判断が自然に見えるか。
5. 根拠・テスト・コードの詳細を主表示から外しても、必要時に追えるか。

この人間レビューで読みやすさが改善したと確認できれば、Velvetでは常設の巨大matrixを作らず、必要時にこのAtomic Check形式で再生成・照合する運用を候補とする。
