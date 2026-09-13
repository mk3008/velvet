# Measured results and deployment conclusion

The opt-in routine candidate reduces driver calls, and bounded Runs recover the tested finite backlog. It is not a universal serverless production approval. The source snapshot remains complete/in-memory; row-sized stored SQL and shared-resource tails remain.

Evidence: [PostgreSQL Verify](https://github.com/mk3008/velvet/actions/runs/34758561470) passed **298 tests (52 CLI + 246 application), no skips**, type/build/document checks and SQL audit on `118d046e15afffa4718cb70b86e625377eec1516`. [Evaluation](https://github.com/mk3008/velvet/actions/runs/34758561474) uses that execution tree. [Results/index](results.json) references unmodified result files with hashes and decoded original Docker observations. The final summary parser fix changes post-processing only and was checked against those original files; the execution/harness is unchanged.

## Driver calls and invocation duration

Seconds are means of two observed Runs per cell, not statistically established speedups. Independent runners, changing table statistics/autovacuum and instrumentation can affect durations. Calls are exact driver awaits, including the 12 fixed successful-run calls. The source has a 128-byte memo. No injected RTT in this matrix.

| Rows | Links | Route | Row calls | Routine calls | Row seconds | Routine seconds |
| ---: | ---: | --- | ---: | ---: | ---: | ---: | ---: |
| 1,000 | 1 | initial | 6,012 | 4,012 | 1.824 | 2.014 |
| 1,000 | 1 | all_no_op | 5,012 | 4,012 | 1.689 | 1.960 |
| 1,000 | 1 | mostly_no_op | 5,082 | 4,052 | 1.655 | 2.100 |
| 1,000 | 1 | all_changed | 12,012 | 8,012 | 4.778 | 5.862 |
| 1,000 | 3 | initial | 18,012 | 12,012 | 7.262 | 6.146 |
| 1,000 | 3 | all_no_op | 15,012 | 12,012 | 6.563 | 6.186 |
| 1,000 | 3 | mostly_no_op | 15,222 | 12,132 | 6.814 | 6.583 |
| 1,000 | 3 | all_changed | 36,012 | 24,012 | 15.547 | 14.755 |
| 10,000 | 1 | initial | 60,012 | 40,012 | 29.792 | 26.332 |
| 10,000 | 1 | all_no_op | 50,012 | 40,012 | 31.864 | 32.954 |
| 10,000 | 1 | mostly_no_op | 50,712 | 40,412 | 23.094 | 21.094 |
| 10,000 | 1 | all_changed | 120,012 | 80,012 | 49.864 | 45.386 |
| 10,000 | 3 | initial | 180,012 | 120,012 | 70.492 | 93.025 |
| 10,000 | 3 | all_no_op | 150,012 | 120,012 | 58.412 | 81.439 |
| 10,000 | 3 | mostly_no_op | 152,112 | 121,212 | 46.221 | 52.917 |
| 10,000 | 3 | all_changed | 360,012 | 240,012 | 109.931 | 124.483 |

Ignoring fixed overhead, initial/correction calls fall by one third and no-op by one fifth. This is not an O(links) executor: a 10,000 × 3 unbounded no-op still requires 120,012 calls; correction requires 240,012. At an assumed extra 5 ms/call those waits alone are 600/1,200 seconds (arithmetic, not measured full-Run RTT durations). Unbounded use is not accepted for the illustrative one-minute runtime.

Low-latency durations do not always improve: for 1,000 × 1 and 10,000 × 3, routine initial/unchanged/correction were slower in these observations despite fewer calls. The improvement claim is request reduction and tested bounded recovery, not a general localhost CPU/time improvement. No provider prices, allocated-memory cost or isolated causal speedup are inferred.

## Memory and PostgreSQL observations

Peaks are measured whole-process RSS, not allocated serverless memory or per-invocation attribution. In recovery they include both Settings in one Node process. The full-state rollback oracle can dominate both Node and PostgreSQL memory: the failure/retry samples retain large verification snapshots and are not clean executor memory measurements. The first-four-route peak below precedes that oracle. Container peaks include fixture setup/background/oracle work and are not exact per-Run DB CPU; CPU percentage may exceed 100% across cores. Terminal redraw frames can repeat samples. Zero spill counts concern this fixture only; `blk_*_time` counters were not enabled and must not be interpreted as zero I/O latency.

| Cell | First four routes RSS MB | Whole-process peak RSS MB | Whole-job DB peak MB | Peak DB CPU % | Diagnostic temp bytes |
| --- | ---: | ---: | ---: | ---: | ---: |
| recovery-1-250 | 160.9 | 162.2 | 85.6 | 55.70 | 0 |
| recovery-1-50 | 160.2 | 206.8 | 82.8 | 53.22 | 0 |
| recovery-5-250 | 148.5 | 149.6 | 88.2 | 27.46 | 0 |
| recovery-5-50 | 146.7 | 154.6 | 89.1 | 20.09 | 0 |
| routine-1000-1 | 100.5 | 120.7 | 70.5 | 79.00 | 0 |
| routine-1000-3 | 129.6 | 267.3 | 534.1 | 110.99 | 0 |
| routine-10000-1 | 184.3 | 187.6 | 183.0 | 119.41 | 0 |
| routine-10000-3 | 210.7 | 1215.7 | 4535.5 | 143.05 | 95,995,296 |
| row-1000-1 | 100.3 | 119.2 | 67.7 | 70.43 | 0 |
| row-1000-3 | 131.4 | 223.9 | 641.8 | 92.47 | 0 |
| row-10000-1 | 196.5 | 196.5 | 195.0 | 121.15 | 0 |
| row-10000-3 | 229.2 | 1211.8 | 5216.2 | 108.08 | 82,845,360 |

For recovery rows, the first-four column simply covers the first four recorded Runs, rather than four normal matrix routes; the whole-process peak is the relevant aggregate. The large matrix oracle inflated whole-job Node RSS to about 1.2 GB and DB container peaks to 4.5–5.2 GB. Do not attribute those peaks directly to the executor. Pre-sampling flush requests reduce contamination but asynchronous statistics/oracle activity can still affect DB deltas; these are diagnostics, not isolated per-invocation resource accounting.

Per-trial buffer/cache, tuple, WAL, app CPU, GC, serialized bytes and work-transaction data remain in the result files. Large tuple/buffer counts show that reducing calls does not automatically reduce database work. Background activity and changing statistics limit causal attribution; this is not an EXPLAIN-based optimization or proof that the shared database can sustain arbitrary concurrency.

## Finite backlog and continuing arrivals

All four cases use 10,000 source rows, three links, a 600-record backlog after an injected downstream failure, target intake of 2 Dirty Keys/s, a concurrent independent Setting on the same DB/physical destination, and a neighbor update probe. Every bounded work transaction remains atomic and every Run evaluates the entire source once. Each case reaches at most five pending records, then observes five steady intervals. The final bounded correction sample can include newly arrived initial inserts.

| Added wait per call | Cap | Catch-up seconds | Arrivals during catch-up | Observed arrival/s | Gross processed keys/s | Longest measured Run s | Peak RSS MB |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 1 ms | 50 | 14.74 | 29 | 1.97 | 42.54 | 2.13 | 206.8 |
| 1 ms | 250 | 14.96 | 29 | 1.94 | 42.03 | 11.29 | 162.2 |
| 5 ms | 50 | 47.03 | 92 | 1.96 | 14.61 | 6.59 | 154.6 |
| 5 ms | 250 | 46.81 | 93 | 1.99 | 14.74 | 34.09 | 149.6 |

The largest tested cap is 250 keys/750 key-link pairs, not a proven absolute maximum. At 5 ms added delay its longest measured Run is about 34.1 seconds, inside the explicit 45-second safety budget for an assumed 60-second invocation. The smaller cap makes more complete source evaluations and does not necessarily minimize RSS or total recovery cost. At 5 ms, observed gross throughput is about 14.6–14.7 keys/s against approximately 2/s arriving; the finite backlog declines rather than growing in this experiment. The 60/300/600-second outage projections (120/600/1,200 keys at 2/s) are arithmetic; only the 600-key backlog is exercised.

Neighbor median/p95 remained low, but recovery maxima reached roughly 76–335 ms; this does **not** establish absence of shared-resource harm. The neighbor uses a separate DB connection but shares the Node event loop, so GC/scheduling and DB effects are not separated. Activity sampling observed no lock-wait samples, not proof that no short waits occurred. Both Settings progressed within the safety budget, with no global mutex. Host concurrency above two and independent host/process placement remain untested.

## Adoption boundary

The experiment supports a reviewable opt-in mechanism and recovery under the stated workload. It does not supply a scheduler, global limiter, automatic retry policy, hard wall-clock cancellation or a memory-bounded source. If source evaluation or one stored statement exceeds the host lifetime, smaller admission alone cannot recover; repeated timed-out atomic Runs can make zero durable progress. Likewise arrivals exceeding effective throughput cannot be drained. Production adoption remains unresolved until actual source width/cardinality, slow-query/lock behavior, memory allocation, network placement, neighbor tail tolerance and host admission/retry policy are verified. If those reject the candidate, explicit bulk stored I/O/materialization is still required; no semantic weakening or automatic SQL rewrite is justified.
