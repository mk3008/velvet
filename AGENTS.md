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

Read `docs/scope/SYSTEM_SCOPE.md`, `docs/testing/TEST_POLICY.md`, and `docs/review/AUTHORITY_MODEL.md` before implementation. Follow the concept index into the relevant Process Map and DFD. Human-owned meanings must not be inferred from implementation or changed to make tests pass.

Run `pnpm verify` for changes affecting repository wiring or runtime behavior. A PostgreSQL connection via `ASHIBA_DB_URL`, or Docker for Testcontainers, is required for the complete test suite. Existing `ASHIBA_*` environment names and `rawsql_transfer` schema names remain contracts during this repository-only migration.

Do not merge PRs or publish packages unless explicitly requested. Report incomplete or skipped verification. Keep temporary task notes in `tmp/`.

## Business Design and Alder

Start at `docs/business-design/README.md` for current Business Design. Preserve existing source formats and follow their lifecycle and authority rules. Record material implementation assumptions and choices in `docs/decisions/`; do not treat records as human approval of unresolved business meaning.

For an Alder review, read Business Design, Decision Records, then implementation / DDL / tests. Use `docs/alder/review-knowledge.md` (Alder v0.1, knowledge v0.3; provenance in `docs/adoption.md`) in a separate agent or fresh context. Apply the full knowledge only during review.

## Raw SQL

For Raw SQL data-access work, read `rules/raw-sql-rules.md` and follow it as the repository contract. This v0.3 contract supersedes the former Ashiba `.sql` / generated SQL snapshot convention.

Use `@mk3008/serene` as the default construction path for executable raw SQL; if it cannot preserve needed SQL behavior, keep the exception explicit for additional review. For SQL-construction review, use the installed `pnpm audit:sql` and keep unresolved paths in review. Use ordinary results to skip redundant construction-provenance review, not SQL meaning/binding, authorization, or business-behavior checks. See `docs/adoption.md` for pinned sources and scope.

## Code structure ownership

The owner does not prescribe a named architecture, recursive feature framework, mandatory `boundary.ts`, or fixed roles for `features` / `libraries` / `adapters`. Structure, splitting and naming are AI-owned implementation choices justified by current needs. Retain useful existing structure without treating it as a future requirement. Alder review, Raw SQL Rules and Serene remain the cross-cutting implementation contracts. This does not remove product Business Design, Concept/DFD/Process/DDL meaning, PostgreSQL assumptions, or verification requirements.

The standing human implementation requirements are Alder review, Raw SQL Rules, Serene as the standard SQL construction/binding path, and PostgreSQL as the target runtime/database. Other cross-cutting choices (including ORM use, adapter shape, CLI/Web surface and coding style) are AI-owned, based on current requirements and concrete benefit; there is no separate technology exception policy.
