# Adopted review and SQL dependencies

| Dependency                                 | Selected source                                                              | Local use                                                   |
| ------------------------------------------ | ---------------------------------------------------------------------------- | ----------------------------------------------------------- |
| Alder v0.5.1, research review knowledge v0.3 | `mk3008/alder` tag `v0.5.1`, commit `5405a5069fc13e1a1e27de8b06e4a375a3653e5e` | [Unmodified review knowledge](alder/review-knowledge.md)    |
| Raw SQL Rules v0.3                         | `mk3008/raw-sql-rules` commit `0804d0e18a5d2aee6c8b9c61265cb632e29e2a6d`     | [Unmodified repository contract](../rules/raw-sql-rules.md) |
| Serene v0.7.0                              | `github:mk3008/serene#v0.7.0`; resolved commit in `pnpm-lock.yaml`           | Runtime construction/binding and `pnpm audit:sql`           |

Sources: [Alder adoption](https://github.com/mk3008/alder/blob/5405a5069fc13e1a1e27de8b06e4a375a3653e5e/docs/adoption.md), [review knowledge](https://github.com/mk3008/alder/blob/5405a5069fc13e1a1e27de8b06e4a375a3653e5e/docs/phase2/review-knowledge-v0.3.md), [Raw SQL Rules](https://github.com/mk3008/raw-sql-rules/blob/0804d0e18a5d2aee6c8b9c61265cb632e29e2a6d/raw-sql-rules.md), [Serene adoption](https://github.com/mk3008/serene/blob/v0.7.0/docs/ai-adoption.md), [security](https://github.com/mk3008/serene/blob/v0.7.0/docs/security.md), [audit coverage](https://github.com/mk3008/serene/blob/v0.7.0/docs/review-coverage.md).

Alder and Raw SQL Rules are documents, not runtime dependencies. Preserve selected upstream text when updating, and update this provenance record. Alder v0.5.1 adds an optional item-level traceability-drift pilot; Velvet does not adopt that pilot as a standing gate in this revision. The copied review knowledge remains byte-identical to v0.5. The final relative evaluation-plan link in the copied Alder knowledge refers to [the upstream evaluation plan](https://github.com/mk3008/alder/blob/5405a5069fc13e1a1e27de8b06e4a375a3653e5e/docs/evaluation-plan.md#review-knowledge-benchmark-operation-2026-09-11).

Use [Business Design](business-design/README.md) → [Decision Records](decisions/README.md) → implementation / DDL / tests for an Alder review in a separate agent or fresh context. Apply the full knowledge and its stopping conditions; return unresolved business questions to the product owner.

For SQL construction review, run `pnpm audit:sql` (or `pnpm audit:sql --actionable-only`). Unresolved/imported paths remain for review; ordinary construction does not prove SQL correctness, binding, authorization or business behavior. Do not introduce a host-side source filter without a separate need and explicit integration.

Raw SQL Rules covers executable application SQL. Registration stores SQL as bound data. Phase 1 execution uses developer-managed stored SQL under the owner's explicit [trusted-configuration decision](decisions/0002-phase1-trusted-execution.md); analysis/generation status is not approval. Stored SQL uses `externalSql` / `bindExternal` for standard binding and remains `review-required / EXTERNAL_SQL`; Velvet retains the trusted-master decision, authoring checks and shared-context parameter selection. DDL and documentation generation remain distinct from runtime query mirrors.

See [verification and the existing DDL blocker](adoption-verification.md) before starting further implementation.

Alder v0.5.1 retains the v0.5 reasoning-led validation guidance; the local Evaluation decisions section routes it to Velvet recovery and PostgreSQL evaluation. Copied knowledge stays v0.3, byte-identical to the released upstream file (Git blob `1af50d44ce53083ff758b4c9ca7a808bb0568856`). No new local review rules or Business Design authority are introduced.

Code-authored identity-backed SQL uses official Serene `materializeTemp` for the historical Issue 23 source snapshot. DB-master stored reviewed SQL remains the explicit [Decision 0013](decisions/0013-product-set-phases.md) boundary: hash/revision proves deployment provenance, not Serene identity or semantic approval. See [the upgrade verification](adoption-v0.2-verification.md) for audit changes and regressions.

## Alder v0.5.1 Check Item workflow

The current [execute-transfer Check list](alder/execute-transfer-check-items.md) replaces the historical Issue 39/43 views for ongoing review. It preserves IDs, unresolved review states and test-evidence gaps. Historical records remain frozen. The list covers F1–F5 only, not every Velvet feature.

Use [v0.5.1 adoption](https://github.com/mk3008/alder/blob/5405a5069fc13e1a1e27de8b06e4a375a3653e5e/docs/adoption.md), [Check Item traceability](https://github.com/mk3008/alder/blob/5405a5069fc13e1a1e27de8b06e4a375a3653e5e/docs/check-item-traceability.md), and [c3](https://github.com/mk3008/alder/blob/5405a5069fc13e1a1e27de8b06e4a375a3653e5e/docs/behavior-derivation/candidate-c3.md). v0.5.1 retains the v0.5 adoption/release guidance that explicitly retires permanent Code/SQL-entry mappings; c3's leftover wording permitting those mappings is not adopted. Maintain Business Design ↔ Check Item ↔ Test; tests verify implementation by execution.

When human review changes meaning, update and human-confirm Business Design first, then regenerate affected Checks and representative test mappings. Keep design revision + list revision + Check ID together. Do not infer human approval from confidence or passing tests. Audit meaning preservation whenever regrouping or regenerating Checks. Optional [functional consideration discovery](https://github.com/mk3008/alder/blob/5405a5069fc13e1a1e27de8b06e4a375a3653e5e/docs/behavior-derivation/functional-considerations.md) is available when warranted; it is not a mandatory gate or authority to decide business policy.
