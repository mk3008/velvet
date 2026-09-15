# 0017: Reassess prior boundaries without prescribing direction

Issue: [34](https://github.com/mk3008/velvet/issues/34).
Baseline: `fcda11b`, after merged #33. Evaluator remains [0016](0016-proportional-refactoring-decisions.md); the follow-up adds a bounded candidate-generation cue.

The [bounded evaluation](../../evaluations/issue-34/README.md) compares registration
field/receipt maintenance with the deliberately introduced mapping-validation
boundary from `f2a1e22`. The mapping seam remains useful for direct value-only
checks; its caller still owns pre-Run timing and configuration/recovery effects.
It was re-evaluated, not retained merely because a prior Decision adopted it.

Adopt removal of the two setting-registration INSERT execution forwarders. Each
only dispatches its named QuerySource; its sole caller already owns awaiting,
cardinality and parsing. Direct execution removes the separate no-policy contract
to inspect. Parsed parameters retain an explicit compile-time query compatibility
check. SQL-versus-validation files and all receipt, transaction, public and business
contracts remain. This refines #13's incomplete cleanup; no later business change
or original failure of SQL/validation separation is asserted.

One fresh ordinary-context agent proposed typed handoffs and retained mapping
isolation, but did not propose runtime seam removal. The removal decision is the
author's, separately reviewed. The independent result therefore does **not**
demonstrate autonomous bidirectional runtime candidate generation. It is insufficient
to diagnose a general bias or add another mandatory checklist. Initially the
study stopped without changing guidance. The owner's subsequent
[request](https://github.com/mk3008/velvet/pull/36#issuecomment-5673099006) correctly
distinguishes that general uncertainty from the observed local omission: a
plausible candidate cannot be evaluated if it is not generated.

The [follow-up](../../evaluations/issue-34/guidance/README.md) adds only a conditional
ownership question to 0016's existing comparison paragraph. Prior adoption grants
no exemption; when a boundary owns no independent policy/invariant/change or
verification responsibility and requires the same facts to be rechecked across
it, consider a plausible subtractive/redrawing alternative. Ownership absence
alone is not an adoption criterion: the existing net-benefit, navigation, timing
and safety tests still apply. AGENTS already routes to 0016 and is unchanged.
One fresh application uses the original code and prompt plus only that cue;
the forwarder removal was again not proposed. The response notes repeated parsing
but does not justify its removal as a maintenance improvement; mapping stays KEEP.
The cue is retained as a conditional reasoning aid with effectiveness unestablished,
not as an experimentally validated generator improvement. Both negative observations
remain visible. Results and limits are in the follow-up; stop without another run,
stronger steering, matrix or Alder change.

Reopen these local choices on changed execution-policy consumers, lost validation
isolation or repeated caller coordination. A2/B2 retain #33 dispositions. Source
rollback is straightforward, but verification/readiness still requires existing
PostgreSQL, SQL and independent review gates. See the evaluation for results and limits.
