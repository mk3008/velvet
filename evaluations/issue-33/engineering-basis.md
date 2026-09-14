# Sources, repository evidence and judgment

Read on 2026-09-14. These sources generate questions, not binding coding laws.

| Primary source | Relevant idea | Velvet hypothesis / limit |
| --- | --- | --- |
| Green & Blackwell, [Cognitive Dimensions of Information Artefacts, tutorial v1.2](https://www.cl.cam.ac.uk/~afb21/CognitiveDimensions/CDtutorial.pdf), introduction, hidden dependencies, abstraction, visibility | Static and interactive representations can be assessed by the activities they support; improving an abstraction can add navigation/dependency costs. | Inspect a semantic unit and its caller obligations. A name can aid navigation while a new hop makes ordering less visible. No automatic preference for more functions or a numerical readability score follows. |
| Shneiderman, [The Eyes Have It: A Task by Data Type Taxonomy for Information Visualizations](https://drum.lib.umd.edu/items/cd983adb-568a-47d3-b43a-1d8d8b8c72f4), author/institutional record | Overview and selective detail are distinct information-seeking tasks. | Ask separately for an execution outline and a precise receipt-check location. The visualization analogy is not evidence that code needs a mandatory index or function hierarchy. |
| [Issue 31 engineering basis](../issue-31/engineering-basis.md) | Existing Parnas/Fowler/Beck precedents and local evidence are already separated. | Reuse that provenance; a second literature survey is not necessary to judge this seam. |

## What the current repository actually establishes

V3 already permits source equality, contracts and costs as enough evidence (§3),
proportional verification (§6), and short ordinary records. It does not impose a
universal replay study. The concrete narrower point is the current A2/B2 register:
M1 asks for reduced unrelated implementation/fixture obligations. A semantic
navigation benefit can exist without fewer fixtures, and that question should
not exclude it. Prior DEFER was a bounded unperformed comparison, not a proof
that the comparison was infeasible. Issue 33 now authorizes investigating it.

- `fbfe73e`: mutable feature introduction and invalid-return/locator tests. This
  establishes actual contracts and test tasks, not a production incident.
- `6ffab6f`: repair of committed-success handling after a lost COMMIT response;
  coordinator/failure SQL/tests establish why causal isolation matters.
- `8bb20a2`: insert-only simplification through the common path; evidence against
  unnecessary distributed lifecycle ownership, not against narrow private seams.
- Decision 0015 and issue-31/multiaxis report establish a supported mapping-module
  case with direct value-only tests and extra interface cost. Timing variations
  C3/C6/C8 are counterfactual applications, not repeated historical experiments.
- B2 DML (baseline boundary.ts 383–407) takes five existing facts and has no
  returned state. The earlier stable-key check and later retirement are caller
  obligations. A2 includes immutable Red's opposite returned-key invariant and
  a module contract, so B2 evidence cannot be silently credited to A2.

## Judgment under investigation

Verification strength can reduce uncertainty about a reversible trial, and cheap
rollback can bound wasted implementation effort. Neither bounds an incorrectly
committed database effect by itself. Evidence effort should address the largest
remaining decision-changing uncertainty, not reward a small diff. Task timing can
block execution of a valuable change without making its maintenance value false.
These are proposed reasoning distinctions tested in the frozen cases; no universal
risk probabilities, developer-time savings or release policy are claimed.
