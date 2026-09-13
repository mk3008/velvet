# Issue #23 execution candidate evaluation

See [Decision 0010](../../docs/decisions/0010-bounded-execution-candidate.md). The candidate is opt-in. Install `db/runtime/execute-transfer-metadata.sql` explicitly after canonical DDL, then select `metadataMode: 'routine'`; use `maxDirtyKeys` for bounded admission. These routines perform ordinary owned SQL sequentially; they do not transform stored source/destination SQL.

## Reproduce

Use Node 22, locked dependencies, and PostgreSQL 18 with permission to create an isolated test database. Never supply production credentials.

```sh
pnpm install --frozen-lockfile
pnpm build
mkdir -p tmp
VELVET_MODE=routine VELVET_ROWS=10000 VELVET_LINKS=3 ASHIBA_DB_URL=postgres://... node experiments/issue-23/benchmark.mjs
```

The Issue 23 workflow runs row/routine × 1,000/10,000 × 1/3 on separate PostgreSQL service runners. Each cell repeats initial Black, all no-op, 99% no-op and correction twice; three-link cells also verify downstream rollback/retry. It uses the actual executor and the same fixture shape as #20. Source rows have a 128-byte memo and sequence-generated destination keys. SQL/parameter/result byte counters are serialization proxies, not wire bytes. Timing includes instrumentation. Two repetitions are observations, not reliable population tail percentiles. Cross-job comparisons have runner variance.

Per-query and 10 ms sampling capture RSS, heap, external/ArrayBuffer peaks, plus process CPU, GC events, parameter sizes and work transaction/connection occupancy. Sampled peaks can miss transients. RSS covers the whole benchmark process; configuration/connection setup is excluded from measured invocation time and must be added for a real cold-start deployment. JSON serialization/GC are included in time; GC callbacks can cross measurement boundaries. DB statistics report buffers, tuple activity, WAL, I/O and temp spill counters; these are not isolated DB CPU. The workflow separately samples PostgreSQL container CPU/memory with `docker stats`. Its samples are shared-job evidence, not exact per-query attribution.

`VELVET_RTT_MS` injects extra waiting per awaited driver call. It is an explicit latency sensitivity experiment, not measured network RTT or real remote placement. A 60-second invocation / 45-second work safety budget is an illustrative evaluation assumption, not a chosen provider limit or agreed production budget.

## Status

See the completed-cell evidence in [results](results.json) and the [fresh review](alder-review.md). Production adoption remains unresolved until the target source width/cardinality, timeout, memory tier, arrival rate and shared-DB/concurrency budget are verified. Reduced request counts alone are insufficient. Raw workflow artifacts retain measurements and failures; an artifact with `completed: false` is not a successful evaluation.

## Recovery matrix

`VELVET_MODE=routine VELVET_MAX_DIRTY=50 VELVET_RTT_MS=5 node experiments/issue-23/recovery.mjs` uses the same isolated setup. CI also tests a cap of 250 and an added 1 ms delay. Every Run still evaluates all 10,000 source rows. The observed backlog has 600 Dirty Keys (modeled as 300 seconds at a target 2 keys/s), with three links, an initial downstream failure, continuing producer intake, concurrent bounded Runs of a second Setting sharing the physical DB/destination, and an unrelated update probe. The 60/300/600-second backlog table is arithmetic modeling; those are not three elapsed outages. Recovery must reach at most five pending keys, followed by five steady intervals and a bounded correction Run. Every measured Run must fit the illustrative 45-second safety budget; this does not enforce or establish a production host deadline.

The producer sleeps 500 ms **plus** its insertion time: 2 keys/s is a target, not the exact observed rate. Report actual arrivals during catch-up. No automatic retries or unconstrained recovery concurrency are introduced; this fixture represents host-controlled concurrency of two Settings and one invocation per Setting. Recovery process memory/CPU, sequence consumption, WAL and DB counters aggregate both Settings and probes. Instrumented calls/source counts are only for Setting 1. Activity sampling records wait types and transaction ages, not exact lock-acquisition/release timestamps. Five steady intervals and one workload shape do not establish long-term capacity or production tail latency.

The sequential routine candidate does not remove the row-sized stored SQL floor. If the required arrival/width/latency exceeds observed recovery capacity, proceed to an explicit bulk-I/O/materialization contract; do not claim this experiment fits that deployment.

## SQL review scope

At the current candidate, `pnpm audit:sql` reports **23 ordinary / 49 review-required / 0 violation** findings. The four new fixed SQL definitions (whole-key admission and three routine calls) are ordinary; generic executor dispatch and trusted stored statements remain review-required. The review-required paths were not suppressed.

`pnpm exec serene-audit experiments/issue-23` reports **9 ordinary / 45 review-required / 2 violation** findings. The two violations are the isolated fixture's CREATE/DROP DATABASE identifier concatenation: the name consists only of a fixed prefix and an internally generated UUID stripped to hex, never runtime caller data. They remain visible and are reviewed as lifecycle-DDL exceptions, as in #20. The harness's static fixture/probe SQL and stored configuration are directly inspectable and exercised in CI; they are not the shipped executor's SQL construction path.

The fixed PL/pgSQL bodies in `db/runtime/execute-transfer-metadata.sql` are outside the TypeScript auditor and require direct review. All data comes through named function parameters, with explicit JSON member names and typed casts. Relations are fully qualified, rights are SECURITY INVOKER, and there is no dynamic EXECUTE. This is an explicit review path, not an ordinary Serene classification for SQL that Serene did not examine. [Fresh Alder review](alder-review.md) records the independent review and fixed findings.

## Operational boundaries

A failed execution still exposes its Run ID, original cause and recovery errors, and failed Run state is recorded separately after rollback. This candidate does not add a structured failing-link/phase/configuration-version field; incident reconstruction can still require the caller's logs and retained configuration. COMMIT-response ambiguity remains deliberately distinguishable from a proven rollback. No automatic retry is safe merely because the client threw.

The optional routines are deployment assets outside canonical table DDL. Existing deployments can keep the row mode unchanged; using routine mode requires explicitly installing the reviewed SQL file with the existing schema owner's normal deployment process. No sequence expression is extracted or deferred, and configuration registration executes no new statements for optimization.

The unrelated-work probe uses its own PostgreSQL connection but shares the benchmark's Node event loop and runner. Its latency includes app scheduling/GC and DB work; a tail spike cannot be attributed to PostgreSQL alone. Docker CPU observations include setup and all job work; terminal refresh frames may repeat samples, so their mean is not a time-integrated CPU cost. Peak CPU/memory and raw artifacts are retained for comparison. The summary parser strips terminal control sequences; the original workflow logs' empty CPU summary was a parser defect, not zero DB CPU.

## Completed evidence

[Measured results and conclusions](results.md) summarize all 12 successful cells (80 unbounded matrix invocations plus the four recovery cases) and the 298-test PostgreSQL Verify result. [The result index](results.json) links losslessly gzip-compressed original per-job result JSON and decoded Docker observations; decompressed JSON hashes make provenance checkable. Container terminal control characters were removed without changing observation values. The summary can be reproduced with `python experiments/issue-23/summarize.py <downloaded-artifact-directory>`.
