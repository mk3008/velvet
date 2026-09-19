# execute-transfer：責務と検査証拠の対応（Issue 39）

**人間レビュー前のたたき台。** 実装の変更提案ではなく、既存プロダクトに対する小規模な適用記録。まず「責務カード」、次に **C12 / G1 / G2 / G3** を確認してほしい。`mapped` は表に記した条件・アサーションの対応を意味し、契約全体の証明やテスト実行成功を意味しない。

## 入力版・適用条件

- VelvetのBusiness Design・Decision・実装・テストはすべて `ecd2152c7502247c156a63bea2ca837e4b230b41` に固定。本書のInterface/Check版は `v1`（このPR）。将来のmainへ無条件に持ち越さない。
- 手法はAlder [f1](https://github.com/mk3008/alder/blob/f1e642fb3f23629bda9f3a548100918d68254513/docs/functional-interface/prompt.md) と同版の [c3](https://github.com/mk3008/alder/blob/f1e642fb3f23629bda9f3a548100918d68254513/docs/behavior-derivation/candidate-c3.md)。Business Designを先に読み、既存実装へ対応付けた回顧的試行。c3単独の盲検比較・精度評価ではない。
- 意味の入口：[Business Design](../../business-design/README.md) → [Scope](../../scope/SYSTEM_SCOPE.md) → [Concept一覧](../../concepts/README.md) → [DFD](../../dfd/change-detection-dirty-key-registration.md)・[Process Map](../../processes/transfer-execution-process.md)。関連ConceptはTransfer Execution / Run / Setting、Work Item、Transfer Target Decision、Dirty Key / Processing、Destination / Link、Active Black、Black / Red / Physical Delete Transfer、Lineage（参照した各Conceptは `defined`）。本書は意味の正本を増やさない。
- 技術上の具体化は [Decision 0002](../../decisions/0002-phase1-trusted-execution.md)〜[0006](../../decisions/0006-phase5-insert-only-identity-mapping.md)、[0008](../../decisions/0008-multi-destination-verification.md)、[0012](../../decisions/0012-reviewable-set-phases.md)、[0013](../../decisions/0013-product-set-phases.md) を参照。Decisionの実装条件をBusiness Designの直接記述と混同しない。
- 実装への入口は既存の [feature README](../../../src/features/execute-transfer/README.md)。本書は全関数・全テストの台帳にせず、意味から読むための追加索引に限定する。

## 責務カード

呼出主体はアプリケーション／外部の実行契機。F2〜F4は実行から引き継がれる責務であり、独立した公開APIや個別commitを要求しない。内部SQLやrow/setの方式でInterfaceを分割しない。

| ID・責務 | 根拠・主体／入力 | 成功・不成立・保持／次への接続 | 主担当Check |
| --- | --- | --- | --- |
| F1 実行文脈を作る | Transfer Execution / Run / Setting。呼出主体が1つのSettingと実行引数を与える | Runが引数と実行全体の状態を保持し、F2へ渡す。Runは事前キューでも転送対象行の正本でもない。設定不成立時の拒否時点はDecision 0002の具体化 | C01 |
| F2 今回の評価対象を固定する | DFD、Work Item、Dirty Key / Processing。実行が検知履歴とSetting/Link文脈を読む | 処理済みを除外し、由来と文脈を保ったWorkをF3へ渡す。0件なら転送なし。重複通知も履歴として残す。未採用分は後続Runで再選択できる | C02、C03 |
| F3 現在状態から転送要否を決める | Transfer Target Decision、Destination / Link、Active Black。Work・現在値・有効黒・モデル・除外列を評価 | 転送候補またはno-opをF4へ渡す。Dirty Keyをイベント操作として逐次再生しない。不在・再出現は新しい通知で再評価する | C04、C05、C06 |
| F4 選択した転送と結果追跡を成立させる | Process Map、Black / Red / Physical Delete、Lineage、Processing。実行がF3の結果を適用 | 宛先行・Active・条件付きLineage・処理結果が対応し、次Linkと次回評価で利用できる。no-opは新しい転送行を作らず処理済みにする。取消後も既存履歴・評価済みキーを保持 | C07、C08、C09、C10、C12 |
| F5 実行結果を確定し再試行へつなぐ | Run、Processing、Decision 0002/0008/0013。実行全体の成功／失敗 | 成功はRunと結果を確定。work失敗は途中結果を戻し、別途失敗Runを残す。未処理通知は再試行可能。COMMIT応答喪失だけで成功を失敗へ上書きしない | C11、C13 |

分割理由：F2は対象の同一性、F3は判断、F4は転送事実と追跡、F5は実行全体の結果という異なる観測対象を持つ。一方Active/Lineage/Processingを独立操作にすると原子性・順序を見失いやすいため、F4にまとめた。F1とF5の統合可否は人間レビューで判断する。

## Check → アサーション → 実装

各行の期待結果はその行の条件に限定する。C01〜C10・C12の意味根拠は原則 **明示・確度高・通常レビュー**。具体的な拒否時点、件数上限、rollback、COMMIT回復は併記Decisionによる技術的具体化。C11/C13もその範囲では高・通常であり、新しい業務承認を意味しない。C12の証拠不足、G1〜G3は優先レビュー。

テスト略号（以下の引用はファイル内のtest名を検索）：
[E](../../../tests/features/execute-transfer/execution.integration.test.ts)、[R](../../../tests/features/execute-transfer/reevaluation.integration.test.ts)、[M](../../../tests/features/execute-transfer/mutable.integration.test.ts)、[I](../../../tests/features/execute-transfer/insert-only.integration.test.ts)、[D](../../../tests/features/execute-transfer/multi-destination.integration.test.ts)、[S](../../../tests/features/execute-transfer/set-phase.integration.test.ts)。
実装略号：[B](../../../src/features/execute-transfer/boundary.ts)、[Q](../../../src/features/execute-transfer/queries.ts)、[SP](../../../src/features/execute-transfer/set-phase/execute.ts)、[SQ](../../../src/features/execute-transfer/set-phase/queries.ts)。

| Check・条件 → 期待結果／禁止 | 意味根拠（Concept内statement IDまたはDecision） | 実際のテスト証拠と限界 | 実装・判定 |
| --- | --- | --- | --- |
| C01 / F1：有効Setting＋引数 → Runに文脈保存。不正mappingでRunや宛先を書かない | Run `transfer-run-trace-hold`、Execution `transfer-execution-setting-target-requires-one`、Decision 0002 | E `completes a run and records exact source/link/destination lineage; rerun inserts nothing` は引数・succeeded・関連IDを照合。E `invalid mapping is rejected before a Run or destination write` は拒否位置を確認 | B `executeTransfer`、`assertDestinationLinkMapping` → Q `runSql`。**mapped**。ヘルパー単体を拒否時点の証明にしない |
| C02 / F2：未処理0/1/複数、同一キーの重複通知 → 既処理を再転送せず、重複は別Processingで記録 | Work `dirty-key-processing-processed-work-item`、`destination-link-dirty-key-transfer-setting-context-decide-2` | E `coalesces repeated dirty keys in one snapshot without duplicate insertion` はinserted=1/skipped=1とblack_insert/duplicate_ignore。E初回・rerunテストは再実行0/0。I `coalesces repeated Dirty Keys and keeps composite source identities distinct` は別論理キー2件を区別 | Q `pendingSql`、B `completed` / `context`。**mapped**。「通知重複」と「source SQLが同じ論理キーを複数返す」は別条件（G2） |
| C03 / F2（関連F5）：上限より多い通知、遅れてcommitした小さいID → 全Linkを採用し残りを後続Runへ | Dirty Key `dirty-key-transfer-management-2`、Decision 0013、Qのbounded方針 | D `bounded Runs admit whole keys, retain remaining work and evaluate the complete source once per Run` は3回の全3Link、Processing9件、source実行回数、最後0件。D `bounded admission does not lose a lower ID committed after eligibility was frozen` はID=0を次Runで処理。S `whole-key cap, duplicates, complete source once and empty retry cleanup` はcapとTEMP消去 | Q `boundedPendingSql`、SQ `admit` / `pending`。**mapped**。setの遅延commit条件まで同一テストで証明したわけではない。無期限の追随性能は対象外 |
| C04 / F3：immutableで差分なし／除外列のみ差分 → no-op、宛先・Active・Lineageを保持しProcessingを残す | Decision `ignored-columns-only-is-no-transfer` | R `unchanged and ignored-only snapshots complete without changing destination, Active Black or Lineage` は3者の前後一致、no_op、Workのfalse flags、rerun0/0。日付補正はR `owner decision: April 10 to April 11 stays May 1 and is no-op without original_date` | B `compareSql`呼出と`skip`、Q `compareSql`。**mapped**。全DB無変更という意味ではない |
| C05 / F3（関連F4）：現在行消失＋Activeあり → immutableはRedのみ、mutableはdelete。両方なしはno-op。再出現には新通知 | Decision `immutable-no-source-no-active-black-is-no-op`、Physical Delete `physical-delete-transfer-source-exists-active-black-2` | R `source disappearance records Red only and supports reappearance as a fresh Black`。M `insert, unchanged/excluded-only no-op, update, delete, absent no-op, and reappearance preserve current identity` は空宛先・空Active、処理結果、新通知なし0件／あり1件を照合 | B `workFields` / `resultFields` とモデル分岐。**mapped**。sourceの不存在はstored SQLの結果で判断 |
| C06 / F3：insert_onlyは初回だけBlack、Activeありなら変更・消失でもno-op | Decision `insert-only-active-black-is-no-op`、Black `black-insert-transfer-insert-only-model-2` | I `repeat/change/disappearance short-circuit to no-op without replacing the first row` は初回行とActive保持、Lineage1件。I `absent before materialization is no-op and later appearance needs a new Dirty Key` は新通知の要否 | B `insertOnly` / `noOp`。**mapped**。source keyの別実体への再利用policyは追加しない |
| C07 / F4：immutable訂正 → 元黒を残しRed→新Black、旧Active退役、新Active、両Lineage | Red `red-transfer-black-physical-delete`、Lineage `red-transfer-source-key-meaning`、Active `new-black-becomes-active` | R `correction inserts Red before new Black, preserves old row, records both lineages and retires old Active Black` は旧行保持、-100/150、Redの元キー、新黒の論理キー、過去Workの評価キー保持を確認。実書込順はD `100 to 120 correction retains original Red provenance and correlates all new Blacks`も参照 | B Red分岐 → `retireRowActive` → `redLineageSql` → Black分岐。**mapped**。routineは呼出元とDB routine双方を追う |
| C08 / F4：mutable更新・削除 → 同じ完全キーのみ操作。更新はActive保持、削除は退役。Lineageなし | Black `black-update-transfer-mutable-model-active`、Physical Delete `lineage-physical-delete-transfer-create`、Decision 0005 | MのC05記載testは更新後の完全行、Active前後一致、削除後空、最終Lineage空。M `rejects inconsistent mapped identity even if key columns are excluded` と `an UPDATE SQL that moves the destination key is rolled back` がキー不一致を拒否 | B mutable事前guard、`executeMutableDestination`、退役呼出。**mapped**。UPDATE結果だけでno-op前のguardを代用しない |
| C09 / F4：1つのsourceから複数Link、同一Destinationの別役割 → snapshot共有・Link順・個別結果 | Link `destination-link-source`、`destination-link-reference`、Decision 0008 | D `one evaluated source snapshot shares allocation, mappings and write order across all three links` はsource1回、journal/debit/creditの実write順、同一Dirtyの3結果。D `one Dirty Key changes only the journal memo while both ledger links independently no-op` は一部Linkのみ変更 | Q `linksSql` / `pendingSql`、B固定sourceと各Link処理。**mapped**。採番済みキーだけでは先行write成立の証明にならない |
| C10 / F4：生成した行だけ追跡。Blackの論理sourceとRedの元宛先を混同しない | Lineage `lineage-model-boundary`、`black-transfer-source-key-meaning`、`red-transfer-source-key-meaning` | E初回testのsource_kind/関連ID、R訂正testの両sourceキー、I `first materialization uses ordinary Black Insert, Active Black and Lineage` の1行、M lifecycleのLineage空を組み合わせる | Q `lineageSql` / `redLineageSql`、B `!mutable`、routine `withLineage`、SQ `lineage`。**mapped**。Runが成功しただけではこの条件は証明できない |
| C11 / F5（関連F4）：途中・後続Link失敗 → 全workをrollback、failed Runを保持、通知は再試行可能 | Run lifecycle＋Decision 0002/0008/0013 | E `a database failure inside metadata recording rolls back destination and all earlier metadata`、D `a bounded Run rolls back every admitted link on downstream failure and remains retryable`、S `downstream failure rolls back destination and metadata, retains failed Run, then retries` は前後snapshot一致・failed・再試行成功 | B try/catchとQ `failSql`。**mapped**。恒久切断・プロセス強制終了後の自動復旧までは主張しない |
| C12 / F4（関連F2）：Processingへ結果を書くが、元Dirty Keyの内容を変更しない | Dirty Key `dirty-key-transfer`、Processing `not-dirty-key-processing-change-detection-history-management` | E初回testはDirty Key **件数1** とProcessingを確認。件数だけでは内容不変の保証にならない。D/Sの失敗snapshotはDirty Key全行も比較するが、成功・no-op前後の全内容一致とは別（G1） | Q/SQ/metadata routineのengine-owned書込先はWork/Processing等でDirty Key更新なし。**partial test evidence**。実装欠陥とは未判定 |
| C13 / F5：work COMMIT成功後に応答だけ失う → APIはerrorでも保存済みsuccessをfailedにしない | Run lifecycle＋Decision 0002/0013のcommit ambiguity | E `a lost work COMMIT response cannot relabel committed success as failed` は元cause、success Run、宛先とProcessingを照合。S `lost successful COMMIT response remains durable and retry does no work` は再実行0件も確認 | B recovery、Q `failSql` の `run_status = 'running'`。**mapped**。Run作成commit応答喪失は別場面 |

## 優先して人間が判断する点

| ID・分類 | 判明したこと／未確定範囲 | 次に判断できること |
| --- | --- | --- |
| G1 / partial test evidence（C12） | Dirty Key不変は明示要件。engine-owned SQLに更新は見つからないが、件数アサーションを全内容不変へ拡張できない。Dの`state()`とS supportの`snapshot()`はDirty Key全行を含み、C11の失敗rollbackでは前後一致を確認する。検索範囲は上記6統合suite、supportのsnapshot、Q/SQとmetadata routine | 成功・no-op前後のDirty Key全列比較を別タスクにするか。任意のtrusted SQL／triggerまでエンジンが無害化する保証は追加しない |
| G2 / missing direct test evidence（F2/F3） | B `executeRowTransfer` の `current.has(key)` はsource SQLの重複logical keyを拒否。setもSQ `sourceConstraint` のPKと `identityCheck` で一意性を検査する。C02は通知の重複で、同じ証拠にはできない。`tests/features/execute-transfer` 内でsource重複行を与える直接テストを特定できなかった | 実装あり・直接証拠不足として、重複sourceを与えた拒否・work rollback・failed Run保持の検査追加を別タスクにするか。期待する障害境界はDecision 0002/0013を使う。業務上の重複行採用policyを新設せず、バグとは判定しない |
| G3 / ambiguous mapping（F5） | Run Conceptのcreated/running/succeeded/failed/cancelledは**例**で、最終集合は実装Issueに委ねている。Qはrunning→succeeded/failed。cancel操作やschedulerはこの実行責務の要求として導けない | 「cancelled経路がない＝実装漏れ」としない。キャンセル／クラッシュ復旧を求めるなら別途要件化。現在の文書に新policyを足す必要はない |

今回の限定照合で、確定したimplementation gap（経路なし）・conflicting behavior（意味矛盾）は報告しない。これは全実装の無欠陥宣言ではない。候補対応を確定に昇格させず、まず上記の証拠範囲と期待結果をレビューする。

## 方式差と逆方向の照合

- **row / routine / setは同じF1〜F5を実現する方式。** routineのDB側は [execute-transfer-metadata.sql](../../../db/runtime/execute-transfer-metadata.sql) の `record_skipped` / `record_black` / `retire_active`。呼出元の条件と順序を併読する。routineだけを読んで全モデル対応済みとはしない。
- **setは対応範囲を限定。** [config.ts](../../../src/features/execute-transfer/set-phase/config.ts) `loadSetPhase` とDecision 0013はimmutable・日付hookなし・文字列キー等を条件にする。S `differential row/set history across duplicate, precise numeric, NULL and absent source routes` は正規化した履歴を比較するが、時刻・採番の同一性やmutable/insert_onlyを証明しない。C04〜C10の全モデルをsetへ一括mappedにしない。
- **技術支援。** key正規化/hash、SQLパラメータbinding、TEMP作成/cleanup、設定hash/revision検証は対象同一性・実行を支える手段。独立した業務能力やorphan implementationに数えない。stored SQLのbind/hashが正しくても、元黒の符号反転や宛先更新の業務意味までは保証しない。
- **空入力の違い。** setは採用通知0件なら早期returnする。一方、非空Run内のRed/Black対象0件でもINSERT文を実行する（Decision 0013）。文レベルtrigger等のempty-input safetyは配備SQLのレビュー対象。rowの「該当DMLを呼ばない」を共通契約にしない。
- **対象外。** CDC/通知登録方式、scheduler、UI、全SQLの意味検証、独立キーprofile外のset対応、全障害組合せ、production性能/SLA。上限付きRunの残務継続（C03）は全体復旧時間の証明ではない。

## この中間索引を残す価値・維持負担

**得られた追加情報：** READMEからは具体的な障害・実装へすぐ入れる。本書からは「同じ通知を再び処理しない」「Lineageが必要なモデルだけ記録する」などの業務責務から複数suiteへ入れる。C12では、件数確認と内容保持の証拠差が見えた。G3では、状態名の例を実装漏れに誤分類することを避けられた。これらはAIによる今回の観察であり、人間のレビュー時間短縮が実証されたわけではない。

**重複する部分：** C01/C08/C11/C13の具体的な入口はREADMEにもある。別途全test名の台帳を保守すると二重更新になるため、本書はIssue 39の固定版記録として扱う。継続採用する場合も、意味根拠・該当Check・変わった証拠だけ更新し、READMEに同じ表を複製しない。Interfaceを常設せず既存READMEへの短い意味リンクだけで足りる、という判断も可能。

人間レビューで確認してほしいのは次の3点。

1. F1〜F5から責務とその証拠を追えるか。特にF1/F5の統合、F4の粒度を変える必要があるか。
2. C12/G1〜G3の分類・期待結果を認めるか。テスト追加、対応修正、要件の別タスク化、現状維持のどれにするか。
3. READMEへの直結よりこの索引が有用か。常設・簡略化・今回限りのどれにするか。

回答はこのPRで受け、必要な変更だけ後続タスクへ分ける。**人間レビュー結果は未取得。** Alderへの改善候補は「技術Decisionの具体化とBusiness由来の期待を区別する」「テスト名一致ではなくアサーションの範囲を書く」の2点に留める。今回はAlder本文を変更しない。

## 検証記録

本書は既存アサーションを静的に照合した記録。実行結果とは区別する。リンク・引用test名・実装symbolの存在と差分をローカルで確認し、PostgreSQL付きの既存Verify CIの結果はこのPRのChecksを参照する。ローカルのDB統合テストは未実行。製品コード・テスト・Business Design・Decisionの変更はない。

独立レビュー：AGENTS指定の別コンテキストで、同じ固定版のBusiness Design・Decisions・`docs/alder/review-knowledge.md`を読み、G1〜G3を再照合した。G1に失敗時の全行比較が既にあることを反映し、G2を業務曖昧さではなく直接テスト証拠不足に修正した。AI間の照合であり、人間承認ではない。
