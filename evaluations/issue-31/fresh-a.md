Independent assessment A — frozen rule v1

Inputs and scope

I applied `evaluations/issue-31/rule.md` and `protocol.md` to baseline `b3190e3d341ee21478161f2b8b31f96826c503b1`. Implementation, history and test references below are from `git show` at that revision or explicitly named ancestral commits. I did not inspect another agent’s assessment or post-baseline implementation. This was read-only; no tests were executed and no code changed.

Inputs included root `AGENTS.md`; Business Design entrypoint; System Scope; Destination, Dirty Key and Transfer Setting concepts; Dirty Key intake/execution DFD; Transfer Execution Process; Decisions 0005, 0010, 0012 and 0013; Raw SQL Rules; transfer boundary, queries, metadata routines and set-phase implementation; relevant integration tests; package verification script and PostgreSQL Verify workflow. Historical evidence included the actual boundary patches of `6ffab6f`, `fbfe73e` and `ff0cbbd`, plus boundary history and the change inventory of `6e89908`.

Disposition: trigger; implement a narrow extraction for review, subject to regression acceptance

Repository evidence supports separating the legacy row/routine work algorithm from the Run transaction coordinator. Preserve the existing set-phase seam and make successful finalization common to both execution paths. Do not split each transfer model into independent executors, redesign the SQL layer, or broadly reorganize metadata ownership in the same change.

This recommendation is an implementation-for-review disposition, not an assertion that verification has passed. The dedicated branch must satisfy the preregistered comparison and regression criteria before the candidate is accepted. The existing PostgreSQL CI workflow provides a concrete gate; the availability of that workflow is not evidence of a successful candidate run.

Observed independent reasons to change

1. Durable Run recovery and ambiguous COMMIT outcomes. Historical `6ffab6f` changed the failure-recording call and introduced conditional failure SQL so that a rejected COMMIT response cannot overwrite durable success. This concern is independent of mutable/immutable row decisions. At baseline it lives in `executeTransfer`, alongside the complete row work algorithm.

2. Mutable identity and snapshot semantics. The `fbfe73e` patch and Decision 0005 establish stable mapped destination identity, validation before comparison exclusions, direct UPDATE/DELETE, and absence of immutable Lineage for mutable operations. These change the row evaluation/mutation algorithm and its metadata, rather than Run recovery.

3. Explicit set-phase selection and deployment compatibility. `ff0cbbd` and Decision 0013 introduce nullable configuration dispatch, conditional legacy definition requirements, configuration evidence and an existing extracted `executeSetPhase`. The successful finalization sequence appears twice in the same coordinator after that introduction.

4. Metadata execution strategy while preserving observable order. Decision 0010 and `6e89908` introduce row/routine execution alternatives with explicit ordering across arbitrary trusted SQL boundaries. At baseline both mutable deletion and immutable retirement duplicate a row/routine retirement choice. This is real evidence of coordinated maintenance, but a separate reason does not automatically justify a further extraction: lifecycle and visibility ordering remain tightly coupled to those call sites.

These are behavior and contract changes, not rename counts. The trigger is their coexistence in one owning function together with concrete P1/P3 maintenance exposure and duplicated successful finalization, not the file’s size.

Baseline probe anchors and boundaries

All four TypeScript probes are owned at baseline by `executeTransfer`, `src/features/execute-transfer/boundary.ts:72–519`, an inclusive 448-line lexical span. This is only a containing-function exposure proxy. It does not mean every task requires reading all 448 lines.

| Probe | Actual baseline anchors | Necessary edit and inspection boundaries |
| --- | --- | --- |
| P1: lost successful COMMIT response / durable failed Run | `boundary.ts:158–160` separately persists Run; `177–179` and `480–482` finalize successful work; `484–518` catches, rolls back, conditionally records failure and preserves errors. `queries.ts` owns `finishSql` and `failSql`, with `failSql` constrained to `run_status = 'running'`. | A recovery correction edits the coordinator and possibly `failSql`; inspect both successful COMMIT sites, persisted/discarded flags, and secondary error handling. Do not need to redesign mapping, reassessment or Red/Black SQL. Regression anchors: `execution.integration.test.ts:250`, `311`, `363`, `434`; mutable COMMIT-loss cases at `548`; set-phase COMMIT loss at `315`. |
| P2: mutable stable-key guard despite exclusions | `boundary.ts:238–247` compares projected mapped keys with Active Black before `248–285` exclusion/reassessment handling. `61–69` owns `projection`; `331–356` checks mutation binding, returned cardinality and returned stable key. | A guard correction edits row evaluation. Inspect source mapping, `projection`, comparison exclusions, and post-mutation identity validation so the invariant is not weakened on another route. Decision 0005 is authority. `mutable.integration.test.ts:399–411` is the exact exclusion counterexample; the moving-UPDATE test begins at `412`. Transaction rollback remains a cross-boundary regression obligation. |
| P3: nullable set-phase dispatch and successful finalization | `boundary.ts:105–151` determines opt-in and conditional configuration validation; `152–167` creates Run with evidence and rechecks locked configuration; `168–179` invokes and finalizes set phase; `480–482` separately finalizes legacy work. | Dispatch/finalization changes edit coordinator. Inspect `set-phase/config.ts:50–94` (`loadSetPhase`) for fail-closed opt-in and `set-phase/execute.ts:21–155` (`executeSetPhase`) for work-only ownership, counts and empty admission return. Changes to profile meaning also require configuration/DDL/deployment inspection; a structural common-finalization change does not. Tests: set-phase differential history at `36`, misconfiguration at `258`, incompatible Active keys at `304`, lost COMMIT at `315`. |
| P4: metadata row/routine retirement ordering | `boundary.ts:358–375` retires after mutable DELETE; `378–422` performs immutable Red followed by retirement and Red Lineage; Black begins at `423`. `queries.ts` owns `releaseActiveReferencesSql`, `activeDeleteSql`, `redLineageSql`, and `retireMetadataSql`; `db/runtime/execute-transfer-metadata.sql` owns `rawsql_transfer.retire_active`. | An ordering change must inspect both lifecycle sites, row SQL and the deployed routine. The routine releases historical Work references, deletes and checks one Active row, then optionally writes Red Lineage. Inspect subsequent Black/Processing visibility. For a universal retirement invariant, also inspect `executeSetPhase` at `116–136` and its `release`/`retire`/`lineage` SQL. Tests include reevaluation correction/history at `181`, mutable lifecycle at `154`, retirement failure cases around `436`, and set-phase historical-reference retirement at `205`. |

The P4 row/routine duplication is deliberate experimental reference evidence in Decision 0010. It must not be silently replaced with a different execution model under a structural-refactoring label.

Alternatives and predicted costs

Keep everything as-is:

- P1 and P3 still edit only the coordinator file plus relevant SQL/tests, but their owning function includes unrelated row model behavior.
- P2 and P4 retain direct visibility of decisions, writes, metadata and transaction exit in one function.
- There are no added internal interfaces.
- Keeping is better for a task that changes the entire per-item ordering contract: splitting decisions, mutation and metadata among model-specific owners would increase coordination and hide ordering. It is also better than an extraction whose arguments merely expose dozens of mutable locals without giving a clear work-only contract.

Narrow extraction, preferred:

- Extract the contiguous legacy work operation beginning with pending admission and ending with work counts, approximately baseline `181–479`. It receives already-validated configuration, client/query access, Run identity, arguments, definition and admission/routine options; it returns `{ inserted, skipped }`.
- Retain one coordinator responsible for initial validation/configuration locking, separate Run persistence, configuration recheck, work-path dispatch, successful finish/COMMIT, rollback and failure recording.
- Keep the row algorithm’s loop, duplicate context, Work construction, mutation, retirement, Lineage and Processing ordering together.
- P1 remains a coordinator plus SQL task with one extra inspection hop only when proving the extracted executor has no transaction ownership. Routine P1 reasoning no longer occurs inside the row model algorithm’s containing function.
- P2 becomes a legacy-work task. It still must inspect the stable-key precondition and result check together; the extraction does not eliminate that legitimate coordination.
- P3 remains coordinator plus existing set-phase configuration/execution inspection. Common success finalization removes a duplicated transaction decision.
- P4 remains deliberately cross-cutting across legacy work, SQL and routine. A universal invariant still involves set-phase code. Claim no file-count reduction or universal maintenance benefit for P4.
- Costs: one internal call boundary, parameter/result definitions, possible relocation of legacy-only identity helpers, and preserving SQL construction provenance across the new location. Prefer an explicit small context over passing the entire public request or an untyped mutable closure bag.

Wider decomposition:

Separate mutable, immutable, insert-only, metadata, recovery and configuration modules might reduce individual function spans further, but no evidence here justifies the increased interfaces. Work flags, actual writes, Active retirement, Lineage and Processing would risk gaining separate owners for one item’s invariant. Reject this wider option for the current experiment.

Invariant owner map

| Invariant | Baseline owner | Preferred candidate owner |
| --- | --- | --- |
| Separate durable Run creation; lock/recheck; atomic work; successful COMMIT; recovery error preservation | `executeTransfer`, with `finishSql`/`failSql` | Same coordinator and SQL; one common successful finalization |
| Non-null phase configuration fails closed; deployment evidence matches exact configuration | Coordinator plus `loadSetPhase` | Same owners |
| Pending whole-key admission and legacy source identity/mapping | Coordinator’s embedded legacy block plus pending SQL and supplied definition | Extracted legacy work operation plus unchanged SQL/definition contract |
| Mutable identity before exclusions and after returned mutation | Embedded legacy algorithm plus `projection` | Same legacy algorithm owner, preserving both checks |
| Per-item model decision, Work flags, mutation/retirement/Lineage/Processing order | Embedded legacy algorithm; metadata routines as explicit paired implementation | One extracted legacy algorithm; unchanged routine ownership |
| Set-phase ordered links, relation/actual-write verification and metadata | `executeSetPhase` plus fixed phase SQL/configuration | Unchanged |
| Named binding and trusted stored SQL boundary | Serene binding sites, `trusted-sql.ts`, reviewed SQL definitions | Same contracts; relocated call sites require audit review |
| Business meaning of Destination, Dirty Key, Setting and transfer models | Business Design and recorded human decisions | Unchanged; not inferred from the refactor |

Comparison and stopping criteria, before editing

1. Record baseline and candidate anchors for all four probes, containing function spans and actual required inspection/edit boundaries.
2. Require P1 or P3 to lose unrelated model-algorithm exposure, without moving recovery or successful finalization into executor helpers.
3. Require P2’s two identity checks to retain a coherent owner; require P4’s observable statement order and explicit row/routine parity to remain intact.
4. Compare representative task edits rather than treating moved lines or smaller files as benefits. An additional hop to verify work-only ownership is a cost to record.
5. Run unchanged PostgreSQL integration regressions and `pnpm verify`, including the SQL audit. Inspect findings for moved construction sites rather than interpreting relocation as new provenance.
6. Obtain the required independent post-change Alder review.
7. Accept the first narrow candidate meeting those conditions. If benefit is only lexical without a credible reduced inspection boundary, or invariant ownership becomes worse, narrow the claim further or keep/propose. Do not continue decomposing for an optimum.

Confidence, evidence classification and limitations

Repository evidence: high confidence that independent recovery, mutable semantics and set-phase dispatch changes coexist in `executeTransfer`, and that success finalization is duplicated. These are directly supported by named patches and baseline anchors.

Agent judgment: moderate confidence that extracting only legacy work and unifying successful finalization improves P1/P3 maintenance locality while preserving P2/P4 ownership. The predicted advantage is narrower reasoning exposure, not fewer total files for every task, runtime speed or measured developer productivity.

Engineering precedent: separating transaction coordination from work execution is a useful general technique, but it is not the trigger or proof. The existing `executeSetPhase` seam is the concrete repository precedent.

No candidate runtime, regression result or measured post-change span was available in this assessment. I did not perform an exhaustive semantic audit of every concept, DDL statement or test. Historical application is retrospective: these patches establish baseline observed reasons, not what an agent would have known before those changes happened.

Reopen after a new concrete task exposes repeated independent edits inside the extracted legacy algorithm, newly duplicated invariant decisions, or an interface that makes ordinary work harder. Do not reopen merely because the extracted algorithm remains long.

---

Prompt and isolation record (appended after the assessment)

Exact original task prompt:

> Issue #31 explicitly requires independent Fresh Agent rule application. Work read-only in /workspace/scratch/8ab680f5d64c/velvet. Read evaluations/issue-31/rule.md and protocol.md. Independently apply frozen rule to baseline b3190e3d341ee21478161f2b8b31f96826c503b1 using git show (working tree may change). Read AGENTS.md and relevant Business Design/decisions/history/tests. Do not read other evaluation results or infer desired decomposition. Return complete assessment with inputs, evidence anchors, keep/extract alternatives, invariant owners, trigger and implement/propose/keep conclusion, confidence and limitations; do not edit code. Also locate four protocol probes at baseline with owning function and necessary edit/inspection boundaries. Your final response will be saved verbatim.

Exact subsequent parent message:

> Please save your complete final assessment to evaluations/issue-31/fresh-a.md when done (only that file). Include exact prompt received, baseline, isolation limitations (fresh conversation, shared filesystem, git-show baseline), concrete findings. Do not read working implementation or other results.

Exact subsequent parent task:

> Save the complete preceding final assessment verbatim to evaluations/issue-31/fresh-a.md in /workspace/scratch/8ab680f5d64c/velvet. Append exact original task prompt plus subsequent messages and isolation limits. Edit only this file, do not read other results or working implementation.

Isolation limits: this was a separate fresh agent conversation sharing the repository filesystem with the parent and other agents; it was not an OS-level isolated checkout. Rule, protocol and root AGENTS.md were read from the working tree. Implementation, Business Design, decisions, tests and historical patches were read through `git show` using the frozen baseline or explicit ancestors. A file-list search exposed names, not other evaluation contents. No working implementation or other agents’ results were read. The initial assessment was completed before the requests to persist it. The only file written by this agent is this assessment, following the subsequent explicit instruction. No independent post-change Alder review is claimed by this baseline assessment.
