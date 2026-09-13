# Prioritize structural reduction of client calls

## Reassessment

Responds to [PR #24's review](https://github.com/mk3008/velvet/pull/24#issuecomment-5653711139). The owner clarified that a sufficiently good candidate is enough; this is not an open-ended search for an optimal executor. This record supersedes the **experiment priority and stopping disposition** in Decisions 0009/0010, not their historical measurements or Business Design.

The initial small metadata-routine experiment was a defensible correctness/implementation-risk probe. Deepening its performance matrix and declaring a stopping point before a structural comparison was the wrong priority. Before those measurements, its remaining four/eight client calls per pair already implied O(N×L) waiting. At 10,000×3 and an assumed additional 5 ms/call, 120,012/240,012 serial calls imply roughly 600/1,200 seconds of extra waiting alone. This is arithmetic sensitivity, not a measured network duration. The 20–33% reduction is an intermediate result, not sufficient progress on #23's primary deployment problem.

The #20 TEMP kernel was not proof of full-executor correctness. It was nevertheless a strong reason to test the *feasibility costs* of DB-side execution/materialization early. Catalog work, ANALYZE, temp I/O, transaction lifetime, concurrency and I/O-contract changes are adoption questions, not automatic reasons to defer the candidate.

## Two independent problems

For backlog B, admitted keys K, L links and source size S, an unchanged row protocol requires approximately ceil(B/K) Runs, O(B×L) client calls and ceil(B/K) complete source evaluations. K=100 and B=10,000 require at least 100 Runs before arrivals/retries. Bounding admission limits one atomic Run; it does not remove aggregate request amplification or the repeated source cost.

A worker invoked once per Run can reduce transport to O(ceil(B/K)) calls while still executing O(B×L) SQL statements **inside PostgreSQL**. Moving a loop is a structural transport change, not a claim of set-based DB execution or constant total computational cost. TEMP alone, with Node still issuing row calls, would not achieve it.

For constant sustainable durable service rate μ and continuing arrival rate λ, finite catch-up requires μ>λ; an idealized drain time is B/(μ−λ). This omits changing route mixtures, repeated scans, contention and retry loss. Real recovery tests must include those effects. If every Run times out before COMMIT, durable service is zero regardless of nominal row speed.

## Candidate order and why

| Candidate | Client call cardinality | First decisive uncertainty |
| --- | --- | --- |
| Existing metadata routine | O(N×L) per Run | Already structurally insufficient as the main answer; retain reference data, stop tuning it |
| Typed DB-side ordered worker + full DB snapshot | O(1) per Run for fixed profile | Can the explicit typed contract preserve source/identity/order/history, and does shared DB cost fit the bounded recovery case? |
| Memory snapshot + explicit bulk I/O | O(number of batches×L), depending on contract | Independence/order and JSON transport/memory cost; keep as fallback if DB materialization cost rejects the first candidate |
| DB snapshot + set-based destination operations | O(number of dependency stages/batches) | Prove which operations can reorder; compare if the ordered worker's internal DB work fails the envelope |

Prioritize the **ordered DB worker**: it removes per-row network waits without first requiring cross-key/link reordering. Existing #19 statements read preceding writes. A set-based rewrite cannot silently assume those statements commute. This is a reason to preserve order inside the DB initially, not to retain Node as the per-row coordinator. If that candidate meets the gates, stop; do not implement all alternatives simply because they exist.

## Concrete opt-in experiment

[The ordered profile](../../experiments/issue-23/ordered/README.md) makes a complete typed source snapshot in a temporary relation, freezes whole-key/link eligibility, then performs sequential operations inside PostgreSQL. Node retains separately durable Run creation, configuration locks/reread, one atomic work transaction, failed Run recording and lost-COMMIT handling. Successful calls are a fixed 11 per Run, including the transaction/configuration/finalization calls; internal statements remain row-sized.

This is an explicitly authored **immutable text-key profile**, not a transparent replacement for arbitrary stored SQL or JavaScript `resolveLogicalKey`. Its source/Insert/Red/reassessment functions are canonical and called by both the reference and ordered worker. No arbitrary source query is rewritten, no callback is translated, and no sequence expression is extracted. Profile configuration is validated before Run creation and reread under locks. It is an experimental implementation, not a new public API or a production deployment asset.

The existing row/routine executor and Phase 1–5/#19 coverage remain available. Passing that existing CI does not prove the new profile implements mutable/insert_only or every #19 configuration. Those are outside this typed profile; general replacement/adoption stays unresolved. A deployment using other contracts must author and verify its typed profile or retain the compatible path. This explicit coverage boundary is preferable to silently coercing arbitrary pg/JavaScript values through JSONB.

## Finite evaluation budget and stopping conditions

Use one structural profile, a same-profile reference comparison at 1,000×1 and 10,000×3, two observations for initial/no-op/mostly-no-op/correction, and one decisive recovery case. Existing #20/#23 matrices provide broader reference evidence; repeating every old cell is not a prerequisite to the new decision.

The controlled recovery assumptions are 10,000 source rows with 128-byte memo, 10,000 pending keys, continuing target 2 keys/s, three links, another Setting sharing the database/destination, a neighbor update workload, a cap of 1,000 keys and an additional deterministic 5 ms per client call. A 60-second invocation with a 45-second work allowance is an **illustrative assumption**, not a provider guarantee or agreed production budget. A 180-second catch-up test ceiling bounds evaluation effort; it is not an owner-approved recovery SLO. Connection/process startup is outside measured executor time.

Stop this candidate search when:

1. The supported profile passes differential destination/Active/Work/Lineage/Processing checks, observed sequential visibility, duplicates, source disappearance, downstream rollback/retry, lost-COMMIT and TEMP cleanup. Source count per bounded Run confirms the complete snapshot.
2. Calls are independent of admitted row count within the profile. Residual internal SQL and repeated source scans remain explicit.
3. The bounded recovery case returns both Settings to normal pending levels while intake continues, then sustains short steady intervals. Each measured Run stays below the 45-second work allowance and recovery finishes within the explicit evaluation ceiling.
4. App memory, DB observations and neighbor latency are inspected for a concrete reason to reject the profile. If the DB cost defeats this case, compare an explicit bulk/set-based candidate next rather than optimize metadata coefficients again.
5. Fresh Alder review and PostgreSQL Verify pass, and remaining compatibility/deployment limits are stated. Meeting these gates selects a **reasonable candidate for this tested profile**, not universal production approval.

Correctness failures trigger a fix or rejection, never weaker tests. If the profile cannot pass the controlled envelope, advance only to the alternative that addresses the measured bottleneck. If the necessary next change would alter business meaning, stop at that specific human-owned decision. Actual provider/width/arrival/neighbor budgets are required for production qualification, but their absence does not prevent this explicitly assumed comparative experiment. No further search for an optimum is required after a sufficiently good candidate is established.

## Knowledge retained

Inference ranks candidates and identifies the uncertainties worth testing. Measurements decide those uncertainties; they do not replace cardinality analysis. Evaluation effort itself has a budget. These principles are added locally to AGENTS.md now; no Alder version update is required, and this PR does not modify the Alder repository.

## Measured disposition

[The structural result](../../experiments/issue-23/ordered/results.md) selects the bounded ordered worker for its explicit immutable profile: 11 calls per Run; 10,000-key catch-up with continuing intake and two Settings in 18.329 seconds; largest measured bounded execution 3.013 seconds. No further optimum search is required. An unbounded mostly-no-op observation took 76.77 seconds and spilled, so unbounded deployment is not selected. Profile compatibility and actual production qualification remain explicitly limited in the report.
