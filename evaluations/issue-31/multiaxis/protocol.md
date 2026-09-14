# Preregistered multi-axis extension

Baseline B1: `03b998ee3b768e2a03af763714627523243b3cc2` (existing PR 32).
Historical B0: `b3190e3d341ee21478161f2b8b31f96826c503b1`; do not attribute
B0 -> B1 benefits to this extension. Owner request: PR 32 comment 5663431190.
Written before independent candidate selection or further runtime edits.

## Procedure and comparisons

Two fresh contexts independently inspect B1 Business Design, decisions, execution
implementation, tests and relevant history. Neither receives a preferred candidate
nor sees the other response. Read-only assessment; retain both complete responses
including disagreement. Each compares keep plus at least two evidence-supported
alternatives; no pure-function, DI, model or file split is required. Rank before
implementation. The root agent independently checks evidence and reconciles the
results; agreement is not an effectiveness measure.

For every candidate use the vector below: improved / unchanged / worse / unknown,
with code/test anchors, mechanism and counter-cost; no unweighted total score.
Distinguish measured facts, engineering precedent, and agent inference.

| Axis | Observable task evidence |
| --- | --- |
| Changeability | Edit owners/sites for a local change; required coordinated edits |
| Testability | Smallest actual fixture to exercise a local decision; DB, I/O, mocks, setup |
| Diagnosability | Identify failing decision/stage/effect from errors, cause and available state |
| Verifiability | Targeted checks versus required full gates; setup and exercised boundary |
| Side-effect locality | Decision inputs/capabilities; I/O sites and ordering ownership |
| Invariant ownership | Authoritative constraints and ordering; duplication or dispersion |
| Reproducibility | Necessary input/state to replay a decision or failure; missing context |
| Recoverability | Rollback/retry/durable Run evidence, lost-COMMIT and recovery errors |
| Dependency locality | Runtime imports/capabilities and unrelated state needed for local checks |
| AI analysability | Correctly locate edit, fault owner, invariant and verification boundary; extra hops |

Use P1-P4 from the original protocol as negative/coordination controls. Add probes:
Q1 invalid Destination Link mapping; Q2 mutable identity/exclusion/receipt failure;
Q3 duplicate/no-op/model outcome and metadata consistency; Q4 source logical-key
reconstruction, duplicate keys and absent key columns. Inspect these on B1 before
selecting a candidate; they are tasks, not prescribed seams. Preserve validation
order, error strings, SQL/binding, callback timing and transaction behavior.

For the selected candidate run a reproducible before/after comparison using actual
fixtures and source anchors. If a decision is moved, compare old/new outputs and
errors over valid, boundary and malformed inputs as appropriate; do not merely
assert that extraction exists. Keep full PostgreSQL regression/deployment gates
for runtime changes. Record additional interfaces, exports, types and inspection
hops as costs. Do not equate smaller function size, mock-based tests or passing
unit tests with lower end-to-end verification cost.

After implementation a separate fresh reviewer inspects Business Design, decisions,
then code/tests with pinned Alder knowledge, applies the same probes and checks
semantics and unsupported quality claims. This is unblinded review, not a timed
causal experiment. Baseline agents' independently identified locations can be
compared to review locations only as descriptive evidence; no speed claim.

## Stopping and disposition

Accept the first bounded candidate with demonstrated benefit on a concrete task,
justified net value considering added structure, and no material regression in
invariant ownership, recovery, semantic behavior or required verification. A gain
in one axis cannot compensate for a correctness/recovery regression. Narrow mixed
claims. If candidates add only indirection or need new behavior, keep/record.
Stop after one supported candidate and its gates; retry only to resolve concrete
failures or decision-changing uncertainty. Do not optimize all axes or expand the
product. Revise the operational rule only to the extent supported; no Alder edits.

Two runs on one selected subject show small-sample decision compatibility, not
population reproducibility. Preserve failed checks and harness corrections.
