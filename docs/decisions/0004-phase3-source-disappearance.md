# Phase 3 source disappearance cancellation

## Defined route

[Issue #7](https://github.com/mk3008/velvet/issues/7) extends immutable execution with source absent plus Active Black present => Red only. Absence means the logical key is absent from the current stored source SQL result, including filtering or joins; Dirty Keys are reevaluation hints, not deletion events.

The existing work transaction looks up Active Black before requiring source values. Cancellation bypasses source mapping and reassessment, invokes the existing Destination Red SQL with only the old destination key, retires Active Black, and records Red Lineage (`reversed_destination_row`). The stored Red SQL continues to own sign reversal and current posting-date correction. No Black insert or new Active Black is produced. Work Item records `source_exists = false`, Red required and Black not required; Processing is `succeeded / red`. All work and successful Run finalization commit together. Original immutable rows remain untouched, and failed work retains the original cause through existing failure recording.

Coalescing remains per run/link/logical key. Subsequent Dirty Keys record `duplicate_ignore`, including after cancellation removed Active Black. Black insertion counts remain Black-only. A later source reappearance follows initial insertion when no Active Black exists and its mapped destination key is fresh; immutable key conflicts still fail atomically. No schema change, SQL registry, mutable route or scheduler is introduced.

## Human decision: no source and no Active Black

[Owner decision](https://github.com/mk3008/velvet/pull/8#issuecomment-5649561025) resolves the initial draft blocker: when both are absent, complete Processing as `skipped / no_op`, with no transfer, Active Black or Lineage writes. This includes deletion before initial Black and a new Dirty Key after cancellation. Finalized Dirty Keys are excluded from later execution. Source reappearance must register a new Dirty Key, which evaluates the then-current snapshot normally; event history is not replayed.

The existing skipped Work Item records `source_exists = false`, no active/evaluated destination key and both transfer flags false. Coalesced duplicates retain `duplicate_ignore`. No new status or schema is needed. The Transfer Target Decision concept records the approved boundary.

## Verification

PostgreSQL integration tests cover Red-only trace and immutable history, source-SQL filtering, duplicate cancellation, currently permitted Red date, mixed lifecycle routes, reappearance and rollback at Red/Lineage/Processing/Run finalization. Existing Phase 1/2 tests remain regression gates. Boundary tests verify finalization, no writes, and reappearance requiring a new Dirty Key. Separate Alder review and full PostgreSQL-backed `pnpm verify` are required for review readiness.
