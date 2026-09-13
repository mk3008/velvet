# Remove obsolete structural assumptions

Inventory recorded before implementation for Issue #13 against main `5d551595fdbd10d173b05fe3cbd39866548a4931`. This is a local implementation decision, not a new layout convention or approval of business meaning.

| Element | Classification | Evidence and action |
| --- | --- | --- |
| Business Design, Concept/DFD/Process, DDL, Phase 1–5 execution | required | Preserve meaning, source formats and execution behavior. No changes. |
| Root exports and registration/execution signatures | required | `package.json` exports only the root entrypoint; preserve its names and structural parameter/result contracts. Internal deep paths are not package exports. |
| Three use-case `boundary.ts` files | useful | Destination validates and maps input/output; setting coordinates input, transactional workflow and output; execution owns trusted configuration, transactions and failure semantics. Retain all three. |
| Setting `input.ts`, `output.ts`, `workflow.ts` | useful | Separates substantial validation/mapping from ordered transactional writes. Retain. |
| Three INSERT `query.ts` + `boundary.ts` pairs | useful | SQL and raw driver result types are reviewable separately from Zod coercion, result validation and exactly-one-row checks. Retain those checks and files; this is not a template for other queries. |
| Name resolver's three-file directory | misleading / over-structured | One small SELECT, input validation and a two-field projection need no separate row-mapper and forwarding execution function. Colocate them in one query module, preserving projection behavior (do not introduce previously absent result parsing). |
| `FeatureQueryExecutor`, `FeatureQuerySource`, `AshibaQueryParams/Row` | misleading / over-structured | Generic typed query and transaction capability are useful, but framework/product provenance is not their purpose. Rename internal types and module to query terminology, retain phantom type contract and method signatures. |
| `queryMany`, `queryOne`, `queryOneOrNull` | obsolete / over-structured | First only forwards to executor; latter two have no consumers. Use the executor directly; retain INSERT-specific cardinality checks. |
| `src/libraries/sql/sql-client.ts` | obsolete | Unused re-export, with misleading multi-DB advice. Remove; no root export depends on it. |
| PostgreSQL adapter | useful | Serene named-to-indexed binding and native pg seam support actual runtime and tests. Retain implementation, remove obsolete Ashiba CLI example. |
| `#libraries`, `#adapters` aliases | obsolete | No consumers in source or tests. Remove matching package, TypeScript and Vitest mappings. |
| `#features`, `#tests` aliases | useful | Existing imports use these access paths. Retain; names do not prescribe architecture. |
| `features`, `_shared`, `adapters/pg` directories | incidental / useful | Current use cases, shared query contract and driver code are easy to locate. Keep without a mandatory tree. |
| `ashiba.config.json` | obsolete | No repository script, dependency, build/test config or code reads it. DDL tooling passes paths/schema explicitly; runtime schema is in SQL; Serene audits `src`. Remove unused featureRoot/sqlRoots/format settings. Keep ASHIBA environment contracts. |
| Feature README structure language | misleading | Remove imperative CRUD/layout advice and describe actual entrypoints and validation responsibilities. Retain product scope and transaction requirements. |
| Spec relationship metadata | required | Business Design traceability is consumed by documentation tooling. Keep paths and meaning. |
| Build/test wiring and Serene scope | required | Preserve current root API/package behavior and test discovery; update only removed aliases and moved imports. Audit still covers all `src`, including moved SQL; keep review-required/unresolved findings visible. |

No blanket flattening, boundary removal, adapter ban or new mandatory filename follows from these decisions. Historical decision/review records remain historical. Validate with full `pnpm verify`, PostgreSQL tests, unfiltered SQL audit and fresh Alder review before marking the PR ready.
