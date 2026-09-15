# Author's pre-result assessment

Recorded without the independent result; applies Decision 0016 at `fcda11b`.

## Registration

Trace `diffCompareExcludedColumns`: public `input.ts` validates a column list;
`workflow.ts` binds it as `diff_compare_excluded_columns`; the destination-link
query boundary parses parameters, passes through a typed forwarding function,
checks exactly one row and coerces the returned receipt; `output.ts` maps it back.
Source SQL and receipt validation must still be checked together for this claim.
The corresponding setting INSERT has the same execution seam.

The two raw `executeInsert...Query` functions have exactly one consumer each.
Their bodies only call `executor.query` with a fixed QuerySource and the supplied
params. They own no validation, mapping, transaction, error handling or alternative
execution. Their callers erase parsed parameter types through `Record` and
`as never`. Removing these functions and calling the named QuerySource directly
from `loadInsertedRow`, with its actual parsed-parameter type, removes the separate
forwarder-equivalence check and the unsafe parameter handoff. This is not a claim
of fewer SQL/receipt/transaction obligations or reduced total source reading.

ADOPT this exact two-query seam removal, if independent assessment and verification
support it. Keep SQL/driver row declarations separate from Zod receipt parsing:
raw string/unknown rows and coerced Date/object results have different contracts.
Keep input/output/workflow boundaries: field projection, validation timing and
transaction order are real work. A full query/boundary merge could colocate two
contracts but does not eliminate their comparison and enlarges SQL review context.
Further extraction introduces new interfaces for a path with no observed separate
maintenance owner. A README route cannot remove the forwarding/type-erasure
obligation; current README already identifies the queries. No observed retrieval
tool failure justifies new tooling.

Historical distinction: `663842c` imported the structured registration modules.
`0ba9f08` / Decision 0007 reasonably retained SQL-versus-validation files while
removing generic `queryMany`; that change leaves per-query execution functions as
plain forwards. The remaining seam was already removable at #13's post-change
state: this is newly focused evidence of incomplete cleanup, not invented later
product evolution or proof that the SQL/validation boundary was wrong.

## Intentionally introduced mapping seam

`f2a1e22` extracted `assertDestinationLinkMapping` into `link-mapping.ts`.
Current tests exercise malformed values, source-key order, destination-key set,
nonmutation and preserved native errors without a DB/query capability.
`boundary.ts` retains loaded/locked configuration, preceding date/stored-SQL guards,
call timing before Run SQL, recheck and recovery. The feature README already routes
value tests separately from the PostgreSQL pre-Run rejection regression.

KEEP. Inlining removes a hop but makes direct isolated validation depend again
on the execution module, or requires recreating an equivalent seam for tests.
Further separating the coupled mapping predicates adds context transfer without
an independent invariant. A shared object utility would add a dependency for a
three-line predicate. No new navigation record is needed for this question.
The old decision was reasonable and its supporting evidence still holds. It is
re-evaluated, not grandfathered. Reopen if mapping changes require unrelated DB
capabilities, predicates drift or caller coordination repeatedly grows.

A2 remains DEFER and B2 remains ADOPT under #33. No new evidence here reverses them.
No current gap in the ordinary guidance is evident; await the independent result
before deciding whether candidate-generation guidance needs any amendment.
