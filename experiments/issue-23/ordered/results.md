# Structural candidate result

**Select the bounded, ordered PostgreSQL worker as a reasonable candidate for the explicit immutable typed profile. Stop candidate search here.** The preceding metadata-routine experiment remains intermediate evidence, not the resolution of request amplification. General replacement and production qualification remain separate from this supported-profile result.

Measured code: `4ebc6503d46aa61d6abf3151eb100087618bdb3e`; Actions tested merge `40569a3a6c85f6759adcc7ce1385dda507f2a29d`. [Structural evaluation](https://github.com/mk3008/velvet/actions/runs/34762906972) and [PostgreSQL Verify](https://github.com/mk3008/velvet/actions/runs/34762906806). Verify passed 52 CLI + 246 application tests, 298 total, without skips, plus type/build/docs/SQL audit. The new profile has its own differential and failure checks; the old suite is not represented as proof of mutable/insert_only support in this profile.

## Calls and normal-route observations

The same typed source/destination functions are used by both the routine reference and ordered worker. Successful worker calls are always **11 per Run**, including transaction/configuration/finalization calls. There is no per-row Node query loop or full source transfer to Node. Internal PostgreSQL statements still grow with rows×links.

At 10,000×3, the routine protocol has 120,012 initial/no-op calls, 121,212 mostly-no-op calls and 240,012 correction calls. The worker has 11 for each. With K=1,000 admitted keys and three links, the routine initial protocol alone would incur about 60 seconds of extra waiting at the assumed 5 ms/call; the worker's 11 calls add about 55 ms. This is call-count arithmetic, not a measured physical RTT or a promise about SQL duration.

| Rows × links | Route | Routine seconds (two observations) | Ordered seconds (two observations) | Driver calls: routine → ordered |
| --- | --- | ---: | ---: | ---: |
| 1,000 × 1 | initial | 2.119 / 1.912 | 0.549 / 0.542 | 4,012 → 11 |
| 1,000 × 1 | all_no_op | 2.012 / 1.944 | 0.492 / 0.476 | 4,012 → 11 |
| 1,000 × 1 | mostly_no_op | 2.175 / 2.103 | 0.617 / 0.644 | 4,052 → 11 |
| 1,000 × 1 | correction | 6.024 / 5.982 | 2.610 / 2.622 | 8,012 → 11 |
| 10,000 × 3 | initial | 45.713 / 37.396 | 30.734 / 15.316 | 120,012 → 11 |
| 10,000 × 3 | all_no_op | 37.952 / 38.128 | 29.580 / 10.266 | 120,012 → 11 |
| 10,000 × 3 | mostly_no_op | 38.516 / 37.781 | 76.766 / 10.502 | 121,212 → 11 |
| 10,000 × 3 | correction | 92.631 / 92.039 | 30.978 / 30.786 | 240,012 → 11 |

Two observations are retained individually. Do not hide first-observation costs by presenting only the warmer result. In particular, the ordered 10,000×3 mostly-no-op observations were **76.77 s and 10.50 s**; the first exceeds the illustrative 45-second work allowance and recorded about 11.3 MiB of temporary spill. This rejects *unbounded* use of that case within the assumed allowance. It does not invalidate the separately tested bounded recovery case. The large mostly-no-op mean was 43.63 s for the worker versus 38.15 s for the routine reference, so the candidate is not uniformly faster at low latency. The cause of the large variance was not isolated; catalog/planning/cache/maintenance and runner differences must not be asserted as established causes.

The profile comparison changes fixture execution overhead relative to the original raw-SQL #20/#23 benchmark. Use this same-profile pair for duration comparison. The old 600-key recovery and new 10,000-key recovery are different loads, not a controlled speedup ratio.

## Decisive recovery case

Assumptions: 10,000 complete source rows with 128-byte memo, 10,000 pending keys, target continuing intake 2 keys/s, three links, two independent Settings sharing the physical DB/destination, an unrelated update probe, a 1,000-key cap and **additional deterministic 5 ms per driver call**. The primary and independent transfer connections start fresh. Connection establishment/process startup remain outside execution timings.

- Both Settings reached **0 pending keys** after **18.329 seconds** of catch-up; 36 keys arrived during catch-up. Primary gross completed rate was about **547.5 keys/s**, including initial backlog and continuing intake, not a universal sustained capacity claim.
- Each Setting made 11 bounded catch-up Runs. The primary used 121 driver calls across catch-up. Every bounded Run reported all 10,000 source rows; full source scanning/allocation is deliberately repeated per Run. No cross-Run snapshot reuse or deferred allocation was introduced.
- Primary catch-up Runs took about **0.203–1.800 s**; the independent Setting's maximum was **1.831 s**. The first failed attempt on the fresh primary connection took **0.187 s** and retained all pending keys.
- Five subsequent steady intervals kept primary pending work at or below five keys. These intervals exercise the primary Setting; the independent Setting is evaluated through catch-up.
- A separately seeded bounded correction took **3.013 s**, the largest measured bounded execution. This fits the illustrative **45-second work allowance** inside a 60-second invocation assumption. The run then leaves the deliberately seeded remainder pending; it is not another completed full-backlog drain.
- The final catch-up duration also passes the explicit 180-second experiment ceiling. This is an evaluation bound, not an owner-approved recovery SLO or a provider maximum.

A fixed per-Run call count does not eliminate the need for admission bounds: internal SQL, complete source evaluation and locks still take time. Conversely, admission bounds alone did not solve row-oriented aggregate transport cost. The candidate combines both properties without partial work commits.

## Application and shared-DB observations

The same-profile routine normal-route RSS reached 224.5 MiB at 10,000×3. For the 10,000×3 ordered job, sampled Node RSS peaked at **69.1 MiB** overall and **67.6 MiB** during catch-up. This includes harness/history of measurements and all its connections, not allocated serverless memory or a billed amount. Sampling can miss transients. The source snapshot is retained as a typed TEMP relation in PostgreSQL rather than returned as a Node Map.

Neighbor observations on independent connections:

| Phase | Samples | Median | p95 | Maximum |
| --- | ---: | ---: | ---: | ---: |
| Idle | 52 | 0.592 ms | 1.556 ms | 1.967 ms |
| Recovery | 878 | 0.711 ms | 1.490 ms | 12.411 ms |
| Steady | 295 | 0.557 ms | 0.839 ms | 3.693 ms |
| Bounded correction | 149 | 0.590 ms | 0.999 ms | 2.158 ms |

This representative probe did not show sustained tail degradation or an inability to make progress during recovery. Its recovery maximum did increase. The Node event loop/runner is shared, so neither that spike nor the small p95 difference can be attributed solely to PostgreSQL. There is no agreed production neighbor SLO; these are comparative observations supporting the limited candidate decision, not a resource-isolation guarantee.

The ordered job's PostgreSQL container peaked at **214.44% CPU** (multiple cores) and about **278 MiB** memory across setup, oracles, normal routes and recovery. These are sampled whole-job maxima, not CPU-seconds, time-integrated cost or per-query memory. Recovery observations recorded no lock waits or deadlocks; sampling absence is not proof that no waits occurred.

Same-profile normal-route WAL remains broadly comparable: initial routine 112.2/117.3 MiB versus ordered 112.0/117.5 MiB; correction routine 234.5/234.6 MiB versus ordered 234.5/243.2 MiB. The worker preserves history writes rather than eliminating their storage cost. Other counters and both observations are retained in the result JSON. The routine container peaked at about 219.3 MiB and 141.92% CPU, but only the ordered job includes the two-Setting recovery phase, so whole-job maxima are not a matched per-route cost comparison.

Primary catch-up intervals observed about **238.9 MiB WAL**, 7.40 million buffer hits and 428 buffer reads. They include concurrent work and asynchronous statistics flush effects; do not interpret them as isolated primary-Setting costs or sum nested interval accounting into a total. Recovery spill counters were zero, but TEMP relation storage is not equivalent to `temp_files`/`temp_bytes`. Catalog/ANALYZE work, relation buffers and row-sized metadata/mutations remain real DB costs. The unbounded mostly-no-op spill and duration outlier remain visible above.

These observations provide no concrete reason to reject the bounded profile under this controlled load. Therefore another memory-bulk/TEMP/set-based tournament would have low decision value for the owner's sufficiently-good goal. Explicit set-based operations remain a next option only if a real supported workload rejects this profile's remaining DB work or materialization cost.

## Correctness and scope

The profile's small differential oracle agrees with the existing row executor on complete destination/Active/Work/Lineage/Processing state, excluding timestamps only. An enabled test trigger records actual write order and visible metadata before each write; those records also agree. This covers Work-before-write, Red retirement/Lineage before new Black, and Processing before subsequent work in the exercised routes.

Further checks pass for duplicate history, missing source, last-link failure on a later key with complete rollback, retry, separately durable failed Run, lost successful COMMIT response, empty retry and TEMP cleanup after success/failure. Source cardinality is asserted in bounded recovery, including nonpending source rows. [Fresh Alder review](alder-review.md) records the corrected findings and supported-profile disposition.

The worker accepts only its explicitly authored immutable text-key profile, with exact mapping/column/exclusion/SQL entrypoint checks. It does not transparently support arbitrary stored SQL, JavaScript key resolvers, mutable, insert_only, posting-date hooks or every #19 configuration. Those compatible existing paths are unchanged. Functions are trusted deployment definitions and can themselves change; validating wrapper SQL is not an immutable version record of function bodies. The candidate is kept in the experiment, not silently exposed as a general runtime API.

Actual deployment qualification still needs its own source widths/cardinalities, memory tier, real network/startup allowance, slow SQL/lock behavior and shared-DB budget. These limits do not require indefinite optimization of this already-supported profile. No default promotion, merge or release was performed.

## Reproduce and audit

See [README](README.md), [Decision 0011](../../../docs/decisions/0011-structural-execution-priority.md) and the workflow. `python experiments/issue-23/ordered/summarize.py <artifact-directory>` reproduces the numerical summary from extracted artifacts. [results.json](results.json) contains observations and resource summaries; [evidence/index.json](evidence/index.json) links gzip-compressed original result/CPU files with decompressed SHA-256 hashes and workflow provenance.

The ordered harness audit is 10 ordinary / 60 review-required / 0 violation, shipped src 23 / 49 / 0. Direct review covers SQL-language/PLpgSQL outside Serene. The parent fixture's two UUID database-lifecycle exceptions remain visible. No review-required finding or adverse measurement was suppressed.
