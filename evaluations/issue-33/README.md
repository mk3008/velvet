# Issue 33 — proportional refactoring decisions

Baseline `9f554991ab3068756c6b05a483082ad3cda925ef` (merged PR 32).
This is a bounded Velvet study, not a universal refactoring threshold or an
Alder change. [Protocol](protocol.md) was frozen at `34a4ab9`, cases at `947c236`,
reader/task at `eb55b75`, and complete trial fixture at `0703e88`, before scored
runs. [Launch prompts](run-prompts.md), [sources](engineering-basis.md), raw
responses and machine-readable exposures make the result reviewable.

## What was missing

V3 already allows source comparison and proportional verification; it is not a
blanket demand for experiments. However, A2/B2's concrete open questions emphasize
fewer unrelated implementation/fixture obligations. They omit the possibility
that semantic navigation alone is valuable. V3 also separates implementation from
disposition but leaves evidence effort and task timing mostly implicit.

The [trial v4 rule](rule.md) explicitly separates value, execution and decision
work. Safety/meaning remains a floor. Cheap source rollback can make a branch
trial reasonable; it cannot undo bad deployed SQL effects or prove net benefit.
A supported refactor can wait for appropriate scope without reverting to DEFER.
Information-artefact and overview/detail precedents supplied probes, not coding
requirements. No index hierarchy, size threshold or additive score is adopted.

## Comprehension experiment

Four fresh contexts each saw one sample, no peer output or preferred answer.
All used the same instrumented reader, which supports function expansion, regex
search and full-file reading. Baseline n1/n3; candidate n2/n4. Complete answers:
[n1](runs/n1.md), [n2](runs/n2.md), [n3](runs/n3.md), [n4](runs/n4.md).

| Run | Variant | Outline displayed source lines | Locator displayed source lines | Locator newly exposed lines | Total unique source lines |
| --- | --- | ---: | ---: | ---: | ---: |
| n1 | keep | 307 | 331 | 24 | 331 |
| n2 | private B2 | 283 | 48 | 48 | 331 |
| n3 | keep | 307 | 331 | 24 | 331 |
| n4 | private B2 | 283 | 57 | 57 | 340 |

Manual factual scoring against the frozen protocol: **all four passed all three
required facts**: (1) pre-loop preparation, per-item comparison/Work/effects and
completion outline; (2) returned identity checked after mutable SQL and Work,
before delete retirement; (3) mapped identity checked before reassessment, where
a no-op could otherwise bypass the later guard. All four distinguished uninspected
SQL/transaction behavior from visible call order. n2 did not inspect `projection`
internals and explicitly said so; n4 did, accounting for nine extra unique lines.
No correctness gain is observed.

The candidate exposes a named operation with 24 fewer outline lines and permits
focused detail expansion. Baseline participants both re-read the complete row
function in the locator phase. That explains almost all displayed-line reduction:
**total new information was equal or slightly greater with extraction**. The
reader offers no arbitrary line-range action, so its function-oriented interface
favors an addressable helper when revisiting detail. Normal editors/rg can retrieve
the original block directly. This demonstrates local navigation under this reader,
not elapsed-time, token, general AI-performance or human-productivity improvement.
The modest overview benefit and extra call/parameter cost must both enter selection.

The source still contains several detailed stages: this experiment does not show
that one seam makes the whole repository easy to understand or that more extraction
would improve it. Existing Business Design routing already supplies repository
entry points; no observed task requires another index.

## Trial safety and verification scope

The inert fixtures isolate B2: one private five-input helper, no result state,
module/export or new SQL path. Its 25-line body is identical after dedenting;
full reconstructed boundary token equality retains the earlier identity guard,
Work creation, later retirement, shared processing and Run recovery.
[Comparison](compare.mjs) and [raw results](probe-measurements.json) exercise the
actual binder with 29 scenarios / 58 executions and independent expected errors,
query text/values and thrown-object identity. These supplement existing tests;
scripted receipts do not establish PostgreSQL locks, rollback or baseline correctness.

Reproduce from repository root using the pinned package manager:

```sh
corepack pnpm install --frozen-lockfile
node evaluations/issue-33/compare.mjs
node evaluations/issue-33/summarize.mjs
```

The [evidence workflow](../../.github/workflows/issue-33-evaluation.yml) replays
checks and compares committed JSON without a pipeline hiding exit status. It
recomputes stored read logs, not live agents. New agent runs may differ; do not
claim exact model determinism from these four participants.

## Decision and current records

[Selection](selection.md) was committed before runtime adoption. Both independent
applications agreed on all nine cases; C3 and C8 keep a supported module ADOPT but
not_started, whereas C6 makes the same candidate timely. Their C2 DEFER predates
the navigation results. Root then adopted only the measured B2 private seam,
weighing its limited addressability against five inputs and an extra async frame.
A2 remains DEFER for its distinct module/interface comparison. The [current
register](candidates.json) records evidence effort, timing, implementation and
reopen conditions without overwriting historical Issue 31 evidence.

[Decision 0016](../../docs/decisions/0016-proportional-refactoring-decisions.md)
integrates the supported distinctions. The agents' wording clarifications are
identified as reviewed, not a re-scored v5 experiment. [Independent Alder
review](review.md) found no blocking defect and reproduced both evidence outputs.
No further structure or broader study is required by this bounded result.

## Publication provenance

Frozen prompts/responses retain the local preparation commit IDs. Direct git push
had no credentials; the GitHub connector published those commits' trees in order.
[Commit map](commit-map.json) maps every preparation/selection/runtime snapshot to
its public commit and records verified identical trees. API commit timestamps
reflect publication, not experiment execution time. This is retained provenance,
not a claim of an independently timestamped public preregistration.

## Local readiness

Pinned `corepack pnpm` 10.19.0 installation, typecheck and build passed. Local
`pnpm verify` passed the 52 tooling tests and compilation, then failed to initialize
the main test suite because no PostgreSQL/container runtime was present. Its
“No test files found” line followed global-setup failure, not absent test sources.
No local PostgreSQL success is claimed. Existing PR Verify supplies the required
real-database regression and SQL audit; the existing deployment workflow also runs.

## Verified runtime snapshot

Published runtime `67fc622d9697d6afd7fed7ad24e0daee0bade69c` passed
[PostgreSQL 18 Verify](https://github.com/mk3008/velvet/actions/runs/34900638465):
52 tooling + 286 main tests, no skips, typecheck/build, transfer-document checks,
SQL audit and materialization checks. [Evidence CI](https://github.com/mk3008/velvet/actions/runs/34900638365)
also passed both deterministic comparisons. These are current runtime results,
not borrowed baseline CI. The final report-only commit preserves that runtime;
final-head Verify, evidence and existing deployment results are linked from
[PR 35](https://github.com/mk3008/velvet/pull/35) to avoid a self-referential
verification commit. No merge is authorized by these results.

Stop condition reached: supported proportional distinctions, reproducible timing
boundary, a tested local semantic grouping candidate and separately scoped A2
DEFER. No elapsed-time, production-fitness or general AI-efficiency claim follows.
