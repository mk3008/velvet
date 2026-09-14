# 0015: Refactor observable change boundaries, preserve invariant ownership

Issue: [31](https://github.com/mk3008/velvet/issues/31). Baseline:
`b3190e3d341ee21478161f2b8b31f96826c503b1`. Status: accepted for limited use; PostgreSQL Verify passed.

## Why and evidence

Decision 0007 reasonably retained the execution boundary for transaction/failure
ownership. That does not establish that every later behavior must remain inside
one function. Recovery fixes, mutable semantics, metadata execution alternatives
and set-phase dispatch subsequently supply concrete separate change reasons.

The [engineering basis](../../evaluations/issue-31/engineering-basis.md) separates
Parnas/Fowler/Beck precedent, Velvet observations and our judgment. The
[frozen rule](../../evaluations/issue-31/rule.md) requires actual change evidence,
a task exposing unrelated reasoning or coordinated edits, a keep alternative,
and explicit invariant/verification ownership. Neither LOC nor named architecture
is an action criterion. [Protocol](../../evaluations/issue-31/protocol.md) was
written before implementation and independent applications.

## Selected candidate and alternatives

Extract the contiguous legacy row/routine work into a private `executeRowTransfer`
function **in the same file**. Give it explicit inputs and return only work counts.
Keep public types, helpers and SQL definitions at their existing locations.
`executeTransfer` retains validation timing, configuration locks and recheck,
separate durable Run creation, route selection, one common success/COMMIT tail,
and the original catch/recovery path. There is no runtime engine registry or new
SQL construction path.

Keeping everything avoids a call boundary but leaves independent recovery and
work concerns in one function and duplicates success finalization. Extracting
recovery alone moves lifecycle state across an interface without resolving that
duplication. Separate model/Red/Black/metadata modules risk dispersing shared Work,
Active, Lineage and Processing decisions. The existing set engine is already
separate. More files add no demonstrated benefit to the selected tasks, so this
candidate intentionally leaves the file large.

The private function's eleven explicit inputs are a cost: configuration, client,
query capability, definition, source identity, arguments, Run/Setting identity and
options cross one seam. They are not a mutable context protocol or extensibility
framework. Revisit if ordinary changes repeatedly expand or coordinate these
inputs. Do not infer a general eleven-parameter allowance.

## Invariants and automatic-action boundary

The coordinator exclusively owns begin/commit/rollback, Run durability and
recovery errors. `queries.failSql` still protects committed success. The legacy
function exclusively preserves its item loop, duplicate tracking, stable-key
checks, model decision and metadata order; stored SQL and routine definitions are
unchanged. Set-phase internals remain unchanged. No Business Design, schema,
public contract, lock order, query text, invocation values or stored-SQL trust
policy is intentionally changed.

Automatic refactoring means a reversible implementation on a branch for review,
not autonomous merge or approval of business semantics. Perform only when this
scope and the regression route are established. Record/propose if costs exceed
evidence, safety coverage is insufficient or a candidate cannot preserve shared
invariants. Ask the owner for unresolved business meaning, external consequences
or expanded scope, not an internal filename choice. Missing local PostgreSQL
uses existing CI, following AGENTS.md; it is not evidence of a passing gate.

## Evaluation and operational disposition

See [results](../../evaluations/issue-31/README.md) for independent assessments,
probe comparison, historical application and verification. The supported result adds only a short AGENTS.md pointer for newly observed
change reasons. It does not require a recurring full structural audit. The rule
is a candidate reasoning procedure, not a validated universal smell detector.
The experiment does not establish developer-time savings, future regression rate
or applicability to Alder. No Alder file is changed.
