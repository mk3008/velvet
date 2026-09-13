# Three correlated destination links

## Scope and evidence

[Issue #19](https://github.com/mk3008/velvet/issues/19) asks for an accounting-shaped acceptance case, not an accounting subsystem. The existing [Business Design](../business-design/README.md), Destination Link, Transfer Target Decision and [Phase 2 comparison contract](0003-phase2-immutable-reevaluation.md) suffice. No runtime, DDL, public API or Business Design change is needed for this case.

`tests/features/execute-transfer/multi-destination.integration.test.ts` uses one Setting, one source row and three immutable links: journal, debit ledger and credit ledger. Both ledger roles reference one Destination Definition and one physical table. Link IDs and registration order deliberately differ from execution order. PostgreSQL insert triggers record actual writes; ledger Insert SQL reads the preceding journal write in the same transaction. This is stored SQL visibility, not RETURNING propagation or a dependency scheduler.

## Correlation and allocation

The fixture's source-owned `id` and `version` form `journal_key`, identifying the accounting fact/version. Debit and credit accounts, opposite signed amounts and the posting date come from one evaluation of stored source SQL. The amount correction advances that source-owned version from 1 to 2; this is fixture input, not a Velvet versioning rule.

The same evaluation allocates three candidate row IDs plus one shared allocation token with PostgreSQL sequences. All three links receive that token and their own row ID from the fixed row. The Link comparison exclusions explicitly name `row_id` and `allocation`; a fresh evaluation consumes sequence values but unchanged effective business columns remain no-op. The reassessment SQL includes the candidates, so this exercises the real exclusion mechanism rather than hiding allocation from the comparison query. Business correlation `journal_key` remains a compared column. Sequence gaps after no-op and rollback are allowed surrogate-allocation behavior.

Allocation tokens are not a durable business version or an all-links-refresh trigger. When only journal memo changes, the journal performs Red + Black while ledger links retain their existing rows, allocations and Active Blacks. All still identify the same accounting version through `journal_key`; their row materialization generations need not match. A consumer requiring a new common version whenever any role changes must express that requirement in its source/mapping contract. Velvet does not infer it from one Dirty Key. The fixture does not require a ledger foreign key to the newest journal row's generated PK.

For the 100 -> 120 accounting correction, all links change: each Red preserves the old accounting key/allocation and reverses its own original Black; all new Blacks share the new accounting key/allocation. Lineage connects each Red to its original destination key and each Black to the logical source key. Original immutable rows remain intact.

## Atomicity and verification

A rejected second or third link write must roll back earlier destination writes, transactional write observations, Active Black changes, Lineage, Work Items, Processing and successful Run finalization. Full pre/post row snapshots cover historical Work Item references as well as current rows. Run creation is independently committed; only its separately recorded failed outcome is added, with the original PostgreSQL error. Retrying the pending Dirty Key succeeds after removing the fixture failure.

The new PostgreSQL suite complements the existing two-link mutable/immutable case and Phase 1–5 regressions. Full PostgreSQL-backed `pnpm verify` and a fresh Alder review are the review-readiness checks. Node-side snapshot materialization, single-work-transaction behavior, SQL binding and all existing transfer routes remain unchanged; this does not evaluate set-based throughput or general accounting allocation rules.
