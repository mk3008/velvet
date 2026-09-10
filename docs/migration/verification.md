# Migration verification

- Source: Ashiba `af90dc5db236d5894f264bc67a6c6c8d7bb24ec2`.
- Preserved filtered history: 26 commits through `8c54c0c28715cd7b775abbeec5ee46cfe7a8ab15`, verified as an ancestor of Velvet main.
- Protected payload comparison: all 52 runtime source, runtime test, and DDL SQL files match the source snapshot byte-for-byte.
- [PostgreSQL-backed migration verification](https://github.com/mk3008/velvet/actions/runs/34419225084): PASS. Documentation CLI: 65 tests. Transfer: 24 tests. No database-test skip flag was set. Type checking, CLI lint, build, metadata validation (zero errors/warnings), and generated-document drift checks passed.
- Verified lockfile committed at `8b4ae0e473299fbbb0080d777cd2c6c69528d906`; normal CI now uses `pnpm install --frozen-lockfile` and `pnpm verify`.

This verifies repository migration and existing behavior, not the completeness of Transfer Execution or the resolution of historical semantic review findings.
