# Launch provenance

Baseline is public PR35 head `0086480`. Protocol/tasks were publicly committed as
`19e469d191c99b1a4bc98937429c83c48ea13553` (local `1c3a44b`). Candidate, range reader
and summary algorithm were publicly committed as
`80cc5f724dcb4a80abe765a553b8e4d878cced5f` (local `afdf82e`) before participants were
launched. API publication checked identical local/public git trees. Unlike the
initial study, this extension's frozen packet was public before scored runs.

Four contexts used `fork_turns: none`, inherited model/reasoning with no override.
Assignment r1/r3 = current same-file; r2/r4 = candidate. No peer access or desired
answer. File names reveal the structure after entry, so layout blinding is limited.
Source access is procedurally metered; agents share the workspace. No run excluded
or repeated to obtain agreement. Full staged final answers and reader output hashes
are retained, not internal reasoning or a claim of OS isolation.

Exact launch message for each RUN (replace RUN with r1, r2, r3, r4):

> Fresh navigation participant RUN=RUN. Cwd /workspace/scratch/1b5c72679d22/velvet. Read only evaluations/issue-33/overview/participant.md and follow it. All source inspection through assigned read.mjs interface. Complete overview then target then broad stages, writing each answer before next stage to evaluations/issue-33/overview/runs/RUN.md. Source packet publicly frozen at 80cc5f7, but do not inspect protocol, peers, history, fixtures directly, or experiment implementation. No delegation. Use max_output_tokens large enough to avoid source truncation. No preferred outcome or layout.

The exact task prompt is [participant.md](participant.md). Instrumented read logs
include every command's requested ranges/searches, emitted source lines, bytes and
output hash. Comparison replays these against the frozen source. Generated output
is not proof of attention; any reported tool truncation/omission must qualify counts.
