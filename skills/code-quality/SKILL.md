# Code Quality Agent

**Trigger:** George runs this before opening any PR. Bob runs this in the pre-deploy gate.
**Reference:** Read TESTING.md for test requirements.

## What This Agent Does

Enforces code quality standards — TypeScript correctness, test coverage, code patterns, and maintainability — so George ships consistent, maintainable code every time.

## Checklist

### TypeScript
- [ ] No `any` types without explicit justification comment
- [ ] No `// @ts-ignore` or `// @ts-expect-error` without explanation
- [ ] New API response shapes defined in `types/models.ts`
- [ ] All function parameters and return types explicitly typed (no implicit `any`)
- [ ] `tsc --noEmit` passes with zero errors before PR is opened

### Testing
- [ ] Every new utility function in `lib/` has a corresponding unit test in `tests/`
- [ ] Every new API route has at minimum: auth test (401 without session), happy path test, and error path test
- [ ] New UI components have at least a smoke test in Playwright (loads without error)
- [ ] No test files committed with `.skip` or `.only` left in (breaks CI)
- [ ] `npm test` passes with zero failures before PR is opened

### Code Patterns
- [ ] API routes use `apiHandler()` wrapper from `lib/api-handler.ts` (standardized error handling)
- [ ] Client data fetching uses `useApiCall` or `useMutation` hooks — no raw `fetch()` in components
- [ ] New Prisma queries use `prisma-selectors.ts` patterns for consistent field selection
- [ ] No `console.log` left in production paths (only `console.error`/`console.warn` for real errors)
- [ ] Dates handled with `date-fns` (v2) — no native `Date` arithmetic

### Documentation
- [ ] New API routes have a JSDoc comment: method, path, auth requirement, query params, response shape
- [ ] Complex business logic has inline comments explaining *why*, not just *what*
- [ ] New environment variables added to `.env.example` with description
- [ ] THREAT_MODEL.md updated if: new route added, new third-party integration, auth pattern changed

### PR Hygiene
- [ ] PR title follows conventional commits: `feat:`, `fix:`, `test:`, `refactor:`, `docs:`
- [ ] Branch named `feature/KS-XXX-slug` — branched from PreDeploy
- [ ] No uncommitted/unstaged files
- [ ] No merge conflicts with PreDeploy
- [ ] Ticket reassigned to Matt, status InProgress when PR opened

## Output Format

```
CODE QUALITY REPORT — [PR/Branch Name]

🔴 BLOCKER: [issue] at [file:line]
🟠 WARN: [issue] at [file:line]
🟡 NOTE: [suggestion]

Test Coverage:
  New utility functions: X/X have tests
  New API routes: X/X have auth + happy path + error tests

✅ PASS: TypeScript, Tests, Patterns, Docs
```

🔴 BLOCKER → must fix before PR is opened. 🟠 WARN → fix in same PR. 🟡 NOTE → George's discretion.
