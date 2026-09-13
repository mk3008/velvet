# Scalable execution strategy evaluation

## Decision and scope

Issue #20 evaluates execution, not new Business Design. Keep the current executor as the shipped implementation. Prioritize **bounded batching of owned metadata SQL while retaining the memory source snapshot** as the next implementation experiment. Do not adopt a TEMP-based replacement or automatically move source-owned allocation in this PR.

This is not a claim that the current cost is acceptable for every workload. Its per-row protocol is the identified scaling target. The isolated comparison kernel tests transport and allocation mechanics, not a complete alternative executor; its speed cannot establish equivalence for immutable/mutable/insert_only history or justify shipping it. There is no runtime/API/schema/Business Design change here.

Authority: [Business Design](../business-design/README.md), Destination Link and Transfer Target Decision concepts, [execution process](../processes/transfer-execution-process.md), Decisions [0002](0002-phase1-trusted-execution.md)–[0006](0006-phase5-insert-only-identity-mapping.md), and the [three-link acceptance](0008-multi-destination-verification.md). Reproducible experiments and measured results: [evaluation](../../experiments/issue-20/README.md).

## Measured basis for selection

The completed PostgreSQL 18.6 run measured 10,000 rows × 3 links at **105.44 s / 180,012 calls** for initial transfer, **60.06 s / 150,012 calls** for all no-op, **53.24 s / 152,112 calls** for 99% no-op, and **125.45 s / 360,012 calls** for all-row immutable correction. The all-no-op source evaluation took 0.049 s; Active lookup plus Work Item and Processing queries accumulated 37.23 s. Thus the concrete next target is per-item control/recording traffic, not replacing source materialization on the assumption that it dominates. Query timings include instrumented client work and do not isolate network from PostgreSQL CPU.

The reduced 10,000 × 3 / 1%-changed kernel measured memory JSON batches at 143.32 ms, eager TEMP at 25.95 ms and deferred TEMP at 22.94 ms; deferred allocation used 100 tokens instead of 10,000. TEMP therefore remains a worthwhile later transport candidate, while unchanged-source memory batching can be tried without first changing stored SQL contracts. Small all-dirty TEMP was not always faster, and deferred allocation was slower than eager TEMP for the large all-dirty case. These are single-run observations, not product guarantees or a full-executor speedup.

All 20 executor and 24 kernel cases completed, including downstream rollback/retry and TEMP cleanup checks. Full PostgreSQL verify passed 183 tests; the separate Alder review found no business-meaning blocker and its cleanup finding was fixed. See the evaluation for raw evidence, exact measurement boundaries, audit classifications and limitations.

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

## SQL review and staged migration

Executable experiment SQL is visible in the two scripts. Fixed queries use Serene named bindings. Stored source/Insert/reassessment/Red texts are configuration payloads executed by the existing trusted binder; no runtime identifiers or business values form SQL syntax. CREATE/DROP DATABASE concatenates only a locally generated UUID identifier for isolated test lifecycle, an explicit infrastructure exception under Raw SQL Rules scope. DDL setup, control/probe statements and canonical DDL loading are separately reviewable. Audit findings remain review surfaces, not suppressed classifications. Running only `audit:sql` (src) is insufficient to inventory the new experiment folder; the evaluation records the additional audit command.

Next independently reviewable phases, not implementation authorization from this record:

1. Batch owned metadata on the existing snapshot, keeping complete key/link IDs and exact ordering. Compare state against the existing executor for every Phase 1–5 route, #19 asymmetric links, duplicates, source absence, failures at each persistence boundary and lost COMMIT response. Benchmark the same matrix and reject changes that merely relocate cost or weaken checks.
2. Only if remaining measured cost justifies it, design an explicit trusted bulk SQL input/output contract and evaluate memory JSON batches against TEMP. Keep a fallback for row SQL; no inferred relation/identifier rewriting. Prove execution-order compatibility before batch reordering.
3. Evaluate explicit post-decision allocation separately where unused allocation is actually costly. Preserve stable business correlation and per-link no-op independence; do not infer changes to Business Design from the kernel.

Promotion requires full PostgreSQL regression/SQL review, Fresh Alder review, and human PR review. The current decision preserves the shipped semantics by leaving the executor unchanged, not by asserting that the incomplete transport kernel implements them.
