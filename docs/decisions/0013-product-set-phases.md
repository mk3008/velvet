# 0013: DB-managed immutable set phases

Status: implementation candidate for Issue #25, dependent on Decision 0012 / PR #24.

The existing `executeTransfer` boundary dispatches on the nullable Setting `set_phase_definition`. Null preserves the existing row/routine path. A non-null definition is an explicit opt-in: invalid configuration fails without fallback. The database owns configuration; callers supply bound arguments, not SQL. No experimental `scale_*` profile or application-side SQL allowlist is used.

Apply `db/migrations/0025-set-phase.sql` once to an existing installation before deploying this runtime. New installations use canonical DDL. Existing rows remain null. Enable a reviewed Setting, all enabled Links and their Destinations in one administrative transaction; disable by setting only the Setting definition to null. Keep legacy row SQL available for that transition. No history keys are migrated or stringified.

## Version 1 configuration

All three objects have `version: 1` and a nonblank `revision`. A statement is `{text, sha256}` where SHA-256 hashes the exact UTF-8 text. Full executable fixture: `tests/support/set-phase-fixture.ts` (`enable`). This is developer-owned deployment configuration, not an end-user SQL API.

| Master      | Additional fields                                                                                                                     |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| Setting     | `independentKeys: true`, positive `maxDirtyKeys`, `sourceSchema`, `sourceTable`, `sourceSqlSha256`, `sourceIdentity`, `dirtyIdentity` |
| Link        | `evaluate`, `black`                                                                                                                   |
| Destination | `redProjection`, `red`, `verify`                                                                                                      |

The canonical full source is still `source_sql_body`; its exact hash must match `sourceSqlSha256`. Each nonempty Run evaluates it once before any Link. Only flat string-valued source/destination keys with declared `text` types and distinct ASCII column names are supported. This restriction preserves the existing JSON key and SHA-256 representation; it is not a conversion. Version 1 rejects date hooks and non-immutable models. `independentKeys` is a reviewed semantic assertion: different logical keys must not depend on one another's writes.

## Fixed relation contract

Every SELECT slot is a complete developer-owned SELECT, materialized by one of six fixed `CREATE TEMPORARY TABLE pg_temp.<name> ON COMMIT DROP AS` forms. No identifiers, expressions, joins or predicates are supplied as fragments. `pg_temp` is PostgreSQL's fixed session alias. Statements cannot contain semicolons (including literals/comments); this conservative authoring subset is not an SQL parser or a side-effect proof.

| Statement      | Input                                                | Required output                                                                                        |
| -------------- | ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| sourceIdentity | `velvet_source_snapshot`                             | `source_key jsonb`, `source_values jsonb`; exactly one unique logical identity per complete source row |
| dirtyIdentity  | `velvet_pending_keys(dirty_key_id, source_key_json)` | `dirty_key_id`, `source_key jsonb`; exactly every admitted history row                                 |
| evaluate       | `velvet_phase_input`                                 | one row per `occurrence=1`: `dirty_key_id`, `current_values jsonb`, `active_values jsonb`              |
| redProjection  | `velvet_phase_decision`                              | exactly `requires_red` rows: `dirty_key_id`, new `red_key jsonb`, `red_values jsonb`                   |
| red / black    | `velvet_phase_writes`                                | one INSERT, no RETURNING; driver command and rowCount must match                                       |
| verify         | `velvet_phase_writes` and real Destination           | `operation`, `destination_key jsonb`, `destination_values jsonb`; exact match with intended writes     |

All names above are under `pg_temp`. Input contains `source_key`, `source_hash`, `source_exists`, `source_values`, `mapped_values`, `black_key`, `active_black_id`, `active_key`, and `occurrence`. Decision adds evaluated values, `skip`, `requires_red`, `requires_black`. Writes contains `dirty_key_id`, `work_item_id`, `operation`, `destination_key`, `destination_values`. JSON destination values must contain exactly every declared destination column. Authors implement canonical corrections in evaluation and INSERT consistently and read actual old destination values for Red. Runtime compares exact JSONB after excluding configured columns. SQL values stay in PostgreSQL, including numeric precision and NULL.

User parameters and `velvet_run_id`, `velvet_setting_id`, `velvet_link_id` use lexical parameter binding. Invocation arguments cannot use the reserved `velvet_` prefix. No runtime AST, SQL builder, generated procedure, or generic EXECUTE worker is introduced. Serene screens fixed orchestration SQL; trusted master SQL explicitly has no Serene source identity. Hashes/revisions detect deployment drift; they do not certify semantics or constrain a privileged master editor. SELECT functions/triggers can have side effects and require review. Administrative ACLs and immutable/reviewed deployment practice remain the application's responsibility.

## Atomicity and evidence

Admission caps whole Dirty Keys and freezes all eligible Links for each admitted history row. Duplicate logical keys retain Work and Processing but evaluate once per Link. Link execution follows configured order; Red, retirement and Lineage complete before Black; Active, Lineage and Processing complete before the next Link. All historical Work references to retired Active rows are released, while their evaluated keys remain unchanged.

The shared boundary commits Run creation separately, locks and rechecks configuration, then performs work atomically. `run.execution_configuration` records the exact master rows, text, hashes and revisions. Errors roll back destination, TEMP and work metadata and durably mark the Run failed; a lost successful COMMIT response preserves success. TEMP relations drop on commit/rollback, including reused connections.

Verify runs PostgreSQL regressions alongside all existing Phase 1–5 tests. `Issue 25 deployment` uses the production boundary with 1,000/10,000 source rows, 1/3 Links, cap 1,000, 5ms added per driver call and 10,000 initial Dirty Keys with continuing arrivals. The illustrative envelope remains 45s per bounded Run and 180s recovery, not a universal SLA. Record actual CI evidence before accepting this candidate. This task stops at a reasonable deployment candidate rather than reopening the algorithm tournament.

Set-phase opt-in also requires empty-input safety: Red and Black INSERT statements execute even with zero targets to preserve bounded per-Link orchestration. Statement-level triggers and volatile author functions must not manufacture effects for empty input. This differs from a skipped row-by-row INSERT and must be reviewed explicitly.

Construction review: `pnpm audit:sql` retains four `UNRESOLVED` findings in `set-phase/execute.ts`: the imported fixed-SQL binder and its driver call, fixed materialization, and reviewed INSERT execution. Manual review follows those paths to the finite `queries.ts` literals or hash-validated master statements in `config.ts`; the findings are not suppressed or relabelled as screened source. TEMP CREATE/ALTER/ANALYZE/DROP affect fixed session relations only. The persistent DDL is the separate, explicit four-column migration. Authored destination DML remains a deployment SQL-content review obligation.

Fresh Alder review (2026-09-13, separate context, pinned Alder v0.1 / knowledge v0.3) found and resolved two blockers: malformed non-null exclusions must fail, and the supported routes need a full normalized row/set history oracle. The final review of runtime `090e2a4` found no unintended Business Design change. It also checked rejection of incompatible existing Active keys, Destination-owned Red, actual INSERT/receipt validation, ordered metadata visibility, and the shared durable Run boundary. The review is implementation evidence, not human approval of new business semantics.

## Serene v0.7 binding adoption (PR 29 follow-up)

The reviewed-master gate, hashes/revisions, fixed TEMP wrappers and conservative
semicolon subset above remain. `bindStoredSql` now passes complete external SQL to
`externalSql` / `bindExternal(..., 'indexed')`; the actual result remains
`review-required / EXTERNAL_SQL`. It never enters source-backed `materializeTemp`.
Velvet keeps the existing pre-execution checks for missing own data parameters,
native positional markers and unterminated quotes/comments, and selects only the
referenced values from the shared Run/Link context. Serene v0.7 does not reject
missing names itself and rejects unused supplied values, so deleting those local
checks/selection would change the current fail-closed and shared-context behavior.
Serene alone generates positional markers and the ordered value array. This is a
binding-mechanics replacement, not a change in trust, deployment approval or SQL
semantics. The [adoption verification](../adoption-v0.2-verification.md) records the
audit and regression evidence.
