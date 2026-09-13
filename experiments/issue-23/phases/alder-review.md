# Fresh Alder review

Reviewed against Business Design, Decision Records 0001–0012, then the phase
implementation, current DDL and tests, using the pinned Alder v0.1 knowledge v0.3.
Separate review context: `review_phase_design`; base product/design commit
`be84adbd1d3f5a884e6f8ea78f4db0e3d8bcf605`, phase work through `2017ab4` plus the
targeted numeric/causality test additions in this change.

The design review accepts explicitly independent keys with ordered Link phases.
Decision 0009 already permits that contract; no Business Design change is needed.
The implementation review found no blocker in the supported immutable profile.
The source/pending boundaries, Link-local decisions, cardinality/content checks,
Red retirement and Black metadata order, durable Run and lost-COMMIT handling align.
The fixed CTAS adapter remains an explicit construction exception, not a raw API.

Two test gaps were identified and addressed:

- JSON snapshot normalization alone rounds large numeric JSON in Node. Consecutive
  values differing below JavaScript precision now assert actual transfer count and
  PostgreSQL `amount::text`, followed by an unchanged no-op.
- Omitting total cross-key observations must not omit retained causal contracts.
  A key-local trigger now checks Work-before-write, retirement and Red Lineage before
  replacement Black, and prior-Link Processing before a later Link writes. Authored
  destination SQL additionally reads the preceding journal's amount.

The review supports stopping after these targeted PostgreSQL gates and bounded
recovery evidence, without expanding model coverage or seeking an optimum. Existing
Phase 1–5 coverage is legacy regression, not a claim of new-profile mutable or
insert_only support. Refer to results.md for the final execution commit and CI.
