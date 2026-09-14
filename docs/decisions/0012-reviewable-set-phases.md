# Prefer reviewable set-based phase execution

The owner's [follow-up review](https://github.com/mk3008/velvet/pull/24#pullrequestreview-5192120827)
supersedes Decision 0011's preference for an ordered worker. Its 11 calls establish
transport feasibility, not the preferred reusable implementation. Do not extend it
into a generic PL/pgSQL procedure or translate arbitrary stored SQL dynamically.

The next candidate is [explicit SQL phases](../../experiments/issue-23/phases/README.md):
complete source materialization, pending/decision relations, preallocated keys,
set-based destination and metadata statements, and Node orchestration per Link.
Keeping each statement independently reviewable is worth additional fixed calls.
The approach takes the TEMP/phase execution model described for KeyMapSync in the
owner's review; it does not port its SQL fragment builder or control tables.

Business Design remains authoritative: Dirty Key history is immutable, Work records
each admitted pair, the work transaction is atomic, Run failure is durable, and
Active/Lineage represent the actual result. No new permanent KeyMap concept is added.

An explicit independent-key profile permits cross-key phase reordering under
Decision 0009. It must reject metadata/configuration outside its authored contract.
Global sequence interleaving and cross-key observer counts are not part of that
opt-in profile. This is not permission to change arbitrary existing settings.
The legacy executor and all existing model tests remain. Mutable/insert_only/date
hooks are not automatically supported by the immutable experimental profile.

Link order is still required: #19 actually reads prior destination writes.
Preallocated keys are only identities, not proof of successful writes. Decisions
for a later Link run after earlier destination and metadata statements. Cardinality
and identity/content are checked before success metadata; failures roll back all
phases, retaining historical references and pending eligibility.

Serene 0.4 cannot create a new trusted Sql from the fixed wrapper without internal
changes. A local dedicated adapter instead binds an identity-backed complete Sql
once and prefixes exactly one fixed CTAS statement, retaining values separately.
There is no raw string constructor, arbitrary identifier, fragment or runtime AST.
This explicitly reviewed construction exception is not relabeled ordinary by the
audit. Construction and content risk are separate: TEMP is advisory temporary state;
permanent CREATE TABLE is elevated schema change. Separate DROP signals remain.
This follows the investigation in [Serene #26](https://github.com/mk3008/serene/issues/26)
without waiting for an upstream release or claiming its API has shipped.

Stop at a sufficiently good supported profile after semantic/dependency/failure
checks and one bounded recovery environment. Do not restart an optimum benchmark
search. Production compatibility and provider/resource budgets remain separate.

## Measured disposition

[The phase evaluation](../../experiments/issue-23/phases/results.md) passes the
supported-profile gates: 31/63 fixed client calls for one/three Links, exact numeric
and causal visibility checks, full rollback/lost-COMMIT checks, and 10,000-key recovery
in 42.7/62.1 seconds across two CI observations. The largest bounded Run was 11.4
seconds or less. Select the bounded profile as a reasonable candidate. Unbounded
corrections took 78–111 seconds and fail the illustrative 45-second work allowance;
neighbor latency varied significantly. Neither universal compatibility nor production
resource acceptance is implied. This ends the current candidate search.

## Upstream adoption (Issue 28)

The Serene 0.4 composition exception above records the original evaluation.
Serene v0.6.0 now supplies official `materializeTemp`; the code-authored experimental
source uses it and the local CTAS prefix is removed. Original measurements and
audit snapshots are historical evidence, not a claim about the upgraded runtime.
The DB-master boundary in Decision 0013 remains separate and unchanged.
