# Atomic Check のAI traceability検証（Issue 43）

## 目的

人間レビューでは、Functional Interface F1〜F5 + Atomic Checkの二層表示が旧C01〜C13より格段に読みやすいと確認された。

次に、同じ資料がAI / 開発者にとっても、

```text
Business Design / Decision
  ↕
Functional Interface
  ↕
Atomic Check
  ↕
Automated Test
  ↕
Code
```

を辿る索引として実用的かを小さく検証する。

完全matrixや全コード行traceabilityは作らない。代表的な順方向・逆方向・証拠不足・意味衝突を確認する。

## 評価基準

AIがAtomic Check IDを入口として、次を過度な全文探索なしに特定できること。

1. Checkの正確な成立条件
2. Business / Decision上の根拠
3. 代表的なAutomated Test
4. 主な実装箇所
5. 証拠不足なら不足箇所
6. Testや実装から逆に、どのCheckを保証しているか
7. 人間の新しい意味判断が既存仕様と衝突する場合、その衝突箇所

## Probe 1 — 要件 → Test → Code

### A15: 転送元が消えた履歴型データは赤伝として転送できる

Atomic Check:
- 条件: immutable + source currentなし + Active Blackあり
- 期待結果: 現在有効なBlackに対応するRedを作成

Trace:
- Business / Concept: Red Transfer、Transfer Target Decision
- Test: `reevaluation.integration.test.ts`
  - `source disappearance records Red only and supports reappearance as a fresh Black`
- Code:
  - `src/features/execute-transfer/boundary.ts`
  - immutable + active分岐
  - `generated_red_transfer_sql_body`
  - Active Black退役
  - Red Lineage記録
- SQL metadata:
  - `queries.redLineageSql`

**結果: usable。** Checkから代表Testと実装責務へ直接降りられる。

## Probe 2 — 要件 → 障害境界 → Test / Code

### A36: COMMIT済みの成功Runは応答喪失でfailedに変わらない

Trace:
- Decision: 0002 / 0013 commit ambiguity
- Test:
  - execution: `a lost work COMMIT response cannot relabel committed success as failed`
  - set phase: `lost successful COMMIT response remains durable and retry does no work`
- Code:
  - `executeTransfer` のwork commit後recovery
  - `queries.failSql` が `where run_status = 'running'` の場合だけfailedへ更新

**結果: usable。** 「API errorになった」ことと「保存済みRun status」を混同せず、必要なguardへ辿れる。

## Probe 3 — Check → 証拠不足

### A20: 同一logical keyを複数行返すsource結果を拒否できる

Trace:
- Code: `executeRowTransfer` の `current.has(key)` reject
- 既存Test: source row duplicationを直接作る回帰テストは見つからない
- 後続: #41

### A32: Dirty Keyの変更検知履歴は転送処理で書き換わらない

Trace:
- Business / DDL: Dirty Keyはimmutableな変更検知履歴
- Code: engine-owned書込先にDirty Key UPDATEなし
- Test:
  - 失敗rollbackではfull snapshot比較あり
  - 成功/no-opでは全列不変の直接証拠が不足
- 後続: #42

**結果: usable。** 実装有無とテスト証拠有無を別々に表現できる。

## Probe 4 — Test → Check の逆方向trace

Test:
`multi-destination.integration.test.ts`
`one Dirty Key changes only the journal memo while both ledger links independently no-op`

Atomic Checkへ逆に辿ると:
- F4
- A27: 複数Destination Linkで同じsource snapshotを使う
- A29: Destination Linkごとに転送要否を独立判定する

Business / Decision:
- Destination Link `destination-link-source`: 同じsource snapshotを複数Destinationへ一貫して流す
- Destination Link `destination-link-reference`: 各Linkは別の転送単位
- Decision 0008:
  - journal memoだけ変わるとjournalはRed+Black
  - debit / credit ledgerは既存行を維持してno-op
  - 共通version再発行が必要ならsource/mapping側で明示する

**結果: usable。** Test名からBusiness上のCheckへ戻れる。

ただしこのProbeは同時に、人間レビューで重要な意味確認を発生させた。

## Probe 5 — 人間の意味判断と現行仕様の衝突検出

人間レビューで次の意図が提示された。

例:
- 1つの転送設定に仕訳 / 勘定元帳（借方） / 勘定元帳（貸方）の3 Linkがある
- この3つは同じ業務データとして一体で転送すべき
- 「一部だけ転送成功」は想定しない

現行仕様を辿ると、2つの異なる性質を分ける必要がある。

### 現行でも保証しているもの: transaction atomicity

いずれかのLink writeが失敗した場合、
- 先に成功したDestination write
- Active Black
- Lineage
- Work Item
- Dirty Key Processing
- Runの成功確定

をrollbackする。

Test:
`a bounded Run rolls back every admitted link on downstream failure and remains retryable`

したがって **「journalだけcommit済み、creditだけ失敗」という部分成功は許していない。**

### 現行が許しているもの: Linkごとのno-op判断

一方Decision 0008は、
- 全Linkが同じsource snapshotを評価する
- しかし各Linkは独立した転送単位
- Linkごとのcompare結果が同じである必要はない

としている。

Testではjournal_memoだけ変更すると:
- journal: `red_then_black_insert`
- debit: `no_op`
- credit: `no_op`

となる。

したがって **「どれか1 Linkに変更があれば3 Linkすべて再materializeする」要求は現行仕様にはない。**

人間が意図する「3 Linkは常に一体で再転送する」がBusiness requirementなら、
A29のタイトル修正ではなく、
- Business Design / Concept
- Decision 0008
- multi-destination test
- per-Link compare semantics

の見直し対象になる。

**結果: useful。** Atomic Checkを起点に、人間の新しい意味と既存仕様の違いを具体的なDecision / Testまで特定できた。

## Code navigation index

AI向けには、Checkごとの詳細にTestだけでなく主要code symbolも残す方が有用。

| 範囲 | 主なcode入口 |
| --- | --- |
| F1 | `executeTransfer`, `queries.settingSql`, `queries.linksSql`, `queries.runSql` |
| F2 | `queries.pendingSql`, `queries.boundedPendingSql`, `executeRowTransfer` のwork生成 / duplicate context |
| F3 | source current Map、`queries.activeSql`, `queries.compareSql`, model branch |
| F4 | `executeMutableDestination`, immutable Red branch、Black Insert branch、`lineageSql`, `redLineageSql`, Active Black operations |
| F5 | `executeTransfer` transaction/recovery、`finishSql`, `failSql` |

全関数台帳は不要。変更時に検索を開始できる入口があればよい。

## AI側の評価

### 有益だった点

1. **意味からコードへ降りられる**
   - ファイル構造ではなく、F / Checkから対象test/codeへ入れる。
2. **test coverageとrequirement coverageを区別できる**
   - A20 / A32のように「コードはあるが直接証拠不足」を表現できる。
3. **逆方向にも使える**
   - multi-destination testからA27/A29とDecision 0008へ戻れた。
4. **人間の新判断との差分を検出できる**
   - A29で、transaction atomicityとLink別no-opを混同せず差分を説明できた。
5. **物理コード構造を縛らない**
   - 1 Check = 1 functionではなく、同じ`executeRowTransfer`が複数Checkを実現していても追跡できる。

### 維持すべき条件

- 人間向けタイトル/期待結果を短くしても、AI向け詳細条件を削らない。
- Business根拠、導出分類/確度、代表Test、主要Code入口をIDへ紐付ける。
- 表示形式変更時は旧Check / Business意味からの意味保持auditを行う。
- review stateとtest evidence stateを混同しない。
- 完全matrixや全code symbol一覧にしない。
- Business Designを正本のまま維持し、Atomic Checkを第二の仕様正本にしない。

## 結論

**この二層形式は、今回のexecute-transfer範囲ではAIの要件 → Test → Code、およびTest → 要件のtraceability索引として実用的だった。**

人間側では旧形式よりレビューしやすいと確認され、AI側でも:
- forward trace
- reverse trace
- evidence gap
- business meaning conflict

を具体的に扱えた。

したがってAlderへは、
- Functional Interface = 責務のまとまり
- Atomic Check = 人間が個別レビューする期待結果
- supporting detail = AI / 開発者向けの精密条件・根拠・Test・Code入口
- 意味保持audit

という形で**任意のtraceability手順として反映する根拠が得られた**と判断する。

タイトル命名の一般ルール、およびA29の業務意味自体は今回の採用条件に含めない。そこは継続レビュー対象とする。
