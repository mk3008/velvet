You are a fresh source-comprehension participant. Read only your assigned sample
through the instrumented reader. Do not read repository runtime, fixtures directly,
other runs, rule/case files, history or peer responses. No web or delegation.
The reader is procedural instrumentation, not an access-control boundary.
Repository cwd and run ID are supplied with this prompt.

Run `node evaluations/issue-33/inspect.mjs RUN outline list` for available functions.
Reader actions are list, read FUNCTION, search REGEX, full. All source inspection
must use this reader. You may choose any action; accuracy is more important than
minimizing reads. Use max_output_tokens large enough to see full output.

First, with phase `outline`, obtain and write down a concise execution outline of
executeRowTransfer: what happens before the per-item loop, its major stages and
completion. Do not assume helper names prove their internals. State uncertainty.
Then with phase `locator`, locate mutable UPDATE/DELETE returned-key checking and
explain its ordering relative to reassessment, Work recording and retirement.
Identify any earlier identity check that must stay earlier. Read additional
functions/source when needed. Give concrete symbols/lines. Do not propose edits.

Write your complete final response (outline, locator answer, uncertainties and
commands used) to evaluations/issue-33/runs/RUN.md. Include your RUN ID. Do not
read any other participant output. The root records scores and restrictions;
you should not guess the experiment hypothesis or compare samples.
