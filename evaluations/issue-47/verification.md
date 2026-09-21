# Issue 47 verification

## Scope

Product/design baseline: `300ba133377cacf2bfd0a475436c3746cc0d3fbf`.
All changes are evaluation records under `evaluations/issue-47/`. Product source,
tests, Business Design, standing decisions, Alder knowledge and workflows are
unchanged. The raw evaluator report and navigation log remain unedited.

The original dispatch is saved with its trailing newline, model/effort and agent
identity. [Metadata](metadata.json) records SHA-256 values and the exact parent
follow-up. That follow-up asked for configuration/execution precision; this is
disclosed rather than claiming an unassisted or blind experiment. The protocol
commit occurred after dispatch and before the final result. The evaluator's
navigation log is self-recorded, not a complete platform tool transcript.

## Acceptance conditions

| Issue condition | Evidence |
| --- | --- |
| Multiple contrasting incident-origin cases | Original report C1–C4; initial authored packets and actual searches/reads in navigation log |
| Compare Decisions 0016/0017 | C1 B2/outer recovery, C4 forwarder removal and original report interpretation; summary comparison table |
| State a material change or negative result | C3 changes the concrete historical-evidence question and stopping condition; C1/C4 preserve prior judgments |
| False positives and overapplication | Original report interpretation and summary limits; no measured false-positive rate asserted |
| One allowed disposition | `VELVET-SPECIFIC` in original report and synthesis |
| No unauthorized Alder adoption | No candidate rule proposed and no changes outside evaluation artifacts |

## Local artifact checks

- Parse metadata and all 22 navigation JSONL records.
- Recompute SHA-256 for both complete dispatch prompts, evaluator report and log;
  compare to metadata. Record independent review inputs separately from any later
  synthesis corrections.
- Check local Markdown link targets exist and `git diff --check` is clean.
- Confirm the final diff contains only this evaluation directory.

These validate evidence packaging, not the correctness of a live diagnosis. The
evaluator inspected existing tests but did not execute them. No local PostgreSQL
test, incident injection, performance benchmark or replay experiment was run.

## Independent review

A second fresh `gpt-6-astra / low` agent receives the
[complete review prompt](reviewer-prompt.txt) and checks the known findings against
source/history and relevant Alder scope. This is an evidence/sufficiency review,
not an independent replication of the primary evaluation or a control group.
The [original review](runs/reviewer.md) found no blocking findings and required no
substantive synthesis correction. Its report hash and reviewed-input hashes are in
metadata. This confirms the recorded scope and evidence, not diagnostic speed or
independent rediscovery.

## CI

The existing PR `Verify` workflow runs PostgreSQL-backed `pnpm verify` and the
materialization regression check. Use the Verify check attached to the published PR head for the execution result.
It is a repository regression gate, not validation of diagnostic effectiveness.
The source/history evaluator and reviewer did not execute those tests locally.
