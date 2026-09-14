# Final extension: candidate context and honest disposition

Response to [PR comment 5664632667](https://github.com/mk3008/velvet/pull/32#issuecomment-5664632667).
Baseline B2 is `4b895265d8262fafd7a95221a344a7de8c93841e`; prior lifecycle and
mapping benefits remain in their historical reports and are not credited again.

## Preregistration and independent application

[Protocol](protocol.md) was committed as `ab3af52b9f8efc7c3a78b64f118e3f34fb22d07d`
before fresh assessments and runtime edits. [Selection](selection.md) and initial
[candidate records](candidates.json) were committed as
`5acb7ee899778b5cccca26353fa7ea55dc056d5b` before runtime edits.
Raw prompts and complete responses: [A](fresh-a.md), [B](fresh-b.md).
These were separate fresh contexts given B2, the protocol and the model hypothesis,
with no desired design or status and no access to peer decisions by instruction.
Isolation was procedural, not a separate repository permission boundary.
No result was discarded or rerun to manufacture agreement.

Both generated context questions and retrieved source/design/history/failure tests.
The source included shared admission, Work, first Black insertion, duplicate tracking,
mutable identity and returned-key checks, immutable Red, row/routine metadata and Run
recovery. Decisions 0005/0006/0010/0013, Process/DFD and metadata SQL supplied meaning
and ordering constraints. Historical mutable introduction `fbfe73e`, insert-only
simplification `8bb20a2` and lost-COMMIT repair `6ffab6f` supplied actual change reasons.
The exact files, failed/truncated retrievals and targeted rereads are in each response:
retrieving a large file is not claimed as inspecting every assertion. A stale concept
sentence was reconciled against current Process/Decision 0006; no business meaning
was changed from implementation inference.

## Decisions and remaining questions

| Exact candidate | Independent result | Root disposition and decisive evidence |
| --- | --- | --- |
| Full model lifecycles plus distributed metadata ownership | A/B REJECT | Shared first insertion, duplicate and metadata obligations would be distributed; no present independent lifecycle requirement supports that cost. |
| A2 internal module: mutable DML plus immutable Red execution/receipt | A DEFER | Current history and failure tests establish a plausible task; no comparison shows whether the interface removes unrelated obligations. |
| B2 same-file private mutable DML function | B DEFER | Same uncertainty, distinct scope. Private extraction alone does not prove isolated direct tests; an export/interface would add cost. |
| Same-file row retirement helper | A/B ADOPT | Two identical release/delete/exactly-one protocols become one owner, with three inputs and no new runtime file/export. |
| Explicit context and disposition rule | A/B ADOPT | v2 Keep combines missing evidence with sufficient reasons against a candidate; the distinction is needed in this actual review. |

Agreement is compatible candidate families and disposition logic on one subject,
not identical narrow designs or measured population reproducibility.
The [registry](candidates.json) preserves A2 and B2 separately after the reopen
review identified scope ambiguity; evidence for one does not automatically settle
the other.

For both narrow model candidates, missing context is a **comparison not performed**,
not inaccessible repository information. The implementation/review agent can sketch
that exact interface and replay one existing locator or malformed-return task on keep
and candidate, recording touched units, caller facts, fixture capabilities and ordered
effects. This bounded next observation is feasible without a new owner design choice.
Neither green CI nor an existing regression case answers its net-benefit question.
The request's stopping condition permits this specific, supported DEFER; implementing
both alternatives merely to force a label is not required.

## Quality and cost assessment

These are overlapping views, not an additive score. F is an observed source/check
fact; J is a task-grounded judgment. Unmeasured effects remain unknown.

| Axis | Retirement helper B2 -> candidate | Narrow model seam question |
| --- | --- | --- |
| Changeability | F one protocol owner instead of two; J less duplicate maintenance | Does a real DML task reduce unrelated inspection/edits? |
| Testability | F helper can be exercised with query capability; no new public seam | Does the actual fixture lose unrelated state without adding an export? |
| Diagnosability | Error message and propagation unchanged; extra helper frame | No operational context collection improvement demonstrated |
| Verifiability | Exact inline reconstruction and scripted traces; full DB gate remains | Comparator/replay still missing; safety coverage alone insufficient |
| Side-effect locality | F same two fixed SQL effects, named owner | Keep prerequisite timing and model-dependent effects explicit |
| Invariant ownership | F release-before-delete/cardinality one owner; caller keeps Lineage | Shared orchestration need not prohibit narrow operation ownership |
| Reproducibility | F ten scripted protocol traces; no live Run replay gain | Obtain minimal failing inputs and compare exact seam |
| Recoverability | Unchanged transaction, rollback and durable Run owner | No new recovery benefit established |
| Dependency locality | F no new runtime file/export/package; three inputs | A2 adds module/interface; B2 retains broad imports |
| AI analysability | J explicit retirement owner plus call hop | No before/after accuracy or time measurement |

The selected helper accepts query, Active ID and Link ID. Routine execution stays
at the caller; immutable Red Lineage stays after retirement. SQL definitions, DDL,
binding path, mutable identity timing, Work/Processing/counts and Run control are
unchanged. This is a local duplicate-protocol improvement, not model simplification.

## Reopening without continuous auditing

[Events](reopen-events.json) were frozen at
`7e499451a04ddd6ff3c4dd06cb0bf24b7bd19344`; a separate fresh
[reopen review](reopen-review.md) inspected them and the actual historical patches.
[Ledger](reopen-ledger.json) records the intake order, exact variant/question,
event identity/content revision and duplicate relation. The initial candidate
record at selection and replay commits has identical blob
`7fb9d18ddb6a411b7642c14d9600f84b13eebe3e`, independently fetched at both refs.

Historical rollback coverage is relevant safety context but already in B2 and does
not answer the comparison. Alias removal is unrelated. A synthetic mutable failure
report conditionally queues one reassessment; keyword-only prose does not; identical
redelivery creates no second queue. The fixture claims to supply a reproduction but
contains no actual attachment, so obtaining it is the first queued action.
No question closes and DEFER remains unchanged. This is controlled routing evidence,
not a real incident, live task, chronological historical simulation or benefit proof.

The review's criticisms are retained verbatim. Corrections split variant records,
make event identity/revision explicit, treat watch paths only as retrieval hints,
and acknowledge missing synthetic attachments. Ordinary task intake can consult
these records when new task evidence addresses a missing question, even outside a
listed path. No watcher, scheduled audit or mandatory record for every edit was added.

## Verification

Run from repository root with pinned dependencies and Git history:

```sh
pnpm build
node evaluations/issue-31/context/retirement-compare.mjs
pnpm verify
```

The [comparison](retirement-compare.mjs) reconstructs the whole B2 boundary after
inlining both calls and renaming the helper's two value inputs. It asserts unchanged
query/DDL files and ten traces: two call-context value sets times success, zero rows,
multiple rows, release error and delete error. It checks order, parameters, error
identity and short-circuit behavior. It does not execute both full model branches or
prove PostgreSQL constraints; existing integration/deployment gates supply those checks.
No regression test or assertion was weakened.

The first run [34850816952](https://github.com/mk3008/velvet/actions/runs/34850816952)
is **invalid passing evidence**: inline tokens differed on trailing object commas,
and a pipeline to tee masked the assertion failure. Commit
`d8cdd87fa1cc7633a89092e7d6db13251deb1635` preserves the original punctuation and
uses separate output-redirection/display steps so a failure stops the job.
Assertions are unchanged. Corrected runtime `d8cdd87` passed:
- [Evidence run 34851012974](https://github.com/mk3008/velvet/actions/runs/34851012974):
  exact inline tokens, unchanged SQL/DDL and all ten scripted traces.
  [Raw JSON](retirement-measurements.json) is copied from the job log; its candidate
  `57491bee` is Actions' synthetic PR merge commit, not the branch head.
- PostgreSQL 18 [Verify 34851012947](https://github.com/mk3008/velvet/actions/runs/34851012947):
  52 tooling + 286 main = 338 tests passed, no skips, plus materialization checks.
- Existing [deployment run 34851012938](https://github.com/mk3008/velvet/actions/runs/34851012938) passed.
- [Fresh Alder review](runtime-review.md) found no blocking semantic defect.
  Its stale v2 link and pending registry-status findings are corrected in final records.
  The reviewer inspected source; execution evidence comes from the above Actions jobs.

Local execution was unavailable because the environment failed to initialize;
no local test success is claimed. Final-head links belong in the PR to avoid a
self-referential evidence commit. The historical multi-axis checker must be run at B2,
not on this later runtime transformation.

## Stopping and limits

The procedure now demonstrates candidate generation, active context collection,
sufficiency diagnosis, distinct dispositions and bounded reopening. Model hypotheses
have explicit supported states and executable next observations. This satisfies the
final extension's stopping condition; no additional tournament or Alder integration.
No measured AI speed, defect rate, production performance, whole-suite cost reduction
or generalized method effectiveness is claimed.
