# Verification record

## Local evidence

Pinned dependencies installed with repository-required pnpm 10.19.0 via Corepack.
The initial ambient pnpm 11 install failed on its Git dependency build allowlist;
no dependency or build policy file was changed. Local DB/Docker is unavailable;
PostgreSQL evidence will come from the existing Verify workflow.

Before implementation, the existing registration tests plus ten new negative
receipt/error cases passed: 17/17 (`ASHIBA_SKIP_DB_BACKED_TESTS=1`). The cases
cover empty/multiple/malformed receipts and rejected/synchronously thrown driver
errors for both affected INSERTs, preserving receiver identity and preventing
link writes after a failed setting receipt. They do not simulate DB rollback.

Local `ASHIBA_SKIP_DB_BACKED_TESTS=1 corepack pnpm verify` passed: tooling 52/52;
application 65 passed, 231 DB tests explicitly skipped. Typecheck/build, tooling
lint, documentation metadata/drift and unfiltered SQL audit completed. The 17
registration cases pass both before and after; new negative tests are ten of them.

[PostgreSQL 18 Verify](https://github.com/mk3008/velvet/actions/runs/34915218093)
passed on published runtime head `eed00920f08e6a0aa1297887393c95d2fc21df50`
(tree-identical to locally reviewed `7ded0fd`): tooling 52/52 and application
296/296, no skipped DB tests. Existing materialization checks also passed.
The final documentation-only head is checked again by the existing PR CI; its
status is available on PR #36 rather than recursively committing each CI result.

Fresh [Alder review](runs/review.md) by `/root/alder_review` found no blocking
runtime or evidence issue for the same tree. It read the relevant Business Design,
Decisions and full pinned review knowledge; it did not run tests or review a
blind task. See [metadata](runs/metadata.json) for local/published commit mapping.

Unfiltered Serene audit: 52 ordinary findings before/after, review-required
80 -> 81, zero violations. The two existing UNRESOLVED query-execution findings
move from `query.ts` forwards to `boundary.ts` direct calls; the extra finding
is the new test's `execute(executor, validInput)` call. No finding is suppressed.
The two runtime paths were inspected through their unchanged named QuerySource
and Serene SQL to the adapter and validated receipts; the test call uses the
existing mock executor. Audit still labels these paths UNRESOLVED: source review
is not a change to the tool's classification or proof of all business semantics.

The two SQL template bodies compare byte-identically against `fcda11b`; DB,
workflow, mapping, root exports and authority documents have no diff. Eight
relative links in the report/Decision were checked before adding the final
verification links; final document links and `git diff --check` are also checked.

## Scope of evidence

SQL text/QuerySource identity, Zod parsing/cardinality, transaction workflow,
public root exports and mapping code are unchanged. Error promise outcomes and
receiver/invocation behavior are tested; async stack shape and microtask count
are intentionally not claimed identical after deleting an async forwarder.
Existing PostgreSQL registration integration remains the actual driver/binding
round-trip test. Full Verify covers the broader transfer behavior.


## Owner-requested guidance follow-up

The [one-run extension](guidance/README.md) changes only Decision 0016 and evidence
records. Runtime, tests, DB, AGENTS and workflows match pre-follow-up `7fff25a`.
The first protocol/answer and reviewed implementation are preserved. The isolated
input was verified against its hashes and baseline refs, with only the frozen
Decision patch applied and no Issue 34 answer files. No new local runtime suite
was needed for this documentation-only follow-up; final PR CI still runs full
PostgreSQL Verify. No new candidate-generation runs beyond the one extension.
