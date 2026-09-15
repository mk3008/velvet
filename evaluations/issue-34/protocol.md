# Bounded candidate-generation protocol

Frozen before the independent application. Baseline: `fcda11b` (merged #33).
Current evaluator: Decision 0016; no alternative evaluator or rule treatment.

## Selection and question

Use registration's field-to-SQL-to-receipt maintenance path and execution's
pre-Run malformed-mapping rejection path. The former still contains per-query
forwarding functions after Decision 0007 removed the generic forwarding layer;
the latter is a deliberately introduced boundary (`f2a1e22`, Decision 0015).
This gives a plausible removable seam and a valuable isolation seam within one
bounded application, without repeating the #33 mutable/overview study.
These are source-derived maintenance questions, not claimed user incidents.

One fresh independent agent receives only `intake-prompt.md` and a detached
baseline worktree. It does not inherit the Issue, this protocol, the author's
hypothesis, or changes. Ordinary repository history and guidance remain available;
there is no claim that existing Decisions contain no directional precedent.
The author independently inspects both paths and compares the resulting choices.

Record the exact prompt, baseline, agent identity, raw final response, and source
references. No timing/token or internal-attention claim. Reproduction means a
fresh agent can repeat the inputs, not that its answer must be deterministic.

## Decision and stopping condition

Observe whether the agent itself generates removal/consolidation/redrawing;
whether that candidate removes an actual obligation rather than just text;
and whether it preserves useful validation, SQL, transaction and failure owners.
Distinguish code-boundary costs from missing names/evidence routes/tooling.
A compatible narrow removal plus retained useful boundary is sufficient to stop.
Failure to generate a plausible candidate is a scoped negative result, not a
reason to repeat until successful. Only a concrete ambiguity that could reverse
the decision permits an additional run. No tournament or general success rate.

A supported ready candidate may be implemented on the dedicated branch, with
behavior regression checks, full `pnpm verify` / PostgreSQL CI, unfiltered SQL
audit and separate Alder review. Otherwise record KEEP/REJECT/DEFER and stop.
Do not revise A2/B2, Business Design, transfer semantics or Alder. No automatic merge.
