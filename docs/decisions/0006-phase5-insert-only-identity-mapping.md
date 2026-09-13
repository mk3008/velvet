# Phase 5 insert-only identity mapping

## Business purpose

Velvet aggregates transaction data from multiple source systems into a downstream/accounting-oriented identity space. Source-side identifiers are not a suitable shared identity boundary: two systems can use the same customer number for different customers, source identifiers may be strings or composites, and accounting/reporting should not inherit each subsystem's key shape.

`insert_only` materializes a stable correspondence once, for example `(source system, source customer id) -> accounting customer id`. Customer, store and biller/invoice-side identities are typical uses. Downstream transaction SQL may then join the mapping table and aggregate on accounting-owned IDs while reports can still expose the persisted source identifiers.

The mapping table is application-owned. Velvet does not prescribe its physical schema or automatically rewrite downstream SQL to join it.

## Transfer semantics

`insert_only` is a third Destination transfer model alongside `immutable` and `mutable`.

- source present + no Active Black: Black Insert once, then record Active Black.
- source present + Active Black: `skipped / no_op` without reassessment or diff.
- source absent + Active Black: `skipped / no_op`; the mapping and Active Black remain.
- source absent + no Active Black: `skipped / no_op`.

Dirty Keys remain current-state reevaluation triggers. They are not events that force synchronization. Once an `insert_only` logical source identity has an Active Black, later source updates and disappearance do not update, delete, reverse or repoint the materialized row.

No Red Transfer, Black Update, Physical Delete or immutable Lineage is produced for this model. Existing `black_insert`, `no_op`, `duplicate_ignore`, Work Item and Active Black state are sufficient; no new processing result is introduced.

If a source system later reuses the same logical source identity for a different real-world entity, resolving that identity reuse is outside this model. Velvet must not silently repoint an existing mapping.

## Destination-owned key

The principal mapping use case requires the destination/accounting system to own its identifier. Therefore `insert_only` may use a destination key that is not projected by the source SQL.

`Destination Link.destination_key_mapping.destinationKey[].sourceColumn` is optional only for `insert_only`. Omitting it means that destination key component is allocated by the Destination/insert statement (for example a PostgreSQL identity/sequence). The stored Black Insert SQL returns all Destination key columns and the returned key is the canonical destination locator recorded in Active Black.

If an `insert_only` destination-key component does declare `sourceColumn`, the returned component must equal that mapped source value. For `immutable` and `mutable`, every destination-key component remains source-derived exactly as in Phases 1–4; omitting `sourceColumn` is invalid.

The existing `sequence_expression_definition` can document destination-side allocation, but execution does not interpret or inject the expression. The developer-owned Insert SQL/DB default owns actual allocation.

## Configuration and execution

`generated_insert_transfer_sql_body` is required when materialization is needed. Reassessment, update, delete and Red SQL are not prerequisites for `insert_only`; the runtime must not execute them merely because a later Dirty Key exists.

Date-lower-bound control has no defined meaning for identity materialization and is rejected for `insert_only`, as it is already rejected for mutable Destinations.

A Setting may mix `insert_only`, `immutable` and `mutable` Destination Links. Existing `execution_order` remains the ordering mechanism. This allows an application to place identity-map materialization before downstream transaction Destinations, but Velvet does not automatically make a later Link consume the earlier mapping; stored SQL remains application-owned.

Initial insert, Active Black creation, Processing and successful Run finalization share the existing work transaction. Failures roll back together and retain the established failed-Run/original-cause/COMMIT-response-loss semantics.

## Verification boundary

PostgreSQL verification must cover destination-generated surrogate keys, string/composite source identity, repeat/update/disappearance no-op behavior, absence before materialization, duplicate Dirty Keys, rollback, Phase 4 upgrade and mixed-model execution. Immutable and mutable regressions remain mandatory.
