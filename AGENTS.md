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

Read `docs/scope/SYSTEM_SCOPE.md`, `docs/technology/TECHNOLOGY_POLICY.md`, `docs/testing/TEST_POLICY.md`, and `docs/review/AUTHORITY_MODEL.md` before implementation. Follow the concept index into the relevant Process Map and DFD. Human-owned meanings must not be inferred from implementation or changed to make tests pass.

Run `pnpm verify` for changes affecting repository wiring or runtime behavior. A PostgreSQL connection via `ASHIBA_DB_URL`, or Docker for Testcontainers, is required for the complete test suite. Existing `ASHIBA_*` environment names and `rawsql_transfer` schema names remain contracts during this repository-only migration.

Do not merge PRs or publish packages unless explicitly requested. Report incomplete or skipped verification. Keep temporary task notes in `tmp/`.
