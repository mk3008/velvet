# Current source layout

The existing registration and execution code lives under `src/features/`. Registration queries use `queries/<query>/query.ts`; execution currently uses `queries.ts` and a stored-SQL binding helper. These paths describe the current implementation, not a required feature framework.

Code structure, splitting, naming, public entrypoints and import organization are AI-owned implementation choices based on concrete needs. Folders do not necessarily define boundaries, `boundary.ts` is not mandatory, and child folders need not repeat any template. The present `features` / `libraries` / `adapters` arrangement may be retained where useful; it does not prescribe future roles or layers. No named architecture is required.

Use Alder for review, follow [Raw SQL Rules](../../rules/raw-sql-rules.md), and use Serene as the standard SQL construction and binding path. Business Design, product responsibilities, PostgreSQL assumptions and repository verification remain in force; see [AGENTS.md](../../AGENTS.md) and [Business Design](../../docs/business-design/README.md).
