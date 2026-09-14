# Candidate rule v2 — task-grounded quality vector

V1 was frozen before the original B0 experiment; its exact text remains in
[multiaxis/rule-v1.md](multiaxis/rule-v1.md) and commit `283c238`.
V2 follows the [preregistered extension](multiaxis/protocol.md), independent
assessments and [results](multiaxis/README.md). This is a limited reasoning
procedure, not a required decomposition, exhaustive audit or numeric quality gate.

1. **Inspect actual evidence.** Read Business Design, relevant decisions, code,
   tests and meaningful history. State concrete maintenance questions and current
   edit, fault, invariant and verification owners. Mechanical renames and file
   length alone do not establish a need.
2. **Consider a change when a task exposes avoidable maintenance cost.** Examples
   include independent change reasons sharing a unit, duplicated invariant decisions,
   unnecessary I/O/setup for a value-only judgment, hard-to-reproduce decisions or
   dispersed failure investigation. V1's change-locality trigger was too narrow:
   a testability or diagnosis concern can also justify consideration. Evidence of
   an existing task is required; speculative future reuse is not enough.
3. **Compare keep and bounded alternatives as a vector.** Consider changeability,
   testability, diagnosability, verifiability, side-effect locality, invariant
   ownership, reproducibility, recoverability, dependency locality and AI
   analysability. For each relevant axis state improved/unchanged/worse/unknown,
   anchors, mechanism and uncertainty; briefly explain axes with no supported gain.
   Count added files, interfaces, types, capability inputs and inspection hops.
   Do not sum correlated axes into a score or require improvement on every axis.
4. **Preserve essential effects and shared ownership.** PostgreSQL comparison,
   locks, transaction ordering and recovery are behavior, not incidental setup
   to mock away. A testable decision is not automatically pure if it invokes an
   application callback. Keep invariant decisions authoritative, and distinguish
   local replay from captured production context or whole-Run recovery.
5. **Choose disposition.** Keep when costs exceed demonstrated task benefit,
   evidence is speculative, the existing seam suffices or a split merely moves
   complexity. Implement a reversible scoped refactor on a branch for review when
   meanings/public contracts stay fixed, ownership is explicit and regression
   gates are available. Record/propose if safety evidence is insufficient or the
   change requires new behavior. Ask the owner only for unresolved business meaning,
   external effects/costs or scope expansion, not to select an internal structure.
   Automatic implementation never means automatic merge.
6. **Preregister and verify the comparison.** Fix baseline, representative tasks,
   meaningful evidence and stopping criteria before edits. Use actual fixtures,
   effect traces or change tasks appropriate to the hypothesis, alongside required
   regression gates. One axis's benefit cannot compensate for correctness/recovery
   regression. Direct unit tests do not replace necessary DB tests; smaller spans
   do not prove lower inspection effort. Stop after one sufficiently supported
   candidate; retry only for a concrete failure or decision-changing uncertainty.
7. **Record a bounded conclusion.** Separate external precedent, repository facts
   and agent judgment. Record benefits, unchanged/worse/unknown axes, structural
   costs, verification, limitations and reopening condition. Reconsider after
   ordinary work only when new evidence or a reopened concern warrants it. The
   experiment's Fresh Agent replication is evidence about this rule, not a new
   requirement for two agents or a full quality matrix on every routine change.
