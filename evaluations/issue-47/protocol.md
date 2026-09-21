# Issue 47: bounded incident-origin evaluation

Target: `300ba133377cacf2bfd0a475436c3746cc0d3fbf`, after PR #46.
Task: [Issue #47](https://github.com/mk3008/velvet/issues/47).

## Question and scope

Evaluate whether tracing from an incident symptom back to a concrete implementation,
configuration and relevant state changes an existing structural judgment, its
reason, or an actionable evidence question. Existing Decisions 0016 and 0017 are
the comparison baseline, not a straw-man rule based only on code size. In
particular, 0016 already includes incident diagnosis and indirection/search costs.

Only evaluation artifacts under this directory may change. Product code, tests,
Business Design, standing rules, copied Alder knowledge and historical evidence
remain unchanged. No Alder adoption or traceability-drift gate is authorized.

## Budget and stop

One fresh primary evaluator, explicitly configured `gpt-6-astra` / `low`, receives
the [complete prompt](evaluator-prompt.txt) without conversation history. At most
four contrasting authored incident scenarios cover the Issue's comparisons.
The evaluator reads authoritative design before code, records initial symptoms
before implementation inspection, and preserves its original report and actual
navigation log. Existing history and decisions are available: this is not blind
candidate generation or a controlled comparison of agents.

Stop after those cases and one independent evidence/scope review. Corrections to
the synthesis may address concrete review findings; do not rerun evaluation until
a preferred conclusion appears. No new runtime benchmark framework or fabricated
production incident is needed. Missing historical/runtime evidence is a result,
not permission to infer a root cause or demand a new retention requirement.

## Evidence and decision

For each case record the initial information, actual symbols/files/SQL/settings
inspected, the reverse path and additional indirection, static resolution limits,
runtime/history requirements, diagnostic benefits/costs and the comparison with
prior judgments. Separate code-supported observations, historical comparisons,
conditional expectations and unknowns. Inspection of tests is not test execution.

Assess false positives, overapplication and unnecessary use. A candidate finding
must materially change a decision, reason or follow-up question; repeating an
existing principle is insufficient evidence of improved performance. Choose one
of `ADOPT FOR ALDER CANDIDATE`, `VELVET-SPECIFIC`, `INSUFFICIENT EVIDENCE`.
Even a candidate disposition only proposes minimal conditional wording and its
limits; it does not change Alder or prove cross-product benefit.

## Verification

Validate artifact hashes, JSON/log syntax, referenced local paths and the bounded
diff. Check substantive findings against source/history and preserve any review
corrections separately from the raw evaluator response. Since this changes only
evaluation documents, use the existing PR Verify CI for repository regression
evidence; do not claim local PostgreSQL tests or runtime measurements were run.
