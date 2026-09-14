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

## Procedure

Keep v3's candidate-specific context collection, ten-axis quality/cost comparison,
invariant ownership and semantic reopening. Apply these distinctions using short
ordinary reasoning, not a mandatory record/template or score:

1. **Value/disposition:** ADOPT when the concrete maintenance benefit exceeds
   structure, inspection and verification costs; REJECT when the scoped comparison
   favors keep; DEFER for a named decision-changing unknown. Understanding code,
   SQL, tests and design is a maintenance task too. For a navigation claim, walk
   through the actual before/after task: which details can remain unopened, which
   caller facts remain and which hops/arguments are added. A new name alone is
   not evidence. A source walkthrough can suffice; agent studies are optional.
2. **Evidence effort:** establish meaning, ordering, side effects and rollback
   scope first. For a local reversible candidate with an explicit small seam and
   strong relevant verification, a source comparison or bounded branch trial may
   cost less than further proof of benefit. State the hypothesis and stop/revert
   condition. Wider interfaces, uncertain effects, weak coverage or expensive
   reversal require the comparison that can settle those risks. A same-file
   recovery change may need more evidence than a simple new module. Source
   rollback does not undo deployed effects. Do not demand a benchmark or replay
   study by default, or trade safety for cheap experimentation.
3. **Execution:** decide from current scope, urgency, diff/causal isolation and
   feasible gates. A justified change may be ADOPT + not_started during an
   unrelated urgent repair or release freeze. Dedicated cleanup/stabilization
   may make it timely; the phase name itself is not authorization. Ordinary
   feature work can include a relevant bounded improvement. In urgent work,
   include only structural changes necessary for the repair/verification.
4. **State:** keep a review-only trial distinct from runtime implementation and
   verification. An existing trial needs evaluation, not reconstruction. REJECT
   has no planned execution; waiting belongs to a chosen but untimely action.
   A specified invariant with pending tests can leave an established-value ADOPT
   blocked on readiness; an undefined effect/interface that can reverse value
   requires DEFER. On a timing trigger, reuse current evidence; reassess changed
   code/assumptions. Preserve existing authorization and PostgreSQL/SQL gates.

These are supported distinctions, not a fixed incident/feature/release lookup
table. Both agents identified wording ambiguities; the above clarifies them.
That final wording was reviewed, not independently re-scored as another experiment.

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
