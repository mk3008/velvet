# Scalable execution strategy evaluation

## Decision and scope

Issue #20 evaluates execution, not new Business Design. Following the owner's [serverless review request](https://github.com/mk3008/velvet/pull/22#issuecomment-5653125860) and rereading the updated [Issue #20](https://github.com/mk3008/velvet/issues/20), retain the current executor **only as the correctness baseline in this analysis PR**. The existing row-oriented protocol is **not accepted for the target serverless workload**: 150,012–360,012 serial DB calls at 10,000 rows × 3 links are an unresolved deployment problem.

Keep **bounded batching of owned metadata SQL while retaining the memory source snapshot** as the first implementation experiment, conditional on the deployment measurements below. This is an experiment order, not selection of memory materialization for production. Do not adopt a TEMP-based replacement or automatically move source-owned allocation in this PR.

This is not a claim that the current cost is acceptable for every workload. Its per-row protocol is the identified scaling target. The isolated comparison kernel tests transport and allocation mechanics, not a complete alternative executor; its speed cannot establish equivalence for immutable/mutable/insert_only history or justify shipping it. There is no runtime/API/schema/Business Design change here.

Authority: [Business Design](../business-design/README.md), Destination Link and Transfer Target Decision concepts, [execution process](../processes/transfer-execution-process.md), Decisions [0002](0002-phase1-trusted-execution.md)–[0006](0006-phase5-insert-only-identity-mapping.md), and the [three-link acceptance](0008-multi-destination-verification.md). Reproducible experiments and measured results: [evaluation](../../experiments/issue-20/README.md).

## Measured basis for selection

The completed PostgreSQL 18.6 run measured 10,000 rows × 3 links at **105.44 s / 180,012 calls** for initial transfer, **60.06 s / 150,012 calls** for all no-op, **53.24 s / 152,112 calls** for 99% no-op, and **125.45 s / 360,012 calls** for all-row immutable correction. The all-no-op source evaluation took 0.049 s; Active lookup plus Work Item and Processing queries accumulated 37.23 s. Thus the concrete next target is per-item control/recording traffic, not replacing source materialization on the assumption that it dominates. Query timings include instrumented client work and do not isolate network from PostgreSQL CPU.

The reduced 10,000 × 3 / 1%-changed kernel measured memory JSON batches at 143.32 ms, eager TEMP at 25.95 ms and deferred TEMP at 22.94 ms; deferred allocation used 100 tokens instead of 10,000. TEMP therefore remains a worthwhile later transport candidate, while unchanged-source memory batching can be tried without first changing stored SQL contracts. Small all-dirty TEMP was not always faster, and deferred allocation was slower than eager TEMP for the large all-dirty case. These are single-run observations, not product guarantees or a full-executor speedup.

All 20 executor and 24 kernel cases completed, including downstream rollback/retry and TEMP cleanup checks. Full PostgreSQL verify passed 183 tests; the separate Alder review found no business-meaning blocker and its cleanup finding was fixed. See the evaluation for raw evidence, exact measurement boundaries, audit classifications and limitations.

## Serverless reassessment and adoption gates

The owner supplies serverless execution time/memory cost and a shared PostgreSQL as deployment requirements; no provider, price, memory tier, deadline or concurrency budget has been specified. Evaluate both sides, rather than minimizing app cost or DB work alone. The previous local-TCP run is a correctness/route-cost baseline, **not evidence that memory fits the runtime or that a 60-second invocation is acceptable**. Peak heap, RSS, external/Buffer memory, production-like RTT and concurrent DB pressure were not measured. Their absence changes the strength of the memory decision: it remains provisional, and target-deployment acceptance remains open.

Serial calls keep the invocation and its dedicated connection alive while waiting. For an assumed *additional* 1 ms per awaited call, the measured request counts add approximately 150 s for no-op, 180 s for initial Black and 360 s for full correction. At an additional 5 ms the sensitivities are about 750/900/1,800 s. These are arithmetic sensitivities, not observed RTT, total-runtime predictions or provider bills; server CPU, queueing and variance are not isolated by them. A candidate must reduce the residual serial protocol, not merely demonstrate faster localhost execution.

Why keep metadata batching as the first experiment under these requirements? Active/Work/Processing accumulated 37.23 s in the measured no-op route; their SQL is owned, fixed and reviewable. Batching that work tests a concrete request-amplification problem without first introducing arbitrary stored-SQL transformation or new allocation semantics. Fewer requests may reduce app waiting, repeated DB parsing/execution overhead and transaction/lock lifetime together; that is a hypothesis to measure, not proof of a cost saving. The snapshot's 49 ms source evaluation establishes little about its memory footprint. Bounded transport batches do **not** bound the retained source Map, pending/work arrays, completion keys or JSON serialization copies.

Metadata batching alone may be insufficient: batching just Active/Work/Processing leaves one stored reassessment and one fixed comparison call per unique key/link on this no-op route (about 60,000 at 10,000 × 3). Even if the fixed comparison is also batched, up to 30,000 per-row stored reassessment calls remain until its I/O contract is addressed. Thus this first step cannot be the deployment exit criterion. If measured residual calls breach the runtime budget, or the full snapshot breaches memory headroom, advance to the explicit bulk/DB-materialization comparison before adopting an executor. Do not wait for completion of every metadata optimization when those measurements already reject the approach.

| Option | App-side hypothesis | Shared DB risk / measurement |
| --- | --- | --- |
| Memory snapshot + owned batches | Less waiting/serialization; full snapshot still retained, with batch copies | Fewer round-trips may help overall work, but larger statements can increase peak CPU/memory and change lock acquisition; measure transaction and competing workload latency |
| Memory snapshot + explicit bulk destination SQL | Fewer residual calls, bounded transport payload | Still retains snapshot in Node; JSON decoding and set operations consume DB CPU; vary batch size and track plans, buffers, WAL and lock waits |
| DB-side snapshot / TEMP + explicit bulk SQL | Avoid full source transfer/retention; fewer app calls | Source/decision materialization, ANALYZE, catalog work and temporary relation/sort I/O consume shared resources; measure aggregate throughput and neighbor latency, not only one Run |

None implies splitting the atomic work transaction. Smaller batches do not release locks held until commit; faster individual statements also do not prove a shorter lock lifetime when scheduling/queueing changes. No promise of DB resource isolation follows from using a separate app invocation.

### Next implementation experiment: required evidence, not a production approval

1. Establish the intended deployment envelope before adoption: invocation duration/cost and memory headroom, expected source width/cardinality (including source rows beyond pending keys), same-Setting and independent-Setting concurrency, and acceptable impact on a representative unrelated DB workload. Record assumptions where a deployment choice is still absent; do not invent pass thresholds or provider prices.
2. Instrument the actual baseline and metadata-batched candidate at 1,000/10,000 rows × 1/3 links, dirty/no-op mixtures and the existing correctness routes. Measure peak RSS, heap and external memory, source/pending/batch serialization phases, GC, complete invocation duration (including connection/configuration/recovery), calls and transport. A duration × allocated-memory proxy may help compare configurations, but is not an actual bill; sampled heap alone is neither total memory nor billed memory.
3. Repeat in an intended-like app-to-DB network placement and under a documented RTT/latency distribution; a simulated-delay sensitivity run may complement but cannot replace deployment testing. Record warm/cold setup separately, repetitions and tail duration. Do not compare the current instrumented single sample with an uninstrumented candidate as an isolated gain.
4. Run increasing concurrency for independent Settings with a competing DB workload, plus same-Setting serialization. Measure DB CPU, buffer/cache behavior, I/O/WAL, temporary relation and sort/hash I/O, lock wait/hold time, work-transaction duration, connection occupancy, aggregate completed work and neighbor latency. Use these observations and app duration/memory together to choose batch size/concurrency for the experiment; introducing a scheduler is outside this PR.
5. Preserve Phase 1–5/#19 equivalence, ordering and full rollback/failed-Run/lost-COMMIT behavior. Require app improvements without exceeding agreed shared-DB budgets. If residual calls, memory or DB contention fail the envelope, compare an explicit bulk memory/TEMP candidate under the same complete semantics and load. If neither fits, keep adoption unresolved; do not reduce history, weaken tests, partially commit or silently change the unit of work.

This follow-up is deliberately separate implementation work. This PR adds no new benchmark results or measured memory/RTT/DB-CPU claims; its conclusion is **metadata batching first for evidence gathering, existing row protocol not accepted for deployment, memory vs DB materialization not finally selected**.

## Historical evidence

Decision 0002 and [PR #4](https://github.com/mk3008/velvet/pull/4) describe the Phase 1 snapshot/one-row stored SQL and dedicated-connection transaction choices; Decisions 0003–0006 extend those mechanics, and 0008 explicitly excludes throughput evaluation. Review of those records, PR #4 body/comments and the original implementation history found no explicit comparison rejecting TEMP staging. Reviewability preference, avoiding TEMP lifecycle/catalog costs, and minimal Phase 1 correctness scope are plausible explanations, **not established intentions of the earlier implementer**. The current decision is based on present contracts and measurements, not an invented historical rationale.

## What is expensive, and what is useful

For N distinct pending logical source keys and L enabled links, the current nonempty successful run uses 12 fixed client queries (including transactions, configuration reread, source evaluation and finalization), plus these route costs per key/link:

| Route | Queries | Main work |
| --- | ---: | --- |
| Initial immutable / insert_only Black | 6 | Active read, Work Item, destination Insert, Active Insert, Lineage, Processing |
| Initial mutable Black | 5 | Same without Lineage |
| Immutable / mutable unchanged | 5 | Active read, reassessment, JSONB comparison, Work Item, Processing |
| Immutable changed | 12 | Above decision plus Red, live-reference release, retirement, Red Lineage, Black, activation, Black Lineage |
| Mutable changed | 6 | Decision + Work Item + Update + Processing |
| Existing insert_only | 3 | Active read, Work Item, Processing; no reassessment |
| Duplicate within key/link | 2 | Work Item and Processing; no Active read |

For 10,000 keys × 3 links, initial immutable transfer therefore needs 180,012 calls; unchanged reevaluation still needs 150,012. At an *assumed additional* 1 ms per serial request this alone adds about 180/150 seconds; this is a sensitivity calculation, not measured WAN latency. Source cardinality can exceed pending cardinality because the entire canonical SQL executes without an injected filter. Pending results also repeat each key per link.

Memory materialization buys one evaluation of arbitrary trusted source SQL, shared typed row values, straightforward per-link mapping, stable source identity checks and visible single-row stored statements. It avoids session objects and changing the trusted row-SQL contract. It does not eliminate repeated destination parameters or reassessment JSON returning to Node and being sent back for JSONB comparison. Full SQL-text/parameter logging magnifies this cost; the benchmark measures submitted text/serialized values, not the application's logging policy.

Batching Active reads alone removes at most one of the five no-op requests; it cannot make the whole route O(L). Work Item/Processing batching and reassessment/comparison transport must also be considered. Row-sized stored SQL remains a throughput floor until there is an explicit bulk I/O contract. No automatic SQL rewriting is justified by these measurements.

## Alternatives and preservation boundaries

| Candidate | Benefit | Why not ship it here |
| --- | --- | --- |
| Memory + bounded owned-metadata batches | Keeps canonical source, no session relation, reduces repeated metadata requests | Must preserve locks, coalescing, Work Item-before-write, error timing and durable mappings; requires a separately tested implementation |
| Memory + bulk destination JSON | Bounds payload and retains source evaluation | Current stored SQL consumes one row and returns one key; arbitrary statements cannot be blindly widened |
| TEMP source/decision relations | Keeps source payload in PostgreSQL, reusable across statements, can allocate once for selected rows | Requires explicit relation-shaped source/destination contracts and exact key validation; kernel omits full lifecycle |
| One materialized CTE | Reuses source within one statement without session lifetime | Does not persist across destination statements; sibling modifying CTEs cannot be used to assume ordered visibility |
| Retain all current mechanics indefinitely | Lowest immediate change risk | Leaves demonstrated linear request amplification unresolved; not selected as a long-term performance conclusion |

Any next executor must preserve one complete source evaluation, a frozen eligible Dirty Key/link set, per-link decisions, duplicate history, exact destination comparison after correction, configured comparison exclusions, complete returned-key validation, and the three route models. NULL/exact numeric handling must not move to lossy JavaScript equality. Missing or malformed reassessment is an error, never no-op.

The current iteration is Dirty Key order then link execution_order. Reordering to “all keys of link 1, then all keys of link 2” can change trusted statements that inspect earlier writes. Preserve the current observable order unless a concrete bulk contract establishes independence. A single statement with multiple data-modifying CTEs is not a substitute for sequential statements whose later SQL must see earlier writes. [PostgreSQL WITH documentation](https://www.postgresql.org/docs/18/queries-with.html).

## Allocation

With the benchmark source (matching #19's allocation pattern), each evaluated source row always consumes one allocation token and three candidate row IDs, even with only one enabled link or all links no-op. Red SQL consumes additional row IDs for actual reversals. The comparison exclusions explicitly name generated IDs/allocation, so fresh candidates do not manufacture business dirtiness. Do not automatically exclude every generated-looking field: only the configured exclusions are authoritative.

The reduced deferred-allocation kernel creates one snapshot of business values, computes Dirty Key-equivalent row × link differences, and allocates once per source row with **any** new write. Links needing new rows share that token; links independently no-op keep their old materializations. This shows that unused candidates are not physically necessary in PostgreSQL. It does **not** authorize treating allocation as a business version or refreshing unchanged links.

Automatic extraction/reordering of `nextval` from arbitrary stored source SQL is rejected. Source expressions can depend on allocation, and the existing mapping requires destination keys in that source result. A deferred allocation facility needs explicit developer-owned comparison/allocation/materialization inputs, validation of dependencies and shared correlation, and a separate contract decision; it cannot silently weaken returned-key validation or rerun the source. If the source already uses stable natural keys or an application-owned insert_only identity mapping, there may be no unused allocation problem to solve. That is a configuration choice, not an engine-injected rule.

Sequence gaps on no-op or rollback remain acceptable surrogate behavior, not broken business identity. PostgreSQL does not reclaim nextval values on transaction abort. [Sequence documentation](https://www.postgresql.org/docs/18/functions-sequence.html).

## PostgreSQL TEMP tradeoffs

A dedicated client already fits transaction-local TEMP use. The kernel uses fixed `pg_temp.probe_snapshot` / `pg_temp.probe_decisions` names and `ON COMMIT DROP`, created inside the work transaction. Repeated use on the same connection checks cleanup after commit and rollback; simulated server COMMIT followed by a lost response checks that committed rows survive while TEMP disappears. Pool reuse must wait for a known idle connection; after failed rollback or broken connection, discard the connection. TEMP does not repair an unknown commit outcome. Retain separately committed Run creation, atomic work/success commit, and guarded failed recording of only still-running Runs; no general crash recovery is added.

CREATE/DROP entails per-run catalog work; reusing session tables would reduce DDL but introduces state/version/cleanup obligations. Do not adopt reuse without measuring a high-frequency/concurrent workload. The small isolated run does not measure catalog contention or bloat. PostgreSQL autovacuum cannot analyze TEMP tables; the eager/deferred kernels include explicit ANALYZE of the source snapshot. Decision-relation statistics, additional indexes and their build costs remain workload-dependent. [CREATE TABLE documentation](https://www.postgresql.org/docs/18/sql-createtable.html).

TEMP is not an assurance of in-memory execution: local buffers and temporary relation files differ from work_mem used by sort/hash operations. Wide rows, larger cardinalities, EXPLAIN (ANALYZE, BUFFERS), temp-file counters and concurrent sessions are follow-up measurements before selecting a TEMP route; no zero-spill claim is made here. Transaction time remains one atomic work transaction; chunking transport must not become chunked commits. [Resource consumption documentation](https://www.postgresql.org/docs/18/runtime-config-resource.html).

## Updated Issue review oracles

The updated Issue also requests explicit operational and SQL-surface assessment. These are current-source observations and follow-up gaps, not new guarantees:

| Oracle | Current evidence and limitation |
| --- | --- |
| Incident identity / phase | `TransferExecutionError` exposes runId, original cause and recoveryErrors; Run links to Setting. It does not provide a structured failing Link or operation phase, and rolled-back Work/Processing cannot recover that context. This is an observability gap to address alongside batching, with bounded diagnostic context rather than full payload logging. Configuration rejection before Run creation has no runId. |
| Durable state / retry | Separately committed Run creation and guarded failure recording preserve known outcomes. After a confirmed work rollback and no concurrent successful processing, that Run's work remains pending by Dirty Key/link. Lost COMMIT response requires inspecting durable Run/Processing before retry; recovery/process failure may leave running state. Existing tests cover these boundaries, not a general recovery service. |
| Executed configuration | Stored SQL fields are reviewable and configuration locks/reread prevent mid-run change. Run does not preserve an immutable copy/version of every executed Link/SQL definition. Later configuration edits can obstruct exact historical reconstruction; a bounded definition/version reference is a follow-up need, not an existing guarantee. |
| Failure isolation | Runtime serializes by Setting row and uses a dedicated client; no global application mutex or global failure flag is introduced. This does not isolate shared destination rows, metadata locks, DB saturation or a host's pool/scheduling policy. Existing same-Setting concurrency and cross-Setting context tests are not proof of neighbor throughput during failures; independent-Setting failure/load testing belongs to the next experiment. |
| Registration / source preview | Canonical source SQL remains directly inspectable and separately executable with bound arguments; no staging DDL is required for registration. A SELECT using nextval (as in this fixture) is not side-effect-free, and rollback will not reclaim those allocations. General trusted functions can also have effects. A side-effect-free preview must be explicitly authored/validated; do not promise it from SELECT syntax or silently strip expressions. No new registration-time mutation or master UI is required. |

Serene's package command scans **src**, not stored DB contents, canonical DDL, DB functions/triggers, tests, documentation or the separate experiments. Its recorded inventory is 19 ordinary / 45 review-required / 0 violation classifications. Imported query definitions and bind/driver wrappers require cross-file tracing; `execute-transfer/trusted-sql.ts` lowers named markers for arbitrary developer-owned stored statements and cannot establish their meaning. Review those exact Setting/Link/Destination statements, target DDL/functions and bindings through PostgreSQL tests. Test-only setup/failure SQL and canonical DDL have a separate fixture/schema review path. The experiment's extra scan is 20 ordinary / 39 review-required / 2 UUID-only lifecycle classifications, with the scope/manual review documented in the evaluation. This is a candidate inventory, not exhaustive driver discovery or approval of unseen stored SQL.

Runtime transformation currently performs lexical marker lowering and validation, not relation/predicate/column synthesis. Stored SQL/configuration checks can catch missing definitions, malformed markers and mapping prerequisites before a particular write, but database syntax/types/constraints, invalid returned rows and data-dependent failures can still surface during execution; not all failures are pre-Run. Next candidates should use fixed, inspectable SQL and explicit bulk inputs. Do not infer bulk SQL by rewriting arbitrary stored statements. Any unavoidable transformation must state which checks move before execution and which remain runtime-dependent. This documentation-only reassessment adds no executable SQL or audit surface; future batching/bulk definitions require their own construction and semantic review.

## SQL review and staged migration

Executable experiment SQL is visible in the two scripts. Fixed queries use Serene named bindings. Stored source/Insert/reassessment/Red texts are configuration payloads executed by the existing trusted binder; no runtime identifiers or business values form SQL syntax. CREATE/DROP DATABASE concatenates only a locally generated UUID identifier for isolated test lifecycle, an explicit infrastructure exception under Raw SQL Rules scope. DDL setup, control/probe statements and canonical DDL loading are separately reviewable. Audit findings remain review surfaces, not suppressed classifications. Running only `audit:sql` (src) is insufficient to inventory the new experiment folder; the evaluation records the additional audit command.

Next independently reviewable phases, not implementation authorization from this record:

1. Batch owned metadata on the existing snapshot as the first experiment, subject to the serverless adoption gates above, keeping complete key/link IDs and exact ordering. Compare state against the existing executor for every Phase 1–5 route, #19 asymmetric links, duplicates, source absence, failures at each persistence boundary and lost COMMIT response. Benchmark the same matrix and reject changes that merely relocate cost or weaken checks.
2. If residual calls, memory or shared-DB pressure fail the deployment envelope, design an explicit trusted bulk SQL input/output contract and evaluate memory JSON batches against TEMP. Keep a fallback for row SQL; no inferred relation/identifier rewriting. Prove execution-order compatibility before batch reordering.
3. Evaluate explicit post-decision allocation separately where unused allocation is actually costly. Preserve stable business correlation and per-link no-op independence; do not infer changes to Business Design from the kernel.

Promotion requires full PostgreSQL regression/SQL review, Fresh Alder review, and human PR review. The current decision preserves the baseline semantics by leaving the executor unchanged, not by asserting that the incomplete transport kernel implements them.
