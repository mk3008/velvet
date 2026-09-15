At `fcda11b`, I recommend one small registration improvement and retaining the existing mapping-validation boundary. No files changed, tests or benchmarks run, or external services contacted.

**Registration: ADOPT a narrowly typed parameter handoff; not started because this assessment is read-only.**

A concrete walkthrough of `sourceKeyDefinition` is:

1. `create-transfer-setting/input.ts` validates its strict `{ keys: [{ column, type }] }` shape.
2. `workflow.ts` resolves destination names inside the transaction, then passes it as `source_key_definition`.
3. `queries/insert-transfer-setting/boundary.ts` parses the SQL parameters, but `loadInsertedRow` then widens them to `Record<string, unknown>` and passes `params as never`.
4. `query.ts` binds `:source_key_definition`, casts it to `jsonb`, and explicitly returns that column.
5. `src/adapters/pg/sql-client.ts` uses Serene named binding and returns driver rows. The query boundary checks exactly one row and applies its strict row schema, including ID/date coercion.
6. `output.ts` maps `source_key_definition` back to `sourceKeyDefinition`.

The destination-link INSERT repeats the same widening/cast pattern. Change only each private `loadInsertedRow` parameter to its existing schema-inferred query-parameter type and pass it directly to the typed execution function. These parsed types structurally satisfy the corresponding query interfaces.

This removes a concrete manual maintenance obligation: reconciling the parsed parameter shape with the query function’s required shape across an unchecked `as never` handoff. The compiler can check that handoff without adding a module, interface, or runtime step. It does **not** prove SQL placeholder/column correspondence or returned-row validity.

Keep the current SQL/validation file pairs, transaction workflow, raw-result distinctions, cardinality checks, and parsing behavior. Decision 0007 and commit `0ba9f08` explicitly retained those pairs for their distinct responsibilities; the walkthrough does not justify overturning that choice. Do not combine this candidate with removal of duplicate result parsing or a broader executor rewrite.

Remaining obligations are substantial but explicit: the workflow owns atomic parent/link registration, defaults and hashing; callers supply a genuinely transactional executor (`fromPg` alone does not provide one); SQL review checks named bindings and storage semantics; result schemas validate driver output; public mapping remains separate.

Verification for implementation: typecheck/build should demonstrate the cast-free compatibility; inspect the diff for unchanged executable behavior; use existing registration unit tests and `tests/adapters/pg/features.integration.test.ts` for PostgreSQL/Serene round trips. Preserve the repository’s `pnpm verify`, SQL audit, and Alder review requirements. Existing tests inspected do not establish exhaustive malformed returned-row/cardinality coverage.

**Malformed mapping rejection: KEEP.**

`execute-transfer/link-mapping.ts` already owns a value-only `assertDestinationLinkMapping(link, keyColumns)`, importing only `node:util`. It checks target membership, mapping source strings, ordered source-key agreement, destination-key membership and mapped key-source agreement.

The coordinator in `execute-transfer/boundary.ts` supplies the crucial temporal guarantee:

- Load configuration and enabled links within the first transaction.
- Check mutable date-control restrictions and required stored Insert SQL before mapping validation.
- Validate every enabled link, then load optional set-phase configuration.
- Only afterward execute `runSql`/`setPhaseRunSql` and commit the Run.
- Reacquire configuration and compare it before transfer work in the second transaction.

Inlining the validator would remove one hop but restore DB/query-context dependence for isolated rejection tests. A shared object utility would add a dependency merely to deduplicate a three-line predicate. Neither improves this concrete maintenance task.

This judgment reuses actual history: commit `f2a1e22`, Decision 0015’s mapping-only extraction, and Decision 0016 / `evaluations/issue-33/kiss-application.md`, which explicitly retained this boundary. Historical evidence reports 39 predicate comparisons and nine coordinator traces; these are prior evidence, not newly executed checks.

`tests/features/execute-transfer/link-mapping.test.ts` exercises valid composite keys, malformed mappings, input non-mutation, and preserved native `TypeError` cases. Normalizing those errors would change behavior. The PostgreSQL execution test “invalid mapping is rejected before a Run or destination write” explicitly asserts zero Run rows; its body does not separately assert destination-table emptiness.

The local validator still cannot prove pre-Run placement, locks, rejection precedence, configuration stability, or absence of database effects. Those remain coordinator/source-review and PostgreSQL-test obligations. Reopen only if mapping changes introduce unrelated dependencies, predicate drift, or growing caller coordination; no further structural work is currently justified.
