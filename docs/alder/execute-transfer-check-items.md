# execute-transfer 検査項目リスト

**人間レビュー前のたたき台。** Alder v0.5に基づく現行リスト（版 `v0.5-1`）。対象は既存のexecute-transferのF1〜F5。登録・SQL生成・独立したLineage検索など、製品全体の網羅リストではない。

- Business Design・Decision・テスト基準：`6b64e3b99845a315a394fee8e500564c3631e2af`。このPRはそれらを変更しない。
- Alder：tag `v0.5`、commit `90dd8985cc8f4e0391b772bbba570ac8110bf04e`。適用手順は[導入記録](../adoption.md)。
- 意味保持の比較元：[Issue 39固定版](../review/issue-39/execute-transfer-mapping.md)のC01〜C13、および[PR #44の最終入力版](https://github.com/mk3008/velvet/blob/5d9872221b1e3f67cef671f644aacff69810efb1/docs/review/issue-43/execute-transfer-atomic-checks.md)のA01〜A36。履歴は書き換えない。今回は既存項目の再構成・根拠再照合であり、実装を見ないc3盲検導出の試験ではない。
- [Business Design](../business-design/README.md)が業務意味のSSOT。Conceptのstatement IDと入力版の行番号で根拠を示す。Decisionは具体化の証拠であり、未決の業務意味を承認する代わりにはしない。
- F1〜F5の粒度に対する既存承認のみ維持。各Checkの承認を推定しない。A25〜A28・A30〜A32は文章修正後も「要修正」を維持し、人間の再確認を待つ。A29は従来どおり「要確認」。A20は既存の技術契約として保持し、Check本文の「未レビュー」と#41の証拠不足を維持する。
- 永続的な対応は **Business Design ↔ Check Item ↔ Test**。コード・関数・SQL入口・実装行への対応表は持たない。テストが実装を実行して検証する。

レビュー状態は「未レビュー / 要確認 / 確認済み / 要修正」。AI確度、導出分類、テスト証拠状態とは独立する。優先レビューは **A20、A25〜A32**。テスト証拠不足はA03・A20・A32の詳細を参照。未承認項目を根拠に新しい合否テストを確定しない。

## 人間向け一覧

## F1 — 実行文脈を作る

**責務粒度: 確認済み**

| ID | タイトル | 期待結果 | レビュー状態 |
| --- | --- | --- | --- |
| A01 | 実行条件をRunに記録できる | どのSettingをどの引数で実行したかを後から確認できる | 未レビュー |
| A02 | Destinationに解決できないmappingでは転送を開始できない | Runや転送先に中途半端な結果を作らず、実行開始前に拒否する | 未レビュー |

## F2 — 今回の評価対象を固定する

**責務粒度: 確認済み**

| ID | タイトル | 期待結果 | レビュー状態 |
| --- | --- | --- | --- |
| A03 | 未処理のDirty Keyが0件でも正常に実行を終了できる | 転送Workを作らず、Runを正常終了できる | 未レビュー |
| A04 | 1件の未処理Dirty Keyを処理できる | 対象Dirty KeyをWorkとして評価し、必要な転送へ進められる | 未レビュー |
| A05 | 複数件の未処理Dirty Keyを同じRunで処理できる | 対象となる複数Dirty Keyをそれぞれ評価して処理できる | 未レビュー |
| A06 | 処理済みのDirty Keyを再転送しない | 同じSetting / Destination Linkですでに処理済みの通知を再転送しない | 未レビュー |
| A07 | 同じ対象の重複通知を二重転送しない | 1回だけ転送し、重複分は別転送せず処理結果として区別できる | 未レビュー |
| A08 | 1回のRunに採用したDirty Keyは対象Linkをまとめて処理できる | maxDirtyKeysの上限で、同じDirty KeyのLink処理を途中分割しない | 未レビュー |
| A09 | 処理上限を超えたDirty Keyを後続Runで処理できる | 今回採用しなかった未処理Dirty Keyを次回以降のRunで処理できる | 未レビュー |
| A10 | Runの対象確定後に登録されたDirty Keyを後続Runで処理できる | 実行中に新しく確定したDirty Keyを取りこぼさず、後続Runの対象にできる | 未レビュー |
| A43 | 複合キーの一部が同じでも別の対象として扱える | logical keyの構成要素が1つでも違えば別の転送元として評価する | 未レビュー |

## F3 — 現在状態から転送要否を決める

**責務粒度: 確認済み**

| ID | タイトル | 期待結果 | レビュー状態 |
| --- | --- | --- | --- |
| A11 | 比較対象に変更がない履歴型データは再転送しない | immutableで比較対象列に差分がなければ、新しいBlack / Redを作らずno-opにする | 未レビュー |
| A12 | no-opでは既存の転送状態を変更しない | Destination、Active Black、Lineageをそのまま維持する | 未レビュー |
| A13 | no-opでも処理済みとして記録できる | Dirty Key Processingにno-opの処理結果を残せる | 未レビュー |
| A14 | 転送元も既存転送もない対象は何も転送しない | 新しい取消・削除を発生させずno-opとして扱う | 未レビュー |
| A15 | 転送元が消えた履歴型データを赤伝で取り消せる | 有効な元Blackを反転したRedだけを追加し、新Blackは作らない | 未レビュー |
| A16 | 転送元が消えた現行型データは物理削除として転送できる | 現在の転送先行を削除できる | 未レビュー |
| A17 | 一度消えた転送元を新しいDirty Keyで再評価できる | 新しいDirty Keyが登録された場合、再出現した現在値を新しい転送として評価できる | 未レビュー |
| A18 | insert_onlyの初回データをBlackとして転送できる | まだActive Blackがない対象を初回Blackとして登録できる | 未レビュー |
| A19 | insert_onlyは初回転送後に再転送しない | 転送元の変更・消失があっても、初回転送済みの対象を新しい転送へ置き換えない | 未レビュー |
| A20 | 同じ転送元キーを複数行返す結果を拒否できる | 同一logical keyの複数行から勝手に1行を採用せず、実行を失敗とする | 未レビュー |
| A39 | 新しい変更通知がなければ再出現した転送元を再評価しない | 不在の通知を処理済みにした後は、sourceが現れただけでは再転送せず、新しいDirty Keyを待つ | 未レビュー |
| A41 | insert_onlyは初回の転送行と有効黒伝を保持する | 変更・消失の通知でも初回行とActive Blackを保持し、Lineageを追加しない | 未レビュー |
| A44 | 補正後の日付が同じなら元の日付変更だけで再転送しない | 元日付を別の比較対象列に保持しない場合、補正後の値が同じならno-opにする | 未レビュー |
| A45 | 元日付を業務列に残す場合はその変更も比較する | original_date等を明示保持し比較除外していなければ、その変更を差分として転送する | 未レビュー |

## F4 — 選択した転送と結果追跡を成立させる

**責務粒度: 確認済み**

| ID | タイトル | 期待結果 | レビュー状態 |
| --- | --- | --- | --- |
| A21 | 履歴型データの訂正をRedの後の新Blackで表現できる | 元Blackの反転を記録してから新しい現在値を追加し、有効なBlackを新しいものへ切り替える | 未レビュー |
| A22 | 現行型データを同じ転送先キーで更新できる | 既存の転送先行を更新し、現在対象のidentityを維持する | 未レビュー |
| A23 | 現行型データを物理削除した後はActiveとして扱わない | 転送先行を削除し、対応するActive Blackを退役させる | 未レビュー |
| A24 | 現行型の更新・削除ではimmutable用Lineageを作らない | mutable操作に不要なLineageを新規作成しない | 未レビュー |
| A25 | 現行型の更新対象キーが既存の転送先と違う場合は拒否する | 比較除外列にキーを指定していても、既存行とは別の完全キーへの更新を認めない | 要修正 |
| A26 | 現行型の更新で転送先のキーを書き換えない | UPDATEが既存行の完全キーを変えた場合、その転送を取り消す | 要修正 |
| A27 | 複数の転送先へ同じ転送元の評価結果を渡せる | 1回のRunで評価した転送元の同じ値を、対象となる各Linkへ渡す | 要修正 |
| A28 | 転送先を設定した順序で処理できる | 先行Linkの書込みを終えてから後続Linkを処理する | 要修正 |
| A29 | 変更のないLinkは再転送せず、変更のあるLinkだけを反映できる | 現行契約ではLinkごとのno-opを許す。いずれかのLinkが失敗した場合に一部だけ確定することは許さない（A33）。業務意図との一致は要確認 | 要確認 |
| A30 | 黒伝を作った転送元のキーをたどれる | immutable / insert_onlyの新Blackから、元の論理キー・Link・実行を追跡できる | 要修正 |
| A31 | 赤伝が取り消した元の黒伝をたどれる | Redから反転元の転送先行のキーを追跡できる。現在の転送元キーに置き換えない | 要修正 |
| A32 | 転送後も元の変更通知の内容を残す | 成功・no-opの処理後も、既存Dirty Keyの全内容を書き換えない | 要修正 |
| A37 | 元の黒伝は訂正・取消後も残る | immutableのRed追加で元Blackを削除・上書きしない | 未レビュー |
| A38 | 有効黒伝の退役後も過去の評価対象キーを追跡できる | 過去Workの生きたActive参照を外しても、評価時点の転送先キーを保持する | 未レビュー |
| A40 | 初回の黒伝を次回判定と由来追跡に使える | immutable / insert_onlyのBlack Insert成功時に、対応するActive BlackとLineageを残す | 未レビュー |

## F5 — 実行結果を確定し再試行へつなぐ

**責務粒度: 確認済み**

| ID | タイトル | 期待結果 | レビュー状態 |
| --- | --- | --- | --- |
| A33 | 途中失敗では転送途中の結果を確定しない | Destination / Work / Active / Lineage / Processingの途中変更をrollbackできる | 未レビュー |
| A34 | 途中失敗をfailed Runとして記録できる | 障害後に失敗記録用の処理が成功した場合、失敗した実行をRunで確認できる | 未レビュー |
| A35 | 途中失敗後の未処理Dirty Keyを再試行できる | 原因解消後の後続Runで未処理通知を再処理できる | 未レビュー |
| A36 | COMMIT済みの成功Runは応答喪失でfailedに変わらない | work COMMITの応答だけ失っても、保存済みの成功結果を失敗へ上書きしない | 未レビュー |
| A42 | 成功した実行の結果をRunから確認できる | 転送workの確定とともにRunをsucceededにする | 未レビュー |

## AI / 開発者向け詳細

条件と根拠は同じIDで保持する。導出は、Business Designの明示を「明示」、複数の意味を接続したものを「強い導出」とする。Decisionの具体化しかない箇所はその旨を併記する。テスト対応は下記T番号の**記述・assertionを照合した結果**であり、今回の実行成功や人間承認を意味しない。mappedは記載した代表条件に限定し、全経路の網羅保証ではない。

| ID | 正確な条件・前後接続 | 根拠 | 導出 / AI確度 / 優先度 | テスト・証拠状態と限界 |
| --- | --- | --- | --- | --- |
| A01 | 有効Setting + execution argumentsでexecuteTransfer開始 | [transfer-run](../concepts/transfer-run/concept.json) `transfer-run-trace-hold` (L301) | 明示 / 高 / 通常 | [T01](#t01)：**mapped**。引数と対象Settingが一致する |
| A02 | Destination Linkのmapping_definitionがDestination定義へ解決できない | [D02](../decisions/0002-phase1-trusted-execution.md) | 明示 / 高（Decisionの具体化） / 通常 | [T02](#t02)：**mapped**。事前拒否という技術的具体化。全設定異常への一般化ではない |
| A03 | pending Dirty Key = 0 | [transfer-execution](../concepts/transfer-execution/concept.json) `dirty-key-processing-transfer-execution-processed-reference-work` (L399)<br>[transfer-run](../concepts/transfer-run/concept.json) `transfer-run-lifecycle-state-hold` (L32) | 強い導出 / 高 / 通常 | [T01](#t01)、[T04](#t04)：**partial**。追加転送0件は確認。空RunのWork件数0とsucceededを直接照合する証拠は未特定 |
| A04 | pending Dirty Key = 1 | [work-item](../concepts/work-item/concept.json) `dirty-key-processing-processed-work-item` (L352)<br>[work-item](../concepts/work-item/concept.json) `destination-link-dirty-key-transfer-setting-context-decide-2` (L362) | 強い導出 / 高 / 通常 | [T01](#t01)：**mapped**。1件のWork・転送・Processing対応 |
| A05 | pending Dirty Key > 1 | [work-item](../concepts/work-item/concept.json) `dirty-key-processing-processed-work-item` (L352)<br>[work-item](../concepts/work-item/concept.json) `destination-link-dirty-key-transfer-setting-context-decide-2` (L362) | 強い導出 / 高 / 通常 | [T19](#t19)、[T25](#t25)：**mapped**。同一Runの異なる論理キー2件 |
| A06 | 同じ dirty_key_id + setting_id + destination_link_id がProcessing済み | [dirty-key-processing](../concepts/dirty-key-processing/concept.json) `destination-link-dirty-key-processing-transfer-setting-context` (L175) | 明示 / 高 / 通常 | [T01](#t01)：**mapped**。同じ文脈の処理済み通知を再実行で転送しない |
| A07 | 同じlogical identityを示すDirty Keyが同一snapshot内に複数 | [dirty-key](../concepts/dirty-key/concept.json) `dirty-key-record-management-source-table` (L212)<br>[D02](../decisions/0002-phase1-trusted-execution.md) | 明示 / 高 / 通常 | [T03](#t03)、[T25](#t25)：**mapped**。重複通知を1転送＋独立した処理結果へまとめる。source結果の重複とは別。途中イベントを逐次再生せず、現在値を1回評価する |
| A08 | maxDirtyKeysで1つのDirty Keyを採用し、複数eligible Linkがある | [D13](../decisions/0013-product-set-phases.md) | 明示 / 高（Decisionの具体化） / 通常 | [T04](#t04)：**mapped**。maxDirtyKeysは通知採用上限。1つの採用通知の全eligible Linkを保つ |
| A09 | maxDirtyKeysを超えるpending Dirty Keyがある | [dirty-key](../concepts/dirty-key/concept.json) `dirty-key-management-transfer` (L152)<br>[D13](../decisions/0013-product-set-phases.md) | 明示 / 高 / 通常 | [T04](#t04)：**mapped**。未採用通知を後続Runで消化。無期限の追随性能は主張しない |
| A10 | eligibility freeze後により小さいIDのDirty Keyがcommit | [dirty-key](../concepts/dirty-key/concept.json) `dirty-key-transfer-management-2` (L242) | 明示 / 高 / 通常 | [T05](#t05)：**mapped**。対象確定後にcommitされた小さいIDを次Runで処理。set経路の同場面の証拠にはしない |
| A11 | immutable、比較対象列に差分なし / excluded columnのみ差分 | [transfer-target-decision](../concepts/transfer-target-decision/concept.json) `ignored-columns-only-is-no-transfer` (L125) | 明示 / 高 / 通常 | [T06](#t06)：**mapped**。immutableの比較対象差分なし／除外列のみ差分 |
| A12 | A11のno-op成立時 | [active-black](../concepts/active-black/concept.json) `requires-transferred-black` (L188)<br>[lineage](../concepts/lineage/concept.json) `exists-after-transfer` (L22)<br>[transfer-target-decision](../concepts/transfer-target-decision/concept.json) `ignored-columns-only-is-no-transfer` (L125) | 強い導出 / 高 / 通常 | [T06](#t06)：**mapped**。A11成立時の転送先・Active・Lineageの保持。全DB無変更ではない |
| A13 | A11のno-op成立時 | [dirty-key-processing](../concepts/dirty-key-processing/concept.json) `dirty-key-processing-record-work-item-2` (L145) | 明示 / 高 / 通常 | [T06](#t06)：**mapped**。no_opのProcessingと転送しないWorkフラグを照合 |
| A14 | source currentなし + Active Blackなし | [transfer-target-decision](../concepts/transfer-target-decision/concept.json) `immutable-no-source-no-active-black-is-no-op` (L53)<br>[transfer-target-decision](../concepts/transfer-target-decision/concept.json) `insert-only-no-source-no-active-black-is-no-op` (L117)<br>[D05](../decisions/0005-phase4-mutable-snapshots.md) | 明示 / 高 / 通常 | [T08](#t08)、[T11](#t11)、[T26](#t26)：**mapped**。3モデルの不在を照合。immutableは初回前／取消後の両方でno_opと保持を直接照合 |
| A15 | immutable + source currentなし + Active Blackあり | [red-transfer](../concepts/red-transfer/concept.json) `red-transfer-target-exists-active-black` (L245) | 明示 / 高 / 通常 | [T07](#t07)：**mapped**。immutableでsourceなし・Activeあり。Redのみ追加 |
| A16 | mutable + source currentなし + Active Blackあり | [physical-delete-transfer](../concepts/physical-delete-transfer/concept.json) `physical-delete-transfer-source-exists-active-black-2` (L214) | 明示 / 高 / 通常 | [T08](#t08)：**mapped**。mutableでsourceなし・Activeあり。転送先行が空になる |
| A17 | source消失後、再びsource currentが現れ、新しいDirty Keyが登録 | [transfer-target-decision](../concepts/transfer-target-decision/concept.json) `immutable-no-source-no-active-black-is-no-op` (L53)<br>[D05](../decisions/0005-phase4-mutable-snapshots.md) | 明示 / 高 / 通常 | [T07](#t07)、[T08](#t08)：**mapped**。新しい通知後、再出現の現在値を転送 |
| A18 | insert_only + Active Blackなし + source currentあり | [transfer-target-decision](../concepts/transfer-target-decision/concept.json) `insert-only-no-active-black-is-insert-candidate` (L101) | 明示 / 高 / 通常 | [T09](#t09)：**mapped**。insert_onlyでsourceあり・Activeなし |
| A19 | insert_only + Active Blackあり | [transfer-target-decision](../concepts/transfer-target-decision/concept.json) `insert-only-active-black-is-no-op` (L109) | 明示 / 高 / 通常 | [T10](#t10)：**mapped**。insert_onlyでActiveあり。変更・消失でもno_op |
| A20 | row source SQLが同一logical keyを2行以上返す | [transfer-setting](../concepts/transfer-setting/concept.json) `source-key` (L42)<br>[D02](../decisions/0002-phase1-trusted-execution.md)<br>[D13](../decisions/0013-product-set-phases.md) | 強い導出 / 高（既存技術契約） / 優先 | **missing direct test evidence**：[#41](https://github.com/mk3008/velvet/issues/41)。旧G2で分類・後続方針が承認された技術契約を保持する。Check全体の業務承認とは区別する |
| A21 | immutable訂正 | [red-transfer](../concepts/red-transfer/concept.json) `red-transfer-black-2` (L295)<br>[active-black](../concepts/active-black/concept.json) `new-black-becomes-active` (L238)<br>[D08](../decisions/0008-multi-destination-verification.md) | 明示 / 高 / 通常 | [T12](#t12)、[T22](#t22)：**mapped**。immutableで比較差分あり。Red→Blackの書込順とActive切替 |
| A22 | mutable update、mapped identity一致 | [black-transfer](../concepts/black-transfer/concept.json) `black-update-transfer-mutable-model-active` (L336)<br>[D05](../decisions/0005-phase4-mutable-snapshots.md) | 明示 / 高 / 通常 | [T08](#t08)：**mapped**。完全キーの同じ既存行を更新しActiveも保持 |
| A23 | mutable delete | [active-black](../concepts/active-black/concept.json) `physical-delete-removes-active-black` (L248) | 明示 / 高 / 通常 | [T08](#t08)：**mapped**。mutable削除後のActiveなし |
| A24 | mutable update / delete | [lineage](../concepts/lineage/concept.json) `lineage-model-boundary` (L290) | 明示 / 高 / 通常 | [T08](#t08)：**mapped**。mutableの全lifecycleでLineage空 |
| A25 | mutable：mapped destination keyと既存Active Blackの完全なdestination keyが不一致 | [D05](../decisions/0005-phase4-mutable-snapshots.md) | 明示 / 高（Decisionの具体化） / 優先 | [T13](#t13)：**mapped**。mapped destination keyと既存Activeの宛先キーを比較。source keyとdestination keyの値が等しいという要求ではない |
| A26 | generated UPDATEがDestination keyを別identityへ移動 | [D05](../decisions/0005-phase4-mutable-snapshots.md) | 明示 / 高（Decisionの具体化） / 優先 | [T14](#t14)：**mapped**。UPDATEが返す完全キーを既存Activeと比較 |
| A27 | 1 source + 複数Destination Link | [destination-link](../concepts/destination-link/concept.json) `destination-link-source` (L32)<br>[D08](../decisions/0008-multi-destination-verification.md) | 明示 / 高 / 優先 | [T15](#t15)：**mapped**。非空Runで1回評価したsourceの値を全Linkで共有 |
| A28 | 複数Linkにexecution_orderあり | [destination-link](../concepts/destination-link/concept.json) `destination-link-transfer-setting-3` (L92)<br>[D08](../decisions/0008-multi-destination-verification.md) | 明示 / 高 / 優先 | [T15](#t15)、[T22](#t22)：**mapped**。execution_orderと実write順。採番だけでは先行書込成功の証明にならない |
| A29 | 同一Dirty KeyでLinkごとに差分有無が異なる | [destination-link](../concepts/destination-link/concept.json) `destination-link-reference` (L277)<br>[D08](../decisions/0008-multi-destination-verification.md) | 考慮候補 / 要精査 / 優先 | [T16](#t16)：**candidate / unapproved**。現行のLink別no-opの観測証拠。業務意図との一致を確定しない。部分commitとは別でA33を参照 |
| A30 | Black作成 | [lineage](../concepts/lineage/concept.json) `black-transfer-source-key-meaning` (L56)<br>[lineage](../concepts/lineage/concept.json) `reference-transfer-run` (L96)<br>[lineage](../concepts/lineage/concept.json) `reference-destination-link` (L116) | 明示 / 高 / 優先 | [T01](#t01)、[T22](#t22)：**mapped**。Blackのsource_kindとlogical key、Link、Run対応 |
| A31 | Red作成 | [lineage](../concepts/lineage/concept.json) `red-transfer-source-key-meaning` (L66) | 明示 / 高 / 優先 | [T07](#t07)、[T12](#t12)、[T22](#t22)：**mapped**。Redは元の転送先キーをsourceとして記録 |
| A32 | engine-owned execute-transferで既存Dirty Keyをsuccess / no-op処理する | [dirty-key](../concepts/dirty-key/concept.json) `dirty-key-change-detection-history-management-3` (L202)<br>[dirty-key-processing](../concepts/dirty-key-processing/concept.json) `not-dirty-key-processing-change-detection-history-management` (L201) | 明示 / 高 / 優先 | **partial**。partial test evidence：#42。T01は件数だけで全内容不変を証明しない。失敗rollbackのsnapshotを成功/no-op証拠に流用しない |
| A33 | work途中 / downstream Linkで失敗 | [transfer-run](../concepts/transfer-run/concept.json) `destination-transfer-run-lifecycle-state` (L364)<br>[D02](../decisions/0002-phase1-trusted-execution.md)<br>[D08](../decisions/0008-multi-destination-verification.md)<br>[D13](../decisions/0013-product-set-phases.md) | 明示 / 高 / 通常 | [T17](#t17)、[T23](#t23)：**mapped**。同じwork transaction内の全Link・採用通知を一括rollback。Run作成は別commit |
| A34 | A33の失敗 | [transfer-run](../concepts/transfer-run/concept.json) `transfer-run-lifecycle-state-hold` (L32)<br>[D02](../decisions/0002-phase1-trusted-execution.md) | 明示 / 高 / 通常 | [T17](#t17)、[T23](#t23)：**mapped**。失敗記録処理が成功する代表ケース。切断・強制終了でrunningが残る場合は保証外 |
| A35 | A33後、原因を解消して再実行 | [dirty-key-processing](../concepts/dirty-key-processing/concept.json) `dirty-key-processing-processed-record-reference` (L72)<br>[D02](../decisions/0002-phase1-trusted-execution.md) | 明示 / 高 / 通常 | [T17](#t17)、[T23](#t23)：**mapped**。原因解消後、成功未記録の通知を後続Runへ引継ぐ |
| A36 | work COMMIT成功後、responseだけ失う | [transfer-run](../concepts/transfer-run/concept.json) `transfer-run-lifecycle-state-hold` (L32)<br>[D02](../decisions/0002-phase1-trusted-execution.md) | 明示 / 高 / 通常 | [T18](#t18)、[T24](#t24)：**mapped**。work COMMIT済みで応答のみ喪失。Run作成commit喪失や一般crash recoveryとは別 |
| A37 | immutableの訂正・取消で元行保持 | [red-transfer](../concepts/red-transfer/concept.json) `red-transfer-black-physical-delete` (L285) | 明示 / 高 / 通常 | [T07](#t07)、[T12](#t12)、[T22](#t22)：**mapped**。immutableの訂正・取消で元行保持 |
| A38 | 退役時にlive参照を外してもevaluated_destination_key_json保持 | [D03](../decisions/0003-phase2-immutable-reevaluation.md)<br>[D05](../decisions/0005-phase4-mutable-snapshots.md) | 強い導出 / 高（Decisionの具体化） / 通常 | [T12](#t12)：**mapped**。退役時にlive参照を外してもevaluated_destination_key_json保持 |
| A39 | 不在通知を処理済みにした後にsourceが再出現し、まだ新しいDirty Keyはない | [transfer-target-decision](../concepts/transfer-target-decision/concept.json) `immutable-no-source-no-active-black-is-no-op` (L53)<br>[transfer-target-decision](../concepts/transfer-target-decision/concept.json) `insert-only-no-source-no-active-black-is-no-op` (L117)<br>[D05](../decisions/0005-phase4-mutable-snapshots.md) | 明示 / 高 / 通常 | [T08](#t08)、[T11](#t11)、[T26](#t26)：**mapped**。3モデルでsource再出現だけでは0件、新しい通知後に転送することを直接照合 |
| A40 | 初回成功に対応する現在状態と由来を次へ渡す | [black-transfer](../concepts/black-transfer/concept.json) `black-transfer-active` (L371)<br>[black-transfer](../concepts/black-transfer/concept.json) `black-transfer-lineage-create-non-mutable-model-2` (L381) | 明示 / 高 / 通常 | [T01](#t01)、[T09](#t09)：**mapped**。初回成功に対応する現在状態と由来を次へ渡す |
| A41 | 初回行・Active・Lineage件数保持 | [transfer-target-decision](../concepts/transfer-target-decision/concept.json) `insert-only-active-black-is-no-op` (L109) | 明示 / 高 / 通常 | [T10](#t10)：**mapped**。初回行・Active・Lineage件数保持 |
| A42 | 転送workとsucceededが永続化する正常例／commit応答喪失例 | [transfer-run](../concepts/transfer-run/concept.json) `transfer-run-lifecycle-state-hold` (L32)<br>[D02](../decisions/0002-phase1-trusted-execution.md) | 強い導出 / 高 / 通常 | [T01](#t01)、[T18](#t18)：**mapped**。転送workとsucceededが永続化する正常例／commit応答喪失例 |
| A43 | source_systemが異なる同じexternal_idの別対象を混同しない | [transfer-setting](../concepts/transfer-setting/concept.json) `source-key` (L42) | 明示 / 高 / 通常 | [T19](#t19)：**mapped**。source_systemが異なる同じexternal_idの別対象を混同しない |
| A44 | 元日付を独立の比較対象列に残さず、補正後の値は等しい | [transfer-target-decision](../concepts/transfer-target-decision/concept.json) `ignored-columns-only-is-no-transfer` (L125) | 明示 / 高 / 通常 | [T20](#t20)：**mapped**。元日付を独立の比較対象列に残さず、補正後の値は等しい |
| A45 | original_dateが比較対象の場合と、明示除外へ切り替えた場合 | [transfer-target-decision](../concepts/transfer-target-decision/concept.json) `ignored-columns-only-is-no-transfer` (L125) | 明示 / 高 / 通常 | [T21](#t21)：**mapped**。original_dateが比較対象の場合と、明示除外へ切り替えた場合 |

### 接続と適用範囲

F1（Setting・引数→Run）→F2（未処理通知→Work）→F3（現在値とActive→転送/no-op）→F4（転送行・現在状態・由来・Processing）→F5（実行結果と次回の未処理選択）。各Checkは所属Fの接続を引き継ぐ。A08〜A10・A35・A39は特にF2/F5への戻りを扱う。

row / routine / setを業務責務として分割しない。ただしset v1はimmutable・日付hookなし・文字列キー・独立キーの配備契約に限定される。T23/T24以外のrow側証拠をset全経路へ一括mappedにしない。setの空集合INSERTの発行と、転送行が増えないことは別であり、文レベルtriggerの無害性を追加保証しない。

0/1/複数通知はA03〜A05、対象なしはA14、通常残件と遅延commitはA09/A10、成功後の引継ぎはA30/A31/A40/A42、失敗後はA33〜A36、何もしない場合の保持はA11〜A13/A19/A41。CDC、scheduler、UI、全障害組合せ、全体復旧SLA、任意SQLの無害性は対象外。Run Conceptのcancelledは例なのでG3の除外を維持する。

## Business Designへ戻す事項

**A29（継続中）**：同じsource snapshotとwork transactionを共有することは、全Linkで常に新しい行を作ることと同義ではない。現行Decision 0008ではjournal memoだけの変更に対しledgerはno-opでよい。一方、業務上「どのLinkの変化でも3役割すべての版を更新する」意図なら、生成される行と後続の参照条件が変わる。業務責任者が意味を決め、必要ならBusiness Designを先に修正・確認し、その版からA29と関連項目を更新する。今回その意図を推定して閉じない。

A20は既存G2で確認された技術契約と#41の後続方針を維持する。重複拒否を新しい業務未決として再質問しない。

## 代表テスト索引（逆引き兼用）

各Testから対応Checkと上の根拠へ逆引きできる。assertionの意味を照合した索引であり、テスト全件の台帳ではない。

### T01

- [execution.integration.test.ts](../../tests/features/execute-transfer/execution.integration.test.ts) — `completes a run and records exact source/link/destination lineage; rerun inserts nothing`
- 代表assertion：引数、succeeded、Work/Processing/Active/Lineageの対応、rerunの0/0を照合。rerun時のWork件数とRun状態の直接照合は不足。
- Check：A01, A03, A04, A06, A30, A40, A42

### T02

- [execution.integration.test.ts](../../tests/features/execute-transfer/execution.integration.test.ts) — `invalid mapping is rejected before a Run or destination write`
- 代表assertion：拒否後のRun・転送先件数0。
- Check：A02

### T03

- [execution.integration.test.ts](../../tests/features/execute-transfer/execution.integration.test.ts) — `coalesces repeated dirty keys in one snapshot without duplicate insertion`
- 代表assertion：inserted=1/skipped=1、black_insertとduplicate_ignoreの別結果。
- Check：A07

### T04

- [multi-destination.integration.test.ts](../../tests/features/execute-transfer/multi-destination.integration.test.ts) — `bounded Runs admit whole keys, retain remaining work and evaluate the complete source once per Run`
- 代表assertion：各Runは同じDirty Keyの3Linkすべてを処理。3回で残件を消化、最終0/0、Processing9件。
- Check：A03, A08, A09

### T05

- [multi-destination.integration.test.ts](../../tests/features/execute-transfer/multi-destination.integration.test.ts) — `bounded admission does not lose a lower ID committed after eligibility was frozen`
- 代表assertion：先に採番されたID=0を後からcommitし、次Runの3結果がそのIDになる。
- Check：A10

### T06

- [reevaluation.integration.test.ts](../../tests/features/execute-transfer/reevaluation.integration.test.ts) — `unchanged and ignored-only snapshots complete without changing destination, Active Black or Lineage`
- 代表assertion：転送先・Active・Lineage前後一致、no_op、Work転送フラグfalse。
- Check：A11, A12, A13

### T07

- [reevaluation.integration.test.ts](../../tests/features/execute-transfer/reevaluation.integration.test.ts) — `source disappearance records Red only and supports reappearance as a fresh Black`
- 代表assertion：元Black＋反転Redだけが残り、Activeが空。新通知後に再出現Blackを作る。
- Check：A15, A17, A31, A37

### T08

- [mutable.integration.test.ts](../../tests/features/execute-transfer/mutable.integration.test.ts) — `insert, unchanged/excluded-only no-op, update, delete, absent no-op, and reappearance preserve current identity`
- 代表assertion：完全行とActiveの保持、更新値、削除後の空状態、no_op、新通知なし0/0・あり1件、Lineage空。
- Check：A14, A16, A17, A22, A23, A24, A39

### T09

- [insert-only.integration.test.ts](../../tests/features/execute-transfer/insert-only.integration.test.ts) — `first materialization uses ordinary Black Insert, Active Black and Lineage`
- 代表assertion：初回転送行、Activeの元キー/宛先キー、Lineage1件、black_insert。
- Check：A18, A40

### T10

- [insert-only.integration.test.ts](../../tests/features/execute-transfer/insert-only.integration.test.ts) — `repeat/change/disappearance short-circuit to no-op without replacing the first row`
- 代表assertion：変更・消失でno_op、初回行/Active維持、Lineage件数1。
- Check：A19, A41

### T11

- [insert-only.integration.test.ts](../../tests/features/execute-transfer/insert-only.integration.test.ts) — `absent before materialization is no-op and later appearance needs a new Dirty Key`
- 代表assertion：初回不在は0件、再出現だけでは0/0、新通知後に1件。
- Check：A14, A39

### T12

- [reevaluation.integration.test.ts](../../tests/features/execute-transfer/reevaluation.integration.test.ts) — `correction inserts Red before new Black, preserves old row, records both lineages and retires old Active Black`
- 代表assertion：元行保持、Red=-100・新Black=150、新Active、両Lineage、過去Work評価キー保持。
- Check：A21, A31, A37, A38

### T13

- [mutable.integration.test.ts](../../tests/features/execute-transfer/mutable.integration.test.ts) — `rejects inconsistent mapped identity even if key columns are excluded`
- 代表assertion：キーを比較除外しても不一致を拒否し、全状態snapshotは不変。
- Check：A25

### T14

- [mutable.integration.test.ts](../../tests/features/execute-transfer/mutable.integration.test.ts) — `an UPDATE SQL that moves the destination key is rolled back`
- 代表assertion：キーを移動するUPDATEを拒否し、全状態snapshotは不変。
- Check：A26

### T15

- [multi-destination.integration.test.ts](../../tests/features/execute-transfer/multi-destination.integration.test.ts) — `one evaluated source snapshot shares allocation, mappings and write order across all three links`
- 代表assertion：source評価1回、3役割のallocation共有、実write順と各役割の値・Processingを照合。
- Check：A27, A28

### T16

- [multi-destination.integration.test.ts](../../tests/features/execute-transfer/multi-destination.integration.test.ts) — `one Dirty Key changes only the journal memo while both ledger links independently no-op`
- 代表assertion：inserted=1/skipped=2、journalだけRed+Black、両ledgerの行/Active保持。同じ通知でも各Linkの結果は異なる。
- Check：A29

### T17

- [multi-destination.integration.test.ts](../../tests/features/execute-transfer/multi-destination.integration.test.ts) — `a bounded Run rolls back every admitted link on downstream failure and remains retryable`
- 代表assertion：後続Link失敗で全状態snapshot不変、failed Run1件、原因除去後に3Link成功。
- Check：A33, A34, A35

### T18

- [execution.integration.test.ts](../../tests/features/execute-transfer/execution.integration.test.ts) — `a lost work COMMIT response cannot relabel committed success as failed`
- 代表assertion：APIの元errorを保ち、保存済みRunはsucceeded、転送先とProcessingは成功のまま。
- Check：A36, A42

### T19

- [insert-only.integration.test.ts](../../tests/features/execute-transfer/insert-only.integration.test.ts) — `coalesces repeated Dirty Keys and keeps composite source identities distinct`
- 代表assertion：同じexternal_idでもsource_systemの異なる複合キーを2件転送、重複分だけ無視。
- Check：A05, A43

### T20

- [reevaluation.integration.test.ts](../../tests/features/execute-transfer/reevaluation.integration.test.ts) — `owner decision: April 10 to April 11 stays May 1 and is no-op without original_date`
- 代表assertion：補正前4/10→4/11、補正後5/1のままなら転送先前後一致。
- Check：A44

### T21

- [reevaluation.integration.test.ts](../../tests/features/execute-transfer/reevaluation.integration.test.ts) — `owner decision: explicitly retained original_date changes, while Red and Black stay in the open period`
- 代表assertion：元日付を保持すると新Black/Redが生じ、original_dateを除外後はno-op。
- Check：A45

### T22

- [multi-destination.integration.test.ts](../../tests/features/execute-transfer/multi-destination.integration.test.ts) — `100 to 120 correction retains original Red provenance and correlates all new Blacks`
- 代表assertion：各LinkのRed→Blackの実write順、元行保持、各Redの元宛先キー、新Blackの論理キーを照合。
- Check：A21, A28, A30, A31, A37

### T23

- [set-phase.integration.test.ts](../../tests/features/execute-transfer/set-phase.integration.test.ts) — `downstream failure rolls back destination and metadata, retains failed Run, then retries`
- 代表assertion：set経路の途中失敗でsnapshot不変、failed Run、再試行成功。
- Check：A33, A34, A35

### T24

- [set-phase.integration.test.ts](../../tests/features/execute-transfer/set-phase.integration.test.ts) — `lost successful COMMIT response remains durable and retry does no work`
- 代表assertion：set経路でも保存済み成功を保持し、再試行0件。
- Check：A36

### T25

- [reevaluation.integration.test.ts](../../tests/features/execute-transfer/reevaluation.integration.test.ts) — `coalesces current state once and processes a new key in the same Run`
- 代表assertion：途中120を再生せず現在170へ訂正し、別キー200も同Runで処理。
- Check：A05, A07

### T26

- [reevaluation.integration.test.ts](../../tests/features/execute-transfer/reevaluation.integration.test.ts) — `absent source and Active Black complete no-op %s`（before first Black / after cancellation）
- 代表assertion：immutableの両不在でno_op、転送先・Lineage保持、Activeなし。再出現だけでは0/0、新通知後に1件。
- Check：A14, A39

## 意味保持監査

PR #44のA01〜A36は同じIDのまま保持し、条件・状態を上記詳細へ対応付けた。A25の「sourceとdestination identity一致」は、異種キーの同値要求に誤読されないよう、Decision 0005のmapped destination keyとActiveの比較へ修正した。A20の既存技術契約と未レビュー状態を保ち、A29は未決のまま。これらは業務意味を変更したものではない。

| 旧Check | 保持先 | 独立した保証の照合 |
| --- | --- | --- |
| C01 | A01,A02 | 文脈保存／mapping事前拒否 |
| C02 | A03〜A07,A43 | 0/1/複数／処理済み除外／重複通知の別結果／複合キーの区別 |
| C03 | A08〜A10 | 全Link採用／残件／後からcommitされた小さいID |
| C04 | A11〜A13,A44,A45 | no-op／3状態保持／Processing／補正後比較と元日付の明示保持 |
| C05 | A14〜A17,A23,A37〜A39 | 不在と各モデルの取消／新通知による再評価／元行・評価キー保持 |
| C06 | A18,A19,A40,A41 | 初回Black・Active・Lineage／以後no-opと初回保持 |
| C07 | A21,A30,A31,A37,A38 | Red→新Black／Active切替／両Lineage／元行・過去評価キー保持 |
| C08 | A22〜A26,A38 | 完全キー更新／削除退役／Lineageなし／2種類のidentity拒否／評価キー保持 |
| C09 | A27〜A29,A33 | 同一snapshot／実write順／同じDestinationの別役割／Link別結果と一括確定を分離 |
| C10 | A24,A30,A31,A40 | 生成された行だけ追跡／BlackとRedのsource意味／モデル境界 |
| C11 | A33〜A35,A42 | work一括確定／失敗rollback／失敗記録／再試行。回復処理失敗時の限界も保持 |
| C12 | A32,A13 | Dirty Key不変／Processing別記録。件数だけでは不十分（#42） |
| C13 | A36 | COMMIT応答喪失でも保存済み成功を上書きしない |

削除した業務保証はない。意図的に廃止したのは恒久的なCode/SQL位置対応。過去のIssue 39/43の研究記録には元の対応を残すが、新版の維持対象にしない。A37〜A45は既存保証を明示したもので、新機能要求ではない。
