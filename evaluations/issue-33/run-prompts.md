# Fresh-context launch record

Frozen packet: `0703e88548b64938d8772dca2bed94d6621c6eec`.
All six scored agents were launched with `fork_turns: none`, inherited model and
reasoning settings, no overrides. Isolation is by instruction; agents share disk.
The root's history assistant and fixture builder are preparation, not scored
independent applications. No scored result was selected out or rerun.

## Navigation launch (four runs)

Exact message below, replacing RUN with n1, n2, n3, n4 and PATH with the repository
working directory `/workspace/scratch/1b5c72679d22/velvet`:

> Fresh comprehension run RUN. cwd PATH. Read ONLY evaluations/issue-33/navigation-prompt.md then follow it with RUN=RUN. Source reads only instrumented reader. Write full response evaluations/issue-33/runs/RUN.md. No peers, history or other artifacts. No delegation.

The exact task is [navigation-prompt.md](navigation-prompt.md). n1/n3 received
baseline and n2/n4 candidate via the reader; the message does not disclose the
variant. Function names naturally reveal structure, so blinding is not perfect.

## Rule application launch (A and B)

Exact message below, replacing LETTER with A/B and LOWER with a/b:

> Independent fresh rule application LETTER. cwd /workspace/scratch/1b5c72679d22/velvet baseline9f55499 frozen packet0703e88. Read AGENTS and evaluations/issue-33/{protocol,rule,cases}.md and referenced source/evidence as necessary. Evaluate all C1-C9 with own judgment, no desired answers: disposition ADOPT/REJECT/DEFER, execution now/wait/trial, implementation state, evidence effort/reason, source anchors, missing observation. In C2 private B2 trial fixture already exists but navigation outcomes unknown. Do not read runs/ or peer responses or root conclusions; no delegation. Write full final assessment with read list to evaluations/issue-33/fresh-LOWER.md. No other edits. Explicitly identify ambiguous rule distinctions and propose minimum clarification if needed.

Read lists and full final responses are retained. These are complete final
assessments, not full internal reasoning or complete tool transcripts. Navigation
reader calls and source exposures are additionally recorded in runs/*.jsonl.
