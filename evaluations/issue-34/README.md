# Issue 34: boundary judgment and candidate-generation evidence

Baseline `fcda11b` (merged #33); [frozen protocol](protocol.md),
[ordinary prompt](intake-prompt.md), [author assessment](author-assessment.md),
[raw independent response](runs/intake.md), [run metadata](runs/metadata.json).

The [guidance follow-up](guidance/README.md), authorized after the first result,
tests one small ownership cue on the same frozen source and ordinary task.
The original result and pre-result artifacts below remain evidence of the first run.

## First result and scope

One fresh ordinary-intake application proposed removing unsafe parameter casts,
not removing/consolidating/redrawing a runtime boundary. It retained the useful
mapping-validation module. The author independently identified two removable
per-query forwarders and also retained mapping isolation. These are partially
compatible judgments, **not a successful autonomous runtime-candidate-generation
result**. Cast removal does not count as the structural result being tested.

The current rule permits both directions; this run does not establish that normal
intake reliably generates both. It also does not establish directional bias:
choosing the smaller typed-handoff change could be a proportional choice. The
agent was not asked to enumerate every alternative, and its omission is not an
explicit rejection of the author's candidate. Stop after this bounded negative
observation rather than repeat until a removal appears. At this initial stopping point no guidance change was adopted. The subsequent
owner-requested follow-up tests a small cue against this concrete omission; it
does not diagnose general bias or introduce a mandatory list, recurring audit
or Alder change.

## Historical subjects

| Subject | Historical evidence | Current conclusion |
| --- | --- | --- |
| Registration SQL/validation pairs and execution forwards | Imported in `663842c`; #13 / `0ba9f08` / Decision 0007 retained pairs while removing generic `queryMany` | Keep the SQL/validation distinction; remove only the two trivial execution forwards in the selected setting-registration path |
| Mapping-only module intentionally extracted by #31 | `f2a1e22`, Decision 0015; #33 KISS application | KEEP after examining current caller and direct tests; no new evidence outweighs the isolated value-test benefit |

The registration conclusion is a refinement of incomplete prior cleanup: the
plain forwarders were already removable after #13. We do not invent a subsequent
feature change to claim an old decision became obsolete. Retaining SQL versus
coercion/receipt validation was reasonable then and remains so. Mapping extraction
was reasonable then and remains useful; history grants no permanent exemption.

## Concrete comparison under Decision 0016

Registration's task is to trace a field such as `sourceKeyDefinition` or
`diffCompareExcludedColumns` from public validation through named SQL parameters
to a validated returned receipt. The current two forwarders have one caller each,
fixed query selection and no validation, transaction, retry or error policy.
`loadInsertedRow` already owns awaiting execution, cardinality and row parsing.

| Plausible choice | Judgment and actual maintenance effect |
| --- | --- |
| Keep all registration code | Preserves current behavior and file ownership but requires checking a forwarding function adds no policy; leaves an unchecked parameter cast |
| Typed handoff only (independent proposal) | Supported smaller improvement: compiler checks parsed parameters against the typed query function; forwarding-policy inspection remains |
| Call named QuerySource directly from receipt owner (author proposal) | ADOPT: eliminates the separate execution-forwarder contract/equivalence inspection; preserves typed parameter compatibility explicitly with `satisfies QueryParams<typeof query>` |
| Consolidate SQL and validation files | REJECT for this task: raw driver and parsed receipt shapes still differ and must be compared; merging text does not remove that obligation |
| Further split registration stages or mapping predicates | REJECT for this task: no independent owner/check is isolated; extra context transfer for coupled facts |
| Inline mapping module | REJECT / KEEP module: loses direct value-only testing without execution dependencies, or needs a replacement seam to restore it |
| Add navigation/naming/evidence routing | KEEP existing routes: registration README identifies queries and execute-transfer README already separates mapping-value tests from pre-Run evidence; a route cannot remove an unchecked handoff or execution policy inspection |
| New retrieval tooling | No observed tooling failure in these walks; not a supported implementation candidate |

The mapping check does not own the whole pre-Run claim: configuration loads/locks,
preceding guards, optional phase validation, Run creation, recheck and recovery
remain in the coordinator. Its PostgreSQL test asserts zero Run rows, not separately
destination-table emptiness. Do not overclaim from its title.

The chosen diff leaves SQL, QuerySource identity/path, parameter/row interfaces,
Zod parsing (including existing double parsing), cardinality messages, public
exports, workflow/transaction order, mapping code, DB and Business Design unchanged.
The two removed exports are internal paths, not package exports. The direct call
retains the executor receiver, one invocation and the same awaited result/errors;
it removes an async forwarding frame, so stack shape/microtask count is not an
unchanged contract. No performance or scheduling improvement is claimed.

The broad `QueryExecutor` defaults erase query-specific parameter checks. Therefore
simply deleting `as never` on a direct call would not establish the independent
proposal's type benefit. The explicit compile-time `satisfies` check retains that
obligation without a new runtime helper or generic executor redesign. It does not
validate SQL placeholders or driver rows; SQL review and Zod remain necessary.

## Implementation and stopping

ADOPT the author's narrow two-forwarder removal with the typed handoff. This is
supported by the source walkthrough, not attributed to the independent agent.
The isolated branch and existing regression route make execution timely; review
and CI remain separate readiness gates. Do not remove the analogous destination-
definition forwarder merely for consistency: it is outside this selected path.
Reopen if a query-specific execution policy gains real consumers or these direct
calls acquire repeated coordination. Mapping's existing reopen conditions remain.
A2 stays DEFER, B2 stays adopted, and #33's rejected overview layout is not retried.

No supported value-only candidate is waiting for timing; no new DEFER label is
used to conceal the observed generation result. Generalizing generator performance
is unestablished. The authorized one-run guidance extension below adds bounded
evidence; it is not a scheduled audit or an open-ended retry.

## Verification

See [verification](verification.md) for the executed checks, baseline comparison,
PostgreSQL CI and independent Alder review. The latter receives the proposed diff
and is a safety/evidence review, **not** a second blind candidate-generation run.
No human-time, token, incident-frequency or universal architecture claim follows.
