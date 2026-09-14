# Maintaining execute-transfer

This is a route to evidence, not a second specification or an exhaustive test map.
Start with [Business Design](../../../docs/business-design/README.md), then the
[execution process](../../../docs/processes/transfer-execution-process.md) and its
concept references for meaning. [Decisions](../../../docs/decisions/README.md)
explain implementation choices, not approval of unresolved business policy.

| Question | Implementation to inspect | Existing verification entry |
| --- | --- | --- |
| Run persistence, commit ambiguity, failure recording | `executeTransfer` in [boundary.ts](boundary.ts), `failSql` in [queries.ts](queries.ts) | [execution tests](../../../tests/features/execute-transfer/execution.integration.test.ts): `a lost work COMMIT response cannot relabel committed success as failed` |
| Mutable identity before no-op and after DML | `executeRowTransfer`'s `Mutable destination key does not match Active Black` guard, then `executeMutableDestination`, both in [boundary.ts](boundary.ts) | [mutable tests](../../../tests/features/execute-transfer/mutable.integration.test.ts): `rejects inconsistent mapped identity even if key columns are excluded` and `an UPDATE SQL that moves the destination key is rolled back` |
| Work, retirement, Lineage and Processing ordering | Caller branches in `executeRowTransfer`, `retireRowActive`, [queries.ts](queries.ts); routine mode additionally requires [DB routine bodies](../../../db/runtime/execute-transfer-metadata.sql) | [mutable tests](../../../tests/features/execute-transfer/mutable.integration.test.ts) and [reevaluation tests](../../../tests/features/execute-transfer/reevaluation.integration.test.ts), including injected failures |
| Loaded mapping validity versus pre-Run placement | [assertDestinationLinkMapping](link-mapping.ts) and its caller in [boundary.ts](boundary.ts) | [value tests](../../../tests/features/execute-transfer/link-mapping.test.ts), plus [execution tests](../../../tests/features/execute-transfer/execution.integration.test.ts): `invalid mapping is rejected before a Run or destination write` |
| Stored SQL binding versus authored SQL meaning | [trusted-sql.ts](trusted-sql.ts), actual stored SQL/configuration and target DDL | [binder tests](tests/trusted-sql.test.ts); relevant DB integration tests still needed for effects |
| Set-phase configuration and execution | [config.ts](set-phase/config.ts), [execute.ts](set-phase/execute.ts), [queries.ts](set-phase/queries.ts), [Decision 0013](../../../docs/decisions/0013-product-set-phases.md) | [set-phase tests](../../../tests/features/execute-transfer/set-phase.integration.test.ts) and the scoped deployment gate in Decision 0013 |

For a mutable-key investigation, the helper alone does not settle pre-Work/no-op
behavior or recovery. Follow its caller and the coordinator as the question requires.
For a rejected COMMIT, source order does not establish the server's final state;
inspect the Run and transaction outcome rather than assuming rollback.
Routine SQL call sites likewise do not prove the deployed routine body's behavior.
An overview answer may leave these uninspected if it explicitly limits its claims;
a change relying on them must obtain the relevant evidence.

Use symbol names or quoted test/error text above with ordinary search and ranges;
line numbers are deliberately not duplicated here. A linked test is a starting
point, not sufficient coverage by itself. Runtime changes follow the repository's
[verification and review requirements](../../../AGENTS.md), including PostgreSQL
`pnpm verify`; local DB absence uses CI. Preserve stored-SQL semantics and distinguish
code revert from reversal of committed data. Update a route if the referenced
symbol/path changes; do not expand this into an inventory of every implementation.
