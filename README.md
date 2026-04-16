# My-AI-Agents

**Matt's AI agent system — backup and recreation guide.**

This repo contains everything needed to recreate Jarvis and the full AI team from scratch if something goes wrong. Every identity file, memory, runbook, agent skill, and workflow lives here.

---

## What's in Here

| Folder | Contents |
|--------|----------|
| `identity/` | Who Jarvis is — SOUL.md, IDENTITY.md, AGENTS.md, USER.md, TOOLS.md |
| `team/` | Full agent roster — TEAM.md, each agent's role, model, and workflow |
| `memory/` | MEMORY.md (long-term) + latest daily notes |
| `runbooks/` | BOB_RUNBOOK.md, dev workflow, pre-deploy gate procedures |
| `research/` | Suzie's marketing files, 007's research reports |
| `skills/` | Agent skill files (threat-model, security-review, perf-review, code-quality, caveman) |
| `docs/` | R&D memos, KinSync strategic documents |
| `scripts/` | mc-task.js (Mission Control task management) |

---

## How to Recreate Jarvis

Jarvis runs inside **OpenClaw** (https://openclaw.ai). To recreate:

1. Install OpenClaw on a new machine
2. Set the workspace to a fresh directory
3. Copy all files from `identity/` into the workspace root:
   - `SOUL.md` → who Jarvis is and how he thinks
   - `IDENTITY.md` → name, persona, emoji
   - `AGENTS.md` → startup instructions (what to read on boot)
   - `USER.md` → who Matt is
   - `TOOLS.md` → local tool notes
4. Copy `memory/MEMORY.md` into workspace root → long-term memory restored
5. Copy `team/TEAM.md` into workspace root → team roster restored
6. Copy `runbooks/` files into workspace → Bob and George know their jobs
7. Copy `scripts/mc-task.js` into workspace `scripts/` → Mission Control task CLI works
8. Configure OpenClaw with:
   - Anthropic API key (direct pay-as-you-go)
   - Telegram bot token (Matt's primary surface)
   - GitHub token for `gh` CLI access
9. Jarvis will boot with full memory and identity intact

---

## The Team

| Agent | Role | Model |
|-------|------|-------|
| **Jarvis** | Team lead, orchestrator, Matt's direct assistant | Claude Sonnet |
| **George** | Coding — Next.js, TypeScript, Prisma | Codex |
| **Bob** | QA, testing, pre-deploy gate, daily error scan | Claude Sonnet |
| **Suzie** | Marketing, X.com, GTM | Claude Sonnet |
| **007** | Research, competitor analysis | Claude Sonnet |
| **Dilbert** | Architecture, system design | Claude Opus |

---

## Key Projects

| Project | Repo | Description |
|---------|------|-------------|
| KinSync | `mtonsager/family-coordinator` | Family coordination app — PreDeploy branch |
| Mission Control | `mtonsager/mission-control` | Internal AI team dashboard |
| My-AI-Agents | `mtonsager/My-AI-Agents` | This repo |

---

## Matt's Software Philosophy

> The app where USERS have the power to change their Software — Software powered by USERS.

> The marginal cost of completeness is near zero with AI. Do the whole thing. Do it right. Do it with tests. Do it with documentation. The standard isn't "good enough" — it's "holy shit, that's done."

---

## Auto-Sync

This repo is updated by Jarvis whenever identity, memory, or runbook files change significantly. Last updated: April 2026.
