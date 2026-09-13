# Set-based phase candidate: measured disposition

Select **bounded, explicitly authored immutable phases as a reasonable candidate**.
This responds to the reviewability goal, not a claim to beat the ordered worker's
latency. Node now orchestrates directly reviewable set SQL. The prior generic-worker
direction is not extended. Production qualification and other transfer models remain
outside this experiment.

## Reproducible evidence

- Final execution head: `ab48e6829348042ea2b73032805ef78d724220eb`, tested merge
  `27379a1214ce75ceef4abc738c5b82e77fbfd3af`.
- [Final PostgreSQL phase workflow](https://github.com/mk3008/velvet/actions/runs/34781660474):
  both 1,000×1 and 10,000×3 passed, including final numeric/causal review gates.
- [PostgreSQL Verify](https://github.com/mk3008/velvet/actions/runs/34781660465):
  52 CLI + 246 application tests passed; no skipped database regression tests.
- [Earlier same phase implementation](https://github.com/mk3008/velvet/actions/runs/34781475259),
  head `2017ab4f622f7c5ae5cc19b5c07ad02b2caa8f3d`: both cells passed. Later commits
  strengthened test observations, including correcting a test's assumption that the
  maximum sequence ID is current Black. Current identity is verified through Active.
- [Raw archived artifacts](evidence/index.json) retain both large observations and
  final small observation, SHA-256 of uncompressed files, workflow/artifact/head IDs.
  [results.json](results.json) summarizes the final run; `summarize.py` reproduces it.
  The raw `mode: ordered` field is inherited harness terminology; the invoked engine
  is `phaseWork` in `work.mjs`, not `scale_ordered_work`.

Local build/type checks, 52 CLI tests, documentation checks, Serene application
inventory and composition tests passed. Local `pnpm verify` could not start a database
container. The branch was pushed and full Verify ran against PostgreSQL 18 in CI.

## Semantics and SQL boundary

The final differential oracle checks destination, Active, Work, Lineage and Processing,
including hashes and relational references before identity normalization. It covers
initial/no-op/correction, duplicate Dirty Keys, disappearance, asymmetric journal-only
changes, exact numeric values below JavaScript precision, and nullable memo. A text
query through Active separately verifies the exact stored numeric value; JSON.parse
rounding is not used as the exact-numeric oracle.

Authored SQL reads the prior journal's amount for subsequent Links. A key-local
trigger checks Work-before-write, old Active retirement and Red Lineage before
replacement Black, and preceding-Link Processing before later-Link mutation.
Total cross-key observer ordering is deliberately excluded by the independence
contract; preallocation alone is never taken as proof of prior-write visibility.

Tests also pass for silently dropped/rewritten destination rows, later-key downstream
failure with complete snapshot rollback, retry, real COMMIT with lost response,
empty retry, and TEMP cleanup. Composition tests verify original Serene identity,
bound value separation, semicolon subset rejection, CTAS consumption on the same
connection, and commit/rollback cleanup in PostgreSQL. The narrow adapter exception
and separate TEMP/permanent content axis remain visible in [sql-audit.json](sql-audit.json).
The existing Phase 1–5/#19 suite is legacy regression; it does not extend the new
immutable profile to mutable/insert_only, arbitrary mappings or date hooks.

## Calls and route observations

Successful nonempty Runs use **15 + 16 × Links calls**: 31 for one Link and 63 for
three, including transaction/configuration/finalization and explicit validation
statements. The same counts hold for the small correctness runs and large runs.
This replaces row-dependent network calls with Link-dependent phase calls. It does
not imply constant database work, zero scans, or superiority to the old 11-call worker.

Final observations below are seconds, two trials each, without injected RTT:

| Source × Links | Initial | No-op | Mostly no-op | Full correction |
| --- | --- | --- | --- | --- |
| 1,000 × 1 | 0.252 / 0.247 | 0.759 / 0.760 | 0.758 / 0.754 | 1.374 / 1.350 |
| 10,000 × 3 | 13.578 / 6.700 | 4.087 / 3.831 | 56.301 / 3.650 | 78.410 / 80.159 |

The earlier large cell recorded 44.492 seconds for one mostly-no-op observation and
111.101 / 109.081 seconds for full correction. These are retained, not averaged away.
**Unbounded execution fails the illustrative 45-second work allowance.** This is
why the selected candidate admits at most 1,000 Dirty Keys per Run in the evaluated
deployment envelope. No unrestricted invocation guarantee is claimed.

## Bounded recovery envelope

Both observations use 10,000 complete source rows, 10,000 pending Dirty Keys, three
Links, a 1,000-key cap, continuing target intake of 2 keys/s, another Setting sharing
the database/destination, neighbor updates, a fresh primary connection and an added
5 ms delay per client call. Each nonempty Run still materializes all 10,000 source rows.

| Observation | Catch-up | Arrivals during catch-up | Remaining, each Setting | Largest bounded Run, either Setting |
| --- | --- | --- | --- | --- |
| Earlier CI | 62.066 s | 123 | 1 | 11.327 s |
| Final CI | 42.663 s | 82 | 1 | 8.033 s |

Both pass the 180-second evaluation ceiling and 45-second illustrative per-Run work
allowance. Both sustain five subsequent primary steady intervals at ≤5 pending keys.
The final gross durable service observation is 236 keys/s versus target intake 2/s.
These are finite controlled observations, not steady-state production capacities.
Recovery covers an initial backlog; one subsequent bounded correction is sampled,
not a sustained full-correction arrival workload. Whole-source reevaluation per Run
and retry costs remain real.

Final Node peak RSS was 76.1 MiB. Database container observations reached 274.7 MiB
and 186.99% CPU (aggregate across cores); the earlier cell reached about 277.7 MiB and
199.01%. This includes the two-Setting recovery. It is not a matched whole-job cost
comparison against the old worker/routine profile, which has different SQL behavior.

Neighbor latency is variable. Final idle median/p95/max was 1.036 / 90.722 / 157.211 ms;
recovery was 0.818 / 39.464 / 268.467 ms. Earlier recovery median/p95/max was
0.526 / 0.866 / 5.718 ms. The final idle baseline has only 35 samples and is itself
noisy. We cannot attribute all spikes to this executor or claim neighbor non-impact.
No sampled lock waits were seen; sampling is not proof of no waits. Actual neighbor
latency/resource budgets remain a production acceptance requirement.

## Stop here

The narrow composition boundary, ordinary set SQL, preserved required dependency
order, durable failure behavior, bounded recovery and [fresh Alder review](alder-review.md)
support this limited candidate. The observed unbounded durations rule out unlimited
Runs in the assumed budget. No further search for a fastest executor or generic
PL/pgSQL worker is needed for this comment. Apply other Settings only through an
explicit authored profile and its regression checks; retain the existing compatible
executor otherwise. Decision 0012 and AGENTS.md preserve this knowledge for later work.
