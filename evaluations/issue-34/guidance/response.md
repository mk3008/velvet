Assessment at `fcda11b`: **adopt one narrow registration typing improvement; retain the mapping-validation seam.** No files changed, tests run, benchmarks performed, or external services contacted.

1. **Transfer-setting registration**

   Tracing `sourceSqlBody` shows distinct responsibilities:

   - `input.ts` trims and validates the supplied string.
   - `workflow.ts` resolves destination names inside the required transaction, forwards the normalized body as `source_sql_body`, and hashes that same body.
   - `queries/insert-transfer-setting/boundary.ts` validates parameters, calls the SQL operation, requires exactly one returned row, and parses its shape.
   - `query.ts` owns the Serene INSERT, named binding, and RETURNING columns.
   - `src/adapters/pg/sql-client.ts` mechanically binds parameters and returns driver rows.
   - `output.ts` maps the validated row back to `sourceSqlBody`.

   **Concrete improvement:** change private `loadInsertedRow`’s parameter type from `Record<string, unknown>` to its existing inferred `InsertTransferSettingQueryParams`, and remove `params as never` at the SQL call. The current cast discards an already-established type and bypasses compatibility checking against the query’s separately declared parameter interface. Retaining the parsed type makes that compatibility compiler-checked, removing one manual coordination obligation when a field changes. It adds no runtime operation, interface, or dependency.

   **Disposition: ADOPT, not started because this task is read-only.** Keep the present input/workflow/output and SQL/result-validation split for this bounded change. Decision 0007 and commit `0ba9f08` retained these responsibilities after removing obsolete forwarding structure elsewhere. That history is evidence, not an exemption from reassessment; here the narrow type fix offers a concrete benefit without requiring a broader layout change.

   Remaining obligations include matching SQL parameter names and RETURNING columns, preserving normalization/hash behavior, validating actual driver rows, exactly-one cardinality, and transaction rollback. Typing does not prove SQL correctness or PostgreSQL behavior. The repeated `QueryResultSchema.parse` of an already parsed row is visible, but removing that runtime pass is unnecessary to obtain the selected benefit.

2. **Malformed destination-key mapping before Run creation**

   **Retain `link-mapping.ts`.** It owns the loaded-value mapping predicate and supports direct malformed-value fixtures without database/query setup. Inlining it would remove one hop but sacrifice that useful isolated verification owner; no current dependency growth or predicate drift justifies doing so.

   `execute-transfer/boundary.ts` retains the essential timing: load/lock Setting and Links → filter enabled Links → date and stored-SQL prerequisites → `assertDestinationLinkMapping` for every Link → set-phase parsing → Run INSERT and durable commit. Rejection reaches rollback while `runId` is unset. Configuration locks, enabled-Link selection/order, prerequisite precedence, subsequent recheck, and Run recovery remain caller obligations.

   Commit `f2a1e22`, Decision 0015, and `evaluations/issue-31/multiaxis/` document the extraction’s concrete fixture benefit and costs. Recorded historical evidence includes 39 differential cases and nine coordinator traces; these were **not rerun**. Current `tests/features/execute-transfer/link-mapping.test.ts` covers accepted composite keys, malformed mappings, and intentionally preserved native `TypeError` cases. Do not normalize those errors as part of structural maintenance.

**Verification needed if the registration fix is implemented:** typecheck/build to establish cast-free compatibility, existing registration boundary tests, and PostgreSQL `tests/adapters/pg/features.integration.test.ts`, followed by required `pnpm verify` and applicable SQL/Alder review. The PostgreSQL registration test specifically verifies source SQL containing quotes, parameter-like text, and comments round-trips as stored data.

For any future mapping change, retain direct expected-outcome tests and coordinator/pre-Run regression coverage. The integration test named “invalid mapping is rejected before a Run or destination write” explicitly checks rejection and zero Run rows; it does **not** explicitly assert destination-table row count. Neither helper tests nor historical scripted traces alone establish database locking or all physical effects.

The checkout already contained a modification to Decision 0016. I inspected that diff and the committed version; I made no changes.
