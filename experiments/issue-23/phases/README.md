# Reviewable set-based phases

Responds to [the new review](https://github.com/mk3008/velvet/pull/24#pullrequestreview-5192120827).
This supersedes the ordered worker as the direction of investigation. It is an
explicit immutable profile candidate, not a transparent replacement for stored SQL.
The [measured result](results.md) selects the bounded profile and records its limits.

`work.mjs` contains complete, ordinary SQL statements. Node loops over configured
Links, never source/Dirty Key rows. PostgreSQL executes `INSERT ... SELECT`, joined
UPDATE/DELETE and relation-based classification; no worker loop or dynamic EXECUTE.
The production row/routine paths and Phase 1–5/#19 tests remain available.

The source is materialized once per nonempty Run, including non-admitted keys.
The snapshot's primary key rejects global duplicate logical identities. Pending
eligibility is fixed before that snapshot, bounded by whole Dirty Keys, with no
watermark. Every admitted pair receives Work and Processing, including duplicates.

For each Link in `execution_order`, Node materializes a decision relation, prepares
Work, inserts Reds, releases historical Active references, retires Active, writes
Red Lineage, inserts Blacks, verifies affected cardinality and identities/content,
then writes Active, Black Lineage and Processing. Later Links decide only after
these statements complete. The whole work transaction is atomic; separately durable
Run creation and conditional failure recording preserve lost-COMMIT behavior.

Source sequence values and Black destination keys remain in TEMP. Red keys are also
allocated into TEMP before insertion. Destination, Active and Lineage reuse these
identities without RETURNING payloads or Node row state. Work correlations use the
unique Run/Dirty Key/Link relation. This is the current Active key map; no new
permanent KeyMap table or predecessor control-table model is introduced.

## Explicit authoring contract

The fixed profile has text logical/destination identities, exact numeric amount,
nullable memo, immutable history and exclusions `row_id`/`allocation`. SQL source,
mapping, model and operation configuration are checked and reread under locks.
Unknown configurations fail before work; arbitrary stored SQL/JavaScript callbacks
are not translated. To apply the pattern to a different Setting, author its complete
source and complete phase statements, declare types/comparison/dependencies, and
run its semantic oracle. This prototype does not expose a new public API.

Different logical keys must be independent: no cross-key aggregate reads, triggers
observing intermediate global Work/Processing counts, or sequence-interleaving
contracts. An explicit opt-in is required; matching column names alone is insufficient.
Unsupported mutable/insert_only, date hooks and arbitrary operation SQL stay on the
existing executor. No Business Design meaning or current model is redefined.

Preallocation does not eliminate prior-write visibility. `dependency.sql` and the
bulk Black statement actually read a preceding journal row for Links 2/3. They can
reuse an unchanged journal; an unused newly allocated journal key is not assumed to
exist. This preserves the relevant #19 dependency, while exact cross-key trigger
order is deliberately outside this profile. Canonical comparison checks final
destination, Active, Work, Lineage, Processing and hashes/references, normalizing
surrogate identities by their relational context instead of numeric sequence order.

## Official Serene TEMP composition

As of Velvet #28, `materializeSource` delegates to Serene v0.7.0
`materializeTemp(statement, 'velvet_source_snapshot')`, then binds named values.
It accepts only identity-backed, unbound code-authored `Sql`. The literal single
identifier is quoted by upstream; arbitrary schema paths and identifier fragments
are rejected. PostgreSQL creates it in the session TEMP schema, still accessible
as `pg_temp.velvet_source_snapshot`. No connection or transaction is opened by the
helper; the phase executor retains its existing connection and atomic work boundary.

Actual statement terminators are rejected upstream. Semicolons inside quoted data
or comments are now accepted; the authored experiment query is unchanged. This
lexical check does not prove SELECT grammar or absence of side effects.
`materialize.test.mjs` verifies identity, binding, identifier rejection and real
PostgreSQL commit/rollback cleanup in the normal Verify workflow.

The former local CTAS composition exception is retired. This does not apply to
DB-master stored SQL in the product runtime: Decision 0013's explicit reviewed
master boundary and conservative subset remain unchanged. Historical
`sql-audit.json` and measured results record the original Serene 0.4 evaluation;
run `node experiments/issue-23/phases/audit.mjs` for the current inventory.

`content-review.mjs` retains supplemental whole-file hints for historical raw `.sql`
assets outside Serene's JavaScript/TypeScript candidate inventory. The official
v0.7 audit supplies runtime content signals; the supplemental pass is not its
replacement. In that supplemental pass: persistent CREATE TABLE
(including UNLOGGED) is elevated; TEMP is temporary-state/advisory; ON COMMIT DROP
alone is lifecycle, while a separate DROP remains elevated. This conservative hint
pass does not alter construction levels, strict exits, or original Serene signals.
It may flag literals/comments and is not a full SQL-content analyzer.

## Reproduce

Run `pnpm build`, then with `ASHIBA_DB_URL` pointing at disposable PostgreSQL:

```sh
node experiments/issue-23/phases/materialize.test.mjs
VELVET_ROWS=10000 VELVET_LINKS=3 ORDERED_OUTPUT=tmp/phases-results.json node experiments/issue-23/phases/evaluate.mjs
node node_modules/@mk3008/serene/tooling/cli.mjs experiments/issue-23/phases
```

The Actions workflow runs 1,000×1 and 10,000×3 plus the existing fresh-connection,
two-Setting backlog recovery experiment. Calls are `15 + 16 × Links` for a nonempty
Run (31/63), independent of row count; checks remain separate readable statements.
This deliberately does not optimize the old 11-call count. Resource measurements,
45-second illustrative work allowance and 180-second recovery evaluation ceiling
are comparative assumptions, not production qualification.
