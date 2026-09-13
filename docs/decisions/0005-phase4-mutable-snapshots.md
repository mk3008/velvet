# Phase 4 mutable snapshot lifecycle

## Human decision and scope

[Issue #9](https://github.com/mk3008/velvet/issues/9) completes mutable initial insertion, unchanged reevaluation, direct update, physical deletion and absent/absent no-op. Dirty Keys remain triggers for the current source snapshot, coalesced per Run / Destination Link / logical source key. Mutable and immutable links may share a Run; each uses its Destination's model. Mutable operations do not create Red rows or immutable Lineage.

The [owner's identity decision](https://github.com/mk3008/velvet/issues/9#issuecomment-5649689616) keeps the existing destination key stable. UPDATE locates the existing row through Active Black and synchronizes mapped current values without relocating Active Black. A changed source identity is disappearance of the old logical key plus appearance of a new logical key, processed as DELETE and INSERT using their Dirty Keys. There is no key-moving UPDATE route.

## Stored SQL execution contract

Continue the trusted developer-managed SQL and named-value binding path from Phases 1–3. SQL syntax/target predicates are owned by the stored statement's author; the binder is not a SQL meaning validator. These input/output conventions implement the stable-identity decision without an automatic SQL generator or a new configuration registry:

- Initial Insert uses the existing mapped destination-column inputs and one-row `RETURNING` destination-key contract. It records Active Black, but Lineage only for immutable destinations.
- Reassessment uses the unchanged Phase 2 contract: mapped destination values plus `:velvet_active_destination_key` as JSON text, returning `current_values` and `active_values` JSON object texts. These represent the effective destination candidate and the stored row. PostgreSQL compares them after removing only the configured excluded columns. Mutable SQL must represent the same conversions as its Insert/Update; no date-lower-bound correction is added. The query may lock the destination row where external writers exist.
- UPDATE binds mapped destination-column values plus the reserved `:velvet_active_destination_key` JSON text. The statement must consume all mapped inputs and the reserved locator, directly update the one row identified by the complete Active Black key, and return all destination key columns. No additional row or Red is inserted. The engine requires exactly one affected/returned row and an unchanged complete key. Active Black is left intact, including its ID and activation time.
- DELETE binds only `:velvet_active_destination_key` JSON text, without requiring source mapping or reassessment. It must delete the row at the complete key and return its destination key columns. The engine requires exactly one affected/returned row and the same key, then clears live Work Item references and retires Active Black using the existing Phase 2 retirement path. Evaluation key snapshots survive retirement.

Before mutable reassessment, mapped destination keys must agree with Active Black, including when keys are excluded from value comparison. An inconsistent configuration/snapshot is an error, not an implicit key remap or ignored mapping. SQL that returns a different key, missing keys, zero/multiple rows, missing inputs or missing locator fails the work transaction. These checks cannot prove that developer-authored SQL uses a bound locator correctly or returns truthful keys; trusted authors remain responsible for SQL meaning, as in prior phases.

Mutable destinations with date-lower-bound configuration are rejected before Run creation. Immutable date correction and history behavior remain unchanged.

## Persistence and verification

Existing Work Item model, route and operation flags now reflect mutable insert/update/delete/skip. Processing records `succeeded / black_insert`, `succeeded / black_update`, `succeeded / physical_delete`, `skipped / no_op` or `skipped / duplicate_ignore` as appropriate. No schema change is needed. The API result remains `{ runId, inserted, skipped }`: inserted counts Black inserts, not updates or deletions; Processing carries the detailed outcome.

Run creation, work atomicity, separate failure recording, original error preservation and COMMIT-response-loss protection retain their existing transaction boundaries. There is no partial-success, scheduler or crash-recovery extension.

PostgreSQL integration coverage includes the mutable lifecycle, composite key isolation, source identity changes, filtered disappearance, coalescing, mixed-model Runs, exact numerics/NULL, stable-key validation, malformed SQL returns and rollback at mutation/retirement/processing/finalization/commit. Existing immutable regression suites remain mandatory. Full `pnpm verify` and a separate Alder review are the readiness gates.
