# Fresh-context assessment B

## Exact original task prompt and provenance

Parent-assigned independent task `/root/context_b`; baseline B2 and protocol revision supplied by parent. Complete initial response below was frozen before this blob-persistence follow-up. No peer assessment or later root outcome was read. The original task was read-only; the later parent instruction authorized only this evidence blob, not a commit or ref update.

```text
Independent Fresh Agent study requested by Velvet PR32 owner. Read-only GitHub research; no local exec environment, use discovered GitHub connector tools. Repository mk3008/velvet baseline B2 4b895265d8262fafd7a95221a344a7de8c93841e. First read evaluations/issue-31/context/protocol.md at protocol commit ab3af52b9f8efc7c3a78b64f118e3f34fb22d07d, then define and retrieve necessary context yourself following AGENTS and Business Design. Generate bounded candidates for actual maintenance problems and evaluate model-separation hypothesis (no desired structure/disposition supplied). Distinguish broad fragmentation vs retaining shared orchestration. Apply ADOPT/REJECT/DEFER with context-sufficiency inventory, 10-axis comparison, explicit missing evidence, attempted retrieval, next smallest experiment and reopen conditions. Source-level reasoning may suffice; no forced benchmark or forced DEFER. Do not read other agents' results or later root outcomes. Do not write files/comments/branches or spawn agents. Return a complete assessment including exact sources/revisions, what was read vs missing, candidate contracts/costs, labels, and limitations. Full final response will be saved. Avoid massive outputs; use structuredContent.content from GitHub fetch_file and targeted reads.
```

## Complete final response, verbatim

Independent assessment B — **ADOPT a bounded retirement helper and disposition clarification; REJECT broad fragmentation; DEFER the specific narrow mutable DML seam pending a comparative maintenance task.**

These labels apply to the candidates below, not every possible model separation. Nothing was implemented or executed.

**Method and context**

I read the protocol first at `ab3af52b9f8efc7c3a78b64f118e3f34fb22d07d`, then independently selected repository context at B2, `4b895265d8262fafd7a95221a344a7de8c93841e`. I did not inspect another agent’s response or a later root disposition. The GitHub connector provided all requested files; there was no inaccessible repository evidence. Local execution was unavailable, and this read-only assessment did not invoke Actions.

My decision questions were:

- Which model differences represent separate maintenance reasons?
- Which apparent model responsibilities actually share insertion, Work, Active, Lineage, Processing or recovery invariants?
- Can a narrow seam reduce those costs without duplicating routing decisions or exposing transaction capabilities?
- Is a smaller alternative supported by an existing duplicated obligation?
- Does the existing decision procedure distinguish insufficient benefit from insufficient evidence?

| Context acquired | Inspection performed |
|---|---|
| `AGENTS.md`, root `README.md`, Business Design index, Scope, Concept index | Full text |
| Destination, Dirty Key and Transfer Setting concepts | All definition statements and lifecycle |
| Active Black, Work Item, Dirty Key Processing, Lineage, Transfer Target Decision and Transfer Run concepts | Lifecycle plus invariant/boundary statements; other statements were not exhaustively inspected |
| Dirty Key intake/execution DFD and Transfer Execution Process | Full text |
| Decision index; Decisions 0002, 0003, 0005, 0006, 0007, 0013, 0015 | Full text |
| `evaluations/issue-31/rule.md`, Raw SQL Rules | Full text |
| Execution `boundary.ts`, `queries.ts`, `link-mapping.ts`, `set-phase/config.ts` | Full text |
| Work Item and Processing DDL; metadata routines | Relevant constraints/protocols; Work Item commentary not exhaustively inspected |
| Execution, mutable, reevaluation, insert-only and set-phase integration suites | Test inventory; targeted fault-injection and COMMIT-loss bodies |
| Verify and Issue 25 deployment workflows | Full text |
| Boundary history ending at B2 | Commit inventory; actual patches for mutable addition, insert-only simplification and COMMIT-loss correction |

The initial recursive-tree and one combined content response exceeded the output budget. I subsequently retrieved targeted files and compacted structured concept statements; a fetched file is not counted as fully inspected merely because it was acquired.

Important evidence, all at B2 unless another revision is named:

- [Execution boundary](https://github.com/mk3008/velvet/blob/4b895265d8262fafd7a95221a344a7de8c93841e/src/features/execute-transfer/boundary.ts): the coordinator owns durable Run creation, configuration recheck, common finalization and recovery. Row work owns ordered per-item processing. Initial Black insertion is shared across models.
- [Mutable addition, `fbfe73e5cd493b893b39d4a60c68c70fae28870c`](https://github.com/mk3008/velvet/commit/fbfe73e5cd493b893b39d4a60c68c70fae28870c): actual model-specific mutation validation also changed shared Work flags, initial-insert conditions, Lineage conditions and Processing results.
- [Insert-only simplification, `8bb20a223bdf8a66c2cd8d6a4830dbfb4791c647`](https://github.com/mk3008/velvet/commit/8bb20a223bdf8a66c2cd8d6a4830dbfb4791c647): removed special mapping/returned-key paths and retained an existing-Active reevaluation short-circuit.
- [COMMIT-loss correction, `6ffab6f963742dde41fc281ecbc66dae4d42d7f2`](https://github.com/mk3008/velvet/commit/6ffab6f963742dde41fc281ecbc66dae4d42d7f2): failure recording became conditional on a still-running Run. This is a concrete shared recovery concern.
- [Decision 0005](https://github.com/mk3008/velvet/blob/4b895265d8262fafd7a95221a344a7de8c93841e/docs/decisions/0005-phase4-mutable-snapshots.md), [Decision 0006](https://github.com/mk3008/velvet/blob/4b895265d8262fafd7a95221a344a7de8c93841e/docs/decisions/0006-phase5-insert-only-identity-mapping.md): stable mutable identity and shared initial insertion are intended contracts.
- [Mutable tests](https://github.com/mk3008/velvet/blob/4b895265d8262fafd7a95221a344a7de8c93841e/tests/features/execute-transfer/mutable.integration.test.ts), [reevaluation tests](https://github.com/mk3008/velvet/blob/4b895265d8262fafd7a95221a344a7de8c93841e/tests/features/execute-transfer/reevaluation.integration.test.ts): exercise retirement, rollback, precise comparisons and mixed routes.
- [Work Item DDL](https://github.com/mk3008/velvet/blob/4b895265d8262fafd7a95221a344a7de8c93841e/db/ddl/work_item.sql): model, operation, source-existence, skip and contextual FK constraints make coordination substantive.
- [Rule v2](https://github.com/mk3008/velvet/blob/4b895265d8262fafd7a95221a344a7de8c93841e/evaluations/issue-31/rule.md): step 5 groups speculative evidence and demonstrably excessive costs under “Keep.”

**Candidate A — broad model and metadata fragmentation: REJECT, high confidence**

Scope: introduce mutable, immutable and insert-only handlers owning their respective work lifecycle, plus separate Active/Lineage/Processing operation modules. Retain top-level Run transactions, but distribute model routing, writes and metadata progression across the handlers.

The maintenance problem is real: mutable evolution touched several parts of row execution. However, this proposal partitions shared obligations along model names. Initial insertion, duplicate control, source snapshot and key handling are common. Insert-only history supplies a concrete counterexample to treating every model as a parallel implementation.

This candidate either duplicates initial insertion and metadata decisions or introduces a shared callback/protocol layer to reconstruct their current ordering. Keeping the B2 row owner avoids both. Counting a smaller file as improved analysability would ignore the additional inter-module inspection.

Structural cost: at least three model modules and three metadata modules, internal handler interfaces and several call hops. Destination SQL execution and metadata capabilities cross multiple seams. Exact interface size is unmeasured, but the added ownership graph is intrinsic to this scope.

Sufficient evidence: current source, actual simplifying history, contracts and DDL establish substantial sharing. A benchmark would not remove that architectural cost.

Missing: no representative implementation or task-time comparison. That does not plausibly reverse this concrete broad proposal’s poor fit with the current shared paths.

Next smallest observation: inspect a future model change for a genuinely independent lifecycle. Reopen if a model acquires substantially separate admission, metadata or execution obligations that cannot reasonably remain shared. A maintainer’s concrete feature diff and approved design can supply that evidence. A request for a smaller mutable SQL seam would be a different candidate, not reversal of this rejection.

**Candidate B — narrow mutable DML seam with common orchestration: DEFER, medium confidence**

Scope: extract only the existing `active && mutable` destination UPDATE/DELETE preparation, execution and returned-key validation into a private same-file `executeMutableMutation`. The caller still owns selection of this branch, Work creation, retirement, Processing, completed-key tracking, counts and transaction/recovery behavior.

Suggested contract: explicit client, selected statement/operation, mapped values, original destination key and destination key columns; return `void` after successful validation. The helper must not choose a model, retire Active Black, write metadata, commit, catch or recover. It receives destination-query capability, not the metadata-query closure. Keep stable mapped-key validation before reassessment at its current location.

There is an actual separate maintenance reason: mutable SQL requires its reserved locator, mapping consumption, exactly-one affected/returned row and unchanged destination key. The mutable history and rejection tests demonstrate those obligations. Unlike Candidate A, this seam does not require splitting shared orchestration.

What remains uncertain is net benefit. The mutation block is already contiguous; important mutable reasoning remains intentionally outside it, especially mapped-key validation before comparison, Work flags and retirement. A helper may make isolated return-validation reproduction cheaper, or merely add a call hop while fault diagnosis still needs the caller.

Costs: zero new production files, one private function, approximately six explicit inputs and one hop. No registry, public export, new SQL definition or engine type. Direct independent tests might require a module/export instead; that is an additional proposal and cost, not assumed free.

Retrieval outcome: relevant source, mutable history, decision and test examples acquired and inspected. A before/after comparative maintenance task was **not performed**; it was not inaccessible repository context. Existing tests show behavior, not reduced maintenance effort.

Decision-changing missing evidence: whether a real mutable locator/return-validation change or diagnosis can be completed with fewer unrelated obligations under this exact seam, without expanding its contract or moving prerequisite timing.

Next smallest experiment: reconstruct one existing malformed-return or stable-locator change on B2 and on this same-file seam. Record edited units, required caller knowledge, crossed inputs and effect order. Stop if the helper merely relocates the same reasoning. Runtime verification would then use PostgreSQL Verify and the scoped deployment gate; no performance tournament is needed.

Reopen supply: an implementation agent can provide that bounded comparison; a maintainer can provide a new mutable-specific failure or change. A generic file-size complaint, unrelated migration, or green CI alone does not supply the missing comparative evidence.

**Candidate C — share only row-mode Active retirement: ADOPT, medium confidence**

Scope: replace the two identical row-mode sequences in mutable deletion and immutable Red processing with a private same-file helper:

`retireRowActive(query, activeId, linkId): Promise<void>`

Its body executes the existing `releaseActiveReferencesSql`, then `activeDeleteSql`, then requires exactly one returned retirement row. The caller retains the routine/row branch. Red Lineage remains after retirement in the immutable branch; mutable deletion still produces no Lineage. No model decisions or destination SQL enter the helper.

The present cost is directly observable: both branches maintain the same ordered release/delete/cardinality obligation. Phase 4’s patch introduced the second copy. DDL and Decision 0003 explain why releasing historical live Work references before retirement matters. Existing mutable and immutable fault tests exercise the surrounding obligation.

The supported gain is narrow: one authoritative JavaScript implementation of this repeated protocol, reducing two edit/inspection sites to one. It is not a claim of faster developers, fewer production defects or better whole-Run recovery. The separately deployed SQL routine remains separate and still requires paired review.

Costs: zero new files, one private function, three inputs, one metadata-query capability and one call hop at each site. A fake query can reproduce the local sequence, but PostgreSQL tests remain necessary.

Context sufficient: source equality, historical duplication, exact contract and existing regression route support the small benefit over this small cost. No missing benchmark is decisive.

Verification still required: compare emitted statement/parameter order for both call sites; run existing row/routine mutable and immutable PostgreSQL suites through Verify, plus the path-triggered Issue 25 gate. Implementation and verification status are **not started**.

Next smallest action: make only this helper extraction and inspect the exact diff and statement trace. Reopen if retirement semantics diverge by model, if routine integration requires a widening context object, or if a proposed call site needs Lineage/Processing ownership inside the helper. The implementing agent or next retirement-related change can provide that evidence.

**Candidate D — distinguish evidence insufficiency in the development rule: ADOPT, high confidence**

Scope: revise rule v2 step 5 and make a short matching clarification in Decision 0015 and its AGENTS pointer. Keep ADOPT, REJECT and DEFER meanings consistent with the preregistered protocol. Require a missing-evidence/retrieval/reopen record only when uncertainty can change a particular disposition; do not require a full matrix for ordinary edits.

Current problem: “Keep” conflates sufficient evidence against a change with speculative/insufficient evidence. Candidate B illustrates why that loses useful state.

Costs: edits to three existing documents, no runtime files/interfaces/capabilities. Small additional decision-record burden; duplicated definitions across documents should be avoided through a canonical rule and pointers.

Evidence sufficient: the conflicting categories are present in the rule text itself. No runtime experiment is necessary.

Next smallest verification: check definitions and links, and replay one sufficient-rejection and one missing-evidence case. Reopen if ordinary use shows the procedure creating unnecessary records, contradicting protocol terminology or obscuring implementation/verification status. A reviewer or future ordinary task record can supply this.

**Ten-axis comparison against B2 keep**

“Improved” below denotes a source-supported mechanism, not measured time savings. “Unknown” is intentionally not converted to a score.

| Axis | A: broad fragmentation | B: mutable DML seam | C: row retirement helper | D: disposition clarification |
|---|---|---|---|---|
| Changeability | Worse: shared changes cross handlers | Unknown net benefit; local DML edits may improve | Improved for the duplicated retirement obligation | Improved distinction between rejected and unresolved work |
| Testability | Unknown; handlers still need effects/context | Potential local return-contract improvement; comparison missing | Modest local sequence replay improvement | Improved ability to assess example dispositions |
| Diagnosability | Worse inspection graph; no new evidence captured | Unknown: caller knowledge remains necessary | One retirement location; end-to-end diagnosis unchanged | Improved visibility of exactly what evidence is missing |
| Verifiability | Worse: more coordination contracts | Local benefit possible; DB gate unchanged | Local protocol easier to inspect; DB gate unchanged | Improved explicit sufficiency and verification-status records |
| Side-effect locality | Worse/distributed | Destination DML bounded; total effects unchanged | Retirement sequence colocated; total effects unchanged | Runtime unchanged |
| Invariant ownership | Worse across model/metadata modules | Preserved if the stated contract holds | Improved single owner of release/delete/count sequence | Runtime unchanged; decision authority clearer |
| Reproducibility | No demonstrated gain | Potential isolated malformed-return replay | Local statement-sequence replay improved | Missing-context state can be reproduced from a record |
| Recoverability | No gain; coordination risk increases | Unchanged common recovery | Unchanged common recovery | Runtime unchanged |
| Dependency locality | More interfaces/capability crossings | Narrow DML capability, but one extra seam | Three explicit inputs; no new module dependency | No runtime dependency; document pointers add maintenance |
| AI analysability | Worse graph; shorter files do not establish gain | Unknown net effect | One protocol owner plus two caller hops; no measured AI gain | More explicit disposition rationale; no measured accuracy gain |

**Limits and stopping**

This is source-level candidate assessment, not a completed Alder review, runtime implementation, regression result or measured maintenance benchmark. I did not exhaustively inspect all concepts, tests, set-phase internals, deployment artifacts or every historical issue discussion. Those omissions limit broad claims but do not invalidate the bounded A/C/D decisions.

For B, the decisive omission is specifically the unperformed maintenance comparison; it is not “no benchmark, therefore DEFER.” For A, current sharing and historical simplification support rejection without an experiment. For C, direct duplicated-protocol evidence supports adoption subject to implementation verification.

The model-separation hypothesis therefore has a supported scoped answer: broad model/metadata fragmentation is rejected; a common-orchestrator mutable seam remains plausible but unresolved. Unexamined alternatives retain no label.
