# Issue 33 independent Alder review

Reviewed 2026-09-14 in a separate agent context. Comparison: product/design baseline
`9f554991ab3068756c6b05a483082ad3cda925ef` to implementation `cd52005`, including
the then-uncommitted `evaluations/issue-33/README.md`. This is an ordinary final
review, not another scored rule application or comprehension experiment. Only
this review file was written. No runtime, fixtures, prompts or recorded runs were
changed. No delegation occurred.

## Verdict

No blocking implementation or evidence-claim defect found in the reviewed scope.
The B2 extraction is sufficient for its explicitly narrow purpose; it does not
change business meaning or require an additional owner decision. Readiness remains
conditional on the current PR's required Verify/PostgreSQL and SQL audit gates.
Those are handled by the implementation agent; this review does not report them
as passed. The two evidence scripts were independently replayed successfully here.

## Business scope and forward walkthrough

Read the Business Design entrypoint, Package Scope, concept index and relevant
Destination/Dirty Key/Transfer Setting material, Dirty Key intake DFD and Transfer
Execution Process before the implementation review. Decision 0005 supplies the
explicit stable mutable identity and trusted stored-SQL contract; Decisions 0015
and 0016 establish the structural scope and evidence distinctions. Applied the
complete `docs/alder/review-knowledge.md` Q1–Q3, P1/P2 and S, and Raw SQL Rules v0.3.
Targeted implementation review covered the coordinator, row admission/comparison,
Work, mutable/immutable operations, retirement, Processing, binder, relevant query
SQL and current Active Black/Work/Processing DDL. Existing mutable integration
cases were inspected for identity drift, malformed receipts, rollback, recovery
errors and lost COMMIT responses. Broad multi-file retrieval had output truncation;
this is a targeted change review, not an assertion that every concept, DDL or
historical evidence file was reread in full.

P1 walkthroughs used ordinary update, source disappearance/delete, unchanged
reevaluation with excluded key columns, repeated keys/mixed models, invalid
returned key and interruption after a database effect. P2 traced the helper's
chosen operation, identity guarantee and completion boundary back to Decision
0005 and the existing transfer process.

- **Q1 — continuation and facts:** the helper neither commits nor catches errors.
  Its caller awaits it; a binding/query/receipt failure prevents retirement and
  successful Processing. The same enclosing coordinator still owns work rollback,
  durable Run reporting, original cause and secondary recovery errors. Guarded
  `failSql` still cannot overwrite committed success after a lost COMMIT response.
  No retry/recovery subsystem is introduced or newly required by this edit.
- **Q2 — causes and remaining constraints:** mapped identity is checked before
  reassessment and Work, so comparison exclusions/no-op cannot bypass it. The
  new helper checks the actual returned complete identity and both affected and
  returned cardinality after DML. UPDATE leaves Active Black intact; DELETE only
  retires it after successful receipt validation. The existing release-before-
  delete protocol and evaluated key snapshot remain at their original owners.
- **Q3 — handoffs and guarantees:** the helper is a private awaited operation,
  not a transfer completion API. Work precedes its DML; Processing/completion and
  Run finalization follow it. The per-item, per-link and Run units are unchanged.
  Immutable Red retains its different-key requirement; mutable operations retain
  same-key validation and no immutable Lineage. The public inserted/skipped result
  remains unchanged. Binding and truthful receipts do not prove a stored author's
  SQL target/predicate semantics; that established external author responsibility
  remains explicit rather than being silently claimed by the extraction.

Classification S: **sufficiency / no finding** for these preserved meanings and
handoffs. The absence of schema changes is not itself the closure reason; the
existing operation, key, ordering and failure contracts continue to be satisfied
by the source transformation. No concrete new business ambiguity was identified.

## Runtime and SQL comparison

The sole runtime change replaces the contiguous mutable SQL preparation,
execution and receipt block with one private five-input `Promise<void>` helper
in the same file. Exact body and reconstructed complete-boundary token equality
were checked by `compare.mjs`. This retains the caller's earlier identity guard,
Work creation, awaited receipt-before-retirement order, routine branching, common
Black/Processing paths and coordinator ownership. The script also verifies that
the current runtime equals the frozen candidate and that baseline fixture equals
the pinned git baseline; query definitions, binder and metadata SQL are unchanged.

An extra async frame/promise boundary and broad existing Row/client arguments
remain real costs. Source reconstruction alone does not prove baseline correctness
or erase those costs. No new SQL construction path, export, module, transaction
owner, capability abstraction or permanent DDL is introduced. The stored-SQL path
continues through the same Serene external binding mechanism and trust boundary.

## Evidence protocol, claims and disposition

The visible git sequence places frozen protocol/rule, cases, reader/task and exact
trial fixture before recorded outcomes, selection, then runtime adoption. The
launch record preserves prompts, assigned variants and procedural fresh-context
restrictions. Final answers and source-read logs are retained; they are not full
agent transcripts or proof of OS isolation. No such stronger claim is needed.

The reported nine-case agreement is consistent with the retained A/B decisions,
including their ambiguity notes. Both distinguish current B2's missing comparison
from A2's wider missing interface, supported mapping value from timing, and an
undefined recovery contract from merely pending gates. Decision 0016 explicitly
labels its final clarifications as reviewed rather than independently re-scored.
Counterfactual timing cases are not reported as incidents or empirical deployment
outcomes. Historical records remain historical, with only current A2/B2 labels
superseded.

All four navigation responses support the three claimed ordering/outline facts.
The narrow result is credible: less row-overview detail and an addressable mutable
receipt owner, with an extra hop and unchanged caller obligations. The report
correctly exposes that total unique source exposure is equal or higher, that the
function reader favors named-unit revisits, and that general speed, correctness,
token, human-time and productivity gains are not measured. B2 ADOPT is an explicit
local engineering judgment after that comparison, not a numerical consequence of
the displayed-line count. A2 remains independently DEFER; no wider module benefit
is inferred from B2.

The rule preserves three distinct questions: sufficient context/value disposition,
execution timing/authorization, and proportionate evidence effort/readiness.
ADOPT with pending specified safety gates is coherent; an undefined effect that
could reverse value remains DEFER. Rejected forwarding work has no scheduled
execution. Ordinary source walkthroughs remain allowed without making this study's
six-agent apparatus mandatory. These conclusions are supported for the bounded
cases; general reliability is not established.

## Reproduction and outstanding limits

Independently executed from repository root:

- `node evaluations/issue-33/compare.mjs`: successful; output exactly matched
  committed `probe-measurements.json` (29 scenarios, 58 executions).
- `node evaluations/issue-33/summarize.mjs`: successful; output exactly matched
  committed `navigation-measurements.json`.

The comparator checks independent expected error messages, query text/values and
thrown-object identity as well as before/after agreement. Scripted client receipts
cannot establish real PostgreSQL locks, foreign keys, atomicity or recovery. The
existing integration tests cover those relevant scenarios but were not rerun by
this reviewer. Full Verify and `pnpm audit:sql` were also not executed here; do not
substitute this review or the comparator for their current results.

The evidence workflow uses full git history for baseline lookup, pinned package
manager/lockfile installation and separate script/diff steps, so a failed producer
is not hidden by a shell pipeline. Its replay recomputes deterministic source and
stored-log evidence, not fresh agents. It is scoped to Issue 33 evidence paths;
it is not an ongoing runtime regression gate. The exact runtime-to-fixture assertion
will intentionally need historical scoping or explicit reconsideration if future
work reruns this study after unrelated runtime evolution. This is a documented
research-harness maintenance limit, not a blocker for the current artifact.

No extra benchmark, abstraction or implementation change is requested. Stop after
current required CI results are inspected and any real failures resolved; preserve
the reported limits and avoid turning this bounded result into a general threshold.
