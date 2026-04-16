# Security Review Agent

**Trigger:** Automatically — Bob runs this on every PR. George runs this before opening a PR.
**Reference:** Always read THREAT_MODEL.md before starting.

## What This Agent Does

Reviews code changes for security issues before they merge. Faster and cheaper than finding them in production.

## Checklist (Run Against Every Changed File)

### Authentication
- [ ] Every API route calls `getServerSession(authOptions)` and checks `session?.user?.id`
- [ ] No route relies on client-supplied userId — always from session
- [ ] Admin routes check BOTH `session.user.id` AND `session.user.isAdmin`
- [ ] Cron routes call `authCron(request)` before any logic

### Authorization (IDOR Prevention)
- [ ] Every Prisma query on a user/family resource includes `familyId: session.user.familyId` or `userId: session.user.id` in the where clause
- [ ] Dynamic route segments (`[id]`) never used as sole lookup key
- [ ] Share tokens are UUIDs, not sequential integers

### Input Validation
- [ ] All `request.json()` bodies parsed and validated with Zod
- [ ] String fields have `.max()` limits (suggested: name=100, description=500, freetext=2000)
- [ ] Numeric fields validated as numbers, not strings
- [ ] No raw user input concatenated into AI prompts — use structured objects

### Secrets & Data
- [ ] No secrets hardcoded in source code
- [ ] No sensitive data (tokens, keys, passwords) returned in API responses
- [ ] No PII logged to console in production paths
- [ ] Encrypted fields use `encrypt()`/`decrypt()` from `lib/encryption.ts`

### Public Routes
- [ ] Any route without auth is explicitly intentional and documented in THREAT_MODEL.md
- [ ] Public routes only expose data scoped to the specific share token, not full family data

### Error Handling
- [ ] All routes wrapped in try/catch or use `apiHandler()`
- [ ] Error responses use generic messages in production — no stack traces or DB errors exposed

## Output Format

Report findings as:
```
SECURITY FINDINGS — [PR/Branch Name]

🔴 CRITICAL: [issue] at [file:line]
   Fix: [specific fix]

🟠 HIGH: [issue] at [file:line]
   Fix: [specific fix]

🟡 MEDIUM: [issue] at [file:line]
   Fix: [specific fix]

✅ PASS: Authentication, Authorization, Input Validation, Secrets
```

If any 🔴 CRITICAL or 🟠 HIGH findings exist → block PR, create bug ticket for George.
If only 🟡 MEDIUM → flag in PR comment but do not block.
