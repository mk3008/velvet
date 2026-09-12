# Phase 2 immutable reevaluation

## Human decision

[Issue #5 owner decision](https://github.com/mk3008/velvet/issues/5#issuecomment-5649140650) establishes that comparison concerns the effective destination result after date correction. A source date change from April 10 to April 11 that produces the same May 1 posting date is no-op. A separately mapped `original_date` remains a comparison column unless explicitly excluded by the Destination Link. Velvet does not require destinations to keep original dates separately. Required Red and new Black entries still use the currently permitted posting date. The existing Transfer Target Decision concept carries this clarification; all other Business Design meanings remain in force.

## Execution choices

The Phase 1 trusted stored SQL, explicit Dirty Key resolver, source snapshot and Run transactions remain. A prior Active Black selects reevaluation rather than an unconditional error. Each run/link/logical key is evaluated once; subsequent Dirty Keys record `duplicate_ignore`. No-op records a skipped Work Item and Processing result `no_op`, without writing destination rows, Active Black or Lineage.

### Stored reassessment SQL

Add `destination_link.generated_reassessment_sql_body`, a developer-managed read-only statement used only when Active Black exists. This is SQL needed to read arbitrary destination tables and evaluate their real corrections, without inferring expressions or concatenating SQL in the runtime. It is a stored-SQL exception to Serene, using the existing named-marker binder; it is not an approval registry or an automatic SQL generator.

Inputs are the same destination-column named values as Black Insert, plus reserved `:velvet_active_destination_key` (the original destination key as JSON text). This statement must read the original Black by that complete key and return exactly one row containing `current_values` and `active_values`: JSON object **texts** (`::text`). The former is the effective new destination row after the same conversion/correction used by Black Insert; the latter is the actual existing Black row. Do not execute an insertion as a preview. Share transformation logic through an application-owned DB function when needed; do not maintain generated copies of canonical SQL or repeat the source query. This SQL may lock the referenced destination row if external writers exist; immutable destination rows are otherwise treated as immutable by their owner.

Both objects must contain every non-excluded destination column, and no columns outside Destination metadata. Excluded columns may be present or absent. The engine removes only `diff_compare_excluded_columns.columns` and compares the objects with PostgreSQL JSONB `IS DISTINCT FROM`. NULL equals NULL, JSON numeric values compare numerically and object order is immaterial; dates/types must be normalized to destination representations by the stored query. JSON is returned as text so node-postgres cannot round large numeric values before PostgreSQL compares them. No automatic exclusion of destination keys, original dates or timestamps occurs. Authors must explicitly exclude generated keys when they change independently of business values.

A missing query, invalid exclusions, missing original row or malformed comparison result fails the work transaction and retains the failed Run. A malformed query is not a no-op. As with Phase 1 Insert SQL, trusted authors own agreement with mapping, destination types and correction functions; lexical binding cannot prove SQL meaning. SQL generation statuses remain metadata, not approval. Initial Black Insert continues to work without reassessment or Red SQL.

### Correction and history

On a difference, execute Destination's existing `generated_red_transfer_sql_body`. Bind the old Black destination key columns by their own names, require all those markers to be consumed, and require one inserted row returning all Red destination key columns. The trusted statement reads that old row, reverses `sign_inversion_columns`, preserves appropriate other columns, and applies Destination correction hooks. It must not read source-current values to construct the Red. Red's new row key must differ from the old key.

After Red insertion, remove the old Active Black and record Red Lineage with `source_kind = reversed_destination_row` and the old destination key as its source. Execute the existing Black Insert with the original mapped snapshot parameters, validate its returned key against Destination Link mapping, activate it and record normal Black Lineage. Final Processing is `red_then_black_insert`. Red, retirement, both Lineage entries, new Black and Processing all commit with the Run or roll back together. Inserted count remains the count of Black inserts; skipped includes no-op and coalesced duplicates.

Work Item's nullable `active_black_id` is a live FK and cannot keep a deleted current-state row alive. Capture its destination key in `evaluated_destination_key_json` before transfer, and explicitly clear the live FK in the work transaction before the Active Black retires (both existing FK constraints remain). Historical evaluation identity survives without retargeting old Work Items to a new Black. No-op Work Items retain their current FK until a later correction retires it. This is a persistence choice, not a new transfer state.

Black keys are still supplied by source SQL and explicitly mapped, as in Phase 1. A source query may explicitly project fresh sequence values for new Black candidates; the engine never injects a sequence. Red keys are produced by the trusted Red SQL under Destination's numbering contract. A conflicting destination key fails atomically; the engine never updates or deletes an immutable destination row to make room.

## Schema and verification

Fresh databases use canonical `db/ddl/`. Existing Phase 1 test databases can apply `db/upgrades/phase2-immutable-reevaluation.sql` once before using Phase 2. It adds the reassessment field and the evaluation snapshot, backfills any existing Work Item active references, without removing historical records or weakening the existing FKs. Developers must populate reassessment/Red SQL for their actual destination schema; no universal destination SQL can be inferred from its table name.

Tests cover unchanged/ignored-only reevaluation, Red then Black, exact Red provenance and frozen original rows, repeated Dirty Keys, mixed old/new keys, nulls and exact large numerics, malformed configuration/results, correction rollback, and the owner's corrected-date/original-date cases. Full `pnpm verify` requires PostgreSQL. Mutable and source-disappearance routes, scheduler/CDC, partial success and general crash recovery remain outside this phase.
