# Candidate rule v3 — context sufficiency and dispositions

V1 and [v2](context/rule-v2.md) are historical experiments. V3 follows the
[final protocol](context/protocol.md), independent context collection and
[results](context/README.md). This is a task-specific reasoning procedure, not
a named architecture, fixed context checklist or full-repository audit.

1. **Generate plausible, bounded candidates from a real task.** Name the
   maintenance problem and repository evidence. Engineering knowledge can suggest
   Strategy, model functions, shared operations or value-only decisions; pattern
   familiarity is not evidence to adopt them. Compare keep and the most relevant
   alternatives. Do not reject a small common-orchestrator seam using objections
   to a different broad fragmentation proposal. Pin materially different variants.

2. **Define context by questions that could change this choice.** Usually follow
   Business Design/Concept/DFD/Process into implementation and side-effect owners,
   history, tests/CI, failures/recovery and dependencies/callbacks. State which
   meanings, validation/order constraints and maintenance costs the particular
   candidate needs. Do not demand every document or a new benchmark by default.

3. **Collect, then diagnose sufficiency.** Inspect available authoritative sources;
   distinguish acquired from actually read. For each decision-changing unknown,
   record retrieval attempted and whether it is not yet inspected, absent from
   inspected sources, inaccessible, or an unperformed comparison. A failed search
   is not proof of absence. Read the needed material now when feasible; do not
   label DEFER just to avoid available retrieval. Sufficient means remaining
   unknowns would not plausibly reverse the scoped choice, not exhaustive knowledge.
   Source equality, contracts and costs can suffice; green baseline CI alone does
   not establish a candidate's maintenance benefit. Tool limits are separate from
   repository evidence gaps; use the existing CI route when execution is needed.

4. **Compare the ten-axis vector and costs.** Consider changeability, testability,
   diagnosability, verifiability, side-effect locality, invariant ownership,
   reproducibility, recoverability, dependency locality and AI analysability.
   Mark supported/unchanged/worse/unknown effects with source anchors and limits,
   including additional files/functions/interfaces, inputs, capabilities, hops
   and verification. Do not add correlated cells into a score. Shared ordering
   requires an authoritative owner, not necessarily a single function.
   Correctness/recovery regressions cannot be compensated by other benefits.

5. **Classify each assessed candidate, separately from implementation readiness.**
   - **ADOPT:** sufficient evidence supports current benefit greater than
     structural/verification cost. Implement reversible in-scope changes for
     review when authorized; record implementation and gate status separately.
     ADOPT does not mean tests passed, merge approved or new business meaning.
   - **REJECT:** context is sufficient and the concrete comparison supports
     insufficient benefit or excessive cost/risk. Record the scope and reason.
     Do not generalize rejection to materially different variants.
   - **DEFER:** plausible candidate, decision-changing evidence still missing.
     Record exactly what is missing, collection already attempted, the smallest
     next observation, who can supply it and a semantic reopen condition.
     New business uncertainty may require the owner; missing technical comparison
     does not automatically require a human to choose the structure.
   Stopping after one useful candidate leaves unresolved candidates deferred,
   not rejected. Unexamined ideas are explicitly unassessed, not automatically
   labeled. No equal quota of the three statuses is required.

6. **Verify proportionately and stop.** Fix baseline, hypothesis, comparison and
   stopping criteria before edits. Keep required PostgreSQL/SQL gates for runtime
   changes. A local scripted test cannot prove DB semantics. Preserve SQL,
   validation, callback timing and transaction/recovery contracts. Stop at the
   supported outcome; do not run a tournament just to settle every deferred idea.
   Record why a remaining comparison is outside this bounded pass and still
   feasible, rather than implying missing evidence can never be acquired.

7. **Reopen through ordinary task intake.** Use the small
   [candidate register](context/candidates.json) when an Issue/PR, test change or
   incident addresses a recorded scope/question. Paths/keywords only shortlist;
   an out-of-path report may be relevant. Check the actual observation against
   missing evidence and compare its source revision with evidence already seen.
   Record event ID plus content revision, exact candidate/variant/question,
   relevance, next action and previous event/assessment. Identical redelivery does
   not create another task; edited/new evidence on the same ID can. Reassessment
   is not automatic ADOPT, and a newly relevant problem may leave the comparison
   unanswered. Keep disposition and queued-assessment state separate; revise a
   prior label if its sufficient basis no longer holds. Do not create a background
   watcher, mandatory agent pair or constant audit.

Use short records for ordinary decisions; the full experiment artifacts are
evidence about this procedure, not a required reporting template for every edit.
Existing Business Design, authorization and verification requirements remain.
