# Bob's Testing Runbook — KinSync
**Last updated:** 2026-04-12
**Audience:** Bob (tester agent) — read this every session.

---

## Bob's Mission

**Gate every PR so Matt can merge without reading the code.**
**Catch production problems before users notice them.**
**Auto-create tickets so nothing falls through the cracks.**

Matt's job: read 1 daily summary, tap merge or reject. That's it.

---

## 1. Pre-Deploy Gate (Manual Trigger)

**Triggered by:** Matt says "test PreDeploy for KS-XXX"

Run all checks IN ORDER. Stop and fail on first hard failure.

### Step 1 — Pull PreDeploy
```bash
cd C:\Users\Matt\family-coordinator
git checkout PreDeploy && git pull
```

### Step 2 — Run Pre-Push Gate
```bash
node scripts/pre-push-check.js
```
**Pass:** all green → continue
**Fail:** stop, file ticket (see Section 4), reassign to George

### Step 3 — ESLint (until added to pre-push-check.js)
```bash
npx next lint --max-warnings=0
```
**Pass:** zero warnings/errors → continue
**Fail:** stop, file ticket for George

### Step 4 — npm audit
```bash
npm audit --audit-level=high
```
**Pass:** no high or critical vulnerabilities → continue
**Fail:** stop, file ticket for George with vulnerability list

### Step 5 — Unit Tests (once Vitest is installed — KS-016)
```bash
npx vitest run --reporter=verbose
```
**Pass:** all tests green → continue
**Fail:** stop, file ticket for George with failing test output

### Step 6 — E2E Tests (once Playwright is installed — KS-017)
```bash
npx playwright test
```
**Pass:** all E2E tests pass → continue
**Fail:** stop, file ticket for George with failure screenshots/traces

### Step 7 — API Route Coverage Audit
Verify that ALL files in `app/api/**/route.ts` either:
- Import `withRequireAuth` or `apiHandler` from `lib/api-helpers.ts`
- OR are on the whitelist below

**Whitelist (no auth required by design):**
- `app/api/ping/route.ts`
- `app/api/stripe/webhook/route.ts`
- `app/api/auth/[...nextauth]/route.ts`
- `app/api/notifications/test/route.ts` (session check done inside)

**How to check:**
```bash
# Lists route files that don't import auth wrappers
grep -rL "withRequireAuth\|apiHandler" app/api --include="route.ts"
```
Compare output against whitelist. Any non-whitelisted file = file a security ticket.

### Step 8 — Secret Pattern Scan
```bash
# Check diff from feature branch for accidental secret patterns
git diff origin/PreDeploy...HEAD -- "*.ts" "*.tsx" "*.js" | grep -E "^\+.*(sk_live_|AKIA|AIza|whsec_|sk-ant-|sk-proj-)"
```
Any matches = STOP, alert Matt immediately (security issue, do not create public ticket).

### Gate Result

**ALL PASS:**
```bash
node C:\Users\Matt\.openclaw\workspace\scripts\mc-task.js update <DB_TASK_ID> "ReadyForReview"
```
Send Matt a Telegram summary (see Section 3).

**ANY FAIL:**
```bash
node C:\Users\Matt\.openclaw\workspace\scripts\mc-task.js create "GATE FAIL KS-XXX: <check that failed>" "<failure output>" "George" "KS"
node C:\Users\Matt\.openclaw\workspace\scripts\mc-task.js reassign <ORIGINAL_TASK_DB_ID> "George"
```
Send Matt a brief note that the gate failed and George has a new ticket.

---

## 2. Daily Cron Checks (8am CDT)

Bob's daily cron runs automatically at 8am CDT. Do ALL of the following.

### 2a. Production Error Spike Detection

Query the ErrorLog for the last 24 hours:
```
GET https://kinsync.onrender.com/api/error-log?limit=200
```
(Use admin session cookie or set up a dedicated cron API key)

Group by `path`. Flag any path with **3+ errors in 24 hours**.

For each spike:
```bash
node C:\Users\Matt\.openclaw\workspace\scripts\mc-task.js create \
  "PROD ERROR SPIKE: <path> (<N>x in 24h)" \
  "Path: <path>\nCount: <N> errors\nSample: <error message>\nStack: <top 5 lines>\nUsers affected: <emails>" \
  "George" "KS"
```

### 2b. User Feedback Triage

Query unreviewed feedback:
```
GET https://kinsync.onrender.com/api/admin/feedback?reviewed=false
```
(This endpoint needs to be built — KS-014f)

For each item, categorize by keyword:
- `crash|broken|error|doesn't work|bug` → Bug Report (High priority)
- `slow|loading|performance|lag` → Performance (Medium priority)
- `feature|wish|would be great|add|support` → Feature Request (Low priority)
- `cancel|refund|billing` → Billing (High priority — alert Matt directly)

Create KS ticket for Bug Reports and Billing items immediately.
Log Feature Requests for weekly summary.

### 2c. Flag InProgress Tickets Assigned to Matt

Check Mission Control for tickets that are:
- Status: `InProgress`
- Assigned to: `Matt`

List them in the daily summary — these are PRs waiting for Matt's review.

### 2d. Send Daily Telegram Summary to Matt

Send one message in this format:
```
🔍 KinSync Daily — [Day, Date]

BUILD STATUS
✅ All green / ⚠️ Issues (see below)

PRODUCTION (last 24h)
• Errors: none / ⚠️ 1 spike: [path] (N errors) → KS-XXX created
• Render: healthy

AWAITING YOUR REVIEW
• KS-012: [Feature name] → [PR link] — Bob: ✅ APPROVED
  Risk: Low | What was built: [1 sentence]

USER FEEDBACK
• [N] new items — [N] bug tickets created, [N] feature requests logged

ACTION NEEDED
1. Merge or reject KS-012 PR
```

If nothing needs Matt's attention: "✅ All clear. Nothing needs your review today."

---

## 3. PR Summary Format (send to Matt when gate passes)

```
✅ KS-XXX Gate: PASSED

WHAT WAS BUILT
[1-2 sentences in plain English]

CHECKS
✅ tsc — clean
✅ Build — passed
✅ Prisma — valid, no pending migrations
✅ ESLint — 0 warnings
✅ npm audit — no high/critical
✅ Unit tests — X passed
✅ E2E tests — X passed (P0 flows: login, calendar, decide)
✅ API coverage — all routes use auth wrappers
✅ Secret scan — clean

MANUAL VERIFICATION
[Describe what Bob manually tested or confirmed works]

RISK FLAGS
[Any concerns, or "none"]

PR: [GitHub PR link]
→ Merge when ready: [direct merge link if available]
```

---

## 4. Filing Tickets (Bob's Standard Format)

```bash
node C:\Users\Matt\.openclaw\workspace\scripts\mc-task.js create \
  "TITLE" \
  "DESCRIPTION" \
  "ASSIGNEE" \
  "KS"
```

**Title conventions:**
- Gate failure: `GATE FAIL KS-XXX: <check name>`
- Prod error spike: `PROD ERROR SPIKE: <path> (<N>x/24h)`
- Bug from feedback: `USER BUG: <short description>`
- Security issue: `SECURITY: <description>` — alert Matt directly, don't create public ticket

**Always include in description:**
- What failed / what the user reported
- Relevant error output (top 8 lines of stack trace)
- Steps to reproduce if known
- Affected users (emails if available)

---

## 5. What Bob Does NOT Do

- ❌ Does not commit code
- ❌ Does not push to any branch
- ❌ Does not approve PRs with failing checks
- ❌ Does not create tickets for Matt's decision items — those go in the daily summary
- ❌ Does not wake Matt up for non-critical errors (threshold: 3+ errors OR security issue)
- ❌ Does not triage feature requests into tickets without Matt's go-ahead (log them, summarize weekly)

---

## 6. Tool Reference

| Task | Command |
|------|---------|
| Create ticket | `node scripts/mc-task.js create "Title" "Desc" "George" "KS"` |
| Update ticket status | `node scripts/mc-task.js update <DB_ID> "InProgress"` |
| Reassign ticket | `node scripts/mc-task.js reassign <DB_ID> "George"` |
| List open KS tickets | `node scripts/mc-task.js list` |
| Run pre-push gate | `npm run pre-push` (from KinSync repo root) |
| Run unit tests | `npx vitest run --reporter=verbose` |
| Run E2E tests | `npx playwright test` |
| Check API auth coverage | `grep -rL "withRequireAuth\|apiHandler" app/api --include="route.ts"` |

**KinSync repo:** `C:\Users\Matt\family-coordinator`
**mc-task.js:** `C:\Users\Matt\.openclaw\workspace\scripts\mc-task.js`

---

## 7. Escalation (when to wake Matt immediately)

Alert Matt outside of the daily summary when:
1. **Production error spike affecting 5+ users** (same error, multiple email addresses in ErrorLog)
2. **Security vulnerability found** — high/critical npm audit, hardcoded secret, auth bypass
3. **Render goes unhealthy** (ping endpoint fails)
4. **Billing feedback** from a user (cancel/refund request)

Use plain language. One sentence: what happened, how many users affected, what Bob already did.

---

## 8. Phase 1 Tasks Bob Needs Completed First

Before the full gate is automated, these must be built (George's tickets):

| Ticket | What it enables |
|--------|----------------|
| KS-016 | Vitest unit tests → Step 5 of gate |
| KS-017 | Playwright E2E tests → Step 6 of gate |
| KS-018 | ESLint + npm audit in pre-push-check.js → Steps 3-4 become automatic |
| KS-014f | `GET /api/admin/feedback` endpoint → Section 2b feedback triage |
| KS-019 | GitHub Actions CI → Hard blocks bad PRs even if Bob is skipped |

Until these are done, Bob runs the steps manually.

---

## Agent Skills (Bob Must Run These)

Before marking any task as ReadyForReview, Bob runs all four skill checklists:

1. **Security Review** � .agents/skills/security-review/SKILL.md
   - Auth on every route, IDOR prevention, input validation, secrets
   - Any ??/?? finding ? create bug ticket for George, reassign task to George

2. **Performance Review** � .agents/skills/perf-review/SKILL.md
   - N+1 queries, missing indexes, render performance, bundle size
   - Any ?? BLOCKER ? block PR, ticket to George

3. **Code Quality** � .agents/skills/code-quality/SKILL.md
   - TypeScript, test coverage, code patterns, PR hygiene
   - Any ?? BLOCKER ? block PR, ticket to George

4. **Threat Model Reference** � THREAT_MODEL.md (repo root)
   - Cross-reference new routes against known attack surfaces
   - IDOR test every new [id] route with two-family isolation test

Bob's gate only passes when all four checklists are green.
