# create-transfer-setting

Creates one `setting` row and one or more `destination_link` rows.

This operation registers a Transfer Setting and its Destination Links; it does not implement update or delete operations.

## Input

The public entrypoint accepts `CreateTransferSettingInput` with camelCase fields:

- `name`
- `description`
- `sourceSqlBody`
- `sourceKeyDefinition`
- `isEnabled`
- `note`
- `destinations`

Each destination item contains:

- `destinationDefinitionName`
- `executionOrder`
- `destinationKeyMapping`
- `mappingDefinition`
- `diffCompareExcludedColumns`
- `isEnabled`
- `note`

## Validation

`input.ts` validates external input before the workflow starts:

- non-blank `name`
- non-blank `sourceSqlBody`
- object-shaped `sourceKeyDefinition`
- at least one destination
- positive integer `destinations[].executionOrder`
- unique `destinations[].executionOrder` within the input
- unique `destinations[].destinationDefinitionName` within the input
- object-shaped `destinations[].destinationKeyMapping`
- object-shaped `destinations[].mappingDefinition`
- object-shaped `destinations[].diffCompareExcludedColumns` when provided

Destination definitions are resolved by `destination_definition_name` before inserting the setting row.
Unknown destination definitions fail the operation before any setting row is inserted.

## SQL

Registration executes three queries:

- `queries/resolve-transfer-destination-definitions.ts`
- `queries/insert-transfer-setting/`
- `queries/insert-transfer-setting-destination-definition/`

The feature requires a transactional executor and runs all three query steps inside one transaction.
Generated SQL body columns are saved as empty strings, `generated_sql_status` is saved as `not_generated`, and `generated_sql_error` is saved as `null`.

## Source SQL Analysis

Full source SQL parsing is intentionally out of scope for this issue.
The feature only stores a deterministic SHA-256 hash of `sourceSqlBody`.
Analysis result fields are saved as `null`, and `source_sql_analysis_status` is saved as `not_analyzed`.
