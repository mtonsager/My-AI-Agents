# KinSync Quality & Trust System
**Date:** 2026-04-11
**Topic:** Code quality, testing, error monitoring, and feedback loop
**Team:** Atlas, Forge, Echo, Prism, Nova

---

## Executive Summary

KinSync already has a solid foundation — `pre-push-check.js` enforces tsc + build + Prisma validation before any code reaches `PreDeploy`, and `lib/error-log.ts` + `lib/api-handler.ts` provide production error capture. The gaps are: no automated runtime production monitoring beyond what Bob sees at 8am, no structured user feedback triage path, no security scan in the CI pipeline, and no consistent Matt-facing summary that surfaces only what needs his decision. The recommended system closes all four gaps without adding meaningful overhead to Matt's day — his job stays: read the morning summary, merge or reject, move on.

---

## Agent Perspectives

### Atlas — Product & Process

- **The feedback loop has two clocks: build-time and run-time.** Build-time (Bob's gate) is largely working. Run-time is where prod surprises happen. We need the same "catch before Matt sees it" discipline applied to production errors, not just pre-deploy checks.
- **User feedback is currently a dead end.** `POST /api/feedback` writes to `UserFeedback` table — good. But there's no triage path: who reads it? When? A daily Jarvis sweep that creates KS-XXX tickets from unreviewed feedback closes the loop.
- **Matt's decision surface should be a single artifact.** One Telegram message per day: "Here's what was built, here's what failed, here's what users said. 3 things need your eyes." Everything else should auto-resolve.
- **Branch discipline is the hidden quality multiplier.** One branch = one ticket = one PR = one review. It's already documented in AGENTS.md. Enforcement (Bob refusing to gate a PR that touches multiple tickets) keeps blast radius small.
- **Quality isn't a layer you add — it's a gate you can't pass.** If George can push code that doesn't pass pre-push-check, the system has failed. The gate must be technical, not social.

### Forge — Technical Implementation

**What's already in place (don't rebuild it):**
- `scripts/pre-push-check.js` — Prisma validate + migrate status + generate + tsc + full next build. Solid.
- `lib/error-log.ts` — DB-persisted errors with user context, 30-day retention, admin-only GET.
- `lib/api-handler.ts` — `apiHandler()` wrapper auto-catches unhandled exceptions and logs to ErrorLog.
- `withRequireAuth()` + `requireProAndAiCap()` — consistent auth/tier patterns across API routes.
- `SECURITY_SCAN.md` — thorough manual audit history. But it's manual.

**What's missing — specific tools and scripts:**

**1. Automated `npm audit` in pre-push-check.js**
Add this step to `scripts/pre-push-check.js`:
```js
step('npm audit (high/critical)', () => {
  const out = execSync('npm audit --audit-level=high --json', {
    cwd: ROOT, stdio: 'pipe'
  }).toString()
  const result = JSON.parse(out)
  const high = result.metadata?.vulnerabilities?.high || 0
  const critical = result.metadata?.vulnerabilities?.critical || 0
  if (high > 0 || critical > 0) {
    throw new Error(`${critical} critical, ${high} high vulnerabilities. Run: npm audit fix`)
  }
})
```

**2. ESLint re-enable in pre-push-check.js**
The current script has ESLint commented out (v9 config issues). Fix the config and restore:
```js
step('ESLint', () => {
  run('npx next lint --max-warnings=0')
})
```

**3. Bob's automated error sweep script (expand existing cron)**
Bob already runs an 8am CDT cron. Add a production error triage function:
```js
// In Bob's daily scan — call GET /api/error-log?from=<yesterday>&limit=200
// Group by path, count occurrences, flag paths with >3 errors in 24h
// If threshold breached → create KS-XXX ticket via mc-task.js
// Ticket title: "PROD ERROR SPIKE: /api/path/to/route (N occurrences)"
// Body: top 3 stack traces, affected users, time range
```

**4. Client-side error boundary → ErrorLog pipe**
Currently `app/(dashboard)/error.tsx` exists — upgrade it to POST to `/api/error-log`:
```tsx
// In error.tsx reset handler:
useEffect(() => {
  fetch('/api/error-log', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: error.message,
      stack: error.stack,
      path: window.location.pathname,
      code: 'CLIENT_ERROR_BOUNDARY'
    })
  }).catch(() => {})
}, [error])
```

**5. DOMPurify for BriefingCard (SECURITY_SCAN open finding)**
```bash
npm install dompurify @types/dompurify
```
```tsx
// In components/decide/BriefingCard.tsx
import DOMPurify from 'dompurify'
// Replace: dangerouslySetInnerHTML={{ __html: content }}
// With:    dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(content) }}
```

**6. Bob's pre-deploy gate additions**
Current gate: tsc + build + Prisma validate.
Add:
- `npm audit --audit-level=high` (fail on high/critical)
- `npx next lint --max-warnings=0`
- Migration drift check (already in pre-push-check.js, confirm Bob runs it)
- `node scripts/security-check.js` (new — see Layer 2 below)

**7. GitHub Actions CI (free on public/private repos)**
```yaml
# .github/workflows/ci.yml
name: CI
on:
  pull_request:
    branches: [PreDeploy, deploy]
jobs:
  quality-gate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20', cache: 'npm' }
      - run: npm ci
      - run: npx prisma generate
      - run: npx tsc --noEmit
      - run: npx next lint --max-warnings=0
      - run: npm audit --audit-level=high
      - name: Build
        run: npm run build
        env:
          DATABASE_URL: postgresql://stub:stub@localhost:5432/stub
          NEXTAUTH_SECRET: stub-secret
          NEXTAUTH_URL: http://localhost:3000
          NODE_OPTIONS: --max-old-space-size=4096
```
This means even if George skips `npm run pre-push`, GitHub blocks the PR from merging.

### Echo — Industry Patterns

- **Linear's approach:** Every bug becomes a ticket before anyone discusses it. The triage is automated — their internal tooling creates issues from Sentry events within seconds of a production spike. KinSync can replicate this with Bob's cron + `mc-task.js`. The key insight: humans shouldn't decide whether to file a ticket — that decision should be automatic.
- **Vercel's deploy pipeline:** They have a "preview → production" gate where the preview environment runs the same checks as production. KinSync's `feature/* → PreDeploy → deploy` mirrors this already. The missing piece Vercel has: **automatic rollback triggers.** On Render, this means Bob should know the last known-good deploy SHA and be able to trigger a rollback via the Render API if error rates spike post-deploy.
- **Supabase's error culture:** They treat any unhandled exception in prod as a P1 — not a "we should look at this." The `apiHandler()` wrapper KinSync already has is exactly the right pattern. The gap is escalation: not all routes use `apiHandler()` yet. A full audit pass (Bob's job) should verify coverage.
- **Indie SaaS pattern (smaller teams like Loom, Superhuman early-stage):** Weekly "quality debt" review embedded in the sprint. For KinSync with an AI team, this should be Bob's Friday summary: "Here are the 5 most common errors from this week, here's my recommendation for each." Creates institutional memory without meetings.
- **The "boring infrastructure" principle:** Don't build custom error dashboards when the ErrorLog table + admin UI already exists. Add a `/api/admin/error-summary` endpoint that returns grouped stats — this is a 30-minute George task, not a Sentry subscription.

### Prism — Developer Experience

- **George needs a one-liner to know if his code is ready.** Currently it's `npm run pre-push`. That's perfect. Do not complicate it. The rule: if `npm run pre-push` passes, George can push. Full stop.
- **Bob's daily report should be a Telegram message, not a dashboard.** Matt is on his phone between work and family obligations. A Telegram summary at 8:05am CDT (right after Bob's cron finishes) that says: "✅ No new errors overnight. 2 feedback items triaged. George has 1 open PR waiting for your review." takes 10 seconds to process.
- **Ticket creation should be invisible to Matt.** Bob creates KS-XXX tickets from errors and feedback automatically. Matt only sees tickets that are in "Needs Matt's Decision" status (PR ready to merge, or a production issue Bob can't auto-resolve).
- **The PR review template is Matt's decision tool.** Every PR Bob approves and forwards to Matt should include: (1) What was built in plain English, (2) What tests passed, (3) One screenshot or curl output showing it works, (4) Any risk flags Bob identified. George writes this as part of the PR description — it's non-negotiable.
- **Noise is the enemy.** If Matt gets 15 Telegram pings per day from the quality system, he'll start ignoring them. Max 1 daily summary. Only page him immediately for: (a) production error spike affecting users, (b) security vulnerability found, (c) PR ready for his review.

### Nova — Risk & ROI

- **The cost of a beta bug is disproportionately high.** KinSync is targeting sports families — their primary use case is time-sensitive (game day, pickup logistics). A bug that breaks the sports calendar or pickups feature on a Friday night for 10 beta users = 10 churned advocates who were going to recruit their teammates. At a $10-15/mo product, churn isn't the issue — destroyed word-of-mouth is. One bad experience at launch = potentially 50 lost prospects.
- **ROI of the current gate (tsc + build + Prisma):** Catches ~80% of "will this even run" errors. Already paid for itself.
- **ROI of adding ESLint + npm audit to the gate:** ~2 hours George spends once to fix lint warnings. Prevents entire categories of runtime errors (unused variables that shadow important ones, implicit any types, etc.) and dependency CVEs. Extremely high ROI.
- **ROI of GitHub Actions CI:** $0 on a private repo (2,000 free minutes/month). Eliminates "George pushed without running pre-push" failure mode entirely. Pure upside.
- **ROI of automated error → ticket creation:** Eliminates the Monday morning "oh, users saw this error all weekend" scenario. Bob catches it at 8am Saturday. If it's critical, George has a ticket by 8:15am. For a beta, this is the difference between a fixable problem and a trust-destroying one.
- **Minimum viable quality bar for launch:**
  1. `npm run pre-push` passes on every PR (already enforced by convention — needs GitHub Actions to make it mandatory)
  2. No HIGH or CRITICAL npm audit vulnerabilities in production (one-time fix + ongoing gate)
  3. Every API route uses `apiHandler()` or `withRequireAuth()` (Bob audits coverage — 1 hour task)
  4. Client-side ErrorBoundary posts to ErrorLog (1 hour George task)
  5. Bob's 8am cron alerts on error spikes within 24 hours
  - That's it. Everything else is post-launch hardening.

---

## The Debate

### Tension 1: "Add Vitest/Jest unit tests" vs. "Skip them pre-launch"

**Forge** argued for adding `vitest` and writing unit tests for critical lib functions (e.g. `rotation-calc.ts`, `sport-event-result.ts`, voice resolvers).

**Nova** pushed back: writing meaningful test suites for a pre-launch product with frequent schema changes is expensive maintenance. The ROI isn't there yet.

**Resolution:** Defer unit tests until post-launch. The tsc + build + ESLint gate already catches most correctness issues at the type level. **Exception:** any pure calculation function that handles money or safety logic (e.g. tax calculations, safety ETA logic) should get targeted unit tests immediately — the blast radius of a wrong number is too high. Bob should write these tests as part of the ticket that introduces or modifies such functions.

### Tension 2: "Use Sentry" vs. "Use existing ErrorLog"

**Echo** noted Sentry is the industry default for error monitoring with source maps, session replay, and performance profiling.

**Prism** argued Sentry adds $0 value at pre-launch scale and creates another dashboard for Matt to ignore. The existing ErrorLog table + Bob's daily sweep is sufficient.

**Resolution:** Use existing ErrorLog infrastructure now. If KinSync hits 50+ active users and Bob's daily sweep is missing errors, revisit Sentry. Not before. The data is already in Neon — use it.

### Tension 3: "PR required for every change" vs. "George commits directly to PreDeploy for hotfixes"

**Atlas** argued the one-PR rule is non-negotiable for quality.

**Forge** noted real emergencies exist (user-facing production outage).

**Resolution:** Hotfix path is allowed but has a clear protocol — George branches from `deploy` (not PreDeploy), fixes, deploys directly, then opens a backport PR to PreDeploy. Bob reviews the backport within 24 hours. Hotfixes still pass pre-push-check before merging to deploy.

### Tension 4: "DOMPurify for BriefingCard" — urgency?

**Nova:** Not urgent pre-launch (it's AI-generated content, not user input).

**Forge:** It's a 15-minute fix and SECURITY_SCAN.md has it as an open finding.

**Resolution:** George closes this as part of the next KS ticket touching BriefingCard. It's a "do it while you're in the file" fix, not a standalone ticket.

---

## Recommended System: KinSync Quality Stack

### Layer 1: Pre-Commit (George's responsibility)

**Rule: `npm run pre-push` must pass before every push. No exceptions.**

Current checks (keep):
- `npx prisma validate`
- Prisma migrate status (no failed/unapplied)
- `npx prisma generate`
- `npx tsc --noEmit`
- `npm run build`

**Add to `scripts/pre-push-check.js`:**
```js
// After TypeScript check, before build:
step('npm audit (high/critical only)', () => {
  try {
    execSync('npm audit --audit-level=high', { cwd: ROOT, stdio: 'pipe' })
  } catch (e) {
    const out = e.stdout?.toString() || e.message
    // npm audit exits non-zero on vulnerabilities; parse for high/critical
    if (out.includes('critical') || out.includes(' high')) {
      throw new Error('High or critical npm vulnerabilities found.\nRun: npm audit\nFix before pushing.')
    }
    // Other npm audit errors (network, etc.) — warn but don't block
    console.warn('  ⚠ npm audit check inconclusive (network issue?)')
  }
})

step('ESLint (no errors)', () => {
  run('npx next lint --max-warnings=0')
})
```

**George's checklist before opening any PR:**
1. `npm run pre-push` — must be green
2. PR description includes: what was built, how to verify, any risk flags
3. Branch is `feature/KS-XXX-slug`, targeting `PreDeploy`

### Layer 2: Pre-Deploy Gate (Bob's responsibility)

Bob runs the full pre-push-check PLUS these additional checks on every incoming PR:

**Bob's pre-deploy gate script additions:**

```js
// scripts/bob-predeploy-gate.js
// Runs everything in pre-push-check.js PLUS:

step('API route coverage audit', () => {
  // Check that every file in app/api/**\/route.ts either:
  // - imports apiHandler or withRequireAuth
  // - OR is explicitly whitelisted (ping, stripe/webhook, auth routes)
  const fs = require('fs')
  const glob = require('glob') // or use manual recursive walk
  const WHITELIST = [
    'app/api/ping/route.ts',
    'app/api/stripe/webhook/route.ts',
    'app/api/auth/[...nextauth]/route.ts',
  ]
  // ... scan and assert
})

step('No console.error without logError in API routes', () => {
  // Grep for raw console.error in app/api/ that aren't in catch blocks
  // that also call logError — warn (don't fail) on mismatches
  const out = execSync(
    'grep -rn "console.error" app/api/ --include="*.ts"',
    { cwd: ROOT, stdio: 'pipe' }
  ).toString()
  // Count lines — warn if >0 that aren't paired with logError
  console.log(`  Found ${out.split('\n').filter(Boolean).length} console.error calls in API routes (manual review)`)
})

step('No hardcoded secrets pattern check', () => {
  // Simple grep for common secret patterns
  const patterns = ['sk_live_', 'AKIA', 'AIza', 'whsec_']
  for (const pattern of patterns) {
    try {
      const out = execSync(
        `git diff origin/PreDeploy...HEAD -- '*.ts' '*.tsx' '*.js' | grep "+.*${pattern}"`,
        { cwd: ROOT, stdio: 'pipe' }
      ).toString()
      if (out.trim()) throw new Error(`Possible hardcoded secret: ${pattern}\n${out}`)
    } catch (e) {
      if (e.message.includes('Possible hardcoded')) throw e
      // grep exit 1 = no match = good
    }
  }
})
```

**Bob's approval flow:**
1. Run full gate → if FAIL: create/update KS-XXX ticket, assign back to George, comment with failure output
2. If PASS: update ticket status to "Needs Matt's Review", send Telegram summary to Matt

**Bob's PR verification checklist (added to ticket before reassigning to Matt):**
```
✅ tsc passes
✅ build passes
✅ Prisma schema valid, no pending migrations
✅ ESLint clean
✅ npm audit: no high/critical
✅ API route coverage: new routes use apiHandler/withRequireAuth
✅ Secret pattern scan: clean
📸 Manual test: [Bob describes what he verified manually or via automated test]
⚠️ Risk flags: [any concerns, or "none"]
```

### Layer 3: Production Monitoring (Automated)

**What we have:** `lib/error-log.ts` writes to `ErrorLog` table. `lib/api-handler.ts` wraps routes. `GET /api/error-log` (admin-only) exposes them.

**What to add:**

**A. Client-side ErrorBoundary → ErrorLog**
Upgrade `app/(dashboard)/error.tsx` to report client errors:
```tsx
'use client'
import { useEffect } from 'react'
import { Button } from '@/components/ui/button'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Report to server ErrorLog
    fetch('/api/error-log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: error.message || 'Client-side render error',
        stack: error.stack,
        path: typeof window !== 'undefined' ? window.location.pathname : undefined,
        code: 'CLIENT_ERROR_BOUNDARY',
      }),
    }).catch(() => {}) // never throw from error boundary
  }, [error])

  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4 p-8">
      <h2 className="text-xl font-semibold">Something went wrong</h2>
      <p className="text-muted-foreground text-sm max-w-md text-center">
        This error has been automatically reported. Try refreshing or tapping below.
      </p>
      <Button onClick={reset}>Try again</Button>
    </div>
  )
}
```

**B. Bob's automated error spike detection (add to existing 8am cron)**

```js
// Part of Bob's daily cron — runs after pre-deploy checks
async function checkProductionErrors() {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  const res = await fetch(`${BASE_URL}/api/error-log?from=${since}&limit=200`, {
    headers: { Cookie: `next-auth.session-token=${ADMIN_SESSION_TOKEN}` }
  })
  const { entries } = await res.json()
  
  // Group by path
  const byPath = {}
  for (const e of entries) {
    const key = `${e.method || 'GET'} ${e.path || 'unknown'}`
    byPath[key] = (byPath[key] || [])
    byPath[key].push(e)
  }
  
  const spikes = Object.entries(byPath)
    .filter(([, errs]) => errs.length >= 3)
    .sort((a, b) => b[1].length - a[1].length)
  
  if (spikes.length > 0) {
    for (const [path, errs] of spikes) {
      // Create KS-XXX ticket
      const title = `PROD ERROR SPIKE: ${path} (${errs.length}x in 24h)`
      const body = [
        `**Path:** ${path}`,
        `**Count:** ${errs.length} errors in last 24 hours`,
        `**First seen:** ${errs[errs.length-1].createdAt}`,
        `**Sample error:** ${errs[0].message}`,
        `**Affected users:** ${[...new Set(errs.map(e => e.userEmail).filter(Boolean))].join(', ') || 'unknown'}`,
        '',
        '**Top stack trace:**',
        '```',
        errs[0].stack?.split('\n').slice(0, 8).join('\n') || '(no stack)',
        '```',
      ].join('\n')
      
      await createTicket({ title, body, priority: errs.length >= 10 ? 'Critical' : 'High' })
    }
  }
  
  return { spikeCount: spikes.length, totalErrors: entries.length }
}
```

**C. `/api/admin/error-summary` endpoint** (George builds this — ~30 min)
```
GET /api/admin/error-summary?hours=24
Returns: { totalErrors, byPath: [{ path, count, lastSeen, sample }], byUser: [...] }
```
Used by Bob's cron and surfaced in the admin settings ErrorLogSection.

**D. Render health check**
`GET /api/ping` already exists (returns `{ ok, pong }`). Ensure Render's health check interval is set to ≤60 seconds in `render.yaml`. If the service goes unhealthy, Render pages via email/Slack already — verify this is configured.

### Layer 4: User Feedback Loop (Jarvis triage)

**What we have:** `POST /api/feedback` → `UserFeedback` table. Feedback is collected but not triaged.

**What to add:**

**A. Bob's daily feedback sweep (add to 8am cron)**
```js
async function triageFeedback() {
  // Query unreviewed UserFeedback entries (need a 'reviewed' boolean column)
  // GET /api/admin/feedback?reviewed=false (George adds this endpoint — 20 min)
  const { items } = await fetch(`${BASE_URL}/api/admin/feedback?reviewed=false`).then(r => r.json())
  
  for (const item of items) {
    // Simple keyword-based triage
    const msg = item.message.toLowerCase()
    let category = 'General Feedback'
    let priority = 'Low'
    
    if (/crash|broken|error|doesn't work|not working|bug/i.test(msg)) {
      category = 'Bug Report'; priority = 'High'
    } else if (/slow|loading|performance|lag/i.test(msg)) {
      category = 'Performance'; priority = 'Medium'
    } else if (/feature|wish|would be great|add|support/i.test(msg)) {
      category = 'Feature Request'; priority = 'Low'
    } else if (/cancel|refund|billing|subscription/i.test(msg)) {
      category = 'Billing'; priority = 'High'
    }
    
    // Create ticket
    await createTicket({
      title: `USER FEEDBACK [${category}]: "${item.message.slice(0, 60)}..."`,
      body: `**User:** ${item.userEmail || 'anonymous'}\n**Date:** ${item.createdAt}\n**Category:** ${category}\n\n${item.message}`,
      priority,
    })
    
    // Mark as reviewed
    await markFeedbackReviewed(item.id)
  }
  
  return { triaged: items.length }
}
```

**B. In-app feedback prompt trigger**
Add a subtle feedback prompt after major actions (sport season creation, first calendar sync, etc.) — but NOT as a modal. A floating "How's this working?" chip that dismisses permanently. Goal: 3-5% of beta users leave feedback per week.

**C. Feedback → roadmap signal**
Jarvis reviews the week's KS-XXX [Feature Request] tickets every Friday and includes a one-line "top user asks this week" in the weekly summary. No formal process needed at this stage — just awareness.

### Layer 5: Matt's Review Interface

**Matt's single daily touchpoint: a Telegram message at 8:05am CDT**

Bob sends this after the cron finishes:

```
🔍 KinSync Daily Report — [Day, Date]

BUILD STATUS
✅ All systems green / ⚠️ Issues detected (see below)

PRODUCTION (last 24h)
• Errors: 0 new spikes / ⚠️ 1 spike: [path] (N errors)
• Render: healthy

OPEN PRs AWAITING YOUR REVIEW
• KS-012: [Feature name] — George | Bob: ✅ APPROVED
  → [link to PR] | Risk: Low | "What was built: [1 sentence]"

USER FEEDBACK
• 2 new items triaged → 1 bug ticket created (KS-013), 1 feature request logged

ACTION NEEDED FROM MATT
1. ✅ Merge or ❌ reject KS-012 PR
```

**Matt's exact decision points:**

| Event | Matt's action | Time cost |
|-------|---------------|-----------|
| Bob sends daily report | Read it, decide on open PRs | 2-5 min |
| PR: looks good | Merge PR on GitHub (1 click) | 30 sec |
| PR: concerns | Reply to Telegram with question, Jarvis relays to George | 2 min |
| Production error spike | Read ticket Bob created, decide: hotfix now or can wait? | 5 min |
| User feedback weekly summary | Read top themes, decide if any change roadmap priority | 5 min |

**Matt's explicit NOT-TO-DO list:**
- ❌ Do not run `npm run pre-push` — that's George's job
- ❌ Do not look at the ErrorLog admin panel — Bob summarizes it for you
- ❌ Do not triage raw user feedback — Bob categorizes it and only bubbles up bugs
- ❌ Do not review code for correctness — Bob's gate handles that; your job is product decisions
- ❌ Do not write GitHub Actions yml — that's Forge's ticket (KS-014 below)

---

## Implementation Roadmap

### Phase 1: Right Now (Pre-Beta Launch) — ~3-4 hours of George/Bob time

| Task | Owner | Time | Ticket |
|------|-------|------|--------|
| Add `npm audit` step to `pre-push-check.js` | George | 30 min | KS-014a |
| Re-enable ESLint in `pre-push-check.js` + fix any lint errors | George | 1 hr | KS-014b |
| Fix `BriefingCard` DOMPurify (open SECURITY_SCAN.md finding) | George | 15 min | KS-014c |
| Upgrade `app/(dashboard)/error.tsx` to post to ErrorLog | George | 30 min | KS-014d |
| Bob audits all `app/api/**/route.ts` for `apiHandler`/`withRequireAuth` coverage | Bob | 1 hr | KS-014e |
| Add `GET /api/admin/feedback?reviewed=false` + `reviewed` column to UserFeedback | George | 30 min | KS-014f |
| Add feedback triage to Bob's daily cron | Bob | 1 hr | KS-014g |
| Add error spike detection to Bob's daily cron | Bob | 1 hr | KS-014h |
| Bob sends daily Telegram summary after 8am cron | Bob | 30 min | KS-014i |

### Phase 2: First Week Post-Launch

| Task | Owner | Time | Notes |
|------|-------|------|-------|
| GitHub Actions CI workflow (`.github/workflows/ci.yml`) | George | 1 hr | Makes pre-push gate mandatory, not optional |
| `GET /api/admin/error-summary` endpoint | George | 30 min | Used by Bob's cron, surfaces in admin UI |
| Bob's bob-predeploy-gate.js additions (API coverage + secret scan) | Bob | 1 hr | |
| Render health check configuration verify | Bob | 15 min | Confirm alerts are routed to Matt |

### Phase 3: Post-Beta (50+ Users)

| Task | Owner | Notes |
|------|-------|-------|
| Vitest unit tests for `tax-calc.service.ts`, `rotation-calc.ts`, `sport-event-result.ts` | Bob/George | High-value calculation functions only |
| Plaid webhook signature verification | George | SECURITY_SCAN open finding |
| Performance monitoring (add response time logging to `apiHandler()`) | George | Add `Date.now()` diff, log to console if >2000ms |
| Evaluate Sentry if ErrorLog volume makes Bob's cron unreliable | Jarvis | Only if needed |
| In-app feedback prompt at key moments (post-action prompts) | George | Drives feedback volume |

---

## What Matt Does (and doesn't do)

### Daily (2-5 minutes)
- **Read Bob's 8:05am Telegram report** — scan for action items
- **Merge or reject open PRs** — GitHub mobile app, one tap

### As-needed (rare)
- **Production error spike response** — decide hotfix priority when Bob escalates
- **Feature request priority shift** — if user feedback reveals something important is broken or missing in the roadmap

### Weekly (5 minutes)
- **Weekly quality summary from Jarvis** — top user asks, error trends, what shipped

### What Matt explicitly never does:
- Run any command in the terminal
- Review the raw ErrorLog admin panel
- Read unfiltered user feedback
- Approve or deny individual lint/test results
- Write tests
- File tickets (all tickets come from Bob's automation or Jarvis's triage)

The system is designed so Matt's only real decision is: **"Did George build the right thing?"** — not "Did George build it correctly?" Bob owns the latter.
