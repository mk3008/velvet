# Proportional action rule — trial v4

Extends [v3](../issue-31/rule.md); retain its candidate-specific retrieval,
ten-axis tradeoffs, invariant ownership and semantic reopening. No additive score.

1. Pin the candidate and a present maintenance task. Include understanding and
   navigation of code, SQL, tests or design artifacts where concrete inspection
   is needed. Compare keep and the relevant alternative. Names/shorter functions
   are hypotheses, not benefit evidence; count caller facts and added hops too.
2. Establish a safety floor before reducing evidence effort: which semantics,
   ordering, capabilities and failure behavior must remain, how to check them,
   and how to undo the edit. Source-only reversal does not undo deployed effects.
   A private same-file function can still have a large semantic blast radius.
3. Choose the smallest decision-changing observation in proportion to downside.
   For a bounded local edit with explicit inputs, unchanged effect ownership,
   cheap source rollback and strong applicable checks, source comparison and a
   concrete navigation/change explanation can suffice. A reversible branch trial
   can cost less than a replay study; record the hypothesis and stop/revert test.
   Trial authorization is not yet an ADOPT verdict. Reinspect its actual diff
   and verification before deciding. Do not require time/ROI benchmarks by default.
   For wider interfaces, caller coordination, weak coverage or costly rollback,
   obtain the relevant interface/change/failure comparison first. Neither file
   count nor urgency lowers semantic confidence requirements. Explain why more
   evidence could change the decision, and whether its cost is proportionate;
   do not invent numeric savings or probabilities.
4. Decide value separately: ADOPT when scoped evidence supports net benefit
   against structure, inspection and verification costs; REJECT when evidence
   supports keep; DEFER only for an identified decision-changing unknown. Cheap
   reversible does not itself mean valuable. Missing safety evidence can block
   execution even when maintenance value is established; unresolved effects
   that could reverse net value also require DEFER. Preserve these distinctions.
5. Decide execution from actual task constraints, not a fixed phase label:
   implement now only when authorized, gates feasible and diff/causal isolation
   remain suitable. A justified candidate can be ADOPT + not_started because an
   urgent repair, frozen scope or independently reviewable fix should go first.
   Dedicated cleanup or feature-complete stabilization can make inspection and
   verification work timely; late release freeze can do the opposite. Ordinary
   feature work permits a relevant local seam, not unlimited cleanup. Urgent work
   permits only structural work necessary for the repair and its verification.
6. Record disposition, execution reason and evidence effort separately from
   implementation/verification state, using short prose for ordinary work. State
   the next trigger when waiting; an already justified change need not re-prove
   value merely because timing improves. Reassess if code or assumptions changed.
   Run existing gates, review the diff, and stop when the scoped decision is
   supported. No human permission is needed for routine authorized reversible
   work; business meaning, expanded scope and external consequences retain their
   existing authorization boundaries.
