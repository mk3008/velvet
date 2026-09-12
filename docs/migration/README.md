# Ashiba to Velvet repository migration

## Source and history

- Source repository: https://github.com/mk3008/ashiba
- Pinned source: `af90dc5db236d5894f264bc67a6c6c8d7bb24ec2`
- Filtered history tip: `8c54c0c28715cd7b775abbeec5ee46cfe7a8ab15`
- History filter: git-filter-repo 2.47.0.
- Retained history: 26 commits, with original author/committer identities, dates, messages, and the relevant parent relationships. Path filtering changes commit hashes and removes empty commits. Signed source commits cannot retain their original signatures after filtering.
- [Commit map](ashiba-commit-map.txt) maps original to filtered hashes; zero hashes identify removed commits. Consult the original repository for unrelated history and the earlier rawsql-ts provenance recorded in the root README.

| Ashiba path | Velvet path |
| --- | --- |
| `dogfood/transfer/` | `/` |
| `packages/ddl-docs-cli/` | `packages/ddl-docs-cli/` |
| `scripts/generate-transfer-docs.mjs` | same path |
| `scripts/verify-transfer-docs-drift.mjs` | same path |
| `LICENSE`, `tsconfig.base.json` | same paths |

The one-time import workflow fetched the pinned public source, applied the filter, verified the expected history tip, and attached that history with a fast-forward merge commit. It removed itself from the resulting tree. No force push or source-history rewrite was used.

## Repository-only changes

The product is named Velvet (`@mk3008/velvet`); its development documentation tool is `@mk3008/velvet-ddl-docs`. Transfer remains the domain vocabulary. The runtime source, runtime tests, reviewed SQL, generated query snapshots, and DDL are unchanged. Documentation and tool references are relocated; root-path review signals retain regression coverage.

The workspace, lockfile, verification commands, license, lint parser configuration, and CI now live here. The old CLI lint command had no ESLint configuration in Ashiba; the migrated configuration enables TypeScript syntax checking without introducing new stylistic rules. Type checking and tests remain separate mandatory gates.

`ASHIBA_DB_URL`, `ASHIBA_SKIP_DB_BACKED_TESTS`, and the `rawsql_transfer` schema are retained to avoid unrelated contract changes. The former implementation-policy constraints were subsequently removed by the owner in PR #4; current requirements are listed in AGENTS.md. Existing semantic AI-review findings are historical input, not a fresh approval of the design; reviewing them and implementing execution are later phases.

## External runtime dependency

`@ashiba-ts/named-parameters` is not published on npm. Velvet uses pnpm's Git subdirectory dependency at the pinned source commit, rather than moving or publishing that package. Its upstream prepack builds the package; a first install also prepares its upstream workspace. The package remains Ashiba-owned research. Replacing it with Serene or an inline helper is outside this migration.
