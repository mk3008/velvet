# 0016: Proportion refactoring evidence and separate execution timing

Issue: [33](https://github.com/mk3008/velvet/issues/33). Extends [0015](0015-observable-refactoring-boundaries.md).
Status: adopted for bounded Velvet use; implementation readiness follows current
PR verification, not this status label.

## Why

V3 already permits proportional source evidence. Its deferred A2/B2 questions
nevertheless privilege reduced implementation/fixture obligations, overlooking
navigation benefits that do not change fixtures. Execution timing and decision
cost also need to be explicit. [Evaluation](../../evaluations/issue-33/README.md)
retains the frozen protocol, nine context cases, two independent applications,
four source-comprehension runs, source/scripted comparisons and limits.

## Current structural judgment: KISS for maintenance

This section is the current ordinary-task rule. It consolidates Decision 0015's
context/invariant principles and this decision's value/timing/evidence distinctions;
the linked v1-v4 experiment rules remain frozen historical evidence. The
[maintainer requirements](../../evaluations/issue-33/maintainer-requirements.md)
supply observations and hypotheses, not a requirement to improve every activity.

KISS means making a safe maintenance judgment, change and verification simpler.
For the same requirements, avoid unnecessary concepts, boundaries, indirection,
search alternatives and verification obligations. File/function/LOC counts are
cost clues, not the objective. Necessary complexity stays explicit.

- Start with a concrete maintenance question and its authoritative meaning.
  Consider the relevant task: comprehension, feature fit, impact, incident diagnosis,
  test selection, review, recovery or reuse of a prior decision. Retrieve existing
  context first; state the claim to settle, necessary pre/postconditions, effects,
  invariant/recovery owner and applicable evidence. Stop when these support that
  claim; disclose unresolved dependencies rather than implying uninspected guarantees.
- Compare keep with a plausible change. Prior adoption does not exempt a boundary
  from reassessment. For a reopened structural concern, ask whether it still owns
  an independent policy, invariant, change responsibility or verification obligation
  (including validation, transaction, retry or error ownership). If it owns none
  and the same facts must be rechecked across it, consider inline, consolidation,
  removal or redrawing alongside extraction when they could reduce that concrete
  maintenance cost. Do not enumerate every direction on every task.
  Explain what no longer needs to be considered together, which check becomes local,
  or which ambiguous search becomes direct.
  Moving text, naming alone or shorter appearance is insufficient. Count remaining
  caller facts, hidden dependencies, new interfaces/hops, duplicated meaning and
  verification/maintenance costs. Use current Astra tooling and an actual walkthrough;
  preserve human-readable why/invariant explanations and a causally clear diff.
  Improved navigation can suffice without fewer fixtures, but is not proof of fewer
  semantic obligations. Different tools may change the balance.
- Match evidence effort to downside and reversibility. A concrete source walkthrough
  and applicable existing checks can suffice for a low-risk local change; no routine
  benchmark, agent tournament or exhaustive scorecard is required. For wider or
  uncertain effects, collect only the observation that could change the decision.
  Keep semantic confidence and existing PostgreSQL/SQL/Alder gates; source revert
  cannot undo deployed effects. Judge the actual candidate diff, not its intended name.
- Separate value from timing and readiness. ADOPT requires supported net benefit;
  REJECT favors keep; DEFER names a decision-changing unknown. Cheap reversal alone
  is not benefit. Implement an ADOPT now when authorized, causally isolated and gates
  feasible; use ADOPT + not_started with a concrete trigger when value is established
  but timing/scope prevents execution. Unproven value is not ADOPT merely because a
  wider architecture seems promising. Safety readiness can block an otherwise valued
  change; an unresolved effect that could reverse value needs further assessment.
- Record the choice, main reason/cost and any missing evidence or reopen trigger in
  short prose. Reuse unchanged evidence; revisit changed assumptions. Stop at a
  supported scoped result. No recurring audit, mandatory template, prescribed file
  shape or decomposition direction follows. Business meaning, external consequences
  and scope authorization retain their existing ownership.

The ten quality axes in earlier experiments are prompts available when useful,
not a fixed checklist for every task. This consolidated wording has a bounded
[current-code application](../../evaluations/issue-33/kiss-application.md), not a
new independent agent-performance result.

## Scoped implementation and tradeoff

Adopt B2's private `executeMutableDestination(client, link, row, mapped, active)`
in the same file. It groups stored UPDATE/DELETE preparation, execution and
receipt validation; no exported seam, new module, state result or SQL path.
Caller keeps early mapped-identity validation before reassessment, Work creation,
awaited DML before retirement, Processing, shared model ordering and Run recovery.

The narrow benefit is an addressable semantic operation and less detail in the
row overview. All four comprehension answers retained the required ordering
facts. Follow-up function reading was more focused; total unique source exposure
was equal or slightly greater. The function reader favors named-unit navigation,
so no general AI-speed, token, human-time or correctness improvement is claimed.
Five inputs, an extra frame/promise boundary and unchanged DB fixture dependency
are real costs. Source/receipt comparisons supplement, not replace, PostgreSQL
regression and independent review. Exact rollback restores the inline block.

The current [candidate record](../../evaluations/issue-33/candidates.json) supersedes
only A2/B2 dispositions from the Issue 31 register; other records remain there.
A2's wider mutable-plus-Red module remains DEFER pending its own interface and
maintenance-task comparison. B2 evidence does not settle its distinct costs.
Stop at this supported local choice; no additional decomposition, navigation
scheme, recurring audit or Alder change follows.

## Explicit overview follow-up

[The additional comparison](../../evaluations/issue-33/overview/README.md) tests a
separate main-flow-only entry, which the original same-file experiment did not.
With ordinary range/search access, one of two trial readers stopped at a selective
overview (274 lines); the other expanded the whole worker (660). Current-layout
readers inspected 613/645 lines. All four retained required local ordering/recovery
facts. The focused reader later consumed all 417 worker lines for the mutable task,
including unrelated model detail. Full local review required 753 unique lines in
current layout versus 768 in the trial, with additional file transitions.

The explicit boundary enabled a lower-resolution read but did not consistently
reduce inspection or solve the next detail boundary. Keep this exact three-file
layout as an evaluated fixture; reject further runtime splitting for this pass.
B2 adoption and A2's distinct DEFER remain. No general AI speed benefit, always-read-
everything policy, mandatory index filename or recursive decomposition rule follows.
Deployed metadata routine bodies were outside the reading packet and disclosed as
uninspected by every participant; this is local source comprehension evidence,
not verification of all database guarantees.

## Maintainer requirements follow-up (non-normative)

[The requirements reflection](../../evaluations/issue-33/maintainer-requirements.md)
distinguishes observed navigation, current tool constraints and hypotheses about
broader maintenance. Its candidate directions are not adopted rules or additional
experiments, and do not change B2, A2 or the overview-layout disposition above.
