# Bounded execution candidate

Issue #23. This is an opt-in candidate, not production adoption. Business authority remains the existing Business Design and Decisions 0002–0009. No source SQL rewriting, deferred allocation or new business policy is introduced.

## Choice

`metadataMode: 'routine'` uses three explicitly deployed, SECURITY INVOKER PostgreSQL routines in `db/runtime/execute-transfer-metadata.sql`. They execute fixed owned metadata statements sequentially between existing trusted SQL calls. Unlike speculative prefetch or deferred metadata writes across keys, this preserves metadata visibility to later stored SQL. Work Item still precedes destination mutation; retirement and Red Lineage precede new Black; Processing precedes the next item's stored SQL. Installation is a deployment action, never a registration side effect. The default `row` path remains the reference and works without installing these routines.

This reduces request overhead without pretending to eliminate row-sized stored SQL. Successful initial immutable calls change from 6 to 4 per pair, unchanged from 5 to 4, and immutable correction from 12 to 8. Both modes still execute the same owned statements inside PostgreSQL. Arbitrary stored reassessment and writes remain row-sized. No DB CPU improvement follows automatically from fewer client calls.

`maxDirtyKeys` optionally admits a bounded number of Dirty Key records with all their eligible links, in one eligibility statement before source evaluation. It limits neither source evaluation nor retained source memory. All admitted work commits atomically. Remaining pairs stay pending, with no durable ID watermark; lower IDs committed late remain eligible. Each subsequent Run gets its own complete source snapshot and source-owned allocation. Duplicates in different Runs can become no-op rather than within-Run duplicate_ignore, with each Dirty Key retaining its own history. This is an explicit Run admission option, not partial commit of an existing Run. Existing unbounded behavior remains the default.

## Recovery and limits

The host owns invocation scheduling, connection admission and retry delays. The core introduces no global lock, queue or automatic retry loop. A bounded Run can make durable progress through a larger finite backlog, while a fail-fast cap on the entire backlog cannot. Admission limits alone do not bound slow source SQL, a slow stored statement, a hot Setting lock, the source snapshot's memory, or DB saturation. A runtime deadline, server-side statement/lock timeouts, host concurrency and arrival rates need a deployment-specific envelope. Do not infer a safe production limit from the illustrative evaluation budget.

Repeated snapshots can increase source scanning, allocation and memory costs during recovery. Measure aggregate work and independent Settings/neighbor latency, not only the smaller per-Run duration. No general claim of recoverability for unbounded arrivals or every source definition is made. Explicit bulk stored I/O or DB materialization remains the next candidate if residual serial calls/source cost cannot sustain the required arrival rate. It would require an explicit SQL contract rather than inference from arbitrary statements.

## Review and validation

The Phase 1–5 and #19 PostgreSQL lifecycle suites run independently with row and routine modes, including exact keys, comparisons, ordering, rollback and lost COMMIT response. Additional checks cover whole-key admission, complete source evaluation per bounded Run, late-committing lower IDs and retry after downstream rollback.

Serene audits the bound runtime call sites and fixed admission SQL in `src`. The PL/pgSQL body is outside that TypeScript audit: review its ordinary sequential SQL directly, compare each operation against the row reference, and execute it in PostgreSQL regression tests. It has named function parameters, no dynamic EXECUTE, identifier construction or SECURITY DEFINER. Baseline/candidate statement duplication is deliberately retained as experimental reference evidence; do not silently diverge their meanings.

Measurements, audit findings, completed CI links and the fresh Alder review are recorded in `experiments/issue-23`. Missing measurements remain explicit adoption gaps, not evidence of fitness.

### Timeout and retry interpretation

The evaluation's 60-second invocation budget reserves 15 seconds and tests work below 45 seconds; these are explicit assumptions. A complete 10,000-source-row scan still occurs even for a one-key Run. A source statement, lock wait or stored mutation that exceeds the host deadline can therefore defeat any admission cap. If every attempt rolls back before COMMIT, durable throughput is zero and continuing intake grows the backlog indefinitely. This candidate does not hide that case behind automatic retries. Deployment must verify the slowest statement/source and host timeout/cancellation/connection-disposal policy before adoption.

The controlled recovery fixture provides finite-backlog evidence under its measured source, RTT, cap, two-Setting concurrency and low arrival rate. It does not establish catch-up when arrival exceeds measured durable throughput, when the host launches unbounded concurrent retries, or under production contention. Those cases remain rejected/unresolved, rather than being described as recoverable because smaller Runs exist.

## Completed evidence and disposition

[The completed results](../../experiments/issue-23/results.md) include 80 matrix invocations and four RTT/cap recovery cases on PostgreSQL 18.6; Verify passed 298 tests with no skips. The candidate cuts initial/correction calls by one third and no-op calls by one fifth, but was slower in the observed 10,000 × 3 low-latency comparison. Keep it opt-in; there is no general performance promotion.

With a 600-key backlog, approximately 2 keys/s continuing to arrive, two Settings and a neighbor probe, the 5 ms additional-delay cases returned to normal pending levels in about 47 seconds. The cap-250 correction Run took about 34.1 seconds within the illustrative 45-second safety allowance. This demonstrates finite recovery for that controlled envelope, not for arbitrary source sizes/SQL or production arrival rates. Neighbor maxima up to about 335 ms and whole-source memory remain deployment concerns. Large verification snapshots inflate full-matrix memory/DB peaks; the report distinguishes the pre-oracle normal-route measurements from the whole instrumented job.

All SQL audit findings and the fresh Alder review are retained. Production adoption remains unresolved; the default row reference and unbounded behavior are not endorsed for the target serverless workload. Explicit bulk I/O/materialization is the next experiment if the actual deployment envelope rejects bounded routine execution.
