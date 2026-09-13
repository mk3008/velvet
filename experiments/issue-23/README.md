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

CI measurements and review are in progress. Production adoption remains unresolved until the target source width/cardinality, timeout, memory tier, arrival rate and shared-DB/concurrency budget are verified. Reduced request counts alone are insufficient. Raw workflow artifacts retain measurements and failures; an artifact with `completed: false` is not a successful evaluation.
