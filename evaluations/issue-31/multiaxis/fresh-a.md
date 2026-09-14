# Fresh Agent A

## Original task prompt

> Read-only independent Fresh Agent evaluation requested by PR32 owner. Repo /workspace/scratch/8ab680f5d64c/velvet. Evaluate baseline 03b998ee3b768e2a03af763714627523243b3cc2 using git show, plus evaluations/issue-31/multiaxis/protocol.md (protocol commit 9e33f3b). Follow AGENTS.md read order Business Design/decisions/code/tests/history. Do not read other agents' output or later working-tree candidate changes. Do not edit files. Independently compare keep and >=2 justified alternatives across all 10 axes, identify Q1-Q4/P1-P4 anchors, rank candidate or keep with evidence and costs, preserve behavior and invariant ownership. No prescribed decomposition. Return complete concise assessment with evidence, selected candidate's exact scope, feasible comparison fixtures, limitations. Do not spawn other agents.

## Provenance

Assessment baseline: `03b998ee3b768e2a03af763714627523243b3cc2`. Multi-axis protocol read from commit `9e33f3b`. Isolation was procedural in a shared filesystem: assessment reads used pinned Git objects, and this agent did not inspect other agent assessments or later working-tree candidate changes. The assessment below was completed read-only and then saved verbatim following a separate instruction from the parent agent. The saving action does not change its reported read-only evaluation scope.

## Complete assessment

Independent read-only assessment of B1 `03b998ee3b768e2a03af763714627523243b3cc2`, using protocol `9e33f3b`. I did not inspect other agents’ assessments or later candidate implementation. No files changed or tests run.

**Recommendation: first compare a narrowly extracted Destination Link mapping validator against keep.** Rank: (1) mapping-validator extraction, conditional on differential evidence; (2) keep B1; (3) extract source identity preparation/indexing; (4) extract a combined model/outcome decision function. This ranking is engineering inference, not measured effectiveness. B0→B1’s row-work/lifecycle separation is already present and receives no credit here.

Business Design establishes that Destination owns destination columns/model, Destination Link owns mapping, Setting owns explicit source identity, and Dirty Key is immutable detection history. Decision 0005 requires mutable identity checks independently of comparison exclusions; Decision 0013 preserves the shared durable Run boundary and explicitly authored set-phase contract. Decision 0015 supports bounded changes but does not prescribe further decomposition.

All implementation anchors below refer to `src/features/execute-transfer/boundary.ts` at B1.

| Probe | Actual ownership and verification anchors |
|---|---|
| Q1 mapping | `executeTransfer` 131–150 checks mapping shape, permitted targets, source-key correspondence and destination-key mapping. It follows mutable date-control and stored Black SQL checks, precedes `loadSetPhase` and Run creation. `execution.integration.test.ts:214` checks invalid mapping and zero Runs. |
| Q2 mutable guard/exclusions/receipt | `executeRowTransfer` 308–326 owns stable mapped identity before exclusion validation; 337–353 owns comparison receipt and PostgreSQL decision validity; 417–425 owns affected-row and returned-key validation. `mutable.integration.test.ts:399,412` and failure matrix beginning 428; `reevaluation.integration.test.ts:404`. These are deliberately multiple stages, not one interchangeable validation seam. |
| Q3 model/outcome consistency | 283–306 establishes model, duplicate, Active and initial no-op; 355–391 derives skip, Work flags and Processing result; 392–545 consumes those fields in ordered effects and counts. `mutable.integration.test.ts:154,275,319`, `insert-only.integration.test.ts:175,212,231,283`, `execution.integration.test.ts:152`, plus row/set history oracle `set-phase.integration.test.ts:36`. |
| Q4 source reconstruction | `keyText` 38–59 and `projection` 61–69; work reconstruction 260–267, including frozen callback input; source query 269–272; current-row indexing and duplicate rejection 273–278. `execution.integration.test.ts:222–249` covers malformed JSON identities/Date keys; multidestination snapshot test at 319 and composite identity cases in mutable/insert-only suites. |
| P1 recovery control | Coordinator 100–102, 153–167 and 183–219; `queries.failSql:49` supplies the durable-state safeguard. `execution.integration.test.ts:311,363,434`; mutable COMMIT-loss tests at 548; set-phase COMMIT-loss test at 315. |
| P2 coordination control | Same Q2 identity check at 308–316 and receipt validation at 417–425. Neither may become subordinate to “changed” or excluded-column decisions. |
| P3 dispatch control | 107–118, 152–182, common success 183–185. Set opt-in must fail without fallback. `set-phase.integration.test.ts:258,315`. |
| P4 ordering control | Mutable retirement 426–442; immutable Red/retirement/Lineage 445–489; Black/Active/Lineage/Processing 491–545. `reevaluation.integration.test.ts:181`, multidestination 319/388, mutable retirement failure matrix. SQL and `db/runtime/execute-transfer-metadata.sql` remain necessary corroboration. |

The historical sequence supports independent concerns: Phase 4 `fbfe73e`, insert-only `8ba092c`/`8bb20a2`, metadata/admission `6e89908`, set phases `ff0cbbd`, and B1 extraction `10549ce`. It does not establish that every concern needs a module.

The vector is relative to B1 keep. “Improved” means a plausible task-specific mechanism to verify, not an observed before/after result.

| Axis | Keep B1 | A: mapping validator | B: source identity helpers | C: model/outcome function |
|---|---|---|---|---|
| Changeability | Unchanged: Q1 edits coordinator predicate | Improved: Q1 constraints have one narrow owner; caller still owns timing | Improved: Q4 representation/indexing changes become local; shared key helpers complicate scope | Unknown: Q3 fields move, but actual effect predicates remain in loop and need coordinated edits |
| Testability | Unchanged: public Q1 fixture uses DB setup or two mocked configuration reads | Improved: ordinary objects and key-column array exercise real validator directly | Improved: rows/keys suffice for indexing; resolver remains executable callback | Improved: tuple fixtures exercise flag/result combinations; cannot validate actual metadata writes |
| Diagnosability | Unchanged | Unchanged runtime messages; new function may help locate mapping rejection, but adds stack hop | Unchanged messages; source-versus-resolver owner could be clearer | Unknown: failing persisted outcome still requires inspecting effect consumer and SQL |
| Verifiability | Unchanged full gates | Improved targeted malformed-input coverage; unchanged full PostgreSQL/Verify gates | Improved local key replay; unchanged snapshot/transaction gates | Unknown net: truth table helps, but split derivation/effect consistency adds a review boundary |
| Side-effect locality | Unchanged | Improved: validator accepts no client/query/callback; call remains under configuration lock | Improved indexing only; resolver helper must retain callback timing and cannot claim purity | Improved derivation only, but I/O predicates remain elsewhere |
| Invariant ownership | Unchanged: coordinator owns validation timing | Unchanged if entire mapping predicate moves intact; coordinator retains ordering and locks | Unknown: moving common serialization/projection affects source and destination identity ownership | Worse risk: flags and actual operation predicates acquire separate owners |
| Reproducibility | Unchanged public fixture needs master/DB state | Improved: exact link object plus key columns replays Q1 | Improved: rowset and resolver outputs replay Q4; callback behavior requires additional evidence | Improved for calculated outcomes only; DB state still needed for correct Active/no-op inputs |
| Recoverability | Unchanged | Unchanged, provided throw timing precedes Run creation | Unchanged only if callback/source execution order stays exact | Unknown until effect-order equivalence verified; no inherent recovery benefit |
| Dependency locality | Unchanged broad boundary imports | Improved: validator requires object check and deep equality, no SQL or PG | Improved if a small dependency-free identity module is possible; otherwise shared-helper exports add coupling | Improved direct fixture dependencies, offset by new consumer contract |
| AI analysability | Unchanged: Q1 owner is identifiable at 131–150 | Improved hypothesis: clear mapping fault/edit owner; one extra caller hop for timing | Improved hypothesis for key faults; extra hops for shared destination uses | Unknown: concise outcome derivation versus two places expressing operation meaning |

**Selected candidate’s exact scope**

Move only the mapping-validation block at 131–150 into one internal module with an exported-for-internal-use `assertDestinationLinkMapping(link, keyColumns): void`, called at the original location inside the existing loop. Preserve its expression evaluation order, deep equality, short-circuit behavior and exact errors, including incidental errors on malformed inputs. Keep the preceding date/SQL checks, link iteration, set-phase loader, locks, Run creation, recheck, dispatch and recovery in `executeTransfer`.

Use no new package-root export, generic validation framework, new schema, normalized model, query capability, or shared execution context. The cost is one file, one internal callable export, two parameters and one inspection hop. A local object predicate may require a tiny private duplicate or deliberate sharing; do not expand this into a general utilities migration.

This is supported by Q1’s existing complex rejection predicate and unusually expensive actual integration fixture: database creation, canonical DDL, metadata routines, physical source/destination tables and master rows precede the existing one-case mapping test. A direct fixture can exercise substantially more malformed configurations without reproducing unrelated Run/work setup. The existing public-boundary test remains necessary for pre-Run ordering.

**Feasible comparison**

1. Execute the exact B1 block and candidate function on identical fixtures: valid single/composite mappings; reordered destination keys; wrong source-key order; unknown target; empty/nonobject mapping; empty/nonstring source; missing destination correspondence; mismatched mapped source; malformed destination-key container/entries. Compare acceptance, error constructor/name/message, and mutation of input objects.
2. Preserve edge behavior, rather than silently “improving” malformed handling. Examples include malformed key entries that may currently produce native `TypeError`, and nonarray destination columns.
3. Through the production coordinator, compare query/event traces for valid configuration and multiply-invalid configuration: mutable date error before mapping error, blank legacy Black SQL before mapping error, mapping error before set-phase parsing/Run creation. Include set-phase and legacy configuration.
4. Retain PostgreSQL integration assertion that rejected mapping creates no Run/destination writes, plus full `pnpm verify`, existing SQL audit/manual unresolved review, and PostgreSQL regression/deployment gates. P1–P4 remain negative/coordination controls.

I would stop after this candidate demonstrates direct-fixture benefit and semantic equivalence. If the extraction merely changes lexical placement, or requires a large shared type/utilities reshuffle, keep B1. B and C should not be implemented merely to improve more axes.

Limitations: this assessment inspected source/tests/history, not executed behavior; no elapsed-time, fault-localization or dependency-load measurements were taken. Some large Business Design retrievals were output-truncated; relevant meanings were corroborated through the process map and decision records. The proposed gain is local validation testability/replay, not lower end-to-end verification cost, better production recovery, or proven AI performance.
