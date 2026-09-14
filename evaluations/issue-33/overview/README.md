# Explicit overview entry: conditional benefit, no further runtime split

Response to [comment 5671427098](https://github.com/mk3008/velvet/pull/35#issuecomment-5671427098).
The earlier same-file helper experiment did **not** test a separate main-flow entry.
This extension tests that missing hypothesis while preserving the initial B2 ADOPT,
A2 DEFER and value/timing/evidence-effort conclusions.

**Result:** a separate entry enabled selective overview reading in one participant,
but another immediately expanded the entire worker. The next detail still exposed
unrelated model code, and complete local review required slightly more unique source
and more file transitions. Keep the exact three-file layout as an evaluated fixture;
**do not adopt this additional runtime split on the current evidence**. This is a
scoped keep decision, not a general rejection of overview files or larger-scale
information architecture. No production source changed in this extension.

## Comparison and prior registration

Baseline `0086480a3c528d1d2a52d49056d90616234f5a38` is the already-verified B2
implementation. [Protocol](protocol.md) and [task](participant.md) were published as
`19e469d` before the complete fixture/reader packet `80cc5f7`, before fresh-agent
launches. [Launch record](launches.md) preserves exact prompts and procedural limits.
All four results were published as `478e927` before the root's final conclusion.
Local/public commit trees were checked equal during API publication.

| Layout | Executable source organization | Added maintenance surface |
| --- | --- | --- |
| Current B2 | `boundary.ts`, 546 lines | Baseline |
| Trial | `boundary.ts` facade 3 lines → `main.ts` 141 lines; `row-work.ts` 417 lines | Two files, two internal runtime exports (`object`, `executeRowTransfer`), one type export (`Row`); 561 total lines |

The trial main file contains only imports and the existing coordinator declaration;
its orchestration still contains real validation, lock/recheck and recovery logic.
All 13 original declarations, including private B2 and the full row worker, remain
exactly equal at declaration text level (excluding leading trivia) after removing
added export modifiers; fixture regeneration also retains their source comments. No new function calls, argument
fields, duplicated helper bodies, SQL or public API were introduced. Existing eleven
row-worker inputs now cross a module seam; the type-only set-phase back-edge remains,
and no runtime cycle is introduced. Error/type placement in the worker means the
entry does not contain every fact a cautious reader may want.

The [generator](build-fixtures.mjs) can regenerate the fixtures. [Parity](parity.mjs)
checks declarations, shared dependencies, import/reexport surfaces and unchanged
production source, plus a temporary whole-project typecheck. [Raw evidence](parity.json)
is not runtime/DB equivalence: initialization order, module identity and actual DB
behavior would still require normal production gates if this layout were adopted.

Unlike the first experiment's function reader, [this reader](read.mjs) offers ordinary
whole files, arbitrary ranges, regex search/context and file counts. There is no
oracle supplying exact function end boundaries. Both variants start at the same
public `boundary.ts`. No participant was required to read the whole boundary or to
prefer low counts. Set-phase internals and authored SQL correctness were outside
tasks; the packet's available paths cover the execute-transfer source directory,
not deployed DB routine bodies.

## Correctness before counts

Complete staged responses: [r1](runs/r1.md), [r2](runs/r2.md), [r3](runs/r3.md),
[r4](runs/r4.md). Two fresh contexts per layout; each records overview, target,
then broad review before proceeding. Raw read logs preserve requests, emitted lines
and output hashes. No output truncation was reported. Knowledge carryover is visible
in newly exposed/cumulative counts; these are not three independent tasks per person.

All four correctly explain the frozen local facts:

- pre-Run checks, first committed Run, second transaction/config recheck, dispatch,
  common success/commit, coordinator rollback/failure recording and original/secondary
  errors; none equates a rejected COMMIT response with server rollback;
- earlier mapped-key validation before reassessment/no-op and Work, returned-key
  validation after DML and Work, then DELETE retirement; UPDATE keeps Active;
- preparation/source identity, duplicate/insert-only/no-op decisions, Work/effects,
  immutable Red/Black/Lineage, completion/Processing and coordinator recovery.

Every run eventually exposed all 13 local declarations and the complete common
queries/mapping/binder files. They also consistently disclosed that routine SQL
wrappers do not establish unprovided `record_skipped`/`record_black`/`retire_active`
bodies, actual DB effects or external library correctness. Thus broad coverage is
complete for **available local legacy code**, not for every business/DB guarantee.
No correctness improvement or detected regression is demonstrated by these tasks.
Minor response qualifications remain: r2 had not inspected the error constructor
at overview, r4's collected source result does not prove a transaction-isolation
snapshot, and authored reassessment SQL is not proven effect-free before Work.
An [independent evidence review](review.md) corroborates the scoring and replays.

## What readers actually inspected

All figures below are source lines, including blank lines in emitted ranges.
“Broad additional” counts newly exposed lines, not source already read in earlier
stages. [Machine-readable totals](measurements.json) also include emitted UTF-8 bytes,
per-stage commands, repeated exposure, exact paths and declaration coverage.

| Run | Layout | Overview unique | Target newly exposed | Broad additional | Final unique | Reader commands | File transitions |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| r1 | Current | 645 | 0 | 108 | 753 | 7 | 4 |
| r3 | Current | 613 | 32 | 108 | 753 | 6 | 3 |
| r2 | Trial | 274 | 417 | 77 | 768 | 8 | 5 |
| r4 | Trial | 660 | 0 | 108 | 768 | 8 | 6 |

**Overview:** both current-layout readers voluntarily read all 546 boundary lines;
r1 read all query definitions and r3 a 67-line search result. Trial r2 read the
3-line facade and 141-line main, queries and mapping, leaving worker internals
unopened. Its overview contained zero of the defined unrelated row-detail region,
versus 367 such lines for both baseline readers. But trial r4 deliberately read
the entire worker to substantiate delegate ownership, types/error and ordering;
it exposed those same 367 detail lines and 660 total overview lines. Both strategies
produced correct, appropriately qualified answers. The layout offers a stopping
boundary; it does not ensure that a reader will regard it as sufficient.

**Target/detail recursion:** r2 followed the main call into all 417 worker lines,
including 90 lines of immutable Red/Black insertion irrelevant to the mutable target.
It then had the needed helper without another search. r4 reused its early full
worker read and revisited a 55-line helper range. Baseline r1 reread 171 targeted
lines; r3 used its cached boundary and completed the query definitions. Therefore
we observed renewed broad detail inspection, not literal repeated search at every
nested call. A main-only entry did not by itself supply the next selective boundary.
Do not credit caching/earlier overreading as zero total cost of the target task.

**Whole local review:** every participant ultimately consumed the same underlying
local declarations and three common files (207 lines). Current total is 546 + 207
= 753; trial is 561 + 207 = 768. Its 15 extra source lines and extra file navigation
remain when essentially all local behavior must be reviewed. No further functions
were added, but the existing call becomes a cross-file obligation and the facade
adds an entry hop. Front-loading a whole-file read is reasonable for this broad task.
This does not prove a whole-file-first strategy is best for every narrower task.

## Adoption judgment and limits

The conditional capability to defer 417 worker lines is real in r2, and a small
entry makes its own endpoint unambiguous. It is not a repeatable saving across both
trial participants. Current readers were free to search/range-read just the existing
coordinator too; none chose that strategy. Whole-file preferences, shared-query read
choices, prior-task memory and small sample size prevent attributing a universal
speed gain to file layout. Byte counts include path/line labels and are not tokens
or elapsed time. No developer-time, future co-change or population study was run.

For this exact candidate, the observed conditional overview benefit does not justify
making two extra modules and three internal exports permanent. Deeper task selection
and full-review cost did not improve consistently. **REJECT runtime adoption of this
layout for the current pass; retain current B2.** This is sufficient bounded comparison
supporting keep, not a DEFER awaiting a mandatory time study. A materially different
candidate or a real task with repeated selective-overview needs can reopen the choice.
This is not A2's mutable-plus-Red module; its separate missing comparison remains.

The result refines the initial limit: meaningful overview/detail structure can let a
reader choose a lower resolution, but useful task resolution and enough confidence
to stop must exist at each needed level. A separate filename alone does not guarantee
that. This is an explanatory observation, not a recursive decomposition rule, new
indexing framework, required comment shape or change to the proportional action rule.
Stop after this registered comparison and review; no experiment was repeated to
manufacture a preferred result, and no additional runtime decomposition is warranted.

## Reproduction and readiness

From repository root with pinned dependencies and full git history:

```sh
node evaluations/issue-33/overview/build-fixtures.mjs --check
node evaluations/issue-33/overview/parity.mjs --typecheck
node evaluations/issue-33/overview/summarize.mjs
```

The existing Issue 33 evidence workflow runs all three and compares the saved JSON.
Summary replay validates every emitted-source/output hash, then recomputes counts;
it does not recreate the fresh model responses. Original B2 evidence checks are
retained. This extension leaves production `src`, `db` and tests byte-unchanged from
`0086480`; PR35 links final-head Verify, evidence and existing deployment checks.
Passing baseline runtime CI is not a claim that the unadopted three-file fixture
has passed PostgreSQL regression.
