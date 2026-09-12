# Phase 1 trusted execution

## Authority and scope

For Issue #3, the product owner explicitly confirmed that Velvet is an experiment with no production environment or external users. Developers manage Transfer Settings as trusted configuration. Explicitly selecting an enabled Setting is execution intent in this phase. This resolves the execution-boundary questions raised on Issue #3; it does not introduce a general approval workflow.

Read this alongside the existing Transfer Execution, Transfer Run, Work Item, Dirty Key, Transfer Setting, Destination Link, Active Black and Lineage concepts indexed by [Business Design](../business-design/README.md).

## Decisions

- Execute `setting.source_sql_body` as its canonical stored SQL, binding run arguments. Do not mirror it in code or add an approved SQL registry. Analysis and generation status remain analysis and generation metadata, not approval states.
- The application supplies one explicit execution definition per Setting: physical source schema/table, expected logical source key definition, and a function projecting the Dirty Key payload to that logical key. No row payload or SQL is supplied by that function. Reject unregistered, ambiguous or mismatching definitions. Do not infer physical-to-logical identity from column names.
- Use the existing stored `destination_link.generated_insert_transfer_sql_body` for Black Insert, prepared by the developer in this experiment. Bind destination-column parameters from the existing mapping. Require a single inserted row with `RETURNING` destination keys matching the mapping. This is an implementation prerequisite, not a new SQL generator, registry or approval state.
- Use Serene for fixed metadata SQL. Stored SQL requires an explicit exception because it is a runtime string: lower named value markers mechanically, preserving literals, comments, casts and SQL structure. Do not concatenate identifiers, predicates or row values into executable application SQL. Stored SQL must be a single statement using named markers (no positional markers or transaction control); its source query must return a rowset. Trusted authors remain responsible for statement meaning and mapping agreement.
- Own a transaction on a dedicated idle PostgreSQL client. Lock the Setting to serialize its runs, and hold shared locks on link/destination configuration. Freeze eligible Dirty Key/link identities before evaluating the source; persist each evaluated Work Item before its write, consistent with the required decision fields in the existing DDL.
- Support only existing source + immutable + no prior Active Black. Coalesce repeated logical keys within the same run/link using the existing duplicate-ignore result. Exclude finalized Dirty Key/link processing. Other routes fail without destination/processing changes; retain a failed Run after rolling back its work. Configuration failures before Run creation leave no Run.

## Consequences and verification

The complete stored source query runs once per nonempty snapshot; no host-side source filter is injected. Key values must have consistent JSON-compatible types in the explicit resolver and PostgreSQL result. Sequence-generated destination keys, partial success, red/update/delete/retransfer and scheduling are outside this slice. A later phase must revisit these limits before broader use.

PostgreSQL integration tests cover the full trace, reruns, repeated keys, context isolation, invalid definitions/mapping and atomic failure. Marker-lowering tests cover binding and preserved lexical regions. Run `pnpm verify`, retain audit review-required paths, and perform the separate Alder review required by Issue #3.
