# 0018: Canonical Velvet PostgreSQL schema

## Requirement and reason

[Issue #37](https://github.com/mk3008/velvet/issues/37) replaces `rawsql_transfer` with `velvet`. The old name was retained during the Ashiba repository migration to avoid unrelated contract changes. Velvet now has its own product identity and has no public release requiring backward compatibility.

## Decision and boundary

Use `velvet` in canonical DDL, runtime and reviewed SQL, installation migrations/upgrades, PostgreSQL fixtures, executable evaluations and DDL documentation metadata. Do not introduce aliases, dual schemas, fallback lookup or rename migrations for the unreleased old installation. Fresh installations use the current DDL; existing upgrade assets target the same canonical schema.

This changes the physical product namespace only. Business Design meanings, transfer behavior, external source/destination schemas, and `ASHIBA_*` environment names remain unchanged. No new abstraction is needed.

## Historical references

Preserve the original migration account in `docs/migration/README.md`, the recorded query in `experiments/issue-20/results.json`, and Issue 31 review/context/measurement evidence (`fresh-a.md`, `fresh-b.md`, `context/reopen-events.json`, `multiaxis/measurements.json`). Those references describe prior commits and observations, not the current contract. Executable evaluation scripts use the new namespace; historical measurements are not relabeled as new measurements.

## Verification

Run `pnpm verify`, the PostgreSQL-backed Verify workflow (including materialization checks), and the existing Issue 25 deployment gate against the renamed schema. Review remaining old-name occurrences against the historical list above. The existing integration coverage exercises registration, transfer models, recovery and schema invariants with the canonical DDL.
