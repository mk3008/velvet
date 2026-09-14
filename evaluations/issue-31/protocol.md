# Preregistered experiment

Baseline: b3190e3d341ee21478161f2b8b31f96826c503b1. Candidate: rule.md v1.

Before implementation, two fresh contexts independently apply the rule to the baseline, without proposed decomposition or access to each other's findings. Save complete final assessments and prompts. Compare trigger/no-trigger, cited change reasons, invariant ownership and implement/propose/keep disposition. Exact module agreement is not required. Two runs establish only small-sample repeatability, not a success rate for other systems.

Representative maintenance probes, selected before implementation:
- P1: lost successful COMMIT response / durable failed Run recovery (historical 6ffab6f).
- P2: mutable stable-key guard despite comparison exclusions (Phase 4).
- P3: nullable set-phase dispatch and common successful finalization (Issue 25).
- P4: metadata row/routine retirement ordering (Issue 23).

For each revision identify actual code anchors and owning functions, required cross-function/file inspection and edits, and exposure to unrelated behavior within the containing function. Count function spans only as a bounded lexical exposure proxy, NOT actual reading time or proof of maintainability. Keep exact task anchors visible so a third party can disagree. Evaluate whether ownership/coordination gets worse, including deliberately cross-cutting probes. No feature behavior is implemented for probes.

Accept a narrow candidate only if at least one independent task loses unrelated behavior exposure, representative edits do not require duplicated invariant decisions, and unchanged PostgreSQL regression plus pnpm verify gates pass. Mixed outcomes narrow the conclusion. Stop after the first sufficiently supported candidate; otherwise record proposal/keep. Independent post-change Alder review checks semantics and evaluates whether the change actually follows the rule. Historical application is retrospective and cannot prove what agents would have known then; do not use future changes to justify earlier triggers.
