# Fresh B assessment

Original task prompt (verbatim):

> Read-only independent Fresh Agent evaluation requested by PR32 owner. Repo /workspace/scratch/8ab680f5d64c/velvet. Evaluate baseline 03b998ee3b768e2a03af763714627523243b3cc2 using git show, plus evaluations/issue-31/multiaxis/protocol.md (protocol commit 9e33f3b). Follow AGENTS.md read order Business Design/decisions/code/tests/history. Do not read other agents' output or later working-tree candidate changes. Do not edit files. Independently compare keep and >=2 justified alternatives across all 10 axes, identify Q1-Q4/P1-P4 anchors, rank candidate or keep with evidence and costs, preserve behavior and invariant ownership. No prescribed decomposition. Return complete concise assessment with evidence, selected candidate's exact scope, feasible comparison fixtures, limitations. Do not spawn other agents.

Provenance: Independent fresh agent assessment of baseline `03b998ee3b768e2a03af763714627523243b3cc2` and protocol commit `9e33f3b`. Isolation was procedural on a shared filesystem, using `git show` against the specified commits for substantive reads; no other agent assessment or later candidate content was inspected. The assessment was completed read-only. The parent subsequently authorized writing this evidence file only. Complete assessment follows verbatim.

---

Independent assessment of B1 `03b998ee3b768e2a03af763714627523243b3cc2`, using protocol `9e33f3b`. Read-only; no candidate working-tree changes or other agent assessments inspected.

**Recommendation: first evaluate a narrow extraction of per-Link configuration validation into a directly testable function in the existing execution file.** Keep B1 if differential fixtures cannot demonstrate useful local coverage without behavior changes. Do not undertake a model/metadata decomposition.

Business Design establishes that Setting owns source identity, Destination owns destination specifications/model, and Link owns mappings/exclusions. Dirty Keys are repeatable immutable history, not transfer commands. Decisions 0005, 0007, 0013 and 0015 require preservation of stable mutable identity, trusted SQL, exact existing keys, ordered metadata, and the shared durable Run lifecycle. The proposal changes none of these meanings.

All following code line anchors refer to B1 `src/features/execute-transfer/boundary.ts`.

| Probe | B1 owner and evidence |
|---|---|
| Q1 invalid Link mapping | `executeTransfer`, 126–151: mutable date restriction, legacy Insert SQL prerequisite, then mapping/source-key/destination-key checks. `execution.integration.test.ts:214` changes mapping metadata and verifies rejection before any Run. |
| Q2 identity/exclusions/receipts | `executeRowTransfer`, 307–353: stable mapped mutable key precedes exclusions and reassessment; 400–425 validates mutation binding, row cardinality and returned stable identity. `mutable.integration.test.ts:399,412` covers excluded-key mismatch and an UPDATE moving identity; 476 onward covers secondary failures. |
| Q3 duplicate/no-op/model outcomes | Row loop 282–306, 355–398, 491–545: duplicate context includes Link identity; outcome fields and operation flags precede writes; completion and Processing follow effects. Mutable lifecycle tests at 154,275,319; reevaluation tests at 138,238,359; set-phase differential test at 36. |
| Q4 source logical identity | 260–278 uses resolver with a frozen shallow copy, validates exact key columns, serializes identity, then executes and indexes source results. Helpers 35–69 own JSON compatibility and key projection. Execution tests at 220–249 cover malformed resolver identities and Date-valued source keys. |
| P1 recovery | `executeTransfer`, 100–102,153–167,183–219; `queries.ts:49–51` restricts failure update to a still-running Run. Execution tests at 311,363,434; mutable lost-COMMIT tests at 548; set-phase equivalent at 315. |
| P2 stable key despite exclusions | Same Q2 anchors: 309–316 must remain before 317–353. This is deliberately not a configuration-preflight check because it requires current row and Active Black. |
| P3 set dispatch/common success | 107–118,152–185; nullable set profile dispatches only after locked configuration validation and durable Run creation. Set-phase tests at 258 reject misconfiguration without fallback. |
| P4 metadata retirement ordering | Mutable deletion 426–443; immutable retirement/Red lineage 473–489; Black metadata 509–540; Processing 544–545. `queries.ts` and `db/runtime/execute-transfer-metadata.sql` remain additional owners for row/routine SQL semantics. Reevaluation test at 181 checks Red/Black and retirement; mutable injected retirement failure starts at 428. |

The candidate ranking is:

1. **A: extract per-Link preflight validation**, leaving its call in the existing loop.
2. **K: keep B1**, potentially adding boundary-level fixtures without refactoring.
3. **B: extract source identity preparation/indexing**, including resolver handling and source-result key indexing.

A has a concrete maintenance reason: the same pre-Run validation region handles restrictions introduced by mutable execution and the later set-phase opt-in. History includes mutable error-contract correction `116b63b` and set-phase addition `ff0cbbd`. Q1 currently has one coarse malformed-mapping integration example; exercising each short-circuit branch requires unrelated database setup through the public boundary. A isolates that existing decision without moving a transaction, callback, source query or model outcome.

B has a credible task: Q4’s absent columns, duplicate canonical identities and malformed resolver outputs deserve small fixtures. Its cost is appreciably larger: callback timing, shallow freezing, serialization shared with destination keys, and source-query ordering are involved. Moving shared key helpers broadens edits across mutation receipts and lineage; keeping them in place requires additional calls or injected helpers. This is not justified as the first candidate given A’s bounded task.

The classifications below are predictions relative to B1, not measured results. “Unchanged” means no supported improvement, not proof that no effect is possible.

| Axis | K: keep | A: per-Link validation | B: source identity helpers |
|---|---|---|---|
| Changeability | Unchanged: Q1 edits remain in coordinator. | Improved locally: one named owner for 127–150; caller still owns timing. Cost: new function declaration and call. | Improved for Q4’s two transformations; worse coordination risk if shared key helpers also move. |
| Testability | Unchanged: actual Q1 fixture uses PostgreSQL metadata. | Improved: link object, key-column array and mode boolean suffice for direct checks. No database or query mock needed. | Improved: pending/source rows and a resolver suffice, but callback invocation/freeze behavior also needs checking. |
| Diagnosability | Unchanged: existing error strings/cause retained. | Unchanged operationally; a named stack frame may help locate validation, but messages still omit offending Link detail. | Unchanged operationally; helper names do not restore lost source/configuration context. |
| Verifiability | Unchanged: integration suite and full gates. | Improved local branch verification; complete PostgreSQL and SQL gates remain unchanged. | Improved local key-case verification; DB behavior, snapshot timing and recovery gates remain necessary. |
| Side-effect locality | Unchanged. | Improved capability boundary: validator accepts values and performs no queries. Coordinator still orders its invocation. | Improved capability separation if two synchronous transformations surround the existing source query; callback effects mean preparation is not automatically pure. |
| Invariant ownership | Unchanged: current centralized ownership. | Unchanged if the exact checks move as one block; no duplicated validator or earlier exclusion checks. | Unknown until scope fixed: key serialization currently serves source, Active and destination receipts. Separating only source logic can obscure that shared invariant. |
| Reproducibility | Unchanged: reproduce via configured DB/client path. | Improved for validation outcome: explicit serializable inputs support replay. No improvement to whole-Run replay. | Improved for source-index decisions; resolver implementation and potentially external callback state remain required. |
| Recoverability | Unchanged. | Unchanged by design: no lifecycle edits, unchanged before-Run rejection. | Unchanged only with exact callback/source-query order; callback effects remain outside database rollback guarantees. |
| Dependency locality | Unchanged. | Unchanged runtime imports if kept in the same file; improved fixture dependencies because tests need no live client. | Improved only with a separate module, incurring additional imports/exports and shared-helper decisions. |
| AI analysability | Unchanged. | Improved local edit/fault owner for Q1; one additional caller→validator hop for timing inspection. No demonstrated improvement for Q2–Q4. | Improved Q4 labels, but extra hops and shared serialization ownership complicate Q2/P2 review. |

Engineering precedent supports separating independently changing decisions and avoiding unnecessary interfaces. The evidence here supports a narrower claim: A could make a real validation decision directly exercisable with fewer fixture capabilities. It does **not** establish faster maintenance, fewer defects, lower end-to-end verification cost, or improved runtime recovery.

**Exact proposed scope for A**

- In the same `boundary.ts`, create one synchronously called function such as `validateDestinationLinkConfiguration(link, keyColumns, useSetPhase)`.
- Move exactly the current loop body at 127–150, preserving expressions, short-circuit order, `.trim()` behavior and error strings.
- Keep iteration over enabled Links at 126, and call the helper once per Link in existing order.
- Keep `object` and all other helpers where they are.
- Export the helper only from this internal module if needed for direct tests; do not add it to `src/index.ts` or package exports.
- Do not add normalized configuration objects, a validation framework, new errors, schemas, clients, callbacks, or additional model decisions.
- Leave `loadSetPhase`, locking/recheck, Run creation, recovery and every row/routine/set SQL path untouched.

The explicit costs are one internal-module export, one function signature with three inputs, one call site, and one inspection hop. Keeping it in the same file deliberately forgoes runtime dependency-locality gains. If an internal export is considered too costly, K remains a reasonable outcome; avoid introducing an entire module merely to conceal that tradeoff.

**Feasible comparison fixtures**

Use the literal B1 validator body as the before oracle and call the candidate implementation with identical fixture objects. Compare success/throw, constructor/name and exact message, plus unchanged input objects. Preserve native exceptions where malformed shapes currently produce them; this refactoring must not silently harden behavior.

Include:

- Valid single/composite keys; destination key ordering accepted by sorting; source-key ordering mismatch rejected.
- Null/array/empty mapping; unknown target; empty/non-string source.
- Missing/empty/wrong-shaped destination mapping; missing destination key; differing source-column mapping.
- Mutable date restriction plus invalid mapping, proving the earlier date error still wins.
- Blank legacy Insert SQL plus invalid mapping, proving SQL prerequisite wins.
- Set-phase mode with blank legacy Insert SQL, proving the prerequisite remains skipped.
- Multiple Links with distinct simultaneous errors, using the boundary to confirm first-Link ordering and no Run creation.

For integration controls retain Q1’s no-Run assertion, P3’s invalid-profile/no-fallback case, P1’s lost-COMMIT regression and the full P2/P4 suites. A pure fixture cannot prove transaction timing, and an extracted-body oracle can repeat a pre-existing bug; both are limits, not reasons to skip the independent PostgreSQL gates.

I ran no tests and made no edits. These are source-supported candidate judgments. No B0→B1 gain—including common finalization or the existing row-work separation—is credited to this extension.
