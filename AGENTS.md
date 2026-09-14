# Velvet Guidance

## 転送制御モデル

destination、dirty key、work item、transfer request、key map、active black、lineage、generated transfer SQL、転送実行に関わる実装を行う前に、以下を読むこと。

- `docs/concepts/README.md`
- `docs/concepts/destination/concept.json`
- `docs/concepts/dirty-key/concept.json`
- `docs/concepts/transfer-setting/concept.json`

destination、dirty key、transfer setting の意味をIssueやfeature内で再定義しないこと。

上記ドキュメントを、destination、dirty key management、transfer setting に関する現在の仕様正本として扱うこと。

## Repository verification

Read `docs/scope/SYSTEM_SCOPE.md` before implementation. Follow the concept index into the relevant Process Map and DFD. Human-owned meanings must not be inferred from implementation or changed to make tests pass.

Run `pnpm verify` for changes affecting repository wiring or runtime behavior. A PostgreSQL connection via `ASHIBA_DB_URL`, or Docker for Testcontainers, is required for the complete test suite. Existing `ASHIBA_*` environment names and `rawsql_transfer` schema names remain contracts during this repository-only migration.

Missing local PostgreSQL or Docker is not a stopping condition. Complete the implementation and available local checks, push the dedicated branch, open a PR, and use the existing PostgreSQL-backed Verify workflow for real database regression testing. Inspect CI results and fix failures before reporting completion. For task-specific performance, memory, RTT, concurrency or recovery measurements, add a reproducible GitHub Actions evaluation following `experiments/issue-20` and its workflow. Report measured evidence separately from assumptions and local skipped checks; do not claim deployment fitness from compilation alone.

Do not merge PRs or publish packages unless explicitly requested. Report incomplete or skipped verification. Keep temporary task notes in `tmp/`.

## Operational design

Prefer structures that make ordinary operations correct even when users forget, misunderstand or hurry. Remove avoidable error points with simple structural changes rather than relying on attention, memory or exceptional manual steps. In particular, migration filenames must sort in application order; allocate the next sequence number rather than an Issue number.

## Evaluation decisions

Apply [Alder v0.2 reasoning-led validation](https://github.com/mk3008/alder/blob/b51c63ea830d6e5a53c63ebed4dc3c5d45879e25/docs/adoption.md#prioritize-and-bound-technical-evaluation) (provenance in `docs/adoption.md`). The following routes those upstream principles to Velvet transfer recovery; it is not a separate review-knowledge customization.

Rank implementation candidates using requirements, cardinality, resource costs and timeout/backlog/retry dynamics before choosing experiments. A smaller change is not automatically the highest-value first experiment. Test uncertainties that can change the decision; do not deeply measure a coefficient improvement when reasoning already shows it leaves the main failure mode. Distinguish bounded work per Run from aggregate recovery cost. State the evaluation envelope and stopping condition; stop when a sufficiently good candidate is supported rather than searching indefinitely for an optimum. Ask the owner only when an unclear requirement level materially changes the work; record assumptions separately from production acceptance.

## Business Design and Alder

For SQL-first transfer scaling, prefer reviewable complete set-based phase SQL and
fixed TEMP materialization over growing a generic database worker. Preallocated keys
do not prove prior writes exist or remove Link dependencies. Reorder independent
keys only under an explicit authored contract; retain legacy behavior for arbitrary
stored SQL. Keep SQL construction provenance separate from TEMP/permanent DDL review
priority. A narrow reviewed composition exception must never become a generic raw
fragment escape hatch. See Decision 0012 for the current candidate and boundaries.
For DB-managed immutable phases, also follow Decision 0013: stored SQL hashes and revisions are deployment evidence, not Serene source identity or a semantic proof. Preserve exact existing keys when enabling a profile, validate actual INSERT results as well as receipts, and use the scoped Issue 25 deployment gate rather than rerunning the historical candidate tournament.

Start at `docs/business-design/README.md` for current Business Design. Preserve existing source formats and follow their lifecycle and authority rules. Record material implementation assumptions and choices in `docs/decisions/`; do not treat records as human approval of unresolved business meaning.

For an Alder review, read Business Design, Decision Records, then implementation / DDL / tests. Use `docs/alder/review-knowledge.md` (Alder v0.2, knowledge v0.3; provenance in `docs/adoption.md`) in a separate agent or fresh context. Apply the full knowledge only during review.

## Raw SQL

For Raw SQL data-access work, read `rules/raw-sql-rules.md` and follow it as the repository contract. This v0.3 contract supersedes the former Ashiba `.sql` / generated SQL snapshot convention.

Use `@mk3008/serene` as the default construction path for executable raw SQL; if it cannot preserve needed SQL behavior, keep the exception explicit for additional review. For SQL-construction review, use the installed `pnpm audit:sql` and keep unresolved paths in review. Use ordinary results to skip redundant construction-provenance review, not SQL meaning/binding, authorization, or business-behavior checks. See `docs/adoption.md` for pinned sources and scope.

## Code structure ownership

The owner does not prescribe a named architecture, recursive feature framework, mandatory `boundary.ts`, or fixed roles for `features` / `libraries` / `adapters`. Structure, splitting and naming are AI-owned implementation choices justified by current needs. Retain useful existing structure without treating it as a future requirement. Alder review, Raw SQL Rules and Serene remain the cross-cutting implementation contracts. This does not remove product Business Design, Concept/DFD/Process/DDL meaning, PostgreSQL assumptions, or verification requirements.

The standing human implementation requirements are Alder review, Raw SQL Rules, Serene as the standard SQL construction/binding path, and PostgreSQL as the target runtime/database. Other cross-cutting choices (including ORM use, adapter shape, CLI/Web surface and coding style) are AI-owned, based on current requirements and concrete benefit; there is no separate technology exception policy.

After feature work, inspect newly observed independent change reasons or reopened
structural concerns using [Decision 0015](docs/decisions/0015-observable-refactoring-boundaries.md)
and its linked rule. Keep, refactor for review, or record/propose based on concrete
maintenance tasks and shared-invariant ownership; file size alone is insufficient.
