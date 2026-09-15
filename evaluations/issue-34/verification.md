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

The full local non-DB verification and final PostgreSQL CI result are pending.
Independent Alder review is pending. Neither pending gate is a passing result.

## Scope of evidence

SQL text/QuerySource identity, Zod parsing/cardinality, transaction workflow,
public root exports and mapping code are unchanged. Error promise outcomes and
receiver/invocation behavior are tested; async stack shape and microtask count
are intentionally not claimed identical after deleting an async forwarder.
Existing PostgreSQL registration integration remains the actual driver/binding
round-trip test. Full Verify covers the broader transfer behavior.
