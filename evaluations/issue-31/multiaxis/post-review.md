# Independent post-change Alder review

Disposition: approval-for-review of the bounded mapping extraction; no production blocker found. Required complete PostgreSQL-backed Verify and final evidence reconciliation remain the root agent's responsibility. This is an **unblinded post review**, not a baseline replication or timed AI benchmark. It does not approve merge, deployment, or previously unresolved Business Design.

## Exact assigned task prompt

> Perform independent read-only post-change Alder review requested by owner of PR32. Repo /workspace/scratch/8ab680f5d64c/velvet. Read AGENTS then Business Design, Decision Records (esp0015), then full docs/alder/review-knowledge.md, then implementation/tests. Compare B1 03b998ee3b768e2a03af763714627523243b3cc2 to working tree: mapping-validator extraction plus multi-axis evidence. Read evaluations/issue-31/multiaxis/protocol.md, selection.md, README.md, compare.mjs, expected-outcome tests. Independently check semantic/ordering/error preservation, quality claims/costs, P1-P4/Q1-Q4 anchors and required verification. No desired verdict. Do not edit production/tests/docs or spawn agents. You may write only evaluations/issue-31/multiaxis/post-review.md with your exact task prompt, inspected baseline/scope, complete findings and limitations; explicitly state this is unblinded post review not a baseline replication or timed AI benchmark. Run meaningful read-only/local checks if useful, not full DB setup. Return blockers or approval-for-review with evidence. Full local verify running/done; PostgreSQL CI will be checked by root.

## Scope and authority inspected

Compared B1 `03b998ee3b768e2a03af763714627523243b3cc2` with the working tree initially at `5469ec29a3947c09fab82fef670dfd363d3b8c6b`, and checked the evidence correction at `e889709f4be151194a6578cf933e938fa270b745`. Production SHA-256 values were unchanged during review:

- boundary.ts: `6b006f317b7bd0e910fa6651ccd85631e1c3badc3f7fd1de0bbbeaf7accf9fb8`
- link-mapping.ts: `0fa37e2b06a697cb72d0d287bab0d444b88c58084b8a43754fc3a9f20d4ff33c`

Read AGENTS, Business Design entrypoint, Package Scope, concept/DFD/process indexes, relevant Destination/Link, Setting, Dirty Key, Run and Execution meanings, intake/execution DFD and Execution Process Map; Decision index and Decisions 0002, 0007 and 0015; full pinned Alder review knowledge; original and extension protocols, v2 rule, selection and extension report. Inspected the complete changed predicate, caller and row-work control flow, query locking/failure guards, expected-outcome tests, comparison harness, and relevant integration-test anchors. There is no DDL/SQL change in this extension. This is a scoped review, not a fresh audit of all historical decisions or all schema constraints.

## Findings and resolution

1. **Evidence traceability defect, fixed.** The initial comparison output used `{ name, ...second }`; rejected outcomes also contain `name: error.name`, overwriting fixture labels with `Error`/`TypeError`. Assertions still compared the correct cases, so this did not invalidate production equivalence, but readers could not identify malformed cases from saved output alone. Reported to root. Root changed this to `{ fixtureName: name, ...second }` and regenerated measurements. Inspected the corrected source and confirmed all 39 saved fixtures retain fixtureName and nine traces remain. No production change was made for this finding.
2. **Sufficiency confirmation: extraction preserves the intended contract.** Same predicate, same object-shape predicate, same prerequisite order and caller position. Native malformed-input errors remain possible and are intentionally preserved. Error stack frames necessarily gain a helper frame; the supported equality is acceptance/error constructor-name/message, not byte-identical stacks. No new normalization, SQL construction, authority or public export was introduced.
3. **Verification completion is a gate, not a review defect.** At inspection the report still marked full local Verify, PostgreSQL CI and audit as pending. This reviewer did not observe those final results and does not convert local tests into a passing database gate. Root must replace draft verification claims with actual results before delivery.

## Alder application

Alder's Q1-Q3 and P1/P2 below are separate from the experiment's P1-P4/Q1-Q4 probe names.

Walking an ordinary enabled Setting as its caller: configuration is locked and loaded, enabled Links are filtered and validated in existing order, then Run creation commits independently; work executes after configuration-lock reacquisition and equality recheck. Walking a malformed first or later Link: rejection precedes Run creation and the existing catch rolls back. Correcting configuration and invoking again needs no new lifecycle state or permission. Walking work failure/lost successful COMMIT: unchanged coordinator recovery and guarded failSql preserve durable facts, original cause and run identity; general process-stop recovery remains outside the accepted phase contract. These support Alder Q1/Q2 for this change.

Under Alder Q3, passing mapping validation establishes configuration-shape/key correspondence prerequisites only. It does not approve stored SQL meaning, prove physical effects, or guarantee later destination receipts. Later stored-statement consumption and returned-row checks remain authoritative. Source logical identity remains authored by the execution definition, never inferred by the helper. Link contexts remain independent even when they reference the same Destination. No new Output guarantee or unresolved business interpretation is introduced by the move. Under S, these are sufficiency confirmations; neither a stricter mapping schema nor a new recovery mechanism is demanded by this refactor.

## Probe owners, coordination and gates

| Probe | Inspected owner/anchor and observation | Required verification |
| --- | --- | --- |
| Q1 mapping | link-mapping.ts predicate; boundary.ts enabled-Link loop before loadSetPhase/runSql. Predicate changes have one owner; timing changes still require caller inspection. | 16 direct tests, 39 differential fixtures, nine placement traces; execution integration invalid mapping before Run |
| Q2/P2 mutable identity | executeRowTransfer stable-key comparison before exclusions/reassessment; returned UPDATE/DELETE key check after effect | mutable.integration tests for excluded key identity and key-moving UPDATE; PostgreSQL NULL/numeric comparison suite |
| Q3 outcomes | executeRowTransfer duplicate/noOp, workFields/resultFields and actual effect predicates stay together | mutable, reevaluation, insert-only and row/routine/set-phase parity integration |
| Q4 logical identity | keyText/projection; frozen resolver input, logical-key shape validation, source current Map duplicate check | execution integration malformed identity/Date and duplicate cases; composite-key integration |
| P1 durable Run | executeTransfer runPersisted/catch/recoveryErrors; queries.failSql guards running status | execution integration durable Run, deferred COMMIT failure, recovery errors and lost successful COMMIT; mutable/set variants |
| P3 dispatch | useSetPhase/loadSetPhase, route selection, one finishSql/commit tail | set-phase no-fallback/configuration and deployment gates |
| P4 retirement | executeRowTransfer release references -> activeDelete -> redLineage, or retireMetadataSql | reevaluation/mutable retirement, multi-destination fault injection, row/routine parity |

The complete boundary token comparison after inlining includes these unchanged controls. It is persuasive for this mechanical move, but not a substitute for actual PostgreSQL constraints, locking, comparison semantics, or recovery execution.

## Quality and costs

The concrete gain is Q1's directly executable value fixture with no client/query/callback and only node:util imported. This lowers local setup and gives a named predicate owner. Keep and same-file callable remain reasonable alternatives; the extra module's direct dependency boundary provides the selected candidate's incremental benefit. The mapping block already contained no I/O, so this is not a new reduction in effect count or a claim that all transfer decisions became pure.

One production file, one internal export/import/call hop, two arguments and the copied three-line object predicate are real costs. The local Row alias is another small declaration, not a new public data contract. Mapping edit-site count remains one. The duplicated generic shape predicate can drift; reopening on observed drift is sufficient without introducing a shared utility framework now. Full execution imports and the overall test inventory increase. No end-to-end verification, operational diagnosis, whole-Run reproduction or recovery saving was demonstrated. AI analysability is mixed: clearer predicate owner but another timing-inspection hop. The report appropriately avoids additive scores, speed/accuracy claims, and counting historical B0 -> B1 lifecycle gains again.

## Checks and limitations

Independently ran `node evaluations/issue-31/multiaxis/compare.mjs`: passed exact predicate/object/inlined-boundary token checks, 39 output/error and input-mutation fixtures, nine coordinator traces. Independently ran `ASHIBA_SKIP_DB_BACKED_TESTS=1 node node_modules/vitest/vitest.mjs run tests/features/execute-transfer/link-mapping.test.ts`: 16/16 passed. These used existing compiled output and installed dependencies while root owned build/full verification. The corrected label output was inspected after regeneration; the correction does not change comparison assertions.

The harness loads candidate dependencies for both coordinators; for this scope the imported dependencies are unchanged, which makes that comparison appropriate. Mutation comparison uses the same fixture sequentially and structuredClone normalizes prototypes; a frozen ordinary fixture and literal/token inspection add support, but this is not exhaustive mutation equivalence for adversarial proxies/getters. Such values are not ordinary loaded DB JSON configurations. Baseline-equivalence checks could preserve pre-existing defects; expected-outcome tests reduce that oracle dependence. The valid coordinator trace deliberately stops before Run creation and proves neither successful transfer nor actual locking.

No database setup or CI review was performed by this agent. No timed/blinded user or AI task, production incident replay, defect-rate measurement, or population replication was conducted. The fresh baseline reports were not independently rerun here; their agreement/provenance remains procedural evidence described by the root report. Final approval-for-review is conditional on the required actual gates and accurate final reporting, not a claim of deployment fitness.
