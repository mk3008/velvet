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
