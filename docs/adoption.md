# Adopted review and SQL dependencies

| Dependency | Selected source | Local use |
| --- | --- | --- |
| Alder v0.1, research review knowledge v0.3 | `mk3008/alder` tag `v0.1`, commit `d4e6395ebf02c5c1fed7334d2dde73ae5d2255b2` | [Unmodified review knowledge](alder/review-knowledge.md) |
| Raw SQL Rules v0.3 | `mk3008/raw-sql-rules` commit `0804d0e18a5d2aee6c8b9c61265cb632e29e2a6d` | [Unmodified repository contract](../rules/raw-sql-rules.md) |
| Serene v0.4.0 | `github:mk3008/serene#v0.4.0`; resolved commit in `pnpm-lock.yaml` | Runtime construction/binding and `pnpm audit:sql` |

Sources: [Alder adoption](https://github.com/mk3008/alder/blob/d4e6395ebf02c5c1fed7334d2dde73ae5d2255b2/docs/adoption.md), [review knowledge](https://github.com/mk3008/alder/blob/d4e6395ebf02c5c1fed7334d2dde73ae5d2255b2/docs/phase2/review-knowledge-v0.3.md), [Raw SQL Rules](https://github.com/mk3008/raw-sql-rules/blob/0804d0e18a5d2aee6c8b9c61265cb632e29e2a6d/raw-sql-rules.md), [Serene adoption](https://github.com/mk3008/serene/blob/v0.4.0/docs/ai-adoption.md), [security](https://github.com/mk3008/serene/blob/v0.4.0/docs/security.md), [audit coverage](https://github.com/mk3008/serene/blob/v0.4.0/docs/review-coverage.md).

Alder and Raw SQL Rules are documents, not runtime dependencies. Preserve selected upstream text when updating, and update this provenance record. The final relative evaluation-plan link in the copied Alder knowledge refers to [the upstream evaluation plan](https://github.com/mk3008/alder/blob/d4e6395ebf02c5c1fed7334d2dde73ae5d2255b2/docs/evaluation-plan.md#review-knowledge-benchmark-operation-2026-09-11).

Use [Business Design](business-design/README.md) → [Decision Records](decisions/README.md) → implementation / DDL / tests for an Alder review in a separate agent or fresh context. Apply the full knowledge and its stopping conditions; return unresolved business questions to the product owner.

For SQL construction review, run `pnpm audit:sql` (or `pnpm audit:sql --actionable-only`). Unresolved/imported paths remain for review; ordinary construction does not prove SQL correctness, binding, authorization or business behavior. Do not introduce a host-side source filter without a separate need and explicit integration.

Raw SQL Rules covers executable application SQL. `source_sql_body` and generated transfer SQL columns are currently stored as bound data by the registration features; this does not authorize executing arbitrary submitted SQL. Future execution must establish the application-owned review/approval boundary under the existing concepts and Rules. DDL and documentation generation remain distinct from runtime query mirrors.

See [verification and the existing DDL blocker](adoption-verification.md) before starting further implementation.
