# Fresh Alder review: structural candidate

A separate fresh agent reviewed Business Design, Decisions 0009/0010, pinned Alder knowledge, then the new SQL/profile, harness, recovery workflow and Decision 0011. Base implementation: `8e8a419`; initial structural code: `b3b0b08`; follow-up review included the working changes on `32b235b` for fresh-connection recovery. The reviewed scope is the explicit immutable profile, not arbitrary-SQL migration or a public API.

The design review found no business-meaning blocker to moving ordered execution into PostgreSQL. The concrete compatibility boundary is typed source/operation I/O and the JavaScript key resolver, so the experiment uses an authored profile rather than silently translating those definitions.

Findings addressed:

- Validate exact destination column metadata, in addition to mapping, exclusions, keys and stored profile entrypoints.
- Inject failure at the last enabled link of a later logical key, preserving the complete rollback oracle.
- Compare actual write order and visible Work/Processing/Active/Lineage state before each write against the reference.
- Use a concurrent producer, independent Setting and unrelated neighbor/activity connections for recovery.
- Start recovery on fresh primary and independent backend connections; assert complete source row count per bounded Run.
- Assert final catch-up duration against the stated evaluation ceiling, not only before each iteration.

Final bounded review found no additional correctness blocker for the supported profile. Candidate search may stop once PostgreSQL CI and the measured resource/recovery gates pass. No generic SQL translator, mutable/insert_only implementation or optimal-candidate search is required for this explicitly scoped experiment.

Limits remain explicit: the second Setting is evaluated through catch-up; the five steady intervals exercise the primary Setting. Driver delay is simulated; execution timing excludes process/connection startup. Shared-container counters and neighbor observations are diagnostic, not isolated resource guarantees. The existing Phase 1–5/#19 CI remains the regression gate for the shipped executor; its success is not proof of those models in this new profile.

## SQL construction review

The ordered TypeScript/JavaScript audit records **10 ordinary / 60 review-required / 0 violation** findings in [sql-audit.json](sql-audit.json). Imported queries and generic driver dispatch stay review-required. Shipped `src` construction is unchanged: 23 ordinary / 49 review-required / 0 violation. No finding is suppressed.

The SQL-language/PLpgSQL functions are reviewed directly outside Serene. They use named function parameters and fixed statements, with no dynamic EXECUTE or executable-SQL concatenation. JSON key/hash serialization constructs values only. Profile source and destination functions are shared by the reference and worker, not mirrored from unseen stored SQL. Lifecycle CREATE/DROP DATABASE is reused unchanged from the parent harness and retains its two UUID-only reviewed exceptions outside this subfolder's audit.
