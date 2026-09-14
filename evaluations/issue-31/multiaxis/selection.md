# Candidate selection before implementation

Baseline B1: `03b998ee3b768e2a03af763714627523243b3cc2`.
Protocol: local `9e33f3b`, published `88955319a3c5a9daf2b1e66a9d61771dc16230ee`
(same tree `82cc6dbe96d6e0d3255a2c48e9dfdb5aa3061f4c`).

Root assessment before runtime edits: Q1 mapping validation is a contiguous
value-only predicate in the coordinator, while its existing integration fixture
creates a database, schema, routines, physical source/destination tables and
master data. Q2's stable-key check, PostgreSQL comparison and returned-row receipt
are distinct stages; combining them for unit tests would obscure their ordering.
Q3's calculated metadata and actual effect predicates must remain consistent;
an extracted outcome table alone adds a new synchronization obligation. Q4's
identity utilities are value-only but shared with destination receipts, and the
logical resolver is an application callback whose timing is observable.

The first independent assessment recommends Q1, with keep second and Q4/Q3 lower.
The second independent assessment is pending; final reconciliation will be recorded
before implementation. No candidate has been implemented at this point.

Root's preferred bounded experiment: move only the Destination Link mapping block
into one internal validator with the same link/keyColumns inputs and call timing.
No normalization, stricter acceptance, type cleanup, shared utility migration or
SQL change. Cost: one production file, one internal export, two arguments and
one caller-to-validator hop; preserve the existing object predicate behavior
without creating a general utility dependency. That small predicate duplication
must be counted as a maintenance cost, not hidden.

Comparison: execute the exact B1 block (extracted mechanically for the experiment)
and actual candidate validator against valid, malformed and multi-invalid objects;
compare acceptance, native error name/message and input mutation. Add explicit
expected-outcome regression cases so the baseline oracle is not the only oracle.
Compare real coordinator traces for legacy/set opt-in and competing validation
failures using a scripted client; this measures call placement only, not DB
semantics. Keep all existing PostgreSQL tests and full gates. Record module imports,
capabilities and fixture dependency differences; do not claim actual AI speed,
production diagnosis/recovery gains or shorter full verification.

## Reconciliation (before runtime edits)

Both runs are now complete. A selects mapping-only validation in an internal
module; B selects the entire per-Link preflight body in the existing file.
They agree on the observed Q1 testability/replay need, a bounded preflight seam,
keep as second choice, retaining lifecycle ownership, and no model decomposition.
They do **not** agree on exact scope or dependency-locality tradeoff. Preserve this
as 2/2 compatible action families, not identical proposals or independent proof
that the final candidate is best.

Select A's mapping-only module. It isolates the longest value-only mapping
predicate and its rejection matrix without adding a mode input or moving the
preceding SQL/date checks. Unlike B's same-file callable, its direct test does not
load Serene, queries or set-phase/Zod modules. This is a concrete dependency
boundary worth testing, not a rule that every validator needs a file. Costs exceed
B by one file and a duplicated three-line object-shape predicate; benefits apply
to Q1 alone. Q2-Q4 and P1-P4 remain controls, not further extraction goals.

Stop after Q1's differential/expected-outcome/placement checks and existing full
gates support this candidate. Do not implement the other suggestions merely to
increase the number of improved axes. B's same-file alternative remains viable
if the isolated module's costs outweigh its measured fixture capability reduction.
