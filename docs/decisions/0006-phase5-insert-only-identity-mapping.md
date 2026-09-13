# Phase 5 insert-only transfer model

## Context

Velvet needs a transfer model for rows that are created once and then intentionally left unchanged. The main use case is identity-conversion tables used by later transfer SQL: customer, store, biller, invoice-side identifiers and similar mappings.

These tables let downstream/accounting processing work through its own identity boundary instead of depending directly on every source system's key shape. The logical source key may already be text, numeric, composite, or otherwise source-specific under the existing Setting/Destination Link contracts.

## Decision

Add `insert_only` as a third Destination transfer model.

Its initial materialization is **not a new transfer operation**. When a current source row exists and there is no Active Black, `insert_only` uses the existing initial Black Insert path exactly as other transfer models do:

- existing source-to-destination mapping validation
- existing stored Black Insert SQL
- existing returned destination-key validation
- existing Active Black creation
- existing Lineage behavior for a non-mutable initial Black Insert
- existing Dirty Key Processing result `black_insert`
- existing transaction, failure recovery and duplicate-control behavior

The only new execution decision is after materialization:

- if Active Black exists for an `insert_only` logical source identity, finish that Dirty Key as `skipped / no_op` before reassessment/diff comparison.
- do not run Red Transfer, Black Update or Physical Delete for that already-materialized row.
- this remains true if current source values changed or the current source row disappeared.

If neither the current source row nor Active Black exists, keep the existing `skipped / no_op` behavior. A later source appearance requires a later Dirty Key and then follows the ordinary initial Black Insert path.

## Key contract

Phase 5 does not redesign destination-key generation. `destination_key_mapping`, `mapping_definition`, source SQL, stored Insert SQL and Destination sequence information keep their existing meaning.

In particular, `insert_only` does not make `destinationKey[].sourceColumn` optional and does not introduce a special returned-key contract. If an identity-conversion table needs an accounting-owned surrogate key, it must use the same already-supported first-transfer configuration used by any other Destination.

## Consequences

The implementation stays small: enum/DDL persistence support plus one reevaluation short-circuit. Existing immutable and mutable paths do not need a parallel implementation.

The conversion table itself remains application-owned. Velvet does not prescribe a universal mapping-table schema or automatically rewrite later transfer SQL to consume it.

A source system reusing the same logical key for a different real-world entity is outside this model; because an Active Black already exists, `insert_only` intentionally keeps the original materialization until an explicit future business rule says otherwise.

## Verification

PostgreSQL verification covers first materialization through the ordinary Black Insert path, repeated/change/disappearance no-op behavior, absence before materialization, duplicate Dirty Keys, string/composite logical source keys, rollback, mixed transfer models, Phase 4 schema upgrade, and the full existing regression suite.
