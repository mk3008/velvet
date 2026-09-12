# Adopt review and SQL contracts

## Decision and authority

The product owner requested Alder, Raw SQL Rules and Serene before further manufacturing, with existing Business Design retained in its present format. The owner explicitly prioritized Raw SQL Rules v0.3 over the former `.sql` / generated snapshot convention and authorized changing existing SQL.

## Implementation

- Route existing scope, concepts, DFD and process documents through `docs/business-design/README.md`.
- Adopt the unchanged Alder knowledge and Raw SQL Rules payloads at the revisions in [dependency provenance](../adoption.md).
- Keep each of the four executable application queries in one fixed Serene `sql` literal in its existing `query.ts`. Remove `.sql` mirrors and generated SQL / binding metadata.
- Bind names mechanically with Serene's indexed output at the existing node-postgres adapter. Preserve feature boundaries, parameter/result contracts and application-owned transactions.
- Preserve application SQL text and business behavior during this migration; the separately authorized minimal DDL correction is described below. Existing row validation remains unchanged; unused generated row mappers are removed, and the used result mapper is retained as application-owned code because the generation sources no longer exist.

The previous Ashiba SQL snapshot generation convention is superseded. The owned DDL documentation tooling remains in use. This is a technical implementation-path decision, not a change to transfer concepts, source-SQL approval policy, generated-transfer-SQL business metadata or external responsibilities.

## Verification

Run type checking, build, existing tests, PostgreSQL feature integration tests, DDL/document checks and Serene audit. Imported SQL may remain review-required under Serene's file-local analysis; do not copy SQL or suppress findings to obtain ordinary classifications. SQL meaning, binding and business guarantees remain review responsibilities.

## Authorized DDL correction

The owner subsequently authorized fixing the pre-existing DDL failure within PR #2 as necessary to complete adoption. Replace the unresolved `jsonb_object_length(...) > 0` with comparison against `'{}'::jsonb`, retaining the existing object-type predicate and NOT NULL column constraint. This preserves the requirement for a nonempty JSON object without introducing a helper function or changing business meaning. Keep the existing DB integration test and directly exercise the CHECK constraint with empty objects, arrays, scalars, JSON null and a nonempty object containing a null value.
