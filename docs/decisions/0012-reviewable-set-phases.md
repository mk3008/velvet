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
