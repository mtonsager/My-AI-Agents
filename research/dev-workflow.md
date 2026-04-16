# KinSync Dev Workflow
### Documented by Jarvis — March 2026

---

## The Pipeline

```
Backlog → In Progress → Testing → Ready for Review → Done
(George)   (George)      (Bob)        (Matt)         (Matt)
```

## Branch Strategy (KinSync)

```
main          ← source of truth (Matt manages)
  ↑ merge when stable
deploy        ← triggers Render auto-deploy (Matt manages)
  ↑ merge when PreDeploy is stable
PreDeploy     ← staging area, features accumulate here
  ↑ PR from feature branch (George opens, Bob tests)
feature/KS-042  ← George's work branch
```

**Branch protection:** `main`, `deploy`, and `PreDeploy` are protected — no direct pushes. All changes via PR.

**Task IDs:**
- `MIS-001` = Mission Control task
- `KS-001` = KinSync task
- Branch name matches task ID: `feature/KS-042`

---

## George's Protocol (Picking Up a Task)

George always works the **highest priority** Backlog task first (lowest priority number = most urgent). Matt sets priority via drag-and-drop in Mission Control.

When George picks up a task (always the highest priority — lowest priority number first):

**Note the task ID** — it's shown on the card (e.g. `KS-042`). The feature branch name must match: `feature/KS-042`.

1. **If it's a Bug task — verify the bug still exists FIRST**
   - Reproduce the exact error described in the task
   - Check the KinSync ErrorLog: `node C:\Users\Matt\.openclaw\workspace\scripts\kinsync-analyze.js`
   - Check if a recent deploy or migration may have already fixed it
   - If the bug is **gone**: move task to Done, add note "Verified fixed — no longer reproducible as of [date]"
   - If the bug **still exists**: continue to step 2

2. **Move task to In Progress**
   ```
   node mc-task.js update <id> InProgress
   ```

3. **Cut a feature branch from `deploy` — named after the task ID**
   ```bash
   git checkout deploy
   git pull origin deploy
   git checkout -b feature/KS-042   # use the actual task shortId
   ```
   ⚠️ NEVER branch from `main`. NEVER push directly to `deploy`, `PreDeploy`, or `main`.

3. **Do the work.** Follow the task description exactly.

4. **Run local tests before pushing**
   ```bash
   cd C:\Users\Matt\mission-control
   npm run test:unit      # Vitest — must pass
   npm test               # Playwright — must pass (dev server must be running)
   ```

5. **Open a PR** — from `feature/KS-042` → **`PreDeploy`** (NOT deploy directly). PR description must include:
   - Task ID (e.g. KS-042) in the title
   - What changed
   - How to test it
   - Any DB migrations run

6. **Add the PR link to the task** — edit the task in Mission Control, paste PR URL into "Repo URL" field. A copy button appears on the card so Matt/Bob can grab it instantly.

7. **Move task to Testing, reassign to Bob**
   ```
   node mc-task.js update <id> Testing
   node mc-task.js agent-status George Active
   ```

---

## Bob's Protocol (Testing a Task)

When Bob sees a task in **Testing**:

1. **Check for a PR link** in the task's Repo URL field. Review the PR diff first.

2. **Run schema check** (KinSync tasks only)
   ```bash
   cd C:\Users\Matt\family-coordinator
   npx prisma migrate status
   ```
   If any migrations are pending — STOP. Create a bug task for George and leave the original in Testing.

3. **Run the full test suite**
   ```bash
   cd C:\Users\Matt\mission-control
   npm run test:unit    # Vitest unit + API tests
   npm test             # Playwright E2E (dev server must be running on port 3000)
   ```

4. **Parse results**
   - All pass → move to next step
   - Any fail → create a bug sub-task, assign to George, leave original in Testing

5. **If everything passes:**
   - Update the original task description with test summary: "✅ All tests passed — [date]"
   - Move task to **Ready for Review**
   - Reassign to **Matt**
   ```
   node mc-task.js update <id> ReadyForReview
   ```

6. **Message Jarvis** with a summary so Jarvis can notify Matt.

---

## Matt's Protocol (Review)

When Matt sees a task in **Ready for Review**:

1. Open the PR link from the task's Repo URL
2. Review the code on GitHub
3. If approved → merge PR into `deploy`
4. Move task to **Done** in Mission Control

---

## Matt's Release Protocol (PreDeploy → Deploy)

When a batch of features is ready and tested in PreDeploy:

1. Open a PR on GitHub: `PreDeploy` → `deploy`
2. Review the combined diff
3. Merge → Render auto-deploys to production
4. Merge `deploy` → `main` to keep main current

---

## Bug Sub-Tasks (Bob creates these)

When Bob finds a test failure, he creates a new task:
- **Title:** `Bug: <what failed> [from task #<original-id>]`
- **Description:** Full error message + stack trace + which test failed
- **Assigned to:** George
- **Status:** Backlog
- **Doc URL:** Link to the original failing task if relevant

The original task stays in **Testing** until all bug sub-tasks are resolved and tests pass.

---

## Branch Rules (Non-Negotiable)

| Action | Allowed |
|--------|---------|
| Branch from `deploy` | ✅ |
| PR to `deploy` | ✅ |
| Branch from `main` | ❌ |
| Direct push to `deploy` | ❌ |
| Direct push to `main` | ❌ |
| PR to `main` | ❌ (only deploy → main, done by Matt) |

---

## Quick Reference — mc-task.js commands

```bash
# Create a task
node mc-task.js create "Title" "Description" "AgentName"

# Move a task
node mc-task.js update <id> Backlog
node mc-task.js update <id> InProgress
node mc-task.js update <id> Testing
node mc-task.js update <id> ReadyForReview
node mc-task.js update <id> Done

# Set agent status
node mc-task.js agent-status George Working
node mc-task.js agent-status George Active
node mc-task.js agent-status Bob Working
node mc-task.js agent-status Bob Active

# List all tasks
node mc-task.js list
```

All commands run from: `C:\Users\Matt\.openclaw\workspace\scripts\`
