# Velvet

Velvet is an experimental SQL-first PostgreSQL transfer-control product.

The initial features register transfer destination definitions and transfer settings for PostgreSQL transfer workflows.

Transfer package tables live under the `rawsql_transfer` schema to avoid collisions with user tables or generic schemas such as `transfer`.

## Development

Use Node.js 22 or 24 and pnpm 10.19.0.

```sh
pnpm install --frozen-lockfile
pnpm verify
```

The full gate includes the documentation CLI checks, type checking, build, tests, DDL metadata checks, and documentation generation. Tests use PostgreSQL 18 via Docker/Testcontainers by default. To use a dedicated existing test database, set `ASHIBA_DB_URL`. CI provisions its own PostgreSQL service and does not skip database tests.

Generated review pages are written to `docs/generated/transfer/` and remain untracked. Start design work at [Package Scope](docs/scope/SYSTEM_SCOPE.md), [Concepts](docs/concepts/README.md), [Processes](docs/processes/README.md), and [DFD](docs/dfd/README.md).

## Migration Source

This package was migrated from the former rawsql-ts transfer dogfood package:

- Source: https://github.com/mk3008/rawsql-ts/tree/main/packages/transfer
- Local source commit used for the initial migration: `4698a87e9a73f8d6b87b0545cb0a740246f7d457`

The product now lives in `mk3008/velvet`. See [repository migration](docs/migration/README.md) for the Ashiba source commit and preserved history.

## Review and SQL contracts

Start at [Business Design](docs/business-design/README.md). [Adoption and versions](docs/adoption.md) documents Alder, Raw SQL Rules v0.3 and Serene v0.4.0.

Registration SQL uses fixed Serene literals in the INSERT `query.ts` files and `queries/resolve-transfer-destination-definitions.ts`. Names are bound through Serene at `src/adapters/pg`; node-postgres execution and transactions remain application-owned. No generated SQL copy or separately maintained binding map is needed. Current schema remains in `db/ddl/`.

Run `pnpm audit:sql` for construction review. Keep imported or unresolved paths visible and review SQL meaning and business behavior separately.

## Transfer Execution: current snapshots

`executeTransfer(client, definitions, { settingId, arguments })` owns separate Run-creation and transfer-work transactions on an idle, dedicated node-postgres client. It accepts run arguments, not source rows. The application registers exactly one definition for the selected Setting:

```ts
const result = await executeTransfer(
  client,
  [
    {
      settingId: '1',
      sourceSchema: 'public',
      sourceTable: 'orders',
      sourceKeyDefinition: { keys: [{ column: 'order_id', type: 'text' }] },
      resolveLogicalKey: (key) => ({ order_id: key.id }),
    },
  ],
  { settingId: '1', arguments: { branch: 'north' } },
);
```

The expected key definition must match the stored Setting exactly. Logical and destination keys must have matching JSON-compatible types; unsupported values such as Date and nonfinite numbers are rejected. The source SQL must project those logical key columns and the columns used by each link's mapping.

Developers prepare the enabled Setting and Destination Links, including each link's stored `generated_insert_transfer_sql_body`. That statement binds destination-column names from `mapping_definition.columns`, inserts one row, and returns its destination key columns. The saved source SQL remains the only source SQL definition. SQL uses named value parameters; analysis/generation statuses are not execution approval. See [the trusted execution decision](docs/decisions/0002-phase1-trusted-execution.md) for prerequisites and the explicit stored-SQL exception.

Successful execution returns `{ runId, inserted, skipped }`. Run creation is committed first. Destination and processing changes, including Run success, commit atomically in a second transaction. On work or commit failure, that transaction is discarded and a separate transaction marks a still-running Run failed; already committed success is preserved if only the COMMIT response was lost. `TransferExecutionError` preserves the original `cause` and `runId`; secondary cleanup/recording failures are available in `recoveryErrors` and may leave the durable Run running. Recovery from process interruption between transactions is outside this phase. Configuration rejection before Run creation throws without a Run. Scheduling and general process-crash recovery remain outside this phase.

## Bounded immutable set phases

Settings can explicitly opt into the DB-managed immutable set-phase contract in [Decision 0013](docs/decisions/0013-product-set-phases.md). Apply the migration before deploying this runtime. A null Setting profile preserves the existing executor; an invalid non-null profile fails without fallback. With a valid profile, call `executeTransfer(client, [], { settingId, arguments })`; source/key resolution and reviewed complete phase SQL come from database masters. Optional `maxDirtyKeys` can lower the configured admission cap.

See the decision for the supported text-key profile, Destination-owned Red SQL, review/hash/revision boundary and empty-input/independent-key obligations. The `Issue 25 deployment` workflow exercises production code. The older Issue 23 tournament remains manually runnable and is no longer triggered by routine runtime edits.

## Transfer Destination Definition

The `rawsql_transfer.destination_definition` table stores:

- the destination table name
- destination column metadata
- destination key metadata
- optional sequence-expression metadata
- transfer model
- optional red-transfer column metadata

DDL lives in `db/ddl/schema.sql` and `db/ddl/destination_definition.sql`.

## Transfer Model

### transfer_model

| Value       | Meaning                                                                                                             |
| ----------- | ------------------------------------------------------------------------------------------------------------------- |
| `immutable` | Add a red-transfer row for the old black row, then add a new black row on update. Add a red-transfer row on delete. |
| `mutable`   | Directly update an existing transferred row on update. Physically delete the row on delete.                         |

## Transfer Setting

The `rawsql_transfer.setting` table stores the source SQL text, a deterministic source SQL hash, and analysis placeholders.
Source SQL parsing is intentionally out of scope for the create feature; new rows save `source_sql_analysis_status` as `not_analyzed`.

## Registration entrypoints

`src/features/create-transfer-destination-definition/` owns the create destination definition use case.
`src/features/create-transfer-setting/` owns the create transfer setting use case.

The destination feature accepts `CreateTransferDestinationDefinitionInput` with `transferModel`.
The setting feature accepts `CreateTransferSettingInput`, resolves destination definitions by name, and creates the setting plus one or more destination links transactionally.
Destination-link input owns transfer-setting-specific mapping and diff-comparison metadata.

The current source layout is an implementation choice, not a required architecture or feature framework. See [source layout](src/features/README.md).

Previously transferred immutable keys are reevaluated against their Active Black. Equal effective destination values (after correction and configured exclusions) complete as no-op; differences produce Red followed by a new Black atomically. Repeated Dirty Keys are coalesced within the Run/link and never replay source events. Initial and previously transferred keys can run together.

For reevaluation, developers supply the link's stored `generated_reassessment_sql_body` and, for corrections, the Destination's stored `generated_red_transfer_sql_body`. See [Phase 2 contracts and schema upgrade](docs/decisions/0003-phase2-immutable-reevaluation.md). The reassessment statement returns the corrected candidate and existing Black values as JSON object texts; Velvet applies the link's exclusions and compares them in PostgreSQL. It does not infer correction logic from arbitrary Insert SQL.

## Mutable snapshots

Mutable destinations insert an initial Black and keep its Active Black identity stable. Reevaluation with no effective difference is no-op; a difference directly updates the existing row. Source disappearance physically deletes that row and retires Active Black. Mutable operations create neither Red rows nor immutable Lineage. Missing source and missing Active Black complete as no-op; later source reappearance requires a new Dirty Key.

A source identity change is old-key disappearance plus new-key appearance (DELETE + INSERT), not a key-moving UPDATE. Mutable and immutable links can run together against the same source snapshot. Date-lower-bound control remains an error for mutable destinations.

Developers supply the link's stored Update/Delete SQL using the [Phase 4 input and return contracts](docs/decisions/0005-phase4-mutable-snapshots.md). Updates and deletes must target the complete Active Black key, affect exactly one row and return its unchanged key. `inserted` still counts Black inserts only; Processing records `black_update` and `physical_delete` separately.
