# Alder v0.2 / Serene adoption verification

The current pin is Serene v0.7.0; see [the PR review follow-up](#serene-v070-review-follow-up).

## Initial v0.6.0 adoption

Issue: #28. Baseline: `39e5a79` (includes the completed Issue #18 schema review).
This is a dependency/adoption change; product `src`, schema and Business Design
are unchanged. No performance search or new production guarantee is introduced.

## Provenance and compatibility

- Alder tag `v0.2`: `b51c63ea830d6e5a53c63ebed4dc3c5d45879e25`.
  Copied knowledge remains v0.3. Local `git hash-object` and upstream GitHub blob
  both equal `1af50d44ce53083ff758b4c9ca7a808bb0568856` (byte identity).
- Serene tag `v0.6.0`: `2946ee29bc959ca5e4cd27b00b68eb63f4f9a669`.
  The package and lockfile pin that release; no unrelated dependency upgrade is intended.
- The historical code-authored source helper delegates to official `materializeTemp`,
  with the literal name `velvet_source_snapshot`, then binds values once. The source
  query and phase execution order are unchanged. The quoted TEMP name still resolves
  through `pg_temp.velvet_source_snapshot` on the caller's existing connection.
- Upstream lexical terminator rejection replaces the experimental broad semicolon
  ban: quoted/comment semicolons are allowed. Identifier paths/fragments, forged
  identity, bound objects, actual terminators and unused named values are rejected.
  No claim of read-only SQL or semantic approval follows from construction identity.
- Product DB-master SQL keeps Decision 0013's hash/revision, reviewed-statement identity,
  conservative semicolon subset, fixed TEMP slots and `bindStoredSql` marker lowering.
  It is not converted into Serene `Sql` or hidden from construction review.
- Historical `sql-audit.json` and measured evaluation results are preserved as history.
  The current experiment audit removes only the retired exception declaration and
  retains all official findings. Its supplemental whole-file content hints remain
  useful for raw `.sql` assets outside the official JS/TS source inventory.

## Fresh Alder review

A separate agent reviewed the working-tree implementation against baseline `39e5a79`,
reading Business Design, Decisions 0012–0014, implementation/tests and full knowledge
v0.3, and independently inspecting upstream v0.6.0 runtime/scanner source.
No blocking semantic or implementation findings were identified. Q1/P1 continuity
and connection ownership, Q2 restriction causes, Q3/P2 complete-source handoff and
honest master provenance were sufficient. Under S, no new Business decision or
performance tournament is warranted. The review was conditional on completing the
lockfile, audit and real PostgreSQL checks below; it is not Business approval.

## SQL audit delta

Both versions scanned the same 24 `src` files: 130 findings, ordinary 52,
review-required 78, violations 0. Construction fields are unchanged, including
all four `UNRESOLVED` sites in `set-phase/execute.ts` and the stored-SQL paths.
Counts below are signal occurrences attached to candidate sites, not unique statements.

| Signal                                     | v0.4.0 | v0.6.0 | Reviewed disposition                                                                       |
| ------------------------------------------ | -----: | -----: | ------------------------------------------------------------------------------------------ |
| `SQL_PERSISTENT_DDL` (elevated)            |      0 |      6 | Fixed TEMP constraints; retain elevated output                                             |
| `SQL_DROP` (advisory)                      |      7 |      2 | Five `ON COMMIT DROP` lifecycle hints disappear upstream; standalone DROP remains          |
| `SQL_CREATE_TEMP` (advisory)               |      5 |      5 | Fixed session relations; unchanged                                                         |
| `SQL_SELECT_WITHOUT_WHERE`                 |     16 |     16 | Unchanged                                                                                  |
| `SQL_UPDATE_WITHOUT_WHERE`                 |      3 |      3 | Unchanged                                                                                  |
| `SQL_DELETE_WITHOUT_WHERE`                 |      1 |      1 | Unchanged                                                                                  |
| `SQL_PROCEDURAL_BODY` / `SQL_ROUTINE_CALL` |      0 |      0 | No new signal in this source inventory; not proof that stored SQL has no delegated effects |

The six elevated sites are `sourceConstraint`, `dirtyConstraint`,
`evaluationConstraint`, `redConstraint`, `writesConstraint`, `receiptsConstraint`
in `src/features/execute-transfer/set-phase/queries.ts`. Each adds a primary key
to a literal `pg_temp.velvet_*` relation created by the fixed phase path. The
runtime context establishes TEMP lifetime; the file-local content heuristic sees
`ALTER TABLE` and conservatively elevates it. Keep all six signals visible: no
filter, suppression, priority rewrite or construction downgrade was introduced.
The referenced relations are created inside the atomic work transaction and drop
at commit/rollback. These statements do not alter persistent product tables.

Normal audit exits 0; strict audit exits 1 on retained unresolved provenance.
Separate temporary CLI probes verify persistent DDL, procedural bodies and routine
calls emit elevated signals without failing ordinary/strict construction gates;
TEMP stays advisory. Unresolved input exits 0 normally / 1 strictly; concatenated
SQL exits 1 in both modes; missing input exits 2. These checks neither execute DDL
nor add production SQL exceptions.

## Verification

- pnpm 10.19.0 frozen-lockfile installation succeeds. Only Serene resolution changes
  are retained in the lockfile; unrelated metadata/peer rewrites are excluded.
- Local TEMP identity/binding/identifier/terminator checks and experiment audit succeed.
- Local `ASHIBA_SKIP_DB_BACKED_TESTS=1 pnpm verify` succeeds: DDL CLI 52 tests,
  application 35 tests; 231 DB-backed tests explicitly skipped locally because no
  PostgreSQL/Docker is available. Typecheck, build and DDL metadata/drift checks pass
  (0 errors, 0 warnings). Full database coverage remains the PR CI gate.
- [PostgreSQL Verify](https://github.com/mk3008/velvet/actions/runs/34799228202)
  succeeds at implementation commit `20151d25772f4d83f34037074c6073ce080a5f68`:
  52 DDL CLI + 266 application tests, with no DB skips, plus the TEMP regression.
  This includes existing row/routine and immutable set-phase behavior, stored-SQL
  lowering, binding, commit/rollback cleanup and reused connections. Typecheck,
  build, DDL metadata/drift and SQL audit also pass.
- The existing [Issue 23 phase workflow](https://github.com/mk3008/velvet/actions/runs/34799228192)
  auto-runs its 1,000-row/1-Link and 10,000-row/3-Link matrix because the historical
  helper changed. It is unchanged; no new candidate search or performance acceptance
  criterion was added. Final workflow status and any later documentation-only head
  checks are recorded in [PR #29](https://github.com/mk3008/velvet/pull/29).

## Serene v0.7.0 review follow-up

Requested in [the owner review](https://github.com/mk3008/velvet/pull/29#issuecomment-5659464055).
Baseline for this follow-up is `5177d9858ba79858e9175a5bf8d8abfd76a64990`.
Serene tag `v0.7.0` resolves to `48545f18b73e5d0111ac8d550e25569d270e6dc4`;
package, lockfile and current adoption references are synchronized. Alder and its
review knowledge are unchanged.

`bindStoredSql` delegates positional-marker generation and value-array ordering to
`bindExternal(externalSql(text), selectedValues, 'indexed')`, returning the actual
Serene external-bound value. Runtime review therefore reports
`review-required / EXTERNAL_SQL`, never source-backed provenance. The product
hash/revision checks, reviewed-object identity, fixed CTAS composition, invocation
permissions, and conservative master semicolon subset remain unchanged.

Retained local work is authoring validation and argument selection, not marker
lowering: missing/inherited/undefined/accessor parameters, native positional markers
and unterminated quotes/comments still fail before execution. Shared Run/Link
contexts may still contain unused values; only referenced own data properties are
passed to Serene. Serene v0.7 alone neither rejects absent requested names nor
accepts extra supplied names, so removing this compatibility would weaken early
failure or reject valid existing calls. No private scanner API is imported.
The updated tests preserve all prior rejection cases and add shared-context,
getter, external provenance, source-backed API rejection and forged-master cases.

Audit results, fresh review and CI outcomes for this follow-up are recorded below
and in PR #29; the v0.6 results above remain historical evidence.

### Follow-up audit and verification

The current full `src` inventory contains 136 candidates: ordinary 52,
review-required 84, violations 0. The previous 130 candidates retain their
construction classifications. The six additions are two external boundaries in
`bindStoredSql`, two external statements in its new tests and two deliberately
misused source-backed APIs in those tests (retained as `UNRESOLVED`). No existing
reviewed-master call site was promoted to ordinary.

All six former `SQL_PERSISTENT_DDL` signals on fixed `pg_temp` constraints are now
`SQL_TEMP_DDL` advisory, as recognized by upstream v0.7.0. No priority is rewritten
locally. The current inventory has no persistent-DDL elevation; existing TEMP
creation hints remain. New provenance tests add two SELECT-without-WHERE hints.
Normal audit still exits 0 and strict audit exits 1; isolated CLI probes preserve
persistent/procedural/routine elevation and violation/input-error exits.

The fixed DB-master CTAS wrapper still returns its explicit reviewed composition;
it does not manufacture source identity. Its complete stored body is bound through
the external API, while the original fixed prefix/values separation remains.

A fresh separate Alder review found no concrete blocker or Business meaning change:
required-name failures, shared-context selection, atomic execution and durable Run
behavior retain their current guarantees. External provenance and the local
reviewed-master identity remain distinct. One compatibility limit is retained:
Serene's generic scanner treats backticks as quoted spans, so an authored PostgreSQL
custom backtick operator around named parameters can fail binding. No affected
repository SQL was identified. This does not warrant an arbitrary raw fallback or
an unbounded grammar-compatibility claim.

Local pnpm 10.19.0 frozen installation and non-DB `pnpm verify` succeed: 52 DDL CLI
and 39 application tests pass; the same 231 DB tests are deferred to PostgreSQL CI.
TEMP regression and normal/strict audit checks pass locally. The required current
PostgreSQL Verify, TEMP and phase regression outcomes are recorded in
[PR #29](https://github.com/mk3008/velvet/pull/29) at the follow-up commit; prior v0.6
CI links above are not used as proof of the new external binding integration.
