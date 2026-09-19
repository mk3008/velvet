# execute-transfer：Atomic Check 再検証（Issue 43）

**人間レビュー前のたたき台。** Issue #39 / PR #40 の複合Checkを、Alder Issue #66 / PR #67で更新されたAtomic Check形式へ再整理した。製品コード・テスト・Business Designは変更していない。

- Velvet基準: `6b64e3b99845a315a394fee8e500564c3631e2af`（PR #40 merge）
- Alder基準: `03115d3d289329172f0a6b80ed5a5af9c7209c99`
- Functional Interface F1〜F5の責務粒度はPR #40の人間レビューで確認済み。
- Check本文は今回あらためて人間レビューするため、すべて **未レビュー** から開始する。
- 人間はまず **タイトル → 期待結果** を読む。条件・根拠・テスト証拠・コード対応は詳細側で確認する。
- タイトルは「何を保証・検証したいか」を短く表す。不正・曖昧・遅れて、のように条件を読まないと意味が決まらない語は避ける。
- 「できる / できない」は自然な場合に使うが、すべての不変条件へ強制しない。
- 1 Check = 原則1つの観測可能な期待結果。ただし不可分な結果をassertion単位に機械分割しない。
- 旧C01〜C13の意味を分解時に失わないことを、末尾の意味保持監査で確認する。

## レビュー状態

| 状態 | 意味 |
| --- | --- |
| 未レビュー | AI初稿。人間がまだ内容を確認していない |
| 要確認 | 意味・期待結果に人間判断が必要 |
| 確認済み | 人間がタイトル・期待結果・必要な条件を確認した |
| 要修正 | 人間レビューで修正が必要と判明した |

レビュー状態は、テスト証拠の有無とは別軸。テスト証拠が不足していてもCheckの意味自体は「確認済み」になり得る。

---

# 人間レビュー用

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

## F3 — 現在状態から転送要否を決める
**責務粒度: 確認済み**

| ID | タイトル | 期待結果 | レビュー状態 |
| --- | --- | --- | --- |
| A11 | 比較対象に変更がないデータは再転送しない | 新しいBlack / Red / Update / Deleteを発生させずno-opとして扱う | 未レビュー |
| A12 | no-opでは既存の転送状態を変更しない | Destination、Active Black、Lineageをそのまま維持する | 未レビュー |
| A13 | no-opでも処理済みとして記録できる | Dirty Key Processingにno-opの処理結果を残せる | 未レビュー |
| A14 | 転送元も既存転送もない対象は何も転送しない | 新しい取消・削除を発生させずno-opとして扱う | 未レビュー |
| A15 | 転送元が消えた履歴型データは赤伝として転送できる | 現在有効なBlackに対応するRedを作成できる | 未レビュー |
| A16 | 転送元が消えた現行型データは物理削除として転送できる | 現在の転送先行を削除できる | 未レビュー |
| A17 | 一度消えた転送元を新しいDirty Keyで再評価できる | 新しいDirty Keyが登録された場合、再出現した現在値を新しい転送として評価できる | 未レビュー |
| A18 | insert_onlyの初回データをBlackとして転送できる | まだActive Blackがない対象を初回Blackとして登録できる | 未レビュー |
| A19 | insert_onlyは初回転送後に再転送しない | 転送元の変更・消失があっても、初回転送済みの対象を新しい転送へ置き換えない | 未レビュー |
| A20 | 同一logical keyを複数行返すsource結果を拒否できる | どちらか1行を勝手に採用せず、実行を失敗として扱う | 未レビュー |

## F4 — 選択した転送と結果追跡を成立させる
**責務粒度: 確認済み**

| ID | タイトル | 期待結果 | レビュー状態 |
| --- | --- | --- | --- |
| A21 | 履歴型データの訂正をRedと新Blackで表現できる | 元Blackを残し、Redと新Blackを記録し、現在有効なBlackを新しいものへ切り替える | 未レビュー |
| A22 | 現行型データを同じ転送先キーで更新できる | 既存の転送先行を更新し、現在対象のidentityを維持する | 未レビュー |
| A23 | 現行型データを物理削除した後はActiveとして扱わない | 転送先行を削除し、対応するActive Blackを退役させる | 未レビュー |
| A24 | 現行型の更新・削除ではimmutable用Lineageを作らない | mutable操作に不要なLineageを新規作成しない | 未レビュー |
| A25 | sourceとDestinationのidentityが一致しない転送を拒否できる | mapped identityが不整合な場合、転送を成立させない | 未レビュー |
| A26 | mutable更新でDestination keyを別identityへ移動できない | UPDATE結果が別Destination keyへ変わる場合、転送を成立させない | 未レビュー |
| A27 | 複数Destination Linkを同じsource snapshotで評価できる | 同じRun内の各Linkが同じ時点のsource評価結果を共有できる | 未レビュー |
| A28 | 複数Destination Linkを定義された順序で処理できる | execution_orderに従ってLinkごとの転送を実行できる | 未レビュー |
| A29 | Destination Linkごとに転送要否を独立して判定できる | あるLinkだけ変更し、他Linkはno-opという結果を持てる | 未レビュー |
| A30 | BlackのLineageから元の転送対象を追跡できる | Blackがどのsource logical keyから作られたかを追跡できる | 未レビュー |
| A31 | RedのLineageから取り消した転送結果を追跡できる | Redがどの既存Destinationを取り消したかを追跡できる | 未レビュー |
| A32 | Dirty Keyの変更検知履歴は転送処理で書き換わらない | 元Dirty Keyの内容を維持し、処理結果は別のProcessing記録へ残す | 未レビュー |

## F5 — 実行結果を確定し再試行へつなぐ
**責務粒度: 確認済み**

| ID | タイトル | 期待結果 | レビュー状態 |
| --- | --- | --- | --- |
| A33 | 途中失敗では転送途中の結果を確定しない | Destination / Work / Active / Lineage / Processingの途中変更をrollbackできる | 未レビュー |
| A34 | 途中失敗をfailed Runとして記録できる | 実行が失敗した事実をRunに残せる | 未レビュー |
| A35 | 途中失敗後の未処理Dirty Keyを再試行できる | 原因解消後の後続Runで未処理通知を再処理できる | 未レビュー |
| A36 | COMMIT済みの成功Runは応答喪失でfailedに変わらない | work COMMITの応答だけ失っても、保存済みの成功結果を失敗へ上書きしない | 未レビュー |

---

# AI / 開発者向け詳細

人間向けのタイトル・期待結果を短く保つ代わりに、AIや実装者は以下の条件・根拠・証拠を参照する。

- **条件**: 実装・DB・内部用語を含めてよい。テスト入力を一意にできる精度を優先する。
- **根拠**: Business Design / Concept / DecisionのどこからCheckを導いたか。
- **導出**: 明示 / 強い導出 / 考慮候補。
- **確度**: 高 / 要精査。AIの導出確度であり、人間承認とは別。
- **検証証拠**: 現在のtest / codeがCheckをどこまで裏付けるか。

## F1 詳細

| ID | 条件 | 根拠 | 導出 / 確度 | 検証証拠 |
| --- | --- | --- | --- | --- |
| A01 | 有効Setting + execution argumentsでexecuteTransfer開始 | Transfer Run / Transfer Execution | 明示 / 高 | E: `completes a run...`; `executeTransfer`, `runSql` |
| A02 | Destination Linkのmapping_definitionがDestination定義へ解決できない | Decision 0002 | 明示 / 高 | E: `invalid mapping is rejected before a Run or destination write`; `assertDestinationLinkMapping` |

## F2 詳細

| ID | 条件 | 根拠 | 導出 / 確度 | 検証証拠 |
| --- | --- | --- | --- | --- |
| A03 | pending Dirty Key = 0 | Work Item / Run lifecycle | 強い導出 / 高 | rerun 0/0、Run completion。追加転送なし |
| A04 | pending Dirty Key = 1 | Work Item | 強い導出 / 高 | 通常single-key integration paths |
| A05 | pending Dirty Key > 1 | Work Item | 強い導出 / 高 | multi-key / multi-destination integration paths |
| A06 | 同じ dirty_key_id + setting_id + destination_link_id がProcessing済み | Dirty Key Processing | 明示 / 高 | `pendingSql`, completed exclusion、rerun |
| A07 | 同じlogical identityを示すDirty Keyが同一snapshot内に複数 | Dirty Key / Processing | 明示 / 高 | E: `coalesces repeated dirty keys...`; duplicate_ignore |
| A08 | maxDirtyKeysで1つのDirty Keyを採用し、複数eligible Linkがある | Decision 0013 | 明示 / 高 | D/S whole-key cap; `boundedPendingSql` |
| A09 | maxDirtyKeysを超えるpending Dirty Keyがある | Dirty Key management / Decision 0013 | 明示 / 高 | D/S bounded Runs retain remaining work |
| A10 | eligibility freeze後により小さいIDのDirty Keyがcommit | Dirty Key management / Decision 0013 | 明示 / 高 | D: `bounded admission does not lose a lower ID...` |

## F3 詳細

| ID | 条件 | 根拠 | 導出 / 確度 | 検証証拠 |
| --- | --- | --- | --- | --- |
| A11 | immutable、比較対象列に差分なし / excluded columnのみ差分 | Transfer Target Decision | 明示 / 高 | R: unchanged / ignored-only snapshots; `compareSql` |
| A12 | A11のno-op成立時 | Active Black / Lineage / Decision | 明示 / 高 | RでDestination / Active / Lineage前後一致 |
| A13 | A11のno-op成立時 | Dirty Key Processing | 明示 / 高 | Rでprocessing_result=no_op、Work flags=false |
| A14 | source currentなし + Active Blackなし | Decision `immutable-no-source-no-active-black-is-no-op` 等 | 明示 / 高 | R/M absent-before-materialization routes |
| A15 | immutable + source currentなし + Active Blackあり | Red Transfer | 明示 / 高 | R: disappearance → Red only |
| A16 | mutable + source currentなし + Active Blackあり | Physical Delete Transfer | 明示 / 高 | M lifecycle delete path |
| A17 | source消失後、再びsource currentが現れ、新しいDirty Keyが登録 | Dirty Key / Transfer Target Decision | 明示 / 高 | R/M reappearance requires fresh Dirty Key |
| A18 | insert_only + Active Blackなし + source currentあり | Black Insert / Decision 0006 | 明示 / 高 | I: first materialization uses ordinary Black Insert |
| A19 | insert_only + Active Blackあり | Decision `insert-only-active-black-is-no-op` | 明示 / 高 | I: repeat/change/disappearance no-op |
| A20 | row source SQLが同一logical keyを2行以上返す | row実装の一意性契約 / Decision 0002,0013 | 強い導出 / 高 | code: `current.has(key)`でreject。直接回帰テスト不足 → #41 |

## F4 詳細

| ID | 条件 | 根拠 | 導出 / 確度 | 検証証拠 |
| --- | --- | --- | --- | --- |
| A21 | immutable訂正 | Red / Black / Active / Lineage | 明示 / 高 | R: correction inserts Red before new Black |
| A22 | mutable update、mapped identity一致 | mutable Black Update / Decision 0005 | 明示 / 高 | M update path |
| A23 | mutable delete | Physical Delete / Active Black | 明示 / 高 | M delete path |
| A24 | mutable update / delete | Lineage model boundary | 明示 / 高 | M lifecycleでLineageなし |
| A25 | source logical identityとmapped Destination identityが不一致 | identity mapping / Decision 0005 | 明示 / 高 | M: rejects inconsistent mapped identity |
| A26 | generated UPDATEがDestination keyを別identityへ移動 | identity mapping / Decision 0005 | 明示 / 高 | M: UPDATE that moves destination key is rolled back |
| A27 | 1 source + 複数Destination Link | Destination Link / Decision 0008 | 明示 / 高 | D: one evaluated source snapshot shares allocation/mappings |
| A28 | 複数Linkにexecution_orderあり | Destination Link / Decision 0008 | 明示 / 高 | Dで実write順を確認 |
| A29 | 同一Dirty KeyでLinkごとに差分有無が異なる | Destination Link / Target Decision | 明示 / 高 | D: journal変更、ledger links no-op |
| A30 | Black作成 | Lineage `black-transfer-source-key-meaning` | 明示 / 高 | E/I Black lineage source_kind=transfer_source |
| A31 | Red作成 | Lineage `red-transfer-source-key-meaning` | 明示 / 高 | R correction testで元Destination keyを確認 |
| A32 | success / no-opでDirty Keyを処理 | Dirty Key / Dirty Key Processing | 明示 / 高 | engine-owned SQLにDirty Key updateなし。成功/no-op全列比較は未証明 → #42 |

## F5 詳細

| ID | 条件 | 根拠 | 導出 / 確度 | 検証証拠 |
| --- | --- | --- | --- | --- |
| A33 | work途中 / downstream Linkで失敗 | Run lifecycle / Decisions 0002,0008,0013 | 明示 / 高 | E/D/S rollback snapshots |
| A34 | A33の失敗 | Run lifecycle | 明示 / 高 | failed Run保持 |
| A35 | A33後、原因を解消して再実行 | Processing / Run lifecycle | 明示 / 高 | D/S retry succeeds |
| A36 | work COMMIT成功後、responseだけ失う | commit ambiguity / Decision 0002,0013 | 明示 / 高 | E/S lost COMMIT tests |

略号: E=execution、R=reevaluation、M=mutable、I=insert-only、D=multi-destination、S=set-phase integration tests。

---

# 証拠不足として既知のCheck

| Check | 状態 | 後続 |
| --- | --- | --- |
| A20 | code上のrejectはあるが直接回帰テスト不足 | #41 |
| A32 | engine-owned処理がDirty Keyを更新しないことは実装から確認できるが、成功/no-op前後の全列一致テスト不足 | #42 |

G3（Run Conceptの `cancelled` 状態例）は現在要求ではないためAtomic Checkを作らない。要求されていない機能をmissing implementationとして発明しない。

---

# 旧C01〜C13からの意味保持監査

Atomic化で意味を落とさないため、旧PR #40の複合Checkを今回の新Checkへ逆対応した。

| 旧Check | 保持先 | 監査結果 |
| --- | --- | --- |
| C01 | A01, A02 | Run文脈保存 / mapping事前拒否を保持 |
| C02 | A03〜A07 | 0/1/複数、処理済み除外、重複通知を分離して保持 |
| C03 | A08〜A10 | whole-key cap、残件、late commitを分離して保持 |
| C04 | A11〜A13 | no-op、状態保持、Processing記録を分離して保持 |
| C05 | A14〜A17 | source不在3経路、再出現を分離して保持 |
| C06 | A18, A19 | insert_only初回Black / 以後no-opを保持 |
| C07 | A21 | Red→Black訂正とActive切替を保持 |
| C08 | A22〜A26 | mutable更新/削除、Lineage境界、identity guardを保持 |
| C09 | A27〜A29 | snapshot共有、Link順、Link別結果を保持 |
| C10 | A30, A31 | Black / Redで異なるLineage source意味を保持 |
| C11 | A33〜A35 | rollback、failed Run、retryを分離して保持 |
| C12 | A32 | Dirty Key不変 / Processing別記録を保持 |
| C13 | A36 | COMMIT応答喪失時のsuccess保持を維持 |

**監査結果:** 旧C01〜C13の意味は、今回のAtomic Checkまたは詳細条件へ対応付けた。今後も表示形式を変更する場合、削除した意味は明示的な理由なしに消さない。

---

# 今回の人間レビューで見てほしい点

1. まず **タイトルと期待結果だけ** を読んで、何を保証するCheckか理解できるか。
2. 条件を見なくても意味が通じるタイトルになっているか。
3. 「できる / できない」が自然なCheckと、不変条件として書く方が自然なCheckの境界は妥当か。
4. F1〜F5の責務見出しの下で、Checkの位置付けが理解しやすいか。
5. 人間向け主表示とAI / 開発者向け詳細の二層構造で、双方が同じCheck IDを共有できるか。
6. レビュー状態 / 導出分類 / AI確度 / テスト証拠を別軸にした運用が分かりやすいか。
7. 旧C01〜C13からの意味保持監査で、表示改善による要件欠落を防げそうか。

タイトル命名の一般ルールはまだAlder promptへ固定しない。この実例で人間レビューを続け、読みやすい / 読みにくい具体例を集めてから上流へ戻す。
