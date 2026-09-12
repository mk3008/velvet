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

Generated review pages are written to `docs/generated/transfer/` and remain untracked. Start design work at [Package Scope](docs/scope/SYSTEM_SCOPE.md), [Concepts](docs/concepts/README.md), [Processes](docs/processes/README.md), and [DFD](docs/dfd/README.md). Read the [Technology Policy](docs/technology/TECHNOLOGY_POLICY.md) and [Test Policy](docs/testing/TEST_POLICY.md) before implementation.

## Migration Source

This package was migrated from the former rawsql-ts transfer dogfood package:

- Source: https://github.com/mk3008/rawsql-ts/tree/main/packages/transfer
- Local source commit used for the initial migration: `4698a87e9a73f8d6b87b0545cb0a740246f7d457`

The product now lives in `mk3008/velvet`. See [repository migration](docs/migration/README.md) for the Ashiba source commit and preserved history.

## Review and SQL contracts

Start at [Business Design](docs/business-design/README.md). [Adoption and versions](docs/adoption.md) documents Alder, Raw SQL Rules v0.3 and Serene v0.4.0.

Each `queries/<query>/query.ts` owns one fixed Serene SQL literal. Names are bound through Serene at `src/adapters/pg`; node-postgres execution and transactions remain application-owned. No generated SQL copy or separately maintained binding map is needed. Current schema remains in `db/ddl/`.

Run `pnpm audit:sql` for construction review. Keep imported or unresolved paths visible and review SQL meaning and business behavior separately.

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

## Feature Boundary

`src/features/create-transfer-destination-definition/` owns the create destination definition use case.
`src/features/create-transfer-setting/` owns the create transfer setting use case.

The destination feature accepts `CreateTransferDestinationDefinitionInput` with `transferModel`.
The setting feature accepts `CreateTransferSettingInput`, resolves destination definitions by name, and creates the setting plus one or more destination links transactionally.
Destination-link input owns transfer-setting-specific mapping and diff-comparison metadata.

Feature-specific validation stays inside this feature. Do not move this validation into `src/libraries/` unless it becomes independent enough to extract as a reusable external package.
