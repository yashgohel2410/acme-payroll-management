# ACME Payroll Management — AI-Assisted Development

**Tools:** Cursor Agent and ChatGPT.

AI is used to draft and refine work. It does not replace review. Nothing generated is treated as correct until a person checks it against the product requirements and architecture.

## How AI Is Used

- **Requirements.** Turn product notes into a concise PRD: objectives, scope, exclusions, and acceptance criteria. A person confirms the wording matches the intended release.
- **Architecture.** Propose structure, API shape, validation, and performance notes for 10,000+ employees. Decisions stay aligned with React, Vite, Express, SQLite, and Prisma.
- **Implementation.** Scaffold modules, types, and routine code from an approved design. The developer owns naming, boundaries, and what is merged.
- **Debugging.** Suggest causes and fixes from error messages and code context. Each suggestion is reproduced locally before it is kept.
- **Tests.** Draft unit, API, and UI test cases from acceptance criteria. Tests are added and run by the developer; passing results are not assumed from AI output.

No application code or test runs are claimed by this document. Those happen only when implementation work is actually done and recorded.

## Review and Validation

- Read every generated change. Reject output that adds payroll, tax, bank payouts, currency conversion, or authentication unless that scope was explicitly requested.
- Compare behavior to `docs/REQUIREMENTS.md` and structure to `docs/ARCHITECTURE.md`.
- Run the project typecheck, linters, and tests after implementation exists. Fix failures before accepting the change.
- Prefer small edits that can be traced to a prompt and a decision.

## Correctness, Security, and Quality

- **Correctness.** Validate inputs (required fields, salary amounts, ISO currency codes). Keep pagination and filters on the server. Do not trust sample data or invented edge cases from the model.
- **Security.** Compensation data stays minimal and is not pasted into prompts beyond what a task needs. Do not commit secrets. Authentication remains a future requirement; AI must not pretend it is implemented.
- **Quality.** Keep TypeScript types strict, modules small, and error responses consistent. Delete unused generated code. Match existing project style.

## Prompt and Decision Log

Record significant prompts and the decision taken. Leave the table empty until real work occurs.

| Date | Tool | Prompt summary | Decision |
|------|------|----------------|----------|
| | | | |
