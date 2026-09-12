# Phase 3 source disappearance cancellation

## Defined route

[Issue #7](https://github.com/mk3008/velvet/issues/7) extends immutable execution with source absent plus Active Black present => Red only. Absence means the logical key is absent from the current stored source SQL result, including filtering or joins; Dirty Keys are reevaluation hints, not deletion events.

The existing work transaction looks up Active Black before requiring source values. Cancellation bypasses source mapping and reassessment, invokes the existing Destination Red SQL with only the old destination key, retires Active Black, and records Red Lineage (`reversed_destination_row`). The stored Red SQL continues to own sign reversal and current posting-date correction. No Black insert or new Active Black is produced. Work Item records `source_exists = false`, Red required and Black not required; Processing is `succeeded / red`. All work and successful Run finalization commit together. Original immutable rows remain untouched, and failed work retains the original cause through existing failure recording.

Coalescing remains per run/link/logical key. Subsequent Dirty Keys record `duplicate_ignore`, including after cancellation removed Active Black. Black insertion counts remain Black-only. A later source reappearance follows initial insertion when no Active Black exists and its mapped destination key is fresh; immutable key conflicts still fail atomically. No schema change, SQL registry, mutable route or scheduler is introduced.

## Unresolved Human Decision

Source absent plus Active Black absent has no uniquely defined final Processing in the current Business Design. Transfer Target Decision defines no-active insertion candidates and equal-value no-op, but neither determines this combination. The process's skipped branch presupposes a classification; DDL support for `skipped / no_op` does not authorize one. Finalizing excludes that Dirty Key from later execution, whereas leaving it pending permits reevaluation, so this is a business decision.

Pending the owner's decision, this boundary raises an explicit `Human Decision required` error before transfer or final Processing. The existing work transaction rolls back and the Run records failure. This is a temporary fail-closed boundary, not an approved new lifecycle outcome. The draft must not be represented as completing all of Issue #7 until this decision is resolved.

## Verification

PostgreSQL integration tests cover Red-only trace and immutable history, source-SQL filtering, duplicate cancellation, currently permitted Red date, mixed lifecycle routes, reappearance and rollback at Red/Lineage/Processing/Run finalization. Existing Phase 1/2 tests remain regression gates. The undefined boundary test prevents accidental finalization while the decision is pending. Separate Alder review and full PostgreSQL-backed `pnpm verify` are required for review readiness.
