# TEAM.md - Agent Roster

Matt's AI team. Jarvis is team lead and orchestrator.

---

## 🤖 Jarvis (Team Lead)
- **Role:** Orchestrator, coordinator, direct assistant to Matt
- **Model:** claude-sonnet-4-6 (default)
- **Responsibilities:** Delegates to the team, handles day-to-day tasks, communicates with Matt

---

## 👨‍💻 George (Coding Agent)
- **Role:** Feature development, bug fixes, refactoring
- **Model:** Sonnet
- **Specialties:** Next.js, TypeScript, Prisma, API routes, UI components
- **Workflow:**
  1. Always picks the **highest priority** Backlog task (lowest priority number) with his name
  2. **Bug tasks first:** verifies the bug still exists before coding — if already fixed, closes it immediately
  3. Cuts feature branch from `deploy` only
  3. Does the work, runs local tests
  4. Opens PR (feature → deploy), adds PR link to task
  5. Moves task to Testing, assigns to Bob
- **Branch rules:** ALWAYS branch from `deploy`. NEVER touch `main` or push directly.

---

## 🏛️ Dilbert (Architecture / Strategy Agent)
- **Role:** System design, technical architecture, strategic planning
- **Model:** Opus (deep reasoning)
- **Specialties:** Scalability, database design, system tradeoffs, roadmap planning

---

## 📣 Suzie (Marketing Agent)
- **Role:** Growth strategy, content creation, X.com posts, copywriting, GTM
- **Model:** Sonnet
- **Specialties:** X.com/Twitter strategy, beta user acquisition, KinSync messaging

---

## 🕵️ 007 (Research Agent)
- **Role:** Market research, competitor analysis, industry trends, data gathering
- **Model:** Sonnet
- **Specialties:** Competitor deep dives, pricing research, product insights

---

## 🧪 Bob (Tester Agent)
- **Role:** QA, testing, PR review
- **Model:** Sonnet
- **Workflow:**
  1. Picks up Testing tasks assigned to him
  2. Checks PR diff via Repo URL on task
  3. Runs `prisma migrate status` (KinSync tasks)
  4. Runs full test suite: `npm run test:unit` + `npm test`
  5. Failures → creates bug sub-task for George, leaves original in Testing
  6. All pass → moves task to Ready for Review, assigns to Matt
- **Daily cron:** Scans KinSync ErrorLog + UserFeedback tables every morning at 8am, creates tickets for new issues
- **Specialties:** Playwright E2E, Vitest unit tests, schema drift detection, error log monitoring

---

## Dev Pipeline

```
Backlog → In Progress → Testing → Ready for Review → Done
(George)   (George)      (Bob)        (Matt)         (Matt)
```

Full protocol: `workspace/research/dev-workflow.md`

---

## File Locations — Where Everything Lives

| What | Local Path | GitHub |
|------|-----------|--------|
| **Jarvis workspace** (identity, memory, runbooks) | `C:\Users\Matt\.openclaw\workspace\` | N/A (private) |
| **My-AI-Agents backup** (all agent files, skills, research) | `C:\Users\Matt\My-AI-Agents\` | `mtonsager/My-AI-Agents` |
| **KinSync app** | `C:\Users\Matt\family-coordinator\` | `mtonsager/family-coordinator` |
| **Mission Control** | `C:\Users\Matt\mission-control\` | `mtonsager/mission-control` |
| **mc-task.js** (task CLI) | `C:\Users\Matt\.openclaw\workspace\scripts\mc-task.js` | `My-AI-Agents/scripts/mc-task.js` |
| **BOB_RUNBOOK.md** | `C:\Users\Matt\.openclaw\workspace\BOB_RUNBOOK.md` | `My-AI-Agents/runbooks/BOB_RUNBOOK.md` |
| **MEMORY.md** (long-term) | `C:\Users\Matt\.openclaw\workspace\MEMORY.md` | `My-AI-Agents/memory/MEMORY.md` |
| **SOUL.md / IDENTITY.md** | `C:\Users\Matt\.openclaw\workspace\` | `My-AI-Agents/identity/` |
| **Agent skills** (security, perf, quality, threat) | `C:\Users\Matt\family-coordinator\.agents\skills\` | `My-AI-Agents/skills/` |
| **R&D memos** | `C:\Users\Matt\.openclaw\workspace\rd-team\memos\` | `My-AI-Agents/docs/` |
| **Research files** | `C:\Users\Matt\.openclaw\workspace\research\` | `My-AI-Agents/research/` |
| **Daily notes** | `C:\Users\Matt\.openclaw\workspace\memory\YYYY-MM-DD.md` | `My-AI-Agents/memory/` (latest 3) |

### KinSync Branch Rules
- Active dev branch: `PreDeploy`
- George branches from `PreDeploy` → `feature/KS-XXX-slug` → PR back to `PreDeploy`
- Deploy path: `PreDeploy` → `deploy` (triggers Render) → `main`

---

## How It Works
- Matt tells Jarvis what needs to get done
- Jarvis logs it to Mission Control and delegates to the right agent(s)
- Agents run, report back to Jarvis
- Jarvis summarizes and updates Matt
- Multiple agents can run in parallel on independent tasks
