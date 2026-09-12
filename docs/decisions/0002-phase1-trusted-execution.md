# Phase 1 trusted execution

## Authority and scope

For Issue #3, the product owner explicitly confirmed that Velvet is an experiment with no production environment or external users. Developers manage Transfer Settings as trusted configuration. Explicitly selecting an enabled Setting is execution intent in this phase. This resolves the execution-boundary questions raised on Issue #3; it does not introduce a general approval workflow.

Read this alongside the existing Transfer Execution, Transfer Run, Work Item, Dirty Key, Transfer Setting, Destination Link, Active Black and Lineage concepts indexed by [Business Design](../business-design/README.md).

## Decisions

- Execute `setting.source_sql_body` as its canonical stored SQL, binding run arguments. Do not mirror it in code or add an approved SQL registry. Analysis and generation status remain analysis and generation metadata, not approval states.
- The application supplies one explicit execution definition per Setting: physical source schema/table, expected logical source key definition, and a function projecting the Dirty Key payload to that logical key. No row payload or SQL is supplied by that function. Reject unregistered, ambiguous or mismatching definitions. Do not infer physical-to-logical identity from column names.
- Use the existing stored `destination_link.generated_insert_transfer_sql_body` for Black Insert, prepared by the developer in this experiment. Bind destination-column parameters from the existing mapping. Require a single inserted row with `RETURNING` destination keys matching the mapping. This is an implementation prerequisite, not a new SQL generator, registry or approval state.
- Use Serene for fixed metadata SQL. Stored SQL requires an explicit exception because it is a runtime string: lower named value markers mechanically, preserving literals, comments, casts and SQL structure. Do not concatenate identifiers, predicates or row values into executable application SQL. Stored SQL must be a single statement using named markers (no positional markers or transaction control); its source query must return a rowset. Trusted authors remain responsible for statement meaning and mapping agreement.
- Own the transaction sequence on a dedicated idle PostgreSQL client (revised by the owner in PR #4). Commit Run creation independently. Reacquire configuration locks and reject changed configuration before selecting pending work in a new transaction. Commit all transfer work and Run success together. If work or its COMMIT fails, discard that transaction and record Run failure in a separate transaction. Preserve the original failure in the error cause, with cleanup/recording failures as secondary errors. A failure of that recovery or a process stop between transactions can leave a running Run; general recovery is outside this phase. Lock the Setting to serialize its runs, and hold shared locks on link/destination configuration. Freeze eligible Dirty Key/link identities before evaluating the source; persist each evaluated Work Item before its write, consistent with the required decision fields in the existing DDL.
- Support only existing source + immutable + no prior Active Black. Coalesce repeated logical keys within the same run/link using the existing duplicate-ignore result. Exclude finalized Dirty Key/link processing. Other routes fail without destination/processing changes; attempt to mark the independently persisted Run failed after discarding its work transaction. Configuration failures before Run creation leave no Run.

## Consequences and verification

The complete stored source query runs once per nonempty snapshot; no host-side source filter is injected. Key values must have consistent JSON-compatible types in the explicit resolver and PostgreSQL result. Sequence-generated destination keys, partial success, red/update/delete/retransfer and scheduling are outside this slice. A later phase must revisit these limits before broader use.

PostgreSQL integration tests cover the full trace, reruns, repeated keys, context isolation, invalid definitions/mapping and atomic failure. Marker-lowering tests cover binding and preserved lexical regions. Run `pnpm verify`, retain audit review-required paths, and perform the separate Alder review required by Issue #3.

## Owner confirmation after Alder review

[PR #4 decision](https://github.com/mk3008/velvet/pull/4#issuecomment-5645913309) confirms that Dirty Key is a request to reevaluate Source Table + Key against the current snapshot, not an event to replay. Multiple registrations for one key are normal; coalescing them within one Run/link is appropriate. A fresh Dirty Key for an existing Active Black currently fails the whole Run and leaves unrelated new keys pending as well. This is an accepted Phase 1 limitation for continuous intake, not a permanent business error. The next phase must handle snapshot reevaluation (no-op / Red+Black / update / delete as applicable). Do not add those routes, partial success or defer to this PR.

The same PR's [code-structure decision](https://github.com/mk3008/velvet/pull/4#issuecomment-5645945507) removes mandatory architecture/framework conventions. Code structure is AI-owned; existing folders and public surfaces are retained where useful, with no prescribed recursive template or named architecture. Business Design and PostgreSQL product assumptions remain unchanged.

Additional verification covers independently visible Run creation, PostgreSQL deferred FK failure at COMMIT, secondary failure-recording errors, configuration changes between transactions, and the accepted prior-Active-Black limitation. Resolver/key validation during work now leaves a failed Run because Run creation has already committed; invalid configuration rejected before creation still leaves no Run.
