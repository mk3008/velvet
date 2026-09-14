# Alder v0.2 / Serene v0.6.0 adoption verification

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
- PostgreSQL CI evidence is pending the branch push.
