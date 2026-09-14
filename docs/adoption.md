# Adopted review and SQL dependencies

| Dependency                                 | Selected source                                                              | Local use                                                   |
| ------------------------------------------ | ---------------------------------------------------------------------------- | ----------------------------------------------------------- |
| Alder v0.2, research review knowledge v0.3 | `mk3008/alder` tag `v0.2`, commit `b51c63ea830d6e5a53c63ebed4dc3c5d45879e25` | [Unmodified review knowledge](alder/review-knowledge.md)    |
| Raw SQL Rules v0.3                         | `mk3008/raw-sql-rules` commit `0804d0e18a5d2aee6c8b9c61265cb632e29e2a6d`     | [Unmodified repository contract](../rules/raw-sql-rules.md) |
| Serene v0.6.0                              | `github:mk3008/serene#v0.6.0`; resolved commit in `pnpm-lock.yaml`           | Runtime construction/binding and `pnpm audit:sql`           |

Sources: [Alder adoption](https://github.com/mk3008/alder/blob/b51c63ea830d6e5a53c63ebed4dc3c5d45879e25/docs/adoption.md), [review knowledge](https://github.com/mk3008/alder/blob/b51c63ea830d6e5a53c63ebed4dc3c5d45879e25/docs/phase2/review-knowledge-v0.3.md), [Raw SQL Rules](https://github.com/mk3008/raw-sql-rules/blob/0804d0e18a5d2aee6c8b9c61265cb632e29e2a6d/raw-sql-rules.md), [Serene adoption](https://github.com/mk3008/serene/blob/v0.6.0/docs/ai-adoption.md), [security](https://github.com/mk3008/serene/blob/v0.6.0/docs/security.md), [audit coverage](https://github.com/mk3008/serene/blob/v0.6.0/docs/review-coverage.md).

Alder and Raw SQL Rules are documents, not runtime dependencies. Preserve selected upstream text when updating, and update this provenance record. The final relative evaluation-plan link in the copied Alder knowledge refers to [the upstream evaluation plan](https://github.com/mk3008/alder/blob/b51c63ea830d6e5a53c63ebed4dc3c5d45879e25/docs/evaluation-plan.md#review-knowledge-benchmark-operation-2026-09-11).

Use [Business Design](business-design/README.md) → [Decision Records](decisions/README.md) → implementation / DDL / tests for an Alder review in a separate agent or fresh context. Apply the full knowledge and its stopping conditions; return unresolved business questions to the product owner.

For SQL construction review, run `pnpm audit:sql` (or `pnpm audit:sql --actionable-only`). Unresolved/imported paths remain for review; ordinary construction does not prove SQL correctness, binding, authorization or business behavior. Do not introduce a host-side source filter without a separate need and explicit integration.

Raw SQL Rules covers executable application SQL. Registration stores SQL as bound data. Phase 1 execution uses developer-managed stored SQL under the owner's explicit [trusted-configuration decision](decisions/0002-phase1-trusted-execution.md); analysis/generation status is not approval. The stored-SQL marker-lowering path is an explicit Serene exception requiring review. DDL and documentation generation remain distinct from runtime query mirrors.

See [verification and the existing DDL blocker](adoption-verification.md) before starting further implementation.

Alder v0.2 includes reasoning-led validation guidance; the local Evaluation decisions section routes it to Velvet recovery and PostgreSQL evaluation. Copied knowledge stays v0.3, byte-identical to the released upstream file (Git blob `1af50d44ce53083ff758b4c9ca7a808bb0568856`). No new local review rules or Business Design authority are introduced.

Code-authored identity-backed SQL uses official Serene `materializeTemp` for the historical Issue 23 source snapshot. DB-master stored reviewed SQL remains the explicit [Decision 0013](decisions/0013-product-set-phases.md) boundary: hash/revision proves deployment provenance, not Serene identity or semantic approval. See [the upgrade verification](adoption-v0.2-verification.md) for audit changes and regressions.
