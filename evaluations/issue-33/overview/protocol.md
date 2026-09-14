# Overview navigation extension — frozen protocol

Request: [PR 35 comment 5671427098](https://github.com/mk3008/velvet/pull/35#issuecomment-5671427098).
Baseline: `0086480a3c528d1d2a52d49056d90616234f5a38`. B2 remains adopted;
A2 remains a distinct deferred candidate. Scope is the untested overview/detail
question, not reopening the proportional rule or imposing an index convention.

## Candidate and control

Compare current same-file boundary (including B2) with a research-only executable
layout: compatibility boundary → explicit main-flow-only entry → row work/detail.
Move existing declarations without altering their bodies. Keep row-work internals
unexpanded initially: this deliberately tests whether the reading-boundary problem
reappears at the next level. Count the facade, exported internal seams, imports,
extra files, unchanged arguments and type/runtime dependency edges. A smaller entry
is a hypothesis, not adoption evidence. No runtime candidate is selected in advance.

Baseline and candidate use the same public entry `boundary.ts`; the reader exposes
real candidate filenames after entry. Both may read all files, search regex with
context, and read arbitrary line ranges. Unlike the prior reader, there is no
special whole-function lookup with exact boundaries. File/line counts are visible
on request. Common dependencies are the same pinned source. This removes the
previous forced whole-function reread affordance; it does not reproduce every IDE.

## Four fresh participants

Two contexts per variant, assignment r1/r3 current and r2/r4 candidate. Each receives
only its assigned source reader and identical tasks, no expected answers, peer
results, design conclusion or history. No result discarded or rerun for agreement.
Isolation is procedural, not OS-enforced. Record exact prompt, complete staged final
answers and every reader request. Reader records source lines, UTF-8 output bytes,
file transitions and command count; replay logs from pinned samples.

Each participant completes three stages in fixed order, recording the answer before
starting the next. Carryover is intentional: report each stage and cumulative unique
source, plus newly exposed lines, so rereading is not confused with new knowledge.

1. **Overview:** explain coordinator order/responsibility from validation through
   durable Run creation, work dispatch, success and failure. Do not expand row/set
   details unless needed. Ground truth: pre-Run checks, lock/config acquisition,
   first commit makes Run durable, second transaction reacquires/rechecks config,
   dispatch, common finish/commit; rollback attempt, guarded failure recording,
   original/secondary errors. A rejected COMMIT response is not proof of rollback.
   Names alone do not prove stored SQL or leaf semantics; disclose uninspected facts.
2. **Target:** trace mutable returned-key validation, its earlier mapped-key guard,
   Work placement and deletion retirement; distinguish UPDATE vs DELETE and no-op.
   Ground truth: mapped identity precedes reassessment/no-op and Work; receipt is
   after DML and Work, before deletion retirement; UPDATE leaves Active, DELETE
   retires after successful receipt; both row/routine paths preserve common recovery.
   Inspect enough detail to substantiate these facts, not merely helper names.
3. **Broad review:** check the complete local legacy row/routine execution path and
   coordinator for its major decision/effect ordering. Include preparation/source
   identity, duplicate/insert-only/no-op, mapping/comparison, Work, mutable effects,
   immutable Red/Black/Lineage, completion/Processing, commit/recovery. Explicitly
   inspect all local execution bodies and binding/metadata code needed to substantiate
   the review, or disclose omissions. Set-phase internals, stored author SQL meaning
   and actual DB correctness are outside this code-reading task. A whole-file read
   is legitimate here; do not optimize exposure at the expense of justified review.

## Scoring and interpretation

First score the above required facts and whether unsupported claims replace needed
inspection. Compare counts only at compatible correctness/coverage. For overview,
row implementation is unnecessary detail; for target, immutable Red/Black internals
are unnecessary except when establishing shared ordering; for broad review, nearly
all local execution detail is relevant. Record incidental exposure by source region
where practical, separating boilerplate, code and common dependencies. Indirection
and interfaces are costs even if source lines decrease. Do not infer time/token
savings or population effects from four runs or from file length alone.

Stop after four staged runs and independent evidence review. If counts vary, retain
variation. If the advantage disappears with ordinary search/ranges, report that.
If an entry helps overview but deeper/full tasks still need broad reading, report
both rather than recursively restructuring until a preferred result appears.
Unchanged declaration-body equality and temporary whole-source typecheck make the
fixture interpretable, not production-ready; runtime adoption would require the
normal pnpm verify/PostgreSQL/Alder route. Keep the fixture experimental if interface
costs outweigh demonstrated benefit. Update Decision/report/PR with supported limits.
