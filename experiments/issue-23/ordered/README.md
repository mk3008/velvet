# Ordered PostgreSQL typed-profile candidate

See [Decision 0011](../../../docs/decisions/0011-structural-execution-priority.md) for why this structural candidate takes priority over further metadata tuning and when evaluation stops.

This experiment implements the complete immutable lifecycle for one explicit text-key profile. It freezes whole-key pending membership, materializes the complete typed source in PostgreSQL once, and performs Dirty Key then Link operations sequentially in a single atomic work transaction. The full source is not transferred to Node. The successful driver protocol has 11 calls independent of row count; PostgreSQL statements and history still grow with work size.

`profile.sql` is explicit, inspectable authored SQL. Both execution paths use the same `scale_snapshot`, `scale_insert`, `scale_red` and `scale_compare` functions. `evaluate.mjs` validates the exact supported configuration, keeps the normal Run/failure transaction boundary, and invokes the ordered worker once. It does not translate arbitrary stored SQL, infer relation/predicate rewrites, or translate JavaScript logical-key callbacks. Functions are installed only in the disposable test database, not at registration.

This profile supports immutable transfers with textual logical/destination keys, numeric amounts, nullable text memo, shared allocation and one to three ordered links. Comparison excludes exactly `row_id` and `allocation`. Other metadata/operation profiles are rejected. It is not a general public executor API; existing row/routine execution remains the compatibility path for Phase 1–5 and arbitrary SQL. Those suites passing does not establish this profile's compatibility with mutable or insert_only workloads.

## Reproduce

Use the `Issue 23 structural candidate` workflow, or Node 22, locked dependencies and an isolated PostgreSQL 18 database with CREATE DATABASE permission:

```sh
pnpm install --frozen-lockfile
pnpm build
mkdir -p tmp
ORDERED_MODE=ordered VELVET_ROWS=10000 VELVET_LINKS=3 ORDERED_RTT=5 \
ASHIBA_DB_URL=postgres://... node experiments/issue-23/ordered/evaluate.mjs
```

The paired comparison uses `ORDERED_MODE=routine` on the same canonical typed functions, without injected delay for the four normal routes. The new fixed-function profile changes fixture execution overhead compared with old raw stored SQL, so compare this pair directly rather than attributing cross-harness differences to the worker alone. Two observations do not establish population tails.

Before timing, a small differential oracle compares complete destination, Active, Work, Processing and Lineage state (excluding timestamps only), plus actual writes and the metadata visible before each write. Subsequent checks exercise duplicates, a later-key downstream failure with full rollback, retry, lost COMMIT, empty retry, disappearance and TEMP cleanup. The large matrix does not build full-state JSON oracles.

The 10,000×3 ordered case then evaluates 10,000 pending keys, concurrent continuing producer intake, two Settings and an unrelated update probe on separate connections (fresh transfer backends), followed by five primary-Setting steady intervals and bounded correction. A 1,000-key cap and 5 ms added delay are fixed evaluation assumptions. Background failures propagate; clients and loops are cleaned up on error. The shared Node event loop remains a neighbor-latency confounder.

Timing excludes process/connection startup and profile installation. Node RSS/heap/external peaks include harness overhead; 10 ms samples may miss transients. Per-Run DB cumulative-stat differences may flush asynchronously and include concurrent work. WAL is database-cluster activity over the interval, not isolated query cost. Docker observations cover the full job, including setup/oracles; temp_files/temp_bytes count spills, not every byte stored in a TEMP relation. No zero I/O inference follows from absent timing counters. The script records raw measurements; successful completion requires every assertion, not just artifact creation.

## SQL review

Run `pnpm audit:sql` for unchanged shipped paths and `pnpm exec serene-audit experiments/issue-23/ordered` for the new harness. Imported fixed queries and driver wrappers remain review surfaces. The SQL-language/PLpgSQL profile is outside Serene's TypeScript scope and receives direct review plus PostgreSQL execution. Named SQL/function parameters bind values; string construction inside the profile makes JSON key/hash **values**, not executable SQL. There is no dynamic EXECUTE. The parent benchmark's UUID-only CREATE/DROP DATABASE exceptions remain unchanged and visible.

The [fresh Alder review](alder-review.md) records the corrected findings and audit scope. The harness audit has 10 ordinary / 60 review-required / 0 violation findings. The [measured result](results.md) records the candidate selection, adverse observations and remaining production limits. Reproduce numerical summaries with `python experiments/issue-23/ordered/summarize.py <extracted-artifact-directory>`.
