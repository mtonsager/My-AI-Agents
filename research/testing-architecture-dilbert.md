# KinSync Testing Architecture
### Authored by Dilbert — Architecture & Strategy Agent
**Date:** March 2026  
**For:** Matt / KinSync LLC  
**Status:** Implementation-ready — hand this to George

---

## 1. Testing Philosophy

### What We're Optimizing For

**Reliability over coverage.** A passing test suite that catches real regressions is worth more than 90% coverage that doesn't catch the bug that took the app down. We're not chasing numbers — we're building confidence.

**Speed of feedback.** Tests that take 10 minutes to run don't get run. Every local test pass should complete in under 60 seconds. E2E suite under 3 minutes. If tests are slow, developers skip them.

**Catching production failures before users do.** The ErrorLog in KinSync is our shame ledger — every entry there is a failure we should have caught in testing. The `ShareCarpoolEntry.sportEventId` bug is the canonical example: a schema drift that a 30-second test would have caught.

**Protecting the critical path.** Auth, family creation, calendar CRUD, and the carpool flow are the features users depend on daily. These get the deepest test coverage. The pixel art office page does not.

### What We're NOT Doing

- **No 100% line coverage targets.** Coverage is a vanity metric. We test behavior, not lines.
- **No mocking everything.** Over-mocked tests give false confidence. We use real DB for integration tests.
- **No testing every UI state.** Playwright is expensive to write and maintain. We use it for critical user journeys, not every button click.
- **No test-driven development (yet).** George is implementing, not authoring. Tests follow features until the codebase is stable enough to lead with tests.
- **No separate test environment per developer.** SQLite for Mission Control, a shared test PostgreSQL schema for KinSync. Keep it simple.

---

## 2. Tool Decisions + Rationale

### Playwright for E2E

**Why Playwright over Cypress:**
- First-class TypeScript support without configuration gymnastics
- Runs in the same process as Node — better for Next.js App Router
- Parallel test execution out of the box (Cypress requires paid Cloud)
- Built-in network interception — critical for mocking NextAuth session state
- `page.waitForURL()` and auto-waiting are more reliable than Cypress's implicit retry logic

**Version:** `@playwright/test` v1.42+ (current stable as of March 2026)

**Config approach:**
- Two separate Playwright configs: one for Mission Control, one for KinSync
- KinSync config includes `globalSetup` that authenticates a test user and stores session cookie
- Both configs use `baseURL` pointing at `http://localhost:3000`
- Screenshot on failure always enabled
- Video recording on failure only (keep CI artifacts lean)
- `testIdAttribute: 'data-testid'` — George adds `data-testid` attributes to key elements as he writes tests

```ts
// playwright.config.ts (KinSync)
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false, // KinSync shares DB state — don't run in parallel until isolated
  reporter: [['json', { outputFile: 'test-results/results.json' }], ['html']],
  use: {
    baseURL: 'http://localhost:3000',
    storageState: 'tests/.auth/user.json', // saved after globalSetup login
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
});
```

### Vitest for Unit + API Tests

**Why Vitest over Jest:**
- Native ESM support — no transform configuration nightmare with Next.js
- 10-40x faster than Jest in watch mode (Vite's module graph)
- Zero config with `vite.config.ts` already present in the project
- `vi.mock()` has better ergonomics than `jest.mock()`
- Same API as Jest — George's existing Jest knowledge transfers directly

**What Vitest covers:**
- API route handlers (request/response logic)
- Utility functions (date formatting, schedule parsing, validation)
- Prisma query logic (with test DB, not mocked)
- Business logic extracted from components

### Prisma Validate for Schema Drift

**The problem it solves:** The `ShareCarpoolEntry.sportEventId` bug. If a column exists in `schema.prisma` but hasn't been migrated to the actual DB, `prisma validate` won't catch it — but `prisma migrate status` will. We run both.

**Command:**
```bash
npx prisma migrate status
```

This exits non-zero if there are pending migrations. Bob runs this daily. If it fails, it creates a ticket immediately — before any other tests run.

**Additional tool:** `prisma db pull` diff against current schema in CI to detect drift between production DB and committed schema.

### Additional Tools Worth Adding

**`@testing-library/react` + `@vitejs/plugin-react`** — For component unit tests where behavior (not rendering) matters. Test form validation, state logic. Don't test "does this div have class X."

**`msw` (Mock Service Worker)** — For mocking external API calls in Vitest (Stripe webhooks, Google Calendar, etc.). Do NOT use for Playwright — use real API routes with test data instead.

**`tsx`** — For running TypeScript scripts directly (the ticket-creation script, test report parser). Already likely available in the monorepo.

**`zod`** — Already in use (likely). Add `schema.parse()` assertions in API tests to verify response shape, not just status code.

---

## 3. Mission Control Test Suite

Mission Control is a local tool with no auth. Tests should be fast. Playwright for smoke + feature tests, Vitest for API routes.

### Smoke Tests (Playwright)
*Goal: Every page loads without a console error or uncaught exception.*

```
✓ Dashboard page loads at / with status 200
✓ Tasks page loads at /tasks without JS errors
✓ Activity Log page loads at /activity without JS errors
✓ Office page loads at /office without JS errors
✓ Products page loads at /products without JS errors
✓ Docs page loads at /docs without JS errors
✓ Memory page loads at /memory without JS errors
✓ Calendar page loads at /calendar without JS errors
✓ System page loads at /system without JS errors
✓ Projects page loads at /projects without JS errors
✓ Research page loads at /research without JS errors
✓ Agents page loads at /agents without JS errors
```

**Implementation pattern:**
```ts
const pages = ['/', '/tasks', '/activity', '/office', '/products', 
                '/docs', '/memory', '/calendar', '/system', '/projects'];

for (const path of pages) {
  test(`${path} loads without errors`, async ({ page }) => {
    const errors: string[] = [];
    page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
    await page.goto(path);
    await page.waitForLoadState('networkidle');
    expect(errors.filter(e => !e.includes('favicon'))).toHaveLength(0);
  });
}
```

### Feature Tests (Playwright)

**Kanban Task Board (`/tasks`):**
```
✓ Task board renders with at least one column visible
✓ "Add task" button opens the create task modal
✓ Creating a new task with title "Test Task [timestamp]" adds it to the board
✓ Task card displays title, status badge, and action menu
✓ Opening task edit modal shows title input pre-filled with existing task title
✓ Editing task title and saving updates the card on the board
✓ Deleting a task removes it from the board and does not show a 404
✓ Dragging task from column 1 to column 2 persists the column change after page reload
✓ Task drag reorder within same column persists position after page reload
```

**Products Page (`/products`):**
```
✓ Products list renders existing products
✓ Creating a new product navigates to product detail or shows new product in list
✓ Editing a product name and saving reflects the updated name
✓ Deleting a product removes it from the list
```

**Docs Page (`/docs`):**
```
✓ Docs page loads and shows document list or empty state
✓ Document list endpoint responds (linked doc count visible or empty state message)
```

**Memory Page (`/memory`):**
```
✓ Memory page loads with content area visible
✓ Memory content is editable (textarea or rich text field is interactive)
✓ Saving memory content returns without error
```

**Calendar Page (`/calendar`):**
```
✓ Calendar renders in month view by default
✓ Toggling to week view updates the calendar display
✓ Toggling to day view updates the calendar display
✓ Navigating to next month changes the displayed month header
✓ Adding an event via the calendar UI creates an entry visible on the calendar
```

**Activity Log (`/activity`):**
```
✓ Activity log page loads with a list of entries or empty state
✓ Activity entries display timestamp and message
```

**Office Page (`/office`):**
```
✓ Office pixel art canvas or container renders without JS errors
✓ Page does not throw on load (no blank white screen)
```

### API Tests (Vitest)

**`GET /api/tasks`**
```
✓ Returns 200 with array response
✓ Response contains expected fields: id, title, status, order
✓ Response is valid JSON
```

**`POST /api/tasks`**
```
✓ Creates a task with valid payload { title: "Test", status: "TODO" }
✓ Returns 201 with created task including generated id
✓ Returns 400 when title is missing
```

**`PUT /api/tasks/[id]`**
```
✓ Updates task title successfully
✓ Updates task status successfully
✓ Returns 404 for non-existent task id
```

**`DELETE /api/tasks/[id]`**
```
✓ Deletes existing task and returns 200
✓ Returns 404 for non-existent task id
```

**`POST /api/tasks/reorder`**
```
✓ Accepts array of { id, order } and persists new order
✓ Returns 200 on success
✓ Returns 400 with malformed payload
```

**`GET /api/products`**
```
✓ Returns 200 with array
✓ Response items contain id, name fields
```

**`POST /api/products`**
```
✓ Creates product with valid payload
✓ Returns 400 for missing required fields
```

**`PUT /api/products/[id]`**
```
✓ Updates product name
✓ Returns 404 for unknown id
```

**`DELETE /api/products/[id]`**
```
✓ Deletes product, returns 200
```

**`GET /api/docs`**
```
✓ Returns 200 with array (may be empty)
✓ Response is valid JSON
```

**`GET /api/docs/list`**
```
✓ Returns 200 with document list
```

**`GET /api/memory`**
```
✓ Returns 200 with memory content
✓ Response contains content field
```

**`PUT /api/memory`**
```
✓ Accepts updated content and returns 200
✓ Persisted content is returned on subsequent GET
```

**`GET /api/activity`**
```
✓ Returns 200 with array
✓ Activity entries have timestamp and message fields
```

**`GET /api/agents`**
```
✓ Returns 200
✓ Response is valid JSON array
```

**`GET /api/research`**
```
✓ Returns 200
```

**`GET /api/cron`**
```
✓ Returns 200 with cron job list
```

---

## 4. KinSync Test Suite

KinSync has auth, PostgreSQL, Stripe, and real users. Tests need a test user + test family seeded in the DB. George creates a `tests/setup/seed.ts` script that creates:
- `testuser@kinsync.test` with password `TestPass123!`
- A family named "Test Family" with 2 members
- 2 calendar events, 1 task, 1 sport season with 1 sport event

### Auth Flow (Playwright)

```
✓ Unauthenticated user visiting /calendar is redirected to /auth/signin
✓ Unauthenticated user visiting /tasks is redirected to /auth/signin
✓ Login with valid credentials (testuser@kinsync.test / TestPass123!) redirects to dashboard
✓ Login with invalid password shows error message, stays on signin page
✓ Login with unregistered email shows error message
✓ Authenticated user visiting /auth/signin is redirected to dashboard
✓ Logout via menu clears session and redirects to /auth/signin
✓ Session persists across page navigation without re-authenticating
✓ Session expires after timeout and redirects to /auth/signin (if configurable)
```

### Critical Paths (Playwright)

**Family Setup:**
```
✓ New user can create a family from onboarding flow
✓ Family name is saved and visible in family settings
✓ User can invite a family member via email (invite sent, no error)
✓ Join link/token flow: visiting share URL with valid token shows join prompt
✓ User cannot join family they're already a member of
```

**Calendar CRUD:**
```
✓ Calendar page loads and shows current month
✓ Creating an event with title, date, and time shows event on calendar
✓ Event creation with required fields missing shows validation error
✓ Clicking existing event opens event detail/edit view
✓ Editing event title and saving persists the change
✓ Deleting an event removes it from the calendar view
✓ Recurring event shows on multiple dates
✓ Events from different family members show with correct color coding
```

**Task Management:**
```
✓ Tasks page loads and shows task list or empty state
✓ Creating a task with title assigns it to current user by default
✓ Task can be assigned to another family member
✓ Marking task complete updates status
✓ Deleting a task removes it from the list
```

**Sports Hub:**
```
✓ Sport seasons list loads for the family
✓ Creating a sport season with name and sport type saves successfully
✓ Sport event can be added to an existing season
✓ Sport event list shows events for the season
✓ Deleting a sport event removes it from the season
✓ Sport links can be added to a season (URL, link type)
```

**Family Messaging:**
```
✓ Messages/announcements page loads
✓ Sending a message shows it in the message list
✓ Messages show sender name and timestamp
```

### Known Bug Regression — Carpool / Pickup Endpoint

**Context:** The ErrorLog contains entries for `ShareCarpoolEntry.sportEventId` — a column that exists in application code but was missing from the database migration. This caused 500 errors on endpoints that touch carpool/pickup data.

**Regression tests that MUST pass before any release:**

```
✓ GET /api/pickups returns 200, not 500
✓ GET /api/pickups response body is valid JSON array (not an error object)
✓ POST /api/pickups with valid payload { eventId, assigneeId, type: "PICKUP" } returns 201
✓ POST /api/pickups does NOT throw "column sportEventId does not exist" Prisma error
✓ GET /api/sports/events returns 200 for authenticated user with sport season
✓ GET /api/sports/events/[id] returns event data including all expected fields
✓ Creating a pickup assignment linked to a sport event does not 500
✓ ErrorLog table does NOT contain new entries with "sportEventId" in message after test run
```

**Implementation note for George:**
```ts
// After each carpool test, assert no new ErrorLog entries appeared
test.afterEach(async () => {
  const recentErrors = await prisma.errorLog.findMany({
    where: { 
      createdAt: { gte: testStartTime },
      message: { contains: 'sportEventId' }
    }
  });
  expect(recentErrors).toHaveLength(0);
});
```

### API Health Checks (Vitest, with authenticated HTTP client)

These run against the live dev server with a seeded test session token.

```
✓ GET /api/auth/me returns 200 with user object (not 401, not 500)
✓ GET /api/calendar returns 200 with events array
✓ GET /api/tasks returns 200 with tasks array
✓ GET /api/family returns 200 with family object including members array
✓ GET /api/messages returns 200
✓ GET /api/sports/seasons returns 200
✓ GET /api/sports/events returns 200
✓ GET /api/pickups returns 200 (carpool regression — see above)
✓ GET /api/reminders returns 200
✓ GET /api/notes returns 200
✓ GET /api/chores returns 200
✓ GET /api/settings returns 200
✓ GET /api/notifications returns 200
✓ GET /api/subscription returns 200 (not 500, even for free tier)
✓ GET /api/ping returns 200 (simple health endpoint — George should add this if missing)
✓ GET /api/error-log returns 200 (admin endpoint, verify auth guard works)
✓ POST to any route with no session returns 401 (not 500)
```

### Schema Drift Detection

```
✓ `prisma migrate status` exits 0 (no pending migrations)
✓ `prisma validate` exits 0 (schema is syntactically valid)
✓ All models in schema.prisma can be queried without "column does not exist" errors
```

**The schema health check script (`scripts/check-schema.ts`):**
```ts
import { execSync } from 'child_process';

const checks = [
  'npx prisma validate',
  'npx prisma migrate status',
];

for (const cmd of checks) {
  try {
    execSync(cmd, { stdio: 'inherit' });
    console.log(`✓ ${cmd}`);
  } catch {
    console.error(`✗ SCHEMA DRIFT DETECTED: ${cmd} failed`);
    process.exit(1);
  }
}

// Spot-check each major model with a COUNT query
import { prisma } from '../lib/prisma';
const models = ['user', 'family', 'event', 'task', 'sportSeason', 'sportEvent', 'pickupAssignment'];
for (const model of models) {
  try {
    await (prisma as any)[model].count();
    console.log(`✓ prisma.${model}.count() OK`);
  } catch (e: any) {
    console.error(`✗ prisma.${model}.count() FAILED: ${e.message}`);
    process.exit(1);
  }
}
await prisma.$disconnect();
```

---

## 5. Test Runner Setup

### npm Scripts

**Mission Control (`C:\Users\Matt\mission-control\package.json`):**
```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui",
    "test:all": "npm run test && npm run test:e2e",
    "test:report": "npm run test:all -- --reporter=json > test-results/results.json 2>&1"
  }
}
```

**KinSync (`C:\Users\Matt\family-coordinator\package.json`):**
```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "test:e2e": "playwright test",
    "test:e2e:headed": "playwright test --headed",
    "test:schema": "tsx scripts/check-schema.ts",
    "test:all": "npm run test:schema && npm run test && npm run test:e2e",
    "test:report": "npm run test:all 2>&1 | tee test-results/raw.log; node scripts/parse-results.js"
  }
}
```

### How Bob Runs Tests on a Schedule

Bob runs tests every morning at 7:00 AM Central. The cron job should:
1. Run schema check
2. Run Vitest API tests
3. Run Playwright E2E tests
4. Parse results to JSON
5. Create Mission Control tickets for failures
6. Send summary to Telegram

**Exact cron job payload Bob uses:**

```json
{
  "name": "morning-test-run",
  "schedule": "0 7 * * 1-5",
  "timezone": "America/Chicago",
  "command": "node C:\\Users\\Matt\\.openclaw\\scripts\\run-tests.js",
  "notify": "telegram:6011018856"
}
```

**`C:\Users\Matt\.openclaw\scripts\run-tests.js`** (George creates this):
```js
const { execSync, spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const MISSION_CONTROL_DIR = 'C:\\Users\\Matt\\mission-control';
const KINSYNC_DIR = 'C:\\Users\\Matt\\family-coordinator';
const RESULTS_DIR = 'C:\\Users\\Matt\\.openclaw\\test-results';
const TICKET_SCRIPT = 'C:\\Users\\Matt\\.openclaw\\scripts\\create-tickets.js';

const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const outFile = path.join(RESULTS_DIR, `run-${timestamp}.json`);

fs.mkdirSync(RESULTS_DIR, { recursive: true });

const results = {
  timestamp: new Date().toISOString(),
  suites: {}
};

// Mission Control tests
try {
  const mc = spawnSync('npm', ['run', 'test:all', '--', '--reporter=json'], {
    cwd: MISSION_CONTROL_DIR,
    env: { ...process.env },
    timeout: 120000,
    encoding: 'utf8'
  });
  results.suites.missionControl = parseVitestOutput(mc.stdout, mc.status);
} catch (e) {
  results.suites.missionControl = { error: e.message, failures: ['test runner crashed'] };
}

// KinSync schema check
try {
  execSync('npx prisma migrate status', { cwd: KINSYNC_DIR, timeout: 30000 });
  results.suites.schemaCheck = { passed: true };
} catch (e) {
  results.suites.schemaCheck = { passed: false, error: 'Schema drift detected — pending migrations exist' };
}

// KinSync tests
try {
  const ks = spawnSync('npm', ['run', 'test', '--', '--reporter=json'], {
    cwd: KINSYNC_DIR,
    env: { ...process.env, DATABASE_URL: process.env.TEST_DATABASE_URL },
    timeout: 180000,
    encoding: 'utf8'
  });
  results.suites.kinSync = parseVitestOutput(ks.stdout, ks.status);
} catch (e) {
  results.suites.kinSync = { error: e.message, failures: ['test runner crashed'] };
}

fs.writeFileSync(outFile, JSON.stringify(results, null, 2));

// Create tickets for failures
require(TICKET_SCRIPT)(results);

function parseVitestOutput(stdout, exitCode) {
  try {
    const jsonMatch = stdout.match(/\{[\s\S]*"testResults"[\s\S]*\}/);
    if (jsonMatch) return JSON.parse(jsonMatch[0]);
  } catch {}
  return { exitCode, raw: stdout?.slice(0, 2000) };
}
```

### Failure → Mission Control Ticket Creation

**`C:\Users\Matt\.openclaw\scripts\create-tickets.js`**:
```js
const https = require('https');
const fs = require('fs');

const MC_API = 'http://localhost:3000/api/tasks';
const SEEN_FILE = 'C:\\Users\\Matt\\.openclaw\\test-results\\seen-failures.json';

async function createTickets(results) {
  const seenFailures = loadSeen();
  const newTickets = [];

  for (const [suite, data] of Object.entries(results.suites)) {
    const failures = extractFailures(suite, data);
    for (const failure of failures) {
      const key = `${suite}::${failure.name}`;
      if (!seenFailures[key]) {
        newTickets.push({ suite, failure, key });
        seenFailures[key] = { firstSeen: results.timestamp, description: failure.message };
      }
    }
  }

  for (const { suite, failure, key } of newTickets) {
    await postTicket({
      title: `[TEST FAIL] ${suite}: ${failure.name}`,
      description: `**Suite:** ${suite}\n**Test:** ${failure.name}\n**Error:** ${failure.message}\n**First seen:** ${results.timestamp}`,
      status: 'TODO',
      tags: ['automated', 'test-failure', suite]
    });
  }

  // Clean resolved failures (test passed = remove from seen)
  for (const [suite, data] of Object.entries(results.suites)) {
    const currentFailureKeys = new Set(
      extractFailures(suite, data).map(f => `${suite}::${f.name}`)
    );
    for (const key of Object.keys(seenFailures)) {
      if (key.startsWith(suite + '::') && !currentFailureKeys.has(key)) {
        delete seenFailures[key];
      }
    }
  }

  saveSeen(seenFailures);
  return newTickets.length;
}

function extractFailures(suite, data) {
  if (!data || data.passed) return [];
  const failures = [];
  if (data.testResults) {
    for (const file of data.testResults) {
      for (const test of (file.assertionResults || [])) {
        if (test.status === 'failed') {
          failures.push({ name: test.fullName, message: test.failureMessages?.[0] || 'No message' });
        }
      }
    }
  }
  if (data.error) failures.push({ name: 'runner-error', message: data.error });
  return failures;
}

async function postTicket(ticket) {
  return new Promise((resolve) => {
    const body = JSON.stringify(ticket);
    const req = https.request({ hostname: 'localhost', port: 3000, path: '/api/tasks', method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': body.length }
    }, resolve);
    req.write(body);
    req.end();
  });
}

function loadSeen() {
  try { return JSON.parse(fs.readFileSync(SEEN_FILE, 'utf8')); } catch { return {}; }
}
function saveSeen(data) {
  fs.mkdirSync(require('path').dirname(SEEN_FILE), { recursive: true });
  fs.writeFileSync(SEEN_FILE, JSON.stringify(data, null, 2));
}

module.exports = createTickets;
if (require.main === module) {
  const results = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
  createTickets(results).then(n => console.log(`Created ${n} new tickets`));
}
```

### Output Format

Each test run produces:
- `test-results/run-[timestamp].json` — full structured results
- `test-results/seen-failures.json` — persistent failure deduplication state
- `test-results/raw.log` — raw terminal output for debugging

---

## 6. CI/CD Integration (Future)

When KinSync ships to production, GitHub Actions should run on every PR targeting `main`:

```yaml
# .github/workflows/test.yml
name: Test Suite
on:
  pull_request:
    branches: [main]
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: test
          POSTGRES_DB: kinsync_test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s

    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npx prisma migrate deploy
        env:
          DATABASE_URL: postgresql://postgres:test@localhost/kinsync_test
      - run: npm test
      - run: npx playwright install --with-deps
      - run: npm run test:e2e
        env:
          DATABASE_URL: postgresql://postgres:test@localhost/kinsync_test
      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: playwright-report
          path: playwright-report/
```

The schema drift check runs as the first step — if migrations are pending, the build fails immediately. No one merges code with a broken schema.

---

## 7. Implementation Order

George implements in this exact order. Do not skip phases. Do not reorder.

### Phase 1: Infrastructure (Week 1)
**Goal:** Get the test frameworks installed and running with a single passing test each.

1. Install Vitest in Mission Control: `npm install -D vitest @vitest/ui`
2. Create `vitest.config.ts` in Mission Control
3. Write and run one API test: `GET /api/tasks returns 200`
4. Install Playwright in Mission Control: `npm install -D @playwright/test`
5. Run `npx playwright install chromium`
6. Write and run one smoke test: `/ loads without errors`
7. Repeat steps 1-6 for KinSync
8. Create `tests/setup/seed.ts` in KinSync with test user + family data
9. Create `tests/global-setup.ts` in KinSync that seeds DB and logs in test user
10. Verify `storageState` is saved after login
11. Create the `test-results/` and `.openclaw/scripts/` directories

**Done when:** `npm test` and `npm run test:e2e` both run and exit 0 in both projects.

### Phase 2: Mission Control API Tests (Week 1-2)
**Goal:** Full Vitest API test coverage for Mission Control.

1. Write all `GET /api/tasks` tests
2. Write all `POST/PUT/DELETE /api/tasks` tests
3. Write `POST /api/tasks/reorder` test
4. Write all `/api/products` tests
5. Write all `/api/memory` tests
6. Write all `/api/docs` and `/api/docs/list` tests
7. Write remaining API tests (`/api/activity`, `/api/agents`, `/api/research`, `/api/cron`)

**Done when:** All API tests pass. `npm test` exits 0.

### Phase 3: Mission Control E2E Smoke + Feature Tests (Week 2)
**Goal:** Playwright covers all Mission Control pages and key features.

1. Write parametric smoke tests for all 12 pages
2. Write kanban CRUD tests (create, edit, delete task)
3. Write drag-reorder test (this is the hardest — do it last)
4. Write calendar toggle tests
5. Write products CRUD tests

**Done when:** `npm run test:e2e` passes. Drag-reorder test is stable (no flakiness).

### Phase 4: KinSync Schema Check + API Health Checks (Week 2-3)
**Goal:** Catch the class of bugs the ErrorLog is full of.

1. Write `scripts/check-schema.ts`
2. Run `prisma migrate status` — if it fails, fix pending migrations NOW
3. Write all API health check tests (authenticated HTTP client)
4. **Write carpool/pickup regression tests first** — this is the known bug
5. Verify `GET /api/pickups` returns 200, not 500
6. Write ErrorLog assertion helper
7. Write all remaining health check tests

**Done when:** `npm run test:schema` exits 0. All health checks pass. Carpool tests pass.

### Phase 5: KinSync Auth + Critical Path E2E (Week 3-4)
**Goal:** Playwright covers auth flow and critical user journeys.

1. Write all auth flow tests (login, logout, redirect, session)
2. Write family creation tests
3. Write calendar CRUD E2E tests
4. Write task management E2E tests
5. Write sports hub E2E tests

**Done when:** Full E2E suite passes. `npm run test:all` exits 0 for both apps.

### Phase 6: Bob's Automation (Week 4)
**Goal:** Bob can run tests on a cron schedule and auto-create tickets.

1. George creates `C:\Users\Matt\.openclaw\scripts\run-tests.js`
2. George creates `C:\Users\Matt\.openclaw\scripts\create-tickets.js`
3. George tests the ticket creation script manually: run with a fake failure result, verify ticket appears in Mission Control
4. Matt gives Bob the exact cron job payload (see Section 5)
5. Bob registers the cron job
6. Run it once manually to verify the full pipeline

**Done when:** Bob's cron runs, test fails are created as Mission Control tasks, and the deduplication logic prevents duplicate tickets on subsequent runs.

---

## 8. Bob's Daily Test Protocol

Bob follows this exactly every weekday morning at 7:00 AM Central.

### Step 1: Run the Test Suite
```
Run script: C:\Users\Matt\.openclaw\scripts\run-tests.js
Wait for completion (max 5 minutes).
If script crashes or times out, create a Mission Control ticket immediately:
  Title: [TEST RUNNER] Morning test run failed to execute
  Status: TODO
  Tags: automated, test-runner-error
```

### Step 2: Parse Results
```
Read the most recent file in C:\Users\Matt\.openclaw\test-results\run-*.json
Extract:
  - Total tests run (Mission Control + KinSync combined)
  - Total tests passed
  - Total tests failed
  - Schema check result (passed/failed)
  - List of specific failed test names
```

### Step 3: Compare to Existing Tickets
```
Read C:\Users\Matt\.openclaw\test-results\seen-failures.json
For each failure in today's results:
  - If key already in seen-failures.json → existing known failure, skip
  - If key NOT in seen-failures.json → NEW failure, create ticket
```

### Step 4: Create Tickets for New Failures
```
For each NEW failure:
  POST to http://localhost:3000/api/tasks with:
  {
    "title": "[TEST FAIL] {suite}: {test name}",
    "description": "First seen: {timestamp}\nError: {error message}\nSuite: {suite name}",
    "status": "TODO"
  }
  
IMPORTANT: Do not create duplicate tickets for failures already in seen-failures.json.
IMPORTANT: If carpool/pickup tests fail, tag the ticket with "regression" and "critical".
IMPORTANT: If schema check fails, create ticket FIRST before any other tickets:
  Title: [SCHEMA DRIFT] Pending migrations detected in KinSync
  This is P0 — mention it explicitly in the summary.
```

### Step 5: Report Summary to Matt

After all tickets are created, send this summary via Telegram:

```
🧪 Daily Test Report — {date}

Mission Control: {X}/{total} passed
KinSync: {X}/{total} passed  
Schema: ✅ OK | ⚠️ DRIFT DETECTED

{if failures > 0}
❌ New failures ({count} new tickets created):
  • {suite}: {test name}
  • {suite}: {test name}

{if no failures}
✅ All tests passing. No new tickets.

{if carpool tests failed}
🚨 CARPOOL REGRESSION: Pickup/carpool tests failing. Check pickups endpoint immediately.
```

**Bob does NOT:**
- Report passing tests in detail (noise)
- Create tickets for failures already in seen-failures.json
- Run tests again if they fail (just report and let George fix)
- Attempt to debug failures (report only)

**Bob DOES:**
- Escalate immediately (same message) if schema drift is detected
- Mention if the test runner itself crashed
- Note if the same failure has been open for 3+ days without being fixed (check seen-failures.json `firstSeen` date)

---

## Appendix: File Structure Summary

```
C:\Users\Matt\mission-control\
  tests/
    api/
      tasks.test.ts
      products.test.ts
      memory.test.ts
      docs.test.ts
      activity.test.ts
      agents.test.ts
    e2e/
      smoke.spec.ts
      tasks.spec.ts
      products.spec.ts
      calendar.spec.ts
      office.spec.ts
  vitest.config.ts
  playwright.config.ts
  test-results/
    results.json

C:\Users\Matt\family-coordinator\
  tests/
    setup/
      seed.ts
      global-setup.ts
    api/
      health-checks.test.ts
      auth.test.ts
      pickups.test.ts        ← carpool regression, written first
      sports.test.ts
      tasks.test.ts
      calendar.test.ts
    e2e/
      auth.spec.ts
      family.spec.ts
      calendar.spec.ts
      tasks.spec.ts
      sports.spec.ts
    .auth/
      user.json              ← Playwright saved session (gitignored)
  scripts/
    check-schema.ts
  vitest.config.ts
  playwright.config.ts
  test-results/

C:\Users\Matt\.openclaw\
  scripts/
    run-tests.js
    create-tickets.js
  test-results/
    run-[timestamp].json
    seen-failures.json
    raw.log
```

---

*— Dilbert, KinSync Architecture & Strategy Agent*  
*"Tests don't lie. The ErrorLog does — it just tells you after users already saw the error."*
