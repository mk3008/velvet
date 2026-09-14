# Final extension: candidate context sufficiency protocol

Baseline B2: `4b895265d8262fafd7a95221a344a7de8c93841e`.
Request: [PR 32 comment 5664632667](https://github.com/mk3008/velvet/pull/32#issuecomment-5664632667).
Recorded before this extension's independent assessments, candidate dispositions
or runtime edits. Earlier experiments are historical evidence, not new replications.

## Question and method

Can an AI generate plausible candidates, obtain decision-relevant repository
context, distinguish sufficient evidence from missing evidence, choose
ADOPT / REJECT / DEFER, and recognize a later observation that reopens a decision?

Two fresh contexts independently define what context they need, starting from
AGENTS and Business Design, and retrieve it from B2. They receive no desired
structure or disposition. Assess the already-raised model-separation hypothesis
as well as alternatives generated from concrete maintenance problems. A pattern
name is a search seed, not an adoption reason. Do not conflate broad model/metadata
fragmentation with a narrow model seam retaining a common orchestration owner.

For each candidate record:
- problem and code/history/test evidence that it actually occurs, or hypothesis;
- enough candidate scope to compare it fairly with keep (not just a pattern name);
- decision-relevant questions, retrieved sources, outstanding questions and why
  an answer could change the choice;
- retrieval attempted and outcome: acquired, not yet inspected, absent from
  inspected sources, inaccessible, or comparison not yet performed;
- the existing ten-axis vector, additional structure/capabilities/inspection and
  verification costs; clearly distinguish observation, inference and unmeasured gain;
- disposition, confidence, missing context, next smallest useful observation,
  reopen condition and who can supply it.

Retrieve available context before declaring DEFER. A missing benchmark is not
automatically decisive: source-level evidence can suffice for a bounded decision
if the mechanism/cost is clear. Conversely, existing green CI cannot establish
a proposed structure's maintenance benefit. Sufficient means remaining unknowns
would not plausibly reverse this scoped decision, not that every repository file
or every metric has been examined.

ADOPT means demonstrated current benefit exceeds structural/verification costs,
with preserved meanings and a feasible verification route; implementation and
verification status are recorded separately. REJECT means sufficient context
supports insufficient benefit or excessive cost/risk for this concrete candidate.
DEFER means a plausible candidate has decision-changing missing evidence.
Stopping after a supported candidate does not turn unexamined alternatives into
REJECT. If unavailable tools block a necessary experiment, report that separately
from repository insufficiency; available GitHub CI remains a possible route.

## Replication and reopen probe

Save exact prompts and complete final responses. Agents must not inspect each
other's response or root's later verdict. Compare independently collected context,
candidate scope, sufficient/insufficient judgments, labels and reopening evidence;
report disagreements rather than averaging them away. No rerun to manufacture
agreement. Shared tools/repository provide procedural, not security isolation.

After initial assessments, freeze one candidate record with explicit missing
evidence/reopen conditions. Give a fresh-context reader that record and at least
one relevant historical source event and one unrelated source event, without an
expected classification. Require whether each event reopens a particular question,
what remains missing, and whether it changes the label. State openly that this is
a replay/simulation of future intake, not evidence of a deployed watcher.
Reopening is a request to reassess, not automatic adoption.

Root reconciles the independent assessments and can perform a bounded comparison
if it resolves a decision-changing unknown. Any runtime candidate must first have
a recorded comparison scope and preserve validation/SQL/transaction/failure
semantics, then pass required PostgreSQL Verify and existing scoped deployment
gates. Do not implement merely to make all three labels appear in the results.

## Completion and stopping

Stop once the procedure is inspectable, independent self-collection and the reopen
probe are recorded, and the model-separation hypothesis has a supported label
with limits and next evidence specified. Do not start a repository-wide tournament,
continuous monitor, framework or Alder integration. Correct v2's conflation of
keep/insufficient evidence via a small rule/Decision/AGENTS integration if supported.
No universal performance, accuracy or population reproducibility claim follows.

Execution constraint at preregistration: local exec environment is unavailable.
GitHub connector reads/writes and existing Actions are available. Do not claim
local runs or use this constraint as a reason to misclassify an otherwise
decidable candidate. Document-only procedure/evidence changes need source/link
checks; runtime/wiring changes require the existing actual gates.
