Independent assessment B — frozen rule v1

Revision and independence

I applied `evaluations/issue-31/rule.md` and `protocol.md` to baseline `b3190e3d341ee21478161f2b8b31f96826c503b1`, reading baseline source through `git show`/`git grep`. I did not inspect another agent’s assessment, proposed implementation, or post-baseline evaluation result, and made no edits.

Disposition: trigger; implement a narrow local extraction for review, subject to the preregistered regression gates. This is an engineering judgment about separating legacy execution from the shared Run lifecycle, not a requirement to introduce a named architecture. Confidence: moderately high in the trigger and ownership boundary, moderate in the predicted maintenance benefit until measured.

Inputs

Repository evidence inspected included:

- Root `AGENTS.md`; Business Design entrypoint; system scope; concept index and Destination, Dirty Key and Transfer Setting concepts; Dirty Key intake/execution DFD; Transfer Execution Process.
- Decisions 0005, 0010, 0012 and 0013, plus the historical change to Decision 0002 in `6ffab6f`.
- `src/features/execute-transfer/boundary.ts`, `queries.ts`, `set-phase/execute.ts`; configuration entrypoint references; relevant execution, mutable and set-phase regression anchors.
- `db/runtime/execute-transfer-metadata.sql`, and the Raw SQL Rules.
- Baseline implementation history, particularly actual `6ffab6f` recovery patch and the scope of `6e89908`; history identifies separate Phase 2–5 and set-phase additions.

Some large document output was truncated. I subsequently read the process, DFD and relevant decisions separately, but do not claim a complete semantic review of every concept, current DDL constraint or test. This is a structural rule application, not the independent post-change Alder review.

Observed reasons to change

1. Run durability and ambiguous COMMIT outcomes. Historical `6ffab6f` changed failure recording to update only a still-running Run, independently of destination transfer-model behavior. Baseline `boundary.ts:484–518` coordinates recovery; `queries.ts:49–51` owns the state predicate. This requirement applies to every execution engine.
2. Mutable identity and lifecycle. Decision 0005 requires stable destination identity even when comparison excludes key columns, as well as same-key mutation receipts and deletion without immutable Lineage. Baseline `boundary.ts:238–284` handles reassessment; `331–375` handles update/delete and retirement. These concerns evolve independently of COMMIT-response interpretation.
3. Execution strategy selection. Decision 0013 adds explicit nullable DB-managed configuration, fail-closed opt-in and an independently implemented set engine. Baseline `boundary.ts:107–118,152–179` dispatches; `set-phase/execute.ts:21–155` owns its ordered algorithm. Both successful paths repeat Run success and COMMIT at `177–179` and `480–482`.
4. Metadata transport and visibility. Decision 0010 requires row/routine equivalence while preserving Work-before-write, retirement/Red-Lineage-before-Black, and Processing-before-next-item visibility. Baseline row/routine branches occur at `323–329,358–374,405–421,441–478`; SQL routine ownership is separately visible in `db/runtime/execute-transfer-metadata.sql`.

These are observed requirements and patches, not counts inferred from file length. The concrete maintenance conflict is that the same `executeTransfer` function contains recovery, engine dispatch and the entire legacy model/metadata algorithm, while success finalization is duplicated across engine branches.

Alternatives and counterexample

| Alternative | Predicted benefit | Cost or reason against |
| --- | --- | --- |
| Keep baseline | All legacy ordering and transaction context remain visible in one function; no new interface | Recovery and dispatch changes remain embedded alongside legacy mutation logic; successful finalization has two locations |
| Extract the legacy work algorithm as one internal function, returning `{inserted, skipped}`; keep both engines under one shared finalization | P1/P3 reasoning can focus on Run lifecycle without traversing legacy reassessment and writes; removes duplicate success handling | Adds one engine-call boundary and explicit inputs; P2/P4 remain largely as complex as before |
| Extract only recovery | Reduces lexical exposure within recovery helper | Transaction state would need to cross an extra interface; does not address duplicated finalization or distinguish work from lifecycle |
| Split each transfer model and metadata operation into separate modules | Could reduce local spans for individual operations | Shared duplicate handling, reassessment, Work/Processing fields and ordering would span more owners; insufficient evidence to justify this wider change |

A counterexample favoring keeping code together is mutable physical deletion or immutable correction: the stored mutation, receipt validation, release of historical references, Active retirement, optional Red Lineage and subsequent Black must be reviewed as one ordered sequence. Dividing each into an independently owned handler merely because the function is long would increase coordination risk. The existing set-phase function is also a cohesive ordered algorithm; the probes do not justify splitting it.

Recommended narrow boundary

Extract baseline `boundary.ts:181–479` as the legacy engine, with a normal result return replacing its existing success/COMMIT tail. Keep the public `executeTransfer` contract, pre-Run rejection behavior, configuration locks, Run creation commit, lock reacquisition/recheck, engine selection, successful finalization and all failure handling in the shared boundary.

Pass the existing client and explicit validated configuration, definition, arguments, Run ID and execution options. The extracted engine must not begin, commit, roll back or record failed Runs. Avoid an extensible engine registry, model plugin framework, new SQL registry or generic transaction wrapper. Exact filenames are incidental.

Invariant owner map

| Invariant | Baseline owner | Required owner after extraction |
| --- | --- | --- |
| Validation timing; enabled configuration; locks and configuration recheck | `executeTransfer`, `queries.settingSql/linksSql`, `loadSetPhase` | Same shared boundary and existing validation |
| Durable Run creation, atomic work, common success, rollback/failure recording | `executeTransfer`; guarded `queries.failSql` | Shared boundary exclusively; both engines return work counts |
| Legacy snapshot identity, duplicate coalescing and item order | `executeTransfer:181–226,476–478` | One legacy engine |
| Mutable mapped-key guard before exclusions and mutation receipt checks | `executeTransfer:238–284,331–357` | Same legacy engine, preserving guard placement |
| Row/routine metadata equivalence and visibility | Legacy branch ordering plus fixed SQL and deployed routines | Same legacy engine and existing SQL/routine owners |
| Set admission, relation checks, Red/Black/metadata order | `executeSetPhase` and set-phase SQL | Unchanged set engine |
| SQL construction and trusted stored SQL binding | Serene bindings, `trusted-sql.ts`, set-phase configuration helpers | Existing authoritative sources; no mirrored statements |

The failure predicate is a SQL-enforced part of the shared recovery invariant. Extraction must not duplicate it into an engine or replace guarded failure with unconditional finalization.

Protocol probes at baseline

All line anchors below refer to the frozen baseline. The inclusive span of `executeTransfer`, lines 72–519, is 448 lines. This is a bounded lexical exposure proxy, not a claim that any task requires reading all 448 lines.

| Probe | Actual owning function and anchors | Necessary edits/inspection | Expected effect of narrow extraction |
| --- | --- | --- | --- |
| P1: lost successful COMMIT response / durable failed Run | `executeTransfer:153–160,177–179,480–518`; `queries.failSql:49–51` and `finishSql:46–47` | A failure-state fix may change `failSql` and its invocation; inspect Run persistence flag, rollback-success condition, both work commits and secondary-error preservation. Regression anchors: `execution.integration.test.ts:311,363,434`; `set-phase.integration.test.ts:315`; mutable COMMIT-loss cases at `548` | Shared recovery remains one owner. Legacy engine call is one additional inspection hop when checking the complete work contract, but model reassessment/mutations leave the lifecycle function. One common finalization replaces two |
| P2: mutable stable key despite exclusions | `executeTransfer:227–284`, especially `239–247`; receipt guard at `351–357`; `projection:61–69` | Edit guard placement/condition locally if necessary; inspect mapped-value production, PostgreSQL `compareSql:53–62`, and post-mutation key validation. Regression: `mutable.integration.test.ts:399–411`, with key-moving UPDATE test at `412` | Guard and exclusions remain adjacent in the legacy engine; no duplicated decision. Transaction behavior requires an extra caller inspection hop. No claim of a large P2 improvement |
| P3: nullable dispatch and successful finalization | `executeTransfer:107–118,129,152–179,480–482`; `loadSetPhase` begins at `set-phase/config.ts:50`; `executeSetPhase:21–155` | Dispatch-only edits belong in boundary, but inspect legacy-definition bypass, stored-SQL requirements, configuration evidence and fail-closed loader. Success changes currently affect two branch tails. Regression anchors: `set-phase.integration.test.ts:258` misconfiguration and `315` lost COMMIT, plus row execution success | Boundary holds nullable selection and exactly one successful finalization. Existing set engine hop remains, and legacy gains a symmetrical hop. Avoid moving nullable semantics into either engine |
| P4: metadata retirement ordering | `executeTransfer:358–374` mutable deletion and `405–421` immutable Red; `rawsql_transfer.retire_active:46–65` in runtime SQL | Ordering changes must inspect both legacy branches, `queries.releaseActiveReferencesSql:71–73`, `activeDeleteSql:63–64`, `redLineageSql:65–69`, `retireMetadataSql:78`, and PL/pgSQL order/cardinality check. For a general retirement invariant also inspect `executeSetPhase:116–135` and its release/retire/Lineage SQL. Mutable rollback cases begin at test `476`; set historical-reference test at `205` | Extraction alone does not eliminate the two legacy sites or row/routine SQL correspondence. They remain together within the legacy engine. General retirement semantics remain cross-cutting; do not report file shrinkage as resolution |

P4 deliberately limits the benefit claim. It already requires cross-file reasoning because the experiment retains a row reference and deployed routine. A local refactor cannot remove that requirement without changing the experiment’s comparison structure.

Implementation eligibility and stopping criteria

The candidate is scoped, reversible and can preserve public contracts and Business Design. Existing PostgreSQL tests cover identity rejection, row/routine execution, failure recording, lost successful COMMIT, set/row differential histories, historical reference retirement and downstream rollback. Therefore I choose “implement for review” rather than only recording a concern, provided those gates are actually available through local PostgreSQL or the mandated CI route.

Before implementation, record the four probe anchors and predicted new owners. Afterward require:

- Demonstrable removal of legacy transfer behavior from the lifecycle function for P1 or P3.
- Exactly one successful finalization path, with existing error propagation and recovery conditions unchanged.
- No new invariant decision duplication or movement of transaction ownership into either engine.
- Preserved legacy ordering, including P2 guard placement and P4 metadata visibility.
- Unchanged PostgreSQL regression suites and `pnpm verify` passing; a separate post-change Alder review as preregistered.

Stop at this narrow extraction if those conditions hold. If the explicit interface becomes an opaque bag of mutable state, validation timing changes, or P1/P3 locality does not actually improve, narrow or abandon the candidate. Do not continue decomposing models to produce a larger apparent result.

Evidence classification and limitations

- Repository evidence: the cited Business Design, decisions, concrete code, historical recovery patch and regression cases.
- Engineering precedent: none used as an independent authority or numerical threshold.
- Agent judgment: the legacy-engine/shared-lifecycle seam, expected maintenance benefit and implementation eligibility.

No tests were executed and no post-change benefit was measured in this read-only assessment. Test existence is coverage evidence, not a passing result. Historical evidence establishes that independent requirements actually changed this area, but this application evaluates the current baseline; it does not claim a refactor would have been justified at every earlier commit.

Reopen the structural decision only if subsequent real work adds another lifecycle branch, repeats success/failure ownership, or demonstrates repeated coordinated edits around a specific legacy invariant. A larger file alone is insufficient.

---

Appendix: exact prompts and isolation limits

Original task prompt received:

```text
Issue #31 explicitly requires independent Fresh Agent rule application. Work read-only in /workspace/scratch/8ab680f5d64c/velvet. Read evaluations/issue-31/rule.md and protocol.md. Independently apply frozen rule to baseline b3190e3d341ee21478161f2b8b31f96826c503b1 using git show (working tree may change). Read AGENTS.md and relevant Business Design/decisions/history/tests. Do not read other evaluation results or infer desired decomposition. Return complete assessment with inputs, evidence anchors, keep/extract alternatives, invariant owners, trigger and implement/propose/keep conclusion, confidence and limitations; do not edit code. Also locate four protocol probes at baseline with owning function and necessary edit/inspection boundaries. Your final response will be saved verbatim.
```

Subsequent message received after completing the assessment:

```text
Please save your complete final assessment to evaluations/issue-31/fresh-b.md when done (only that file). Include exact prompt received, baseline, isolation limitations (fresh conversation, shared filesystem, git-show baseline), concrete findings. Do not read working implementation or other results.
```

Subsequent task received:

```text
Save the complete preceding final assessment verbatim to evaluations/issue-31/fresh-b.md in /workspace/scratch/8ab680f5d64c/velvet. Append exact original task prompt plus subsequent messages and isolation limits. Edit only this file, do not read other results or working implementation.
```

Isolation limits: this was an independent fresh agent conversation, but not an isolated filesystem, repository clone, or tool environment. The repository and working directory were shared with the parent and other agents and could change concurrently. I read the frozen rule and protocol from the working tree as instructed, then used git object reads for implementation, requirements, history and tests at the baseline. The baseline assessment did not inspect working implementation or other assessment files. The subsequent saving action changes only this assessment file and does not extend the original implementation review. The claim in the verbatim assessment that no edits were made describes the assessment phase before this separately authorized saving action.
