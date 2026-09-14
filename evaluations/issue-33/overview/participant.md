You are a fresh participant inspecting a code sample. Repository cwd and RUN ID
are supplied separately. Read source only through:

    node evaluations/issue-33/overview/read.mjs RUN STAGE COMMAND [ARGS...]

STAGE is overview, target, or broad. COMMANDS:
- files: list available feature-local source paths.
- info PATH: file line count.
- read PATH START COUNT: numbered arbitrary range (one-based).
- file PATH: complete numbered file.
- search PATH REGEX [CONTEXT]: matches with surrounding lines; PATH may be *.

Use enough tool output budget to see returned text; when truncated, retrieve the
missing region through this reader and say so. You may read whole files, ranges,
or searches; correctness comes first. Do not inspect reader implementation,
fixtures directly, repository history, peers, experiment protocol or other reports.
No web or delegation. Public entry is boundary.ts. Use only your assigned RUN.

Complete these tasks IN ORDER. Save each answer before reading for the next stage
to evaluations/issue-33/overview/runs/RUN.md; append subsequent stages. No code edits.

1. overview: explain the high-level transaction/execution sequence and owners from
   validation through Run creation, work dispatch, success and failure. Read enough
   to justify ordering and recovery assertions; explicitly distinguish uninspected
   SQL/leaf behavior. Do not assume a rejected commit response proves rollback.
2. target: locate mutable UPDATE/DELETE returned-key checks. Explain the earlier
   mapped-key guard, reassessment/no-op, Work timing, later retirement, row/routine
   paths and recovery ownership. Show sources/lines and disclose uncertain facts.
3. broad: review the complete local legacy row/routine path plus coordinator for
   decision/effect ordering: preparation and source identity; duplicate/insert-only/
   no-op; mapping/comparison; Work; mutable effects; immutable Red/Black/Lineage;
   completion/Processing; commit/recovery. Inspect all local execution bodies and
   binding/metadata code you need, or disclose omissions. Set-phase internals,
   correctness of developer-authored stored SQL and actual DB execution are outside
   this code-reading task. Whole-file reading is a valid strategy. State whether
   navigation boundaries made you inspect unrelated details or search again in a
   deeper unit; distinguish source facts from your judgment.

Final response must contain all three staged answers, limitations and commands used.
Report facts and inspection experience, not a preference for a coding architecture.
All source reads are metered, but you are not rewarded for low counts or any layout.
