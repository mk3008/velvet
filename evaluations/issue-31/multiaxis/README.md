# PR 32: multi-axis maintainability extension

Question: can a task-grounded quality vector detect a useful refactor after the
original change-locality/lifecycle improvement, without a human prescribing shape?
Baseline **B1**: `03b998ee3b768e2a03af763714627523243b3cc2`. Original B0 -> B1
benefits are recorded separately in [the original report](../README.md).

## Protocol, independent selection and provenance

[Protocol](protocol.md) local commit `9e33f3b`, published
`88955319a3c5a9daf2b1e66a9d61771dc16230ee`, same tree
`82cc6dbe96d6e0d3255a2c48e9dfdb5aa3061f4c`, preceded runtime changes.
[Selection](selection.md) commit `5469ec2` preceded runtime changes. The
[engineering basis](../engineering-basis.md) distinguishes established precedent,
Velvet observations and agent judgments. [Rule v1](rule-v1.md) stays historical;
[rule v2](../rule.md) broadens consideration beyond divergent change.

Two independently spawned fresh contexts received the same baseline/protocol and
no candidate design. Complete prompts and responses: [A](fresh-a.md), [B](fresh-b.md).
They shared files but used baseline Git reads and were instructed not to inspect
each other or later candidate changes; this is procedural, not sandbox isolation.
Both returned before implementation. No run was discarded or rerun for agreement.

| Decision | A | B | Root reconciliation |
| --- | --- | --- | --- |
| First candidate | Mapping-only internal module | Per-Link preflight function in existing file | Mapping-only module |
| Second choice | Keep | Keep | Keep if fixture gain cannot justify interface cost |
| Evidence | Q1 rejection matrix needs unrelated integration setup | Same, plus mutable/set preflight history | Confirmed in actual integration fixture |
| Ownership | Caller retains validation timing, locks and lifecycle | Same | Preserve original call position and preceding checks |
| Module tradeoff | Gains isolated import graph, adds file/predicate copy | Avoids file/copy, keeps broad imports | Accept small file/copy for isolated direct checks |
| Wider candidates | Q4 helpers, Q3 outcome extraction lower | Q4 lower; reject model/metadata split | No further extraction |

This is 2/2 compatible action families, not identical structures, population
reproducibility, or proof of optimality. Baseline Q1 owner was already correctly
identified by both; a smaller function is not evidence that AI previously failed.

## Candidate and quality vector

`assertDestinationLinkMapping(link, keyColumns)` owns the exact existing mapping
predicate. `executeTransfer` calls it at the original point within the enabled-Link
loop, after date/legacy SQL prerequisites and before set configuration/Run creation.
No SQL, callback, transaction, row/routine or set-phase work moved.

Legend: measured/source fact is labeled **F**; reasoned task effect is **J**.
“Unchanged” means no demonstrated improvement, not proof of zero possible effect.

| Axis | B1 -> candidate result | Evidence, qualification and counter-cost |
| --- | --- | --- |
| Changeability | Local owner improves; edit count unchanged | **F** Q1 predicate edits still have one implementation site. **J** that site now excludes lifecycle code. Changing timing requires caller inspection. |
| Testability | Improved for Q1 | **F** 16 direct regression cases exercise the actual validator using ordinary values, no client or query mock. Existing integration fixture creates a database, canonical DDL, metadata routines, physical tables and master data. |
| Diagnosability | Operationally unchanged | **F** Errors retain type/message and precedence. **J** named predicate aids local investigation after inputs are obtained; no offending-Link ID or configuration snapshot was added. |
| Verifiability | Local checks improve; full gate unchanged | **F** 39 differential fixtures, independent expected outcomes and nine coordinator traces run without PostgreSQL. DB timing/locks/recovery still require existing full gates. Total test inventory grows; no full-suite cost saving measured. |
| Side-effect locality | Capability boundary improves for Q1 | **F** helper accepts two values and has no client/query/callback; moved block already contained no I/O. Number/order of effects unchanged. It is not a newly pure transfer engine. |
| Invariant ownership | Unchanged semantics; explicit predicate owner | **F** mapping predicate exists once; caller exclusively retains lock/validation/Run order. Three-line object-shape helper is duplicated, creating a small drift risk. |
| Reproducibility | Improved for local validation; Run replay unchanged | **F** identical link/keyColumns values reproduce 39 outcomes, including native errors. No DB configuration reconstruction needed for that predicate. Capturing those values from a production failure remains unsolved. |
| Recoverability | Unchanged | **F** inline token comparison leaves catch, Run persistence, fail SQL and all ordered work untouched. Existing PostgreSQL lost-COMMIT/recovery gates remain mandatory; no new retry/recovery behavior. |
| Dependency locality | Improved direct validator dependency boundary | **F** B1 boundary has seven direct imports including SQL/set modules; isolated validator has only `node:util`, two inputs. Entire executeTransfer imports increase from seven to eight; no package dependency is removed. |
| AI analysability | Mixed, limited structural evidence | **F** both baseline agents located Q1, P1-P4/Q2-Q4 owners. **J** named Q1 fault/edit owner is narrower; one extra hop is needed to establish timing. No timed, blinded before/after task or accuracy gain measured. |

The cells are overlapping views of one Q1 improvement, not ten independent wins.
Do not sum them. Local testability/replay and reduced direct import dependencies
justify this bounded candidate; recovery/diagnosis gains do not justify it.

Costs: one production file (31 lines), one internal callable export, two arguments,
one additional production import/call hop, and the small object predicate copy.
No root package export, public type, DI interface, normalized data structure,
registry, external dependency or mandatory file convention was introduced.

## Reproducible checks and negative controls

From repository root with pinned dependencies installed:

```sh
pnpm build
node evaluations/issue-31/multiaxis/compare.mjs
ASHIBA_SKIP_DB_BACKED_TESTS=1 pnpm exec vitest run tests/features/execute-transfer/link-mapping.test.ts
# Requires PostgreSQL or Docker; existing CI supplies PostgreSQL 18:
pnpm verify
```

[compare.mjs](compare.mjs) mechanically obtains the exact B1 mapping predicate via
Git, checks parsed tokens against the new function, checks the copied object
predicate, then inlines the call and compares **all** coordinator/source tokens.
This includes unchanged legacy work, recovery and dispatch. It runs 39 valid,
malformed and competing-invalid fixtures against both implementations, comparing
accept/reject, error constructor/name/message and data mutation. A frozen valid
fixture also checks that normal inputs are not written. A baseline oracle could
preserve a bug, so [expected-outcome tests](../../../tests/features/execute-transfer/link-mapping.test.ts)
separately assert acceptance/rejection, key order and malformed-input behavior.

Nine traces execute actual baseline/candidate coordinators with a scripted client:
legacy valid/mapping-invalid, date-before-mapping, SQL-before-mapping, set opt-in
skipping legacy SQL, set parsing after mapping, first/second Link ordering and
disabled-Link filtering. They compare query events/errors and assert expected error
precedence. The valid legacy trace deliberately stops at the first Run query;
it does not simulate successful transfer or claim DB lock/recovery validation.
Raw outputs and file hashes: [measurements.json](measurements.json).

| Control | Before/after observation | Required actual verification |
| --- | --- | --- |
| Q2/P2 stable identity, exclusions and mutation receipt | Same row-work tokens and multiple necessary validation stages | mutable integration: excluded identity, key-moving UPDATE, NULL/exact numeric cases |
| Q3 outcomes and model/metadata consistency | Same decision fields and effect predicates; no new ownership split | mutable/immutable/insert-only row/routine and set-phase parity suites |
| Q4 source identity | Same resolver, freeze, projection, serialization and source index | malformed logical identity/Date, duplicate and composite-key integration cases |
| P1 durable Run/lost COMMIT | Same coordinator catch and guarded failure SQL | execution/mutable/set-phase recovery and COMMIT-loss tests |
| P3 dispatch/success | Same nullable dispatch, set validation and one success tail | set-phase no-fallback/deployment gate |
| P4 retirement ordering | Same row/routine SQL calls and work order | row/routine retirement, lineage and fault-injection suites |

## Verification and limits

Local comparison passed: 39 differential fixtures, nine placement traces, token
and input-mutation checks. Runtime typecheck/build passed. Full local DB-skipped
Verify, PostgreSQL CI, SQL audit and independent post-change review are pending
at this report draft; final evidence will replace this paragraph before delivery.

Environment note: the default pnpm wrapper resolved to 11.19.0 and attempted an
install before formatting; it aborted without a TTY. The cached project-pinned
10.19.0 executable was then used. No dependency/lockfile changes were needed.

No defect rate, developer/AI time, live diagnostic context or whole-Run replay
improvement was measured. Native malformed-value errors are preserved rather than
hardened. The source token proof is scoped to this mechanical extraction and does
not establish PostgreSQL correctness. Agent judgment and source anchors cannot
replace operational measurements. No broader candidate tournament or Alder edit.

## Operational conclusion

Use a task-grounded vector when newly observed maintenance cost warrants review,
including incidental test dependencies even when edit locality is already acceptable.
The shortest change is not automatically best: the same-file alternative is cheaper
in file/interface terms but retains broad module dependencies. Keep/propose remains
a valid answer, and meaningful unchanged axes are a result. Stop after this
candidate's evidence and gates; future work can reopen the concrete concerns in
Decision 0015. The AGENTS pointer remains short, with no recurring exhaustive audit.
