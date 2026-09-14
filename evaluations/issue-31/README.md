# Issue 31 — observable refactoring experiment

Baseline: `b3190e3d341ee21478161f2b8b31f96826c503b1`.
Hypothesis: observable independent changes can justify a repeatable, behavior-preserving
reorganization without a human prescribing the decomposition.

The [rule](rule.md), [protocol](protocol.md) and [engineering basis](engineering-basis.md)
were written before code extraction and before the two independent assessments.
Published protocol commit: `283c2380fffbf4068be87dbf0e4851b9e4a74ad8`.
Initial runtime commit: `10549ce001b4c162a4d543bab333b3f7f6dc958f`.
The local reviewed commit `6adc2c5` has the same tree (`ac2b3842f6f78b94595fa207780120ad5014d401`)
as that published runtime commit; GitHub connector publication changed commit metadata.
Subsequent formatting does not change runtime tokens. No existing test was modified.

## Decision reproducibility

Two fresh conversation contexts independently inspected the baseline via Git, with
the same rule/protocol and no suggested decomposition. They shared a filesystem,
not conversation state; their instructions prohibited reading candidate code or
each other's results. This is procedural isolation, not a filesystem sandbox.
Full responses, prompts and limitations: [A](fresh-a.md), [B](fresh-b.md).

| Criterion | A | B |
| --- | --- | --- |
| Trigger | Yes: independent observed concerns plus P1/P3 exposure and duplicate finalization | Same |
| Disposition | Narrow extraction for review, contingent on gates | Same |
| Evidence | Run recovery, mutable identity, row/routine, set phases | Same categories and concrete anchors |
| Shared invariant owner | Coordinator owns Run transactions/recovery | Same |
| Work ordering | Retain legacy decisions, writes and metadata together | Same |
| Premature split avoided | Reject mandatory per-model decomposition | Same |
| Limits | P4 remains cross-cutting; no productivity claim | Same |

This is 2/2 compatible decisions on one deliberately selected subject. It is not
an estimate of population agreement or proof of bias-free evaluation. Agents know
the subject is under structural evaluation; they were not told the desired result.
No divergent runs were discarded or rerun. The additional [post-change review](post-review.md)
is a separate semantic/benefit assessment, not a third baseline reproduction.

## Candidate and measured comparison

The private `executeRowTransfer` executes the same ordered legacy work and returns
counts; `executeTransfer` owns both engines' transaction lifecycle. The file stays
large and the public API, SQL, tests, schema and Business Design remain unchanged.

Run from repository root after `pnpm install --frozen-lockfile`:

```sh
node evaluations/issue-31/measure.mjs
# To compare a committed candidate instead of the working tree:
node evaluations/issue-31/measure.mjs <candidate-commit>
git diff --ignore-all-space b3190e3 -- src/features/execute-transfer/boundary.ts
pnpm verify
```

[Machine-readable measurements](measurements.json) identify exact before/after
anchors. The script parses TypeScript to compare the ordered work tokens (only
`input.settingId` / `input.maxDirtyKeys` become explicit inputs), verifies unchanged
recovery tokens, and counts successful finalization sites. This is an experiment
check of the extraction, not a substitute for PostgreSQL semantics.

| Probe | Before owning function / span | After owner / span | Actual maintenance effect and cost |
| --- | --- | --- | --- |
| P1: durable recovery / lost COMMIT | executeTransfer / 448 | executeTransfer / 150 | Recovery is no longer nested with legacy model decisions; same guarded failure SQL and error owner. One helper inspection hop to confirm work-only contract. |
| P2: mutable stable key despite exclusions | executeTransfer / 448 | executeRowTransfer / 323 | Guard and mutation receipt check remain together; lifecycle caller is an additional hop for rollback review. No claim of fewer guard edits. |
| P3: nullable dispatch / success | executeTransfer / 448 | executeTransfer / 150 | Successful finish/COMMIT sites fall from two to one. A shared success-handling change now edits one tail. Validation/dispatch stay together. |
| P4: row/routine retirement | executeTransfer / 448 | executeRowTransfer / 323 | Two legacy retirement sites remain; SQL/routine and set-engine inspection still required for a universal invariant. No claimed reduction in those coordinated edits. |

Spans are inclusive containing-function lines, **not** required reading, elapsed
maintenance effort or a LOC-success metric. Production source file count is unchanged
and total source grows. The supported benefit is the explicit work-only seam and
one authoritative success tail, not shorter files. P1/P3 can reason about lifecycle
without model-local mutable state; P2/P4 do not gain algorithmic simplification.
Eleven explicit context inputs and a call boundary are the countervailing cost.
No edit-locality reduction is claimed for the SQL-enforced failure predicate.

The four probes reconstruct equivalent maintenance questions around historical
requirements; they do not replay feature implementations or measure agent speed.
Exact historical P1 patch is inspectable with `git show 6ffab6f --
src/features/execute-transfer/boundary.ts src/features/execute-transfer/queries.ts`.
The after version still has that single recovery call and guarded SQL; the new
benefit concerns inspection ownership, not fewer changes to repair that defect.

## Historical application (retrospective judgment)

| Known-at-revision evidence | Rule disposition using that evidence | Timing implication |
| --- | --- | --- |
| 847c808: first trusted Black insertion, initial savepoint lifecycle | Keep/provisional; one initial algorithm, no demonstrated independent change history | Do not invent future mutable/set engines to mandate an early split |
| 6ffab6f: COMMIT-loss repair after separate durable Run persistence | Consider/record lifecycle independence; prioritize behavior repair and tests | A smell alone need not force concurrent refactoring during a defect fix |
| fbfe73e: mutable lifecycle added after immutable reevaluation/disappearance | Consider a separate follow-up: legacy semantics and already-observed recovery now differ | The rule could identify a concern earlier than this Issue; benefit still needs a task comparison |
| 8bb20a2: insert-only simplified to a short-circuit | Keep this model within shared work unless new evidence appears | More model names do not imply more handlers; actual history favors simplification |
| 6e89908: row/routine metadata and bounded admission | Reconsider work/lifecycle seam; preserve paired reference/routine visibility | Co-change alone does not justify scattering metadata from its ordering owner |
| ff0cbbd: extracted set engine plus second success tail | Strong trigger for current narrow candidate | A concrete duplicated lifecycle decision makes delaying consideration harder to justify |

These are source-grounded retrospective judgments, not independent historical
Fresh Agent experiments. No claimed precise first optimal refactoring commit or
history-derived statistical coupling coefficient. Initial implementation used a
different failure strategy; later correct semantics must not be projected backward.

## Verification and disposition

Accepted as a **limited, reviewable reasoning procedure** for newly observed
change boundaries. P1/P3 ownership and common finalization improve; P2/P4 retain
legitimate coordination costs. The experiment is sufficient for the short AGENTS.md
pointer, not a mandatory architecture, automated size gate or framework. A future
negative application should revise or retire the procedure. No Alder integration.

- PostgreSQL 18 [Verify run 34838197532](https://github.com/mk3008/velvet/actions/runs/34838197532),
  runtime `10549ce001b4c162a4d543bab333b3f7f6dc958f`: succeeded, including `pnpm verify`
  (DDL package 52 tests; main package 270 tests, none skipped) and materialization check.
- Existing [Issue 25 deployment run 34838197565](https://github.com/mk3008/velvet/actions/runs/34838197565):
  production-boundary deployment evaluation step succeeded. This is the existing
  scoped gate, not a new performance tournament or a claim of improved throughput.
- Local Node 24 / pinned pnpm 10.19.0: typecheck and explicit DB-skip `pnpm verify`
  succeeded; 52 tooling and 39 main tests passed, 231 DB tests skipped locally.
  The CI result above supplies the missing database evidence.
- Exact ordered-work/recovery comparison passed. Existing tests were not weakened
  or changed. Independent review found no runtime blocker; its one input-count
  documentation nit is corrected (eleven inputs).
- [SQL audit](sql-audit.json): 52 screened, 46 SINK_ALIAS, 32 UNRESOLVED, 4 EXTERNAL_SQL.
  Baseline: 52/47/33/4 respectively. The decrease is exactly the removed duplicate
  finish query and COMMIT site, not improved provenance. Remaining review-required
  sites stay visible. Fixed SQL still binds through the existing closure, source and
  mutations through `bindStoredSql`; no source-backed identity was invented for DB SQL.

The machine comparison initially exposed a measurement-harness error: standalone
TypeScript scanning misread template tails, and parsing a bare catch fragment is
invalid. The script now uses parser children and wraps catch in a minimal try.
This changed the measuring tool, not the source or regression tests; the final
comparison preserves literal token content and asserts parse success.
