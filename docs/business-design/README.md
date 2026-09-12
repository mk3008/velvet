# Business Design entrypoint

Velvet's current Business Design is the existing document set below. This index routes readers to those sources; it does not duplicate, relocate, reformat, or approve their contents.

| Read | Source | Meaning |
| --- | --- | --- |
| 1 | [Package Scope](../scope/SYSTEM_SCOPE.md) | Purpose, ownership, external responsibilities and non-goals |
| 2 | [Concept index](../concepts/README.md) and relevant `concept.json` files | Stable meanings, responsibilities and invariants; respect each concept's lifecycle |
| 3 | [DFD](../dfd/README.md) and [relationship index](../dfd/relationship.json) | Triggers, actors, inputs, outputs and external boundaries |
| 4 | [Processes](../processes/README.md) and [process index](../processes/process-map.json) | Work order and handoffs; follow relevant concept references |

For transfer execution, follow [Dirty Key intake and execution](../dfd/change-detection-dirty-key-registration.md), [Transfer Execution Process](../processes/transfer-execution-process.md), and their referenced concepts. For destination registration, read [Destination Registration](../dfd/destination-registration.md) and Destination / Destination Link concepts. For lineage tracing, read [Lineage Trace Process](../processes/lineage-trace-process.md).

The machine-readable relationship indexes determine coverage; this entrypoint is not a second inventory. Drafts and unresolved review findings do not become approved requirements through this index.

After Business Design, read [Decision Records](../decisions/README.md), then the implementation, current [DDL](../../db/ddl/), and tests. [Technology Policy](../technology/TECHNOLOGY_POLICY.md), [Test Policy](../testing/TEST_POLICY.md), and [Authority Model](../review/AUTHORITY_MODEL.md) constrain implementation and review. Generated pages and `docs/review/ai-review.json` are review evidence, not Business Design or human approval.

For an Alder review, use the pinned [review knowledge](../alder/review-knowledge.md) and record the compared product/design commit and working-tree scope. This index establishes access, not a finding that all design questions have been resolved.
