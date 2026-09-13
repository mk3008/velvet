# Fresh Alder review

Reviewed by a separate fresh-context agent, using AGENTS, Business Design → Decision Records → full pinned `docs/alder/review-knowledge.md` → implementation / DDL / tests / experiment changes.

Product and Business Design base: `58c0182f9f5b6b3aa01b6b6e875dfca0162d2b70`. Reviewed scope: new experiment scripts/workflow and working-tree Decision 0009/evaluation README. Runtime and Business Design have no changes.

## Findings

- Low: writing the result artifact before cleanup could bypass connection closure/database removal on output failure. Fixed by nesting independent finally paths around artifact writing, db closure, database removal and admin closure. Result JSON now explicitly marks completion, so a failed run's partial results cannot be mistaken for a complete matrix.
- No business-meaning blocker: recommendation preserves canonical source, per-link decision, configured exclusions, complete key validation, execution-order visibility and atomic work. No automatic source allocation extraction, all-links refresh or reduced-kernel substitution is approved.

The reviewer checked the fixed/route query counts against the actual executor, inspected the SQL/binding paths and ran the scoped experiment Serene audit. UUID-only lifecycle SQL remains a visible infrastructure exception, not a suppressed application path.

## Limits

Initial review preceded completed PostgreSQL measurements. It did not endorse a throughput result. Kernel link differences are symmetric and checks are limited to the reduced contract; it does not prove full lifecycle equivalence, arbitrary stored SQL, concurrency, catalog contention or spill. Existing #19 tests and a future separately verified executor remain the evidence for broader semantics. Follow-up review confirmed the cleanup fix and the historical-evidence distinction, with no new finding. The reviewer checked history claims against local Decisions; PR #4 body/comments were inspected separately by the implementation agent. After completion, the reviewer compared README tables and Decision 0009 with the raw artifact: 20 executor cases, 24 kernel measurements and passing cleanup checks, with completed=true. Timings, calls, allocation counts and the 37.23 s metadata subtotal agree. No additional findings or blockers; one rounding value was corrected from 7.98 to 7.99 seconds. Kernel ratios remain explicitly separate from full-executor gains, and selection stays within the evidence.
