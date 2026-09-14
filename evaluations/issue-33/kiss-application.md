# KISSの再整備と現行実装への適用

[依頼](https://github.com/mk3008/velvet/pull/35#issuecomment-5672110986)に対応。
適用基準は `db6d0f4` の実装と既存#31/#33の証拠。新しい性能実験ではない。

## 今回のルール

[Decision 0016](../../docs/decisions/0016-proportional-refactoring-decisions.md)に通常作業の判断原則を集約した。
KISSは、同じ要求を満たす際に、安全な判断・変更・検証のための不要な考慮事項を増やさないこととした。
判断に必要な正本と前後条件を定め、keepと候補について「何を一緒に考えなくてよくなるか」「何の確認や探索が局所化するか」を比較する。
概念・境界・探索分岐・hidden dependency・検証義務・人間reviewerの理解も費用に含む。
名称、移動、短さだけは利益とせず、現在の道具で具体的な作業を辿る。
必要な複雑さと保証は削らず、value / timing / readiness / evidence effortを区別する。

AGENTSの二重routingを0016への一つの入口に整理した。0015は判断履歴として維持し、旧v1-v4や実験結果を書き換えていない。
旧「十軸」は関連する観点を思い出す材料であり、毎回全項目を埋める条件ではないと明示した。
[maintainer requirements](maintainer-requirements.md)の未検証仮説を実証済みの規則に昇格させず、利益の確認方法と費用の捉え方へ反映した。

## 実コードへの適用結果

現行boundary全体、mappingとSQL定義、既存テストの該当箇所、set-phaseの設定入口、Business Designのroutingとprocessを確認した。
全repositoryのarchitecture監査やset-phase全体の新規再評価ではない。

| 対象・比較 | 今回の判断 | 簡単になること／残る費用・理由 |
| --- | --- | --- |
| coordinatorと`executeRowTransfer`を維持するか再統合するか | 維持 | Run lifecycleと行処理を別に確認でき、成功finalizationを共通に保つ。再統合は11入力のseamを消すが、回復と全モデル処理の同時読取を再び増やす。入力調整の新しい問題は今回確認していない |
| B2 mutable helperを維持するかinlineへ戻すか | ADOPTを維持 | UPDATE/DELETEの準備・receipt確認を指定して再取得できる。callerの早期guard・Work・retirementは残り、helperだけで全保証を判断できない。5入力とasync hopは費用。既存の限定navigation利益を覆す新たな調整負担は確認していない |
| `retireRowActive`をinlineへ戻すか | 維持 | 参照解除→削除→件数確認という重複プロトコルの変更箇所は一つ。model分岐・Lineage順はcallerに残る。3入力とhopを消す利益より、二箇所の再照合を戻す費用を重く見た |
| mapping moduleを境界へ戻す／共通utilityを増やすか | 維持 | 値だけの不正mappingをDB能力なしで検査できる既存の境界。pre-Run配置はcallerとDB testで別に確認する。小さいobject述語の重複だけを理由に新しい共通依存を増やさない |
| 概要＋workerの3ファイル案 | 今回はREJECTを維持 | 274行で概要を終えた例はあるが、もう一例は660行、全体確認は753→768行。全読の義務は消えず、追加exportとfile hopを正当化する安定した利益は未確認。単に15行増えたからの拒否ではない |
| mutable/Redを広いA2 moduleへ集約 | DEFER | stable-keyとdifferent-keyという異なるreceipt契約、caller状態、DB能力を跨ぐ正確なinterfaceの比較がまだない。B2から自動的に一般化しない。次の条件は既存[candidate record](candidates.json)のM1-module |
| feature内で問いから実装・SQL本体・テスト・正本へ案内する短いREADME | ADOPT、今回実施 | [入口](../../src/features/execute-transfer/README.md)から既存の住所と検索語をまとめて取得できる。sourceを移動せず、DBルーチンとテストの探索先を明示。新文書1つとリンク・symbol/test名の維持費を追加する |

この判断で今回新たにruntimeを変える候補は選ばなかった。大きな関数であることや、元のコードを変えた実績を作ることは採用理由にならない。
一方、現状維持を無条件に優先してもいない。mappingやretirementの既存境界は、確認義務を実際に局所化するため残す。
既存の証拠checkerを壊さないために構造を維持したのではなく、上記の意味・作業・費用から判断した。

## 実施した情報構造の変更：二つのwalkthrough

**mutable identityの不具合を調べる場合。**
従来、featureにはREADMEがなく、boundaryのhelperを発見しても、早期guard・回復owner・DB routine・対象testとの対応を追加検索で組み立てる必要があった。
新しい入口では、mutable行から二つのguardの検索語と実在する二つのDB test名へ進める。
Work/retirementを疑うなら次の行のSQL本体へ、回復を疑うならcoordinatorと`failSql`へ進む。
局所化したのは「どの場所を探すか」であり、caller/SQLの確認そのものは省いていない。
比較除外にkeyが含まれるtestと、UPDATEがkeyを動かしてrollbackするtestは別々に存在することを確認した。
これらのtestが考え得る全失敗を保証するとは述べていない。

**COMMIT応答喪失を調べる場合。**
入口の最初の行から`executeTransfer`、`failSql`、実際にDBへCOMMITした後で応答エラーを投げるtestへ進める。
「回復処理を呼んだ」ことと「既にcommitされた状態が戻った」ことを混同せず、sourceの説明だけでは最終DB状態を断定できないと分かる。
incidentの終了には対象Run等の実状態が必要であり、READMEやgreen CIだけで解決済みとはしない。

どちらも著者による現在sourceのwalkthroughであり、Fresh Agentや時間/token比較ではない。
既存のoverview packetにはDBルーチン本体が含まれなかったが、通常repositoryには元から存在する。
新READMEがpacketの制限を解消した／過去試行の理解を改善したとは主張しない。
利益は現在の実務入口に関係する参照を集めたことで、少数リンクの維持費に見合うと判断した。
実装を読み直した要約は避け、表を限定した。新規framework、symbol取得tool、全featureへのREADME義務はない。

## 実施しない候補と再開条件

A2は価値未確定なのでADOPT + not_startedにはしない。M1-moduleに答える具体的なinterface/作業比較が生じた時だけ再開する。
symbol取得toolは通常range/searchで対処でき、今回新しいtoolの実装を要する反復費用を測っていないため選ばない。
正確な境界取得を何度も手作業でやり直す実務が現れれば、小さい比較の候補となる。
READMEが古い参照や不要な説明を増やした場合は縮小・削除も比較する。
より広いfolder/architecture再編には今回の具体的な利益根拠がなく、#34を先取りしない。
価値が確立していて単に時期だけを待つ新規候補は今回なかった。

## 検証と限界

今回の実施差分は文書・AGENTS routingのみ。runtime、SQL、DB、test、既存gateは変更しない。
リンクと引用したsymbol/test名を確認し、基準版からruntime/DB/tests/workflowが同一であることを差分で検証する。
独立レビューと最新headの既存CI結果はPRで報告する。CIはKISSの一般的効果や新READMEの時間短縮を保証しない。
将来runtimeを変更する際のPostgreSQL `pnpm verify`、SQL、Alder review条件は維持する。
