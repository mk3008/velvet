# Issue 47: 障害から実体へ戻る探索の評価

対象: `300ba133377cacf2bfd0a475436c3746cc0d3fbf`（PR #46 マージ後）。
[Issue #47](https://github.com/mk3008/velvet/issues/47) / [評価手順](protocol.md) /
[実行条件・指示・hash](metadata.json) / [Fresh 評価原文](runs/evaluator.md) /
[探索記録](runs/navigation.jsonl)。

## 結論

**VELVET-SPECIFIC**。

障害から逆方向に辿ることで、診断のために何を追加確認すべきかは具体化した。
ただし、既存の構造判断を覆す証拠や、Alder に恒久ルールを追加する根拠は得ていない。
[Decision 0016](../../docs/decisions/0016-proportional-refactoring-decisions.md) はすでに
incident diagnosis と indirection / search alternatives を評価対象に含む。
今回の成果は、その既存観点を Velvet の具体的な障害調査に適用した記録である。

最も実質的に変わったのは、過去 Run の SQL を調べる際の確認事項である。
「現在の設定や実装を見つけた」で終了せず、**Run 作成時の設定、実際の実行、
当時のデータ・実行環境を別々に扱う**必要があることを、保存経路から確認した。
これは構造変更や証跡保存の新要件を意味しない。

## 方法と比較結果

Fresh `gpt-6-astra / low` 1担当が、性質の異なる4つの作成シナリオを起点に
現行ソース・既存テスト・過去diffを辿った。実運用の障害観測ではない。
完全な指示、補足指示、対象revision、探索記録、原文を保存した。
既存の判断記録は閲覧可能であり、盲検・時間比較・モデル比較ではない。

| ケース | 障害から辿る対象 | 既存判断との比較 | 新しく具体化した点 |
| --- | --- | --- | --- |
| C1: mutable DML の戻り値不整合 | `executeMutableDestination` → 呼出元の状態遷移 → `executeTransfer` の回復 → stored SQL / DB状態 | B2の同一ファイル内抽出を覆さない。外部モジュールへの追加分割を支持する証拠もない | 名前付き操作への到達は容易でも、回復と状態遷移は呼出元まで読む必要がある。同一ファイルであるだけでは実行時原因は特定できない |
| C2: 登録処理の transaction 境界 | `QueryExecutor` → registration workflow → `fromPg` → application側の組立 | interfaceの撤去・DIの禁止を支持しない | `transaction` メソッドの存在と、その実装が同一接続・適切なrollbackを保証することは別。実際に渡された実体と組立コードが必要 |
| C3: 過去 Run のSQL・設定 | row-mode のmaster参照と `runSql`、set-phase の `loadSetPhase` と `setPhaseRunSql` | set-phase の既存provenance設計に診断上の理由を追加。row-modeの仕様違反や改修必須とは判定しない | 現在のmasterを過去の実体と扱えない。保存設定から復元できる範囲と、実行履歴・呼出引数・当時データなど追加証拠が必要な範囲を区別 |
| C4: 登録receipt異常と過去forwarder | receipt境界 → named QuerySource → executor。除去前diffとも比較 | [Decision 0017](../../docs/decisions/0017-bidirectional-boundary-assessment.md) の2 forwarder除去を支持。SQL/validation分離は維持 | 除去前には「この転送関数がpolicyを足していないか」の確認が増える。ただしreceipt・SQL・executor・transactionの責任は除去後も残る |

各ケースの初期情報、実際の探索経路、静的に確定できたこと、追加証拠、
停止条件、過去の代替構造との比較は[評価原文](runs/evaluator.md)に記録した。
表は採否を増やすものではなく、その要約である。

## C3で変わった具体的な確認事項

比較対象は「当時の実体へ到達したと言えるか」であり、ファイル数ではない。

| 診断で答えたいこと | コードから確認できる範囲 | なお必要な証拠・限界 |
| --- | --- | --- |
| 当時どのmaster設定を選択したか | set-phaseは `{ engine, setting, links }` をRun作成時に保存。row-modeのRun作成は設定snapshotを渡さない | 実際のRun行が必要。row-modeは当時のmaster/deployment記録等がなければ現在値から過去値を確定できない |
| 保存されたSQLを実行したか | Run作成commit後に設定を再取得・比較し、それからphaseへ進む | 再照合で拒否される場合もあるため、保存設定は実行済み証明ではない。Run状態・例外・関連証拠を照合する |
| 過去実行を完全再現できるか | master内のSQL本文・hash・revisionの復元には役立つ | 呼出側override、当時のsource / destination / Active Black、DB環境等の完全なsnapshotではない。履歴復元とreplay・原因証明は異なる |
| 呼出しが失敗したからDBも失敗したか | 最終commitの応答喪失を考慮する回復処理と既存テストがある | 例外だけで結論を出さず、durableなRun状態などを確認する |

主な根拠:
[Run作成・設定再照合・回復](../../src/features/execute-transfer/boundary.ts)、
[Run INSERT](../../src/features/execute-transfer/queries.ts)、
[設定evidenceの生成](../../src/features/execute-transfer/set-phase/config.ts)、
[set-phase実行](../../src/features/execute-transfer/set-phase/execute.ts)、
[schema](../../db/ddl/run.sql)、
[commit応答喪失等の既存テスト](../../tests/features/execute-transfer/set-phase.integration.test.ts)。
テストの読解と、この評価での障害再現実験は区別する。

この観点は「現在の実体を探す」から「そのRunの実体と主張の限界を確かめる」へ
調査の停止条件を具体化した。既存記録にない新しい保存機構を発見したわけではなく、
この指示がなければ発見できないことも検証していない。

## 適用限界と過剰適用

- DI/interfaceの存在だけで診断困難とは判定しない。実体とpolicyが明示された
  compositionでは静的な読解で足りることもあり、抽象境界の便益も残る。
- 同一ファイル・少ないhopを優位の根拠にしない。C1はstored SQLやDB状態まで
  必要で、C4もforwarder除去だけで原因やtransactionが判明するわけではない。
- 履歴が足りないことを直ちに仕様違反・監査機能必須としない。必要な復元範囲は
  実際の診断要求と外部運用で判断し、このIssueから保存要件を追加しない。
- 設定hashの一致は内容の正しさ・承認・実行済み・完全replayの証明ではない。
- 原因と実体が既知の局所的な入力検証や、既存記録で十分に閉じた変更には
  一律の逆引きチェックを加えない。
- 4ケースは明示的に選んだ作成シナリオ。調査時間、障害頻度、一般的なAI性能、
  偽陽性率・検出率は測定していない。既存方針を読んだ1担当の評価なので、
  独立に同じ結論が再発見されることや他製品への有効性も未証明。

したがって今回は、Alder候補文言・恒久Gate・定期監査・追加分割・証跡機能を
追加しない。実障害で同じ探索負担が現れた場合は、その具体的な情報から
Decision 0016を再適用できる。この記録自体は新しい運用義務ではない。

## 検証

[検証・独立レビュー記録](verification.md)を参照。
製品コード・テスト・Business Design・既存Decision・Alderには差分を作らない。
