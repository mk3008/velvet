# Issue #20 execution evaluation

Analysis/PoC only. Read [Decision 0009](../../docs/decisions/0009-scalable-execution-evaluation.md) for selection, boundaries and staged follow-up. Production executor, public API, Business Design and canonical DDL are unchanged.

## Reproduction

Use Node 22, pinned pnpm/dependencies, PostgreSQL 18 and an account allowed to create/drop an isolated test database:

```sh
pnpm install --frozen-lockfile
pnpm build
mkdir -p tmp
ASHIBA_DB_URL=postgres://user:password@localhost/test node experiments/issue-20/benchmark.mjs
pnpm exec serene-audit experiments/issue-20
pnpm verify
```

The runner creates a UUID-named database, loads canonical DDL, and drops only that database in finally. It never truncates the connection URL's database. Do not use production credentials. Output defaults to `tmp/issue-20-results.json`; override with `VELVET_BENCH_OUTPUT`. The path must have an existing parent directory. The scoped GitHub workflow uploads both JSON and logs even on failure; a partial artifact is not a completed run.

## Measurement boundaries

`benchmark.mjs` invokes the actual compiled `executeTransfer`, not a reimplementation. 1,000/10,000 source rows, 1/3 links to one shared physical Destination (distinct role mappings), 128-byte memo, sequence allocation and generated row keys. This measures link multiplicity, not the effect of distributing writes across three different physical tables/indexes. One source row per Dirty Key, no duplicates; all source rows are eligible. It measures initial insert, unchanged reevaluation, 99% no-op, all-row immutable correction, third-link correction failure and retry. The unchanged and partial reevaluations follow a seeded successful run; new Dirty Keys are registered for every row. The one-link source deliberately still projects all three candidate IDs, exposing that source-owned evaluation does not shrink with enabled links.

Metrics cover executeTransfer only, including Run creation/recovery transactions. `workMs` covers the second BEGIN through COMMIT/ROLLBACK. Setup, Dirty Key intake and assertion queries are excluded. Calls count awaited driver queries, not TCP packets. SQL bytes count submitted UTF-8 text each time; parameter/result bytes count JSON serialization of values/rows, **not PostgreSQL wire bytes**. They are transport/log-volume proxies: array encodings, protocol headers, TLS and packetization differ. JSON measurement adds CPU overhead; times are instrumented end-to-end observations, not pure executor performance. Per-query counts and elapsed timings identify the request mix. No concurrency, injected RTT, peak heap, catalog contention or disk-spill measurement is claimed. Each case is one observational run, without warmup/repetition distributions or production throughput guarantees; the source/run environments are recorded in JSON.

Assertions include inserted/skipped counts, Processing coverage, single source evaluation, downstream error cause, separate failed Run and exact pre/post snapshots of destination/Active/Lineage/Work/Processing/Dirty/succeeded Runs on rollback. Original #19 tests remain the authoritative accounting-shaped three-link ordering/correlation and asymmetric no-op acceptance, included by full verify.

`transport.mjs` is deliberately a **reduced kernel**, not a second executor. It compares bounded (1,000-row) memory JSON batches with PostgreSQL TEMP materialization for exactly the same fixed source, prior row comparisons and changed-row insert sink. Eager variants allocate all source rows; deferred TEMP allocates only rows changed on any link. Data and snapshot are reused across links; counts and shared allocation are asserted. It omits Work Item, Active Black, Red, Lineage, Processing, failed Run, locks/configuration validation, general stored SQL and all model routes. Therefore **do not divide full executor time by kernel time and call it a speedup**. Deferred TEMP deliberately has a different explicit allocation input contract; the current engine cannot substitute it for source-owned SQL automatically.

TEMP checks cover downstream failure rollback, reused-connection cleanup, and server commit followed by a simulated lost response. These are kernel checks; existing runtime tests separately verify guarded failed Run recording. Fixed probe names require this dedicated connection and no overlapping invocation.

## Results and review

Completed on PostgreSQL 18.6 / Node 22.23.2 in [GitHub Actions run 34754006818](https://github.com/mk3008/velvet/actions/runs/34754006818), experiment commit `43c8e57d6d7e8fe67433d8aa0f8ce48232f03999`. [Raw results](results.json) are the unmodified completed artifact (20 executor cases, 24 kernel cases, cleanup/rollback checks). `fsync`/`synchronous_commit` on, shared_buffers 128 MiB, work_mem 4 MiB, temp_buffers 8 MiB. Ubuntu GitHub runner; one client, local Docker PostgreSQL TCP, no simulated latency.

[Full verify](https://github.com/mk3008/velvet/actions/runs/34754006817) succeeded with **183 tests (52 CLI + 131 application), no skips**, plus type/build/document consistency and SQL audit. Local verification separately passed 87 tests with 96 DB tests explicitly skipped because no local PostgreSQL was available; the complete verification claim comes from CI. [Fresh Alder review](alder-review.md) records scope, the fixed cleanup finding and limits.

The measurements support retaining the current source snapshot and targeting owned metadata batching first, without shipping the reduced kernel as an executor. They do not establish the effect of three separate physical destination tables, concurrent runs, or wider source payloads.

### Current executor observations

Times are seconds; volumes are decimal MB of the stated serialization proxies, not wire traffic. “99% no-op” changes 1% of logical rows on every link. Each row is a single sample; no significance or latency percentile claim is made.

| Rows | Links | Scenario | Total s | Work tx s | Calls | SQL MB | Params MB | Results MB |
| ---: | ---: | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| 1,000 | 1 | Initial Black | 2.392 | 2.387 | 6,012 | 1.57 | 0.87 | 0.41 |
| 1,000 | 1 | All no-op | 2.027 | 2.025 | 5,012 | 1.82 | 1.19 | 1.03 |
| 1,000 | 1 | 99% no-op | 2.251 | 2.248 | 5,082 | 1.84 | 1.20 | 1.03 |
| 1,000 | 1 | All Red + Black | 6.183 | 6.181 | 12,012 | 3.24 | 1.98 | 1.10 |
| 1,000 | 3 | Initial Black | 6.206 | 6.204 | 18,012 | 4.69 | 2.62 | 0.68 |
| 1,000 | 3 | All no-op | 5.996 | 5.994 | 15,012 | 5.46 | 3.57 | 2.54 |
| 1,000 | 3 | 99% no-op | 6.019 | 6.017 | 15,222 | 5.50 | 3.59 | 2.54 |
| 1,000 | 3 | All Red + Black | 12.336 | 12.334 | 36,012 | 9.73 | 5.96 | 2.77 |
| 1,000 | 3 | Third-link failure | 0.043 | 0.040 | 43 | 0.01 | 0.01 | 0.53 |
| 1,000 | 3 | Retry Red + Black | 12.201 | 12.199 | 36,012 | 9.73 | 5.99 | 2.78 |
| 10,000 | 1 | Initial Black | 19.244 | 19.241 | 60,012 | 15.63 | 8.85 | 4.10 |
| 10,000 | 1 | All no-op | 17.629 | 17.627 | 50,012 | 18.20 | 12.06 | 10.38 |
| 10,000 | 1 | 99% no-op | 17.530 | 17.528 | 50,712 | 18.34 | 12.14 | 10.39 |
| 10,000 | 1 | All Red + Black | 41.085 | 41.083 | 120,012 | 32.41 | 20.14 | 11.18 |
| 10,000 | 3 | Initial Black | 105.437 | 105.434 | 180,012 | 46.89 | 26.58 | 6.81 |
| 10,000 | 3 | All no-op | 60.063 | 60.061 | 150,012 | 54.60 | 36.20 | 25.63 |
| 10,000 | 3 | 99% no-op | 53.241 | 53.239 | 152,112 | 55.03 | 36.44 | 25.65 |
| 10,000 | 3 | All Red + Black | 125.448 | 125.446 | 360,012 | 97.23 | 60.56 | 28.01 |
| 10,000 | 3 | Third-link failure | 0.297 | 0.293 | 43 | 0.01 | 0.01 | 5.30 |
| 10,000 | 3 | Retry Red + Black | 123.507 | 123.504 | 360,012 | 97.23 | 60.85 | 28.16 |

The 10,000 × 3 all-no-op case spends 15.59 s in Active lookup, 11.87 s in Work Item insertion, 9.77 s in Processing, 9.41 s in JSONB comparison and 7.99 s in stored reassessment. These are instrumented awaited-query timings, not a split between network and server CPU. Source evaluation is only 0.049 s and pending selection 0.061 s; neither source SQL computation nor snapshot materialization is the principal measured cost in this fixture. Active/Work/Processing alone account for about 37.23 s of the 60.06 s run. A bare Active prefetch will leave comparison and history writes; it is not a complete scalability solution.

The 3-link initial run took 5.48× the 1-link initial run at 10,000 rows, despite a nearly 3× query-count ratio. Do not extrapolate constant seconds/row or attribute the residual to one cause without repeated runs, plans and server metrics. The benchmark establishes request amplification and its expensive route mix, not an isolated proof that network latency dominates.

Failure is intentionally at the third link of the **first** Dirty Key: its 43 calls are an early rollback case, not worst-case failure after all 30,000 writes. The source still evaluates all 10,000 rows before that failure. Full pre/post state comparison is outside measured elapsed time. Retry runs all pending work and succeeds.

Every measured source evaluation consumes N allocation tokens and 3N candidate row IDs. All-no-op consumes those same candidates while writing zero Blacks. Full immutable correction additionally consumes N×L Red row IDs; the third-link failure consumes 3 Red candidates, including the rejected trigger write, and none are reclaimed. This is accepted sequence behavior, not loss of business identity.

### Reduced transport/allocation kernel

Do not compare these millisecond values directly with full executor seconds: the kernel excludes the lifecycle work listed above.

| Rows | Links | Changed | Memory batch ms / calls | Eager TEMP ms / calls | Deferred TEMP ms / calls | Eager → deferred allocations |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 1,000 | 1 | 100% | 9.27 / 4 | 11.21 / 6 | 9.80 / 7 | 1,000 → 1,000 |
| 1,000 | 1 | 1% | 12.30 / 4 | 6.07 / 6 | 6.23 / 7 | 1,000 → 10 |
| 1,000 | 3 | 100% | 32.03 / 6 | 15.70 / 8 | 17.93 / 9 | 1,000 → 1,000 |
| 1,000 | 3 | 1% | 11.78 / 6 | 5.23 / 8 | 5.03 / 9 | 1,000 → 10 |
| 10,000 | 1 | 100% | 91.26 / 13 | 48.28 / 6 | 61.70 / 7 | 10,000 → 10,000 |
| 10,000 | 1 | 1% | 63.74 / 13 | 16.31 / 6 | 14.56 / 7 | 10,000 → 100 |
| 10,000 | 3 | 100% | 237.25 / 33 | 126.12 / 8 | 145.84 / 9 | 10,000 → 10,000 |
| 10,000 | 3 | 1% | 143.32 / 33 | 25.95 / 8 | 22.94 / 9 | 10,000 → 100 |

For 10,000 × 3 and 1% changed, memory batches submit 5.96 MB of parameter proxy and receive 1.85 MB of result proxy; fixed TEMP queries submit only tiny scalar parameters and return no row payload. Eager TEMP is 25.95 ms vs 143.32 ms for memory batches in this reduced case (an observed 5.52× kernel ratio, not an executor gain). On 1,000 × 1 all-dirty rows, eager TEMP is slower than memory batching (11.21 vs 9.27 ms): TEMP is not universally faster. Single observations are not statistical significance tests.

Deferred TEMP reduces allocations from 10,000 to 100 for 1% changed, sharing one token across new writes per source row. Its measured 22.94 vs 25.95 ms does not establish that sequence calls were a major time cost: source types/materialization/update plans differ and no repetitions isolate that effect. The strong result is avoided unused allocation, with a new explicit allocation contract—not a demonstrated reason to complicate today's engine. All-dirty deferred TEMP adds work and is slower than eager TEMP at 10,000 × 3 (145.84 vs 126.12 ms).

The kernel validates row count/shared allocation plus commit/rollback cleanup. It does not evaluate TEMP catalog contention, buffer/spill behavior, source changes from another session, asymmetric business routes or failure-recording Runs. Those limits are reasons to keep TEMP as a later measured candidate rather than adopt it now.

## SQL construction review

| Inventory | Ordinary | Review-required | Violation classifications |
| --- | ---: | ---: | ---: |
| Existing `src` (full verify) | 19 | 45 | 0 |
| `experiments/issue-20` | 20 | 39 | 2 |

The two experiment STRING_CONSTRUCTION findings are isolated CREATE/DROP DATABASE lifecycle statements whose identifier is generated from a UUID; these fall outside executable application SQL under the existing Rules, and remain visible in audit output. They are not business-query exemptions. Named Serene binding reaches the driver through local helpers; stored statement payloads are executed by the existing trusted binder. Remaining review-required boundaries include canonical DDL loading, driver/control probes and helper calls; these were manually inspected, not treated as ordinary or suppressed. `serene-audit experiments/issue-20` therefore exits nonzero for the visible lifecycle classifications; this is a reviewed limitation, not an unexplained clean gate. No rule or audit configuration is changed.
