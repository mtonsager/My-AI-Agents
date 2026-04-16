# MEMORY.md - Jarvis Long-Term Memory

## Identity
- Name: Jarvis (named after the iconic AI butler)

## Matt
- Christian, husband (Sarah), father: Luke 17, Logan 16, Kenzie 13
- Software engineer (9-5), entrepreneur, hunter, Minnesota
- Telegram ID: 6011018856

## KinSync LLC
- Family coordination app — KinSyncApp.com
- Pre-launch, targeting sports families (2 parents, 3 kids in organized sports)
- Stack: Next.js, PostgreSQL, Prisma, NextAuth, Tailwind, Render.com
- Repo: `C:\Users\Matt\family-coordinator` (GitHub: mtonsager/family-coordinator)
- Branch rules: feature/* → PreDeploy → deploy (triggers Render) → main
- Pre-push check: `npm run pre-push`

## Mission Control
- Internal AI team dashboard — `C:\Users\Matt\mission-control` (GitHub: mtonsager/mission-control)
- Task IDs: MIS-001 (Mission Control), KS-001 (KinSync)
- Script: `C:\Users\Matt\.openclaw\workspace\scripts\mc-task.js`
- Workflow: Backlog → InProgress (George) → Testing (Bob) → ReadyForReview (Matt) → Done
- **KinSync bugs/tasks MUST use project "KS" prefix** — pass "KS" as 4th arg to mc-task.js create: `node mc-task.js create "Title" "Desc" "Agent" "KS"`
- MIS- prefix is for Mission Control internal tasks only

## Caveman Mode
- Installed via `npx skills add JuliusBrussee/caveman` in KinSync repo
- Symlinked to both OpenClaw (Jarvis) and Codex (George)
- Levels: lite / full (default) / ultra

### Jarvis (me)
- **Status: ON (full)**
- To enable: "turn on caveman mode" or "caveman on" → I switch to terse caveman responses
- To disable: "turn off caveman mode" or "caveman off" / "normal mode"

### George (Codex)
- **Status: ON (full)**
- To enable: "turn on caveman for George" → Jarvis prepends `$caveman` to George's prompts
- To disable: "turn off caveman for George"

Both can be toggled independently. Specify level e.g. "caveman lite for George".

## The Team
- Jarvis = me (team lead)
- George = coding (Sonnet)
- Dilbert = architecture (Opus)
- Suzie = marketing (Sonnet)
- 007 = research (Sonnet)
- Bob = tester (Sonnet) — daily cron 8am CDT scans KinSync errors + testing queue

## Bob: Pre-Deploy Gate (KinSync)
- Trigger: Matt says "test PreDeploy for task KS-XXX" (manual, after merging feature/* → PreDeploy)
- Script: `C:\Users\Matt\.openclaw\workspace\scripts\kinsync-predeploy-test.js [taskId]`
- Runs: existing `pre-push-check.js` (Prisma validate, migrate status, tsc, build)
- Pass → Bob moves task to ReadyForReview, assigns to Matt → Matt merges PreDeploy → deploy
- Fail → Bob creates ticket for George, reassigns task to George

## KinSync Task Workflow
feature/* (George) → George finishes → opens PR (feature/* → PreDeploy) → reassigns to Matt, keeps InProgress → Matt reviews PR + merges to PreDeploy → "Bob, test PreDeploy for KS-XXX" → Pass: ReadyForReview (Matt) → merge to deploy → Render builds → main

### George's Required Steps When Finishing a Task
1. Branch from PreDeploy: `git checkout PreDeploy && git pull && git checkout -b feature/KS-XXX-slug`
2. Do all work on that branch
3. Commit everything to the feature branch
4. Push and open a PR: feature/KS-XXX → PreDeploy (on GitHub)
5. Reassign ticket to Matt via mc-task.js, keep status InProgress
6. George's agent status → Active (not working)

### Rules
- George NEVER commits directly to PreDeploy
- George NEVER leaves files uncommitted/unstaged
- George always opens the PR before reassigning the ticket
- Ticket stays InProgress when handed to Matt (not Testing, not ReadyForReview)
- Bob daily cron flags InProgress+Matt tasks as "awaiting your review"

## Branching Convention (updated 2026-03-24)
- George branches from `PreDeploy` (not main) — gets Matt's latest integrated code
- George merges feature/* back to `PreDeploy` when done
- George must merge/rebase from PreDeploy into his feature branch before opening a PR (especially on longer tasks)
- George never commits directly to PreDeploy
- Matt is also actively coding alongside George

## R&D Think Tank
- Weekly AI team: Atlas (product), Nova (revenue), Prism (UX), Forge (tech), Echo (competitive intel)
- 5 agents ideate → debate → synthesize into a memo for Matt
- Schedule: Sundays 9pm CDT | Output: `rd-team/memos/YYYY-MM-DD.md`
- Cron ID: `fe93791f-ca37-40e0-b0c7-faeb88a4fc6f` | **Status: DISABLED**
- Dashboard: `rd-team/DASHBOARD.md` | Runbook: `rd-team/RUNBOOK.md`
- To enable: "enable R&D team" | To trigger now: "run R&D team now"
- **CODE ACCESS (2026-03-24):** On every run, agents must read the KinSync codebase at `C:\Users\Matt\family-coordinator` before ideating — so suggestions are grounded in what's actually built, not assumptions.

## KinSync Hosting / DNS
- Hosted on Render (free tier) at `kinsync.onrender.com`
- Custom domain: `kinsyncapp.com` via Namecheap — using **BasicDNS** (not cPanel hosting DNS)
- **Known issue:** Namecheap can silently switch DNS to cPanel hosting DNS (e.g. when a hosting trial activates), pointing domain to `198.54.117.242` (Namecheap parking IP) instead of Render
- **Symptom:** `ERR_CONNECTION_REFUSED` on kinsyncapp.com, `kinsync.onrender.com` still works
- **Fix:** Namecheap → Domain → Advanced DNS → Change DNS Type → switch back to **BasicDNS** → instantly resolves
- DB: Neon PostgreSQL — use **pooled connection string** in Render `DATABASE_URL` (not direct) to avoid Prisma idle connection drops

## KinSync Strategic North Star (2026-03-29)
- **Moat = coordination, not discovery.** Google/Yelp own discovery. Nobody owns "help our family decide and coordinate."
- Sports families = highest coordination-density segment. Sports Family angle and coordination angle are the same thing.
- The engine is already built: 11 pattern detectors, /decide page, logistics layer (DriverAvailability, PickupAssignment, prepTimeMinutes)
- **The gap:** detection doesn't close into resolution. Build: FamilyDecision + FamilyDecisionResponse models + escalation service
- **Stop building:** discovery features (Navigator, SavedDiscoveryPrompt, vacation discovery) — that's drift
- Competitive window: ~12 months before Cozi/TeamSnap could replicate

## Matt's Software Philosophy
**The app where USERS have the power to change their Software — Software powered by USERS.**

This is the north star for how Matt thinks about building. Not software that does things *to* users — software that users *shape*. The product evolves because the people using it have real power over it. Features, priorities, behaviors — driven by the people living inside the app, not handed down from on high. Keep this in mind when designing anything for KinSync or future ventures.

## Goals
- Launch KinSync, get beta testers via X.com starting week of Mar 23 2026
- Sports Family positioning — nobody owns this lane
- Pricing: free (no ads) + $59/yr family plan; beta → $39/yr for life

## First Session
- 2026-03-18: First contact. Matt named me Jarvis.
