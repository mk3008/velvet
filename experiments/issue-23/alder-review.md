# Fresh Alder review

A separate fresh agent reviewed Business Design, Decisions 0002–0010, the full pinned `docs/alder/review-knowledge.md`, then the implementation, SQL, DDL and tests. Runtime scope: baseline `1434eef4a3dad2f43bb26eb987b25f8e42b3610f` through the candidate tree published as `6e89908847b48fd619cab93cabc46295cca816c1`, followed by the recovery harness published as `a30d22efe4d252dc8c7fe12bbc2f2a77ea5bb116`. Subsequent fixes are described below. This review is independent semantic review, not an assertion that PostgreSQL tests passed.

## Findings

No concrete business-meaning blocker was found. The reviewer confirmed whole-key admission, complete source evaluation per Run, per-link order/independence, exact comparisons/keys and the original atomic work/guarded failed-Run/lost-COMMIT paths. Fixed sequential routines preserve metadata visibility before the next trusted statement. There is no authoritative all-pending-per-Run requirement; bounded admission is an explicit implementation choice under #23. Remaining Dirty Keys, including later commits with lower IDs, remain eligible.

The initial evaluation review identified three gaps, addressed before final evaluation:

- The matrix benchmark accepted an admission bound but asserted all source rows were processed. It now rejects that option; the dedicated recovery harness validates actual admitted outcomes.
- DB setup statistics could contaminate the pre-invocation baseline. The runner now requests a backend stats flush and clears the stats snapshot before sampling.
- The first workflow did not exercise RTT/recovery. A separate recovery matrix now exercises simulated additional RTT, continued intake, two independent Settings sharing the same DB/physical destination, neighbor work, and whole-key caps.

A subsequent recovery review identified unhandled concurrent/background rejection and partial connection cleanup risks. The harness now attaches rejection handling immediately, settles independent transfer work before propagating failure, captures background errors, and closes clients in finally even after partial connection failure. Failed background work cannot count as successful recovery.

The reviewer also required these measurement qualifications: during recovery, sequence/DB/WAL/process memory and CPU metrics are aggregate across both Settings and probes, while the instrumented driver calls/source count belong only to Setting 1. Arrival frequency is a target and must be compared with measured arrivals/time. Modeled outage durations are distinct from the actual 600-record backlog experiment. Five steady observations do not establish long-term sustainable capacity.

## CI feedback

Initial CI exposed an optional-parameter binding bug: Serene correctly rejected an undefined, then unused `maximum` parameter on the unbounded query. The parameter is now provided only for the bounded query; neither Serene nor tests were weakened. Existing fault injection recognizes the grouped routine boundary, and an additional real PostgreSQL trigger failure verifies rollback from inside metadata recording after destination work.

Production adoption remains unresolved outside the measured illustrative envelope. The unchanged full source snapshot, arbitrary stored SQL duration, shared DB saturation and host-level admission/retry policy remain concrete deployment limits.

A final bounded follow-up confirmed the asynchronous cleanup fixes and the cap-250/correction additions. It found no remaining blocker in that scope, and independently confirmed Verify run `34758372212` succeeded on `7673a39e3b52c29d6cf82dc6b8aeb573e1533f29`. The reviewer noted that newly arrived first-insert work can share the final correction sample, so it is labeled bounded correction rather than an exclusively all-changed sample.
