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

## Narrow local Serene boundary

`materializeSource` accepts only an identity-backed, unbound Serene `Sql`, not a
string, raw fragment, fabricated object or BoundSql. `bind` verifies that identity
and lowers parameters once; the fixed CTAS prefix adds no parameters, so its output
positions and values remain unchanged. There is one fixed `pg_temp` table name and
no configurable prefix/suffix/schema/name. The complete SELECT is authored in
`work.mjs`; its grammar and side effects still require review. The conservative
semicolon prohibition also rejects semicolons inside strings/comments. It does not
claim to prove read-only SQL or parse SQL grammar. No runtime AST is used.

`pg_temp` is PostgreSQL's special alias for the current session's temporary schema.
`CREATE TEMPORARY TABLE pg_temp...` is permitted; this does not permit arbitrary
schema-qualified TEMP creation. The source snapshot, pending and decision relations
use only this fixed alias. PostgreSQL's [CREATE TABLE regression cases](https://github.com/postgres/postgres/blob/master/src/test/regress/expected/create_table.out)
explicitly distinguish `pg_temp.doubly_temp` (allowed) from `public.temp_to_perm`
(rejected). The existing `materialize.test.mjs` exercises the exact wrapper on
PostgreSQL, including bound values, commit/rollback cleanup and connection reuse;
the phase evaluation also executes the pending and decision CTAS statements.

This is an explicit local construction exception permitted by the review, not a
new Serene identity or general `unsafeRaw` API. Upstream 0.4 inventory remains
unchanged: unresolved flows and any concatenation finding remain visible for manual
review. The exception covers ONLY the fixed composition expression in
`materialize.mjs`; it does not approve arbitrary string-built SQL elsewhere.
See [Serene #26](https://github.com/mk3008/serene/issues/26).

`content-review.mjs` reports an independent advisory axis: persistent CREATE TABLE
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
