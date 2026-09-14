# Fresh context A — exact prompt and complete response

Provenance: independent task /root/context_a, assigned by /root for Velvet PR 32 context-sufficiency extension. Baseline B2 `4b895265d8262fafd7a95221a344a7de8c93841e`; protocol `ab3af52b9f8efc7c3a78b64f118e3f34fb22d07d`. Assessment completed before this persistence request, without peer results or root later outcomes. GitHub connector read-only research; no local execution or agent delegation. Subsequent parent instruction authorized only creating this evidence blob, without commits or ref updates.

## Exact original task prompt

Independent Fresh Agent study requested by Velvet PR32 owner. Read-only GitHub research; no local exec environment, use discovered GitHub connector tools. Repository mk3008/velvet baseline B2 4b895265d8262fafd7a95221a344a7de8c93841e. First read evaluations/issue-31/context/protocol.md at protocol commit ab3af52b9f8efc7c3a78b64f118e3f34fb22d07d, then define and retrieve necessary context yourself following AGENTS and Business Design. Generate bounded candidates for actual maintenance problems and evaluate model-separation hypothesis (no desired structure/disposition supplied). Distinguish broad fragmentation vs retaining shared orchestration. Apply ADOPT/REJECT/DEFER with context-sufficiency inventory, 10-axis comparison, explicit missing evidence, attempted retrieval, next smallest experiment and reopen conditions. Source-level reasoning may suffice; no forced benchmark or forced DEFER. Do not read other agents' results or later root outcomes. Do not write files/comments/branches or spawn agents. Return a complete assessment including exact sources/revisions, what was read vs missing, candidate contracts/costs, labels, and limitations. Full final response will be saved. Avoid massive outputs; use structuredContent.content from GitHub fetch_file and targeted reads.

## Complete final response (verbatim)

Assessment A: **REJECT broad model/metadata fragmentation; DEFER the narrower model-operation seam; ADOPT a bounded shared retirement helper for review and the decision-rule clarification.** These are separate candidates. None has been implemented or newly verified in this assessment.

Baseline: `4b895265d8262fafd7a95221a344a7de8c93841e` (B2), repository `mk3008/velvet`. Protocol read first at `ab3af52b9f8efc7c3a78b64f118e3f34fb22d07d`. I independently selected the context below. I did not inspect another fresh agent’s assessment or root’s later decisions.

**Context collected and sufficiency**

My decision questions were:

1. Which model differences represent distinct business behavior, and which operations deliberately remain common?
2. Which maintenance changes actually occurred?
3. Where do SQL effects, metadata ordering, duplicate control, transaction ownership and recovery currently live?
4. Can a smaller seam remove a demonstrated maintenance obligation without creating another policy owner?
5. What evidence could distinguish a useful narrow model seam from merely moving code?
6. Are regression gates available?

All paths below refer to B2 unless explicitly qualified.

| Retrieved and inspected | Extent and purpose |
|---|---|
| `AGENTS.md`; `docs/business-design/README.md`; `docs/scope/SYSTEM_SCOPE.md`; `docs/concepts/README.md` | Full entrypoints, authority and verification rules. |
| `docs/concepts/{destination,dirty-key,transfer-setting}/concept.json` | All definition statements and lifecycle, reread in compact form after an initial combined output was truncated. |
| `docs/concepts/{active-black,lineage,transfer-target-decision,work-item}/concept.json` | Lifecycle and boundary/invariant statements; other statements acquired but not inspected. |
| `docs/dfd/change-detection-dirty-key-registration.md`; `docs/processes/transfer-execution-process.md` | Full execution flow and boundaries. |
| `docs/decisions/README.md`; Decisions `0005`, `0006`, `0007`, `0015` | Full records. Decision 0015 supplies historical context, not an adoption verdict for new candidates. |
| `evaluations/issue-31/rule.md`; `evaluations/issue-31/engineering-basis.md` | Full v2 rule, its ten axes and historical source pointers. External papers themselves were not retrieved. |
| `src/index.ts`; `src/features/README.md`; `package.json`; `rules/raw-sql-rules.md` | Public exports, existing layout, verification command and SQL contract. |
| `src/features/execute-transfer/{boundary,link-mapping,queries}.ts` | Full production source. |
| `db/ddl/{order.json,work_item.sql,active_black.sql,dirty_key_processing.sql}`; `db/runtime/execute-transfer-metadata.sql` | Full relevant schemas and optional routine implementation. |
| `tests/features/execute-transfer/{mutable,execution}.integration.test.ts` | Both files acquired; inspected test inventory, setup, mutable fault matrix, malformed-return checks, COMMIT-response-loss checks and selected immutable recovery tests. Not every fixture/assertion inspected. |
| `.github/workflows/{ci,issue-25-deployment}.yml` | Full gate definitions, discovered through the B2 workflow directory listing. |
| Historical commits listed below | Changed-file lists and relevant execution/query/test patches. Large initial output was truncated; relevant patches were subsequently reread selectively. |

Exact historical events inspected:

- Mutable lifecycle: [`fbfe73e5cd493b893b39d4a60c68c70fae28870c`](https://github.com/mk3008/velvet/commit/fbfe73e5cd493b893b39d4a60c68c70fae28870c).
- Insert-only simplification: [`8bb20a223bdf8a66c2cd8d6a4830dbfb4791c647`](https://github.com/mk3008/velvet/commit/8bb20a223bdf8a66c2cd8d6a4830dbfb4791c647).
- Lost-COMMIT recovery correction: [`6ffab6f963742dde41fc281ecbc66dae4d42d7f2`](https://github.com/mk3008/velvet/commit/6ffab6f963742dde41fc281ecbc66dae4d42d7f2).

Retrieval limitations and outcomes:

- Initial tool argument guesses failed; corrected calls acquired the protocol and commit evidence.
- Two guessed execution paths did not yield content; `src/index.ts` resolved the actual path.
- Code search for `executeRowTransfer` returned no results; this was not treated as evidence that the function was absent.
- Guessed `verify.yml`/`verify.yaml` reads failed. A directory read located `ci.yml`; actual gate definitions were then acquired.
- No local execution environment was used. No benchmark or candidate comparison was executed through Actions.
- The commit-workflow endpoint reported B2 Verify run `34841675092` and Issue 25 deployment run `34841675129` successful. I inspected their summaries and workflow definitions, not job logs. This is historical baseline evidence, not verification of proposed changes.
- Set-phase internals, all relationship indexes, complete DDL, complete regression suites, production incidents and developer-time measurements were not inspected. They are unnecessary to establish the limited duplication and rule findings; they would be relevant to wider runtime restructuring.
- Destination’s concept text still names immutable/mutable in one rationale, whereas the process, Decision 0006, Lineage invariant and implementation include insert-only. I preserved current behavior and did not resolve or amend that business-document inconsistency.

**Observed ownership and maintenance evidence**

At B2, `executeTransfer` owns pre-Run validation, configuration locks and recheck, durable Run creation, engine selection, finalization and recovery. `executeRowTransfer` owns the ordered work loop, duplicate tracking, reassessment, model dispatch and metadata ordering. PostgreSQL performs comparison through `compareSql`; replacing it with JavaScript equality would change the contract.

The mutable implementation event changed model-specific validation, work flags, mutation, retirement and result classification. Thus model-related maintenance is real, although the historical patch does not demonstrate that a separate module would have reduced its total cost.

The insert-only simplification removed divergent mapping/returned-key handling. Decision 0006 expressly retains the ordinary Black Insert path. A model decomposition that copies that path would recreate a maintenance problem already removed.

The mutable-delete and immutable-red branches currently duplicate the same row-mode sequence:

1. Release live Work Item references for the Active Black/link.
2. Delete that Active Black/link.
3. Require exactly one returned retirement row.

The Work Item foreign keys and preserved `evaluated_destination_key_json` explain why this sequence is meaningful. Mutable deletion and immutable reversal have different destination effects and Lineage behavior, but share this retirement obligation.

**Candidate contracts and decisions**

| Candidate | Concrete scope, keep comparison and costs | Disposition |
|---|---|---|
| **A1: Broad model/metadata fragmentation** | Three model modules own their complete work behavior, with separate helpers/modules for Black, Red and metadata. Keep retains one ordered work owner. Proposed structure adds at least three model interfaces, several files/hops, and either repeated shared decisions or a context protocol carrying work, mapping, SQL/query capability, Active Black, counts and processing state. Even if Run recovery stays common, work-level ordering becomes distributed. | **REJECT, high confidence, context sufficient for this scope.** Current source and insert-only history show shared first insertion and coupled metadata; no distinct implementation requirement justifies this ownership multiplication. |
| **A2: Narrow model-operation seam retaining shared orchestration** | Extract a single internal model-operation module containing mutable update/delete and immutable Red destination-statement execution plus returned-key validation. Caller retains duplicate/no-op decisions, PostgreSQL comparison, Work creation, retirement, Lineage, common Black Insert, Processing, counts and Run lifecycle. Inputs: existing client capability, model/operation, stored statement, mapped values, complete Active Black key and destination-key columns. Return only validated operation output, such as a Red key; throw original errors. No registry, callbacks into metadata or transaction methods. Cost: one production module, one internal interface/result contract, several explicit value inputs and one inspection hop; raw client capability crosses the seam. | **DEFER, medium confidence.** Real mutable maintenance and malformed-return tests make the seam plausible. Missing is a concrete edit/replay comparison showing that the extraction isolates a useful maintenance task despite validation remaining before reassessment and flags/results remaining in the caller. This is narrower than A1 and is not rejected by A1’s evidence. |
| **A3: Same-file row retirement helper** | Extract only the duplicated row-mode release/delete/cardinality sequence into private `retireRowActive(query, activeId, linkId): Promise<void>`. Both existing row branches call it at exactly their current locations. Caller retains destination writes, routine branch, Red Lineage, work/result decisions and recovery. No new file/export/SQL definition/dependency. Three explicit inputs, one of them the existing bound-query capability; two calls and one same-file inspection hop. Keep requires reviewing/editing two copies of the same FK-sensitive sequence. | **ADOPT for reversible implementation and review, medium confidence; context sufficient.** The current benefit is eliminating one duplicated invariant implementation, not predicted productivity. Structural cost is small and bounded, with unchanged call timing and feasible PostgreSQL verification. Implementation and verification remain pending. |
| **A4: Clarify decision-rule dispositions and context sufficiency** | Amend v2 step 5 and its Decision/AGENTS integration to distinguish rejected benefit from decision-changing missing evidence; require attempted retrieval, explicit candidate scope, missing evidence and reopening conditions. Keep leaves “evidence is speculative” and “costs exceed benefit” sharing a keep route. No mandated tournament, fresh-agent pair, periodic audit or new business authority. Cost: edits to the existing rule and two short routing records; modest additional reasoning fields. | **ADOPT, high confidence; context sufficient.** The v2 wording visibly conflates different knowledge states. The protocol supplies precise meanings. This is a document/procedure correction, not demonstrated improvement in AI accuracy. |

A3 deliberately does not combine row and routine retirement into a generic metadata abstraction. The stored routine already owns its sequential SQL and optional Lineage; preserving that existing experimental comparison is part of the bounded scope.

**Ten-axis comparison against B2 keep**

`I` = supported improvement mechanism; `U` = unchanged; `W` = worse/cost; `?` = unresolved net effect. These are qualitative judgments, not measured gains or an additive score.

| Axis | A1 broad fragmentation | A2 narrow operation seam | A3 retirement helper | A4 rule clarification |
|---|---|---|---|---|
| Changeability | W: shared insertion/metadata edits span owners | ?: mutation edit locality improves, policy stays split | I: one owner for identical retirement edit | I: distinct dispositions have distinct criteria |
| Testability | ?: more seams, shared behavior still needs DB | ?: direct malformed-result replay may need less fixture setup | U: same integration route; helper alone is not DB proof | U: no executable behavior change |
| Diagnosability | W: operation-to-metadata trail has more hops | ?: operation errors local, production context unchanged | U: errors/capture unchanged | I: missing-evidence reason becomes explicit |
| Verifiability | W: larger ownership/ordering proof | ?: smaller operation checks, plus wiring/equivalence obligation | I locally: duplicated sequence checked once; global gates unchanged | I: reader can audit why a label was chosen |
| Side-effect locality | W: effects distributed | U globally; local statement execution grouped | I: retirement effects grouped without moving timing | U for runtime |
| Invariant ownership | W: shared work decisions dispersed | U by contract; must verify caller still authoritative | I: one row retirement sequence owner | U for product invariants |
| Reproducibility | ?: structure supplies no captured context | ?: local replay possible; fixture comparison missing | U: no new replay/capture facility | I: explicit sources, unknowns and next observation |
| Recoverability | U only if common lifecycle preserved; added risk | U: common coordinator and errors retained | U: same transactions and error propagation | U for runtime |
| Dependency locality | W: cross-module state/capabilities | ?: operation module smaller, but client/type dependencies cross seam | U: no new module/import or ambient dependency | U: existing document chain |
| AI analysability | ?: smaller files versus distributed state | ?: local operation focus versus timing hop | I narrowly: shared sequence has one name; added hop remains | I narrowly: REJECT and DEFER no longer ambiguous |

No developer-time, AI-speed, memory, throughput, incident-rate or general accuracy improvement was measured. A3’s supported improvement is the directly observable removal of duplicate source ownership. A4’s is the directly observable removal of disposition ambiguity.

**Missing evidence, next observation and reopening**

| Candidate | Missing evidence and why it matters | Next smallest useful observation | Reopen condition and supplier |
|---|---|---|---|
| A1 | Future genuinely independent model contracts; no present requirement in inspected sources warrants independent metadata owners. Unknown developer-time coefficients would not reverse the scoped duplication/ownership objection. | During an actual model change, map required edits and show which shared behavior really diverges. No benchmark required now. | Owner-approved model behavior requiring independently evolving work/metadata semantics, or a concrete comparison preserving single shared owners with fewer coordination obligations. Product owner supplies meaning; implementer supplies comparison. |
| A2 | A bounded before/after maintenance task and fixture design. It could reveal useful independent operation testing, or show that caller/helper coordination outweighs locality. Available source/history was retrieved; this comparison was **not performed**, rather than repository evidence being inaccessible. | Write a review-only interface/body sketch for one mutable malformed-return or locator-contract task, then compare edit sites, required fixtures, capability inputs and error timing with B2. If favorable, implement on a branch and run required gates. | A concrete model-operation change, repeated fault investigation dominated by mutation validation, or a completed comparison establishing net locality. Maintainer/reviewer supplies task and comparison. |
| A3 | No candidate implementation/equivalence check or CI run yet. No evidence of an existing retirement drift bug, and none is claimed. Those are implementation-readiness gaps; remaining unknown future usage does not plausibly reverse this tiny current duplication reduction. | Inline the proposed helper body mentally/mechanically at both call sites to check exact statements, parameters, ordering and error text; then run row/routine and required PostgreSQL gates after implementation. | The two retirement sequences acquire different ordering/cardinality semantics, helper inputs expand into a context protocol, or regression traces differ. Runtime maintainer or CI supplies evidence. |
| A4 | No measured improvement in decision quality/population reproducibility. Not necessary to correct the actual rule ambiguity. | Source/link review plus an example where unavailable decision-changing evidence yields DEFER while insufficient benefit yields REJECT. | Routine use shows the added record burden exceeds its value, or readers still cannot distinguish labels. Rule users/reviewers supply examples. |

**Verification boundary and stopping**

For any runtime candidate, preserve SQL text/bindings, validation precedence, configuration locks, callback timing, durable Run separation, common success tail, rollback/original-error behavior and the `failSql` guard against relabeling committed success. The existing Verify workflow uses PostgreSQL 18 and `pnpm verify`; changes under the execution directory also trigger the scoped Issue 25 deployment workflow. Both gates must be inspected after a candidate implementation. Current green baseline runs cannot establish candidate maintenance benefit or readiness.

A3 does not justify replacing PostgreSQL tests with mocked query tests. In particular, Work Item reference release, Active Black retirement, transaction rollback and lost COMMIT response remain real database obligations.

This assessment stops with one supported bounded runtime candidate, one supported procedure correction, and explicitly separated broad/narrow model conclusions. Other unexamined alternatives are not rejected. A2 is suitable as a frozen reopening record because it names the exact unresolved comparison and who can supply it. No repository-wide tournament, continuous monitor or universal quality claim follows.
