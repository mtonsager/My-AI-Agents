# KinSync R&D Think Tank — TeamSnap Integration Strategy
**Date:** April 5, 2026
**Session Type:** Competitive Deep-Dive + Integration Roadmap
**Agents:** Atlas (Product) · Nova (Revenue) · Prism (UX) · Forge (Tech) · Echo (Competitive Intel)
**Question:** Should KinSync integrate with TeamSnap? If so, what's the minimum viable version — and what does it change about our launch timing and positioning?
**Carries Forward From:** Memo #005 (March 31, 2026) — Launch Readiness
**Codebase Scanned:** `prisma/schema.prisma`, `lib/feed-calendar.ts`, `PLAN-CALENDAR-PROVIDERS.md`, `components/sports/`, `app/api/integrations/`, `lib/services/sport.service.ts`, schema links model ✓

---

## The Situation Upfront

TeamSnap is in 30 million parents' phones right now, and the coach who runs your kid's soccer team probably requires it. This creates a strategic question that can't be deferred: does KinSync *complement* TeamSnap (import data, ride the install base), *ignore* it (build from scratch, hope parents re-enter their schedules), or *position against* it (be the parent-first alternative to a platform that serves leagues)?

The answer has direct implications for what gets built before launch, what the X.com pitch sounds like, and whether KinSync can land a "first win" in the first ten minutes of onboarding without requiring parents to manually enter data they already have in a TeamSnap app on their phone.

The agents agree the question is urgent. What they fight about is scope, timing, and risk.

---

## Section 1: TeamSnap Analysis — What We're Dealing With

### Who TeamSnap Actually Serves (and Who It Doesn't)

TeamSnap's primary customer is **the coach and the league administrator**, not the parent. The product is built to solve the coach's problem: communicate to a roster, track availability, collect payments, manage a schedule. Parents are *recipients* of TeamSnap — they're there because the coach requires the app.

**TeamSnap's pricing (2026):**
- **Free tier** (teams): Scheduling, messaging, assignments, payments. Roster capped at under 15 players.
- **Premium** ($10/mo billed annually, $15.99/mo monthly): Availability/RSVP tracking, ad-free for team owner/managers, larger roster.
- **Ultra** ($12.50/mo billed annually, $21.99/mo): Unlimited roster, full feature set.
- **Clubs & Leagues**: Custom pricing ("flexible, customized pricing tailored to your organization").
- **Parents pay nothing.** TeamSnap is entirely free on the parent/player side.

TeamSnap ONE (launched November 2025) is their B2B pivot: a unified platform for clubs and leagues, with brand-sponsored partnerships (Kraft Heinz, Progressive, others). The March 2026 headline was "$20 million given back to youth sports through brand-sponsored partnerships." They are building a B2B media/advertising network. **Parents are the audience. Coaches and leagues are the customers.**

### What TeamSnap Does for Parents
- View team schedule (games, practices)
- RSVP to events
- Receive push notifications from coach
- Team chat/messaging
- See team roster
- Track payments

### What TeamSnap Does NOT Do for Parents
- Multi-team coordination across multiple kids
- Scheduling conflict detection
- Driver/carpool assignment
- Family calendar unification (it's one team per view)
- Meal planning, chores, household logistics
- AI-powered command center
- Any cross-family feature

**The gap is enormous and deliberate.** TeamSnap's product surface stops at the edge of the team. Everything that happens when a parent has three kids across four sports, two parents with different availability, and a 3pm pickup to sort out — that's not TeamSnap's problem. That's KinSync's problem.

### Parent Sentiment on TeamSnap
TeamSnap has 43,000+ App Store ratings and 98% satisfaction — from **coaches**. Parent sentiment is much more ambivalent:
- Common complaints: forced to use it because coach requires it; cluttered interface; notifications too frequent or not customizable; no multi-kid view; no carpool coordination; can't see family calendar in one place.
- The core resentment: *TeamSnap works for the league. I'm just a recipient.*

That resentment is a wedge. "TeamSnap works for the league. KinSync works for your family" is not just positioning copy — it's confirmed sentiment.

### TeamSnap iCal / Integration Surface
TeamSnap **does expose iCal feeds** per team/season. Every team schedule in TeamSnap can be exported as an iCal link (`webcal://` or `https://`). This is a public, no-authentication-required URL that any calendar app can subscribe to. It's how parents get TeamSnap schedules into Apple Calendar and Google Calendar today.

TeamSnap also has a **public API** (v3 REST API), but it requires OAuth, developer app registration, and TeamSnap developer approval. The API gives access to:
- Roster data (names, positions)
- Team availability (RSVP states)
- Events/schedule
- Messaging (read/write)
- Assignments

**The iCal feed is the path of least resistance.** It requires no API keys, no OAuth, no developer approval from TeamSnap. A parent just needs their TeamSnap team iCal URL (available from "Export Schedule" in any TeamSnap team). KinSync already has the full iCal parsing infrastructure in `lib/feed-calendar.ts` — this is largely pre-built.

---

## Agent Analyses

---

### Atlas (Product): This Is a Complement, Not a Threat — But Import Is Table-Stakes

**Idea 1: TeamSnap Is Infrastructure for Your Users — Treat It That Way**
TeamSnap is not a competitor; it's a data source. The coach requires TeamSnap. That's not going to change. What KinSync can do is make TeamSnap data *useful at the family level* — pulling it into the conflict detector, the carpool system, and the `/decide` command center. This is additive, not adversarial. Don't try to replace TeamSnap for the coach side. Position as the family layer *on top of* what the coach already provides.

**Idea 2: "I Already Have TeamSnap" Is the Single Biggest Onboarding Objection**
The #1 reason a sports parent will skip manual event entry on day one: they already have their kid's schedule in TeamSnap. If KinSync requires them to re-enter every game, every practice, every tournament — you've lost them before the first win. The iCal import path doesn't just improve onboarding; it *removes the activation barrier entirely*. A parent pastes one URL, and their kid's season populates in 30 seconds. That's the difference between "this is cool" and "I'll do this later."

**Idea 3: The Integration Strengthens Conflict Detection — Which Is the Core Value Prop**
Conflict detection only works when your event data is accurate and complete. If Kid A's soccer practice is in TeamSnap and never imported to KinSync, the conflict detector misses the overlap with Kid B's game. Every missing TeamSnap event is a false negative in the detection engine — a moment KinSync *should have* caught but didn't. TeamSnap import isn't just a UX feature; it's a data quality requirement for the core product to work correctly.

**Idea 4: Link Model Already Has TeamSnap — But Import Is the Gap**
The schema already includes `TEAMSNAP` as a recognized `linkType` in both `SportLink` and `NoteAttachedLink`. We track that a season is *linked to* a TeamSnap URL — but we don't yet parse it. The iCal feed path closes that gap. The link infrastructure is the hook; the feed sync is the action. These are one short step apart.

**Idea 5: Can We Launch Without It? Yes — But the First Win Is Harder**
You can launch without TeamSnap integration. But you should expect onboarding conversion to be lower: parents will need to manually enter game schedules they already have digitally, and some will not. The "first win" flow (one kid, one sport season, one game) is weaker if the parent types it vs. imports it. The choice is: accept a longer, manual first-win path, or close the loop before launch. The question is whether it's a week of work or a month.

---

### Nova (Revenue): iCal Import Is the Unlock — Don't Launch Without It

**Idea 1: TeamSnap Import Turns "Another App" Into "The App That Ties Everything Together"**
Without TeamSnap integration, KinSync is asking a sports parent to maintain a second schedule for data they already have. With it, KinSync becomes the unification layer — the place where TeamSnap, Google Calendar, Infinite Campus, and carpool all live together. That narrative sells. "Another app" doesn't. The pricing conversation changes when KinSync is positioned as a coordination hub rather than a coordination silo.

**Idea 2: "Free to Add Your TeamSnap Feed" — Acquisition Hook in the Product**
The iCal import should be prominently featured as a zero-friction entry point: "Connect your TeamSnap schedule in 30 seconds." That's not a settings feature — it's an onboarding CTA. It's also a low-cost user acquisition tactic: any parent who sees your X.com thread and already uses TeamSnap immediately understands the value. You're not asking them to abandon their coach's app; you're building on top of it.

**Idea 3: TeamSnap Partnership Is a Later Move, Not a Launch Dependency**
An official TeamSnap API integration (with OAuth, developer registration, and TeamSnap's API approval process) is a partnership-level conversation, not a launch feature. TeamSnap ONE is a B2B platform — they may actually welcome a parent-facing integration that gives parents more value on top of their platform. But that conversation happens after you have 100+ active families, not before. For now: iCal first. API later.

**Idea 4: Pricing Holds — But Integration Improves Conversion**
The $49–$59/yr founding cohort pricing (established in Memo #005) isn't changed by TeamSnap integration. But integration likely improves conversion: a parent who gets their kid's full soccer season imported in 30 seconds hits the "first win" state faster, which improves activation, which improves willingness to pay. The integration is a conversion accelerator, not a pricing variable.

**Idea 5: Flag TeamSnap Integration in the X.com Launch Thread**
The launch thread should explicitly call out TeamSnap: "Already using TeamSnap? Good — KinSync imports your schedule in one click. Then it does what TeamSnap doesn't: catches conflicts, assigns drivers, and plans your whole week." That line alone converts the 30 million parent install base into potential KinSync users.

---

### Prism (UX): Import Flow Has to Be Frictionless — One URL, One Button, Done

**Idea 1: The Import Flow Is Two Steps Maximum**
When a parent adds a sport season in KinSync, the create flow should immediately offer: "Import from TeamSnap? Paste your iCal link here." One field. One button. The parent's entire game schedule appears. No manual entry. This isn't a settings panel — it's part of the sport season creation wizard that already exists in the onboarding flow.

**Idea 2: Where to Get the TeamSnap iCal URL — Show Them**
Parents don't know where to find their TeamSnap iCal link. It's buried: Settings → Team → Export Schedule → Copy iCal Link. The import flow needs a "How to find this" tooltip or collapsible instruction: "In TeamSnap: open your team → tap ··· → Export Schedule → Copy Link." Three lines of instruction, collapsible. Without this, 80% of parents who want to import will fail not because the feature is broken but because they can't find the URL.

**Idea 3: The Settings → Calendar Sources Path Already Exists — Wire It**
The `CalendarSource` model with `sourceType: 'FEED'` and `feedUrl` is already built. `lib/feed-calendar.ts` already parses iCal and syncs to the `Event` table. The `CalendarSourcesSection.tsx` component in settings already has the add-feed UI pattern. The gap between "zero TeamSnap integration" and "working iCal import" may be 1-3 days of work: wire up a dedicated TeamSnap flow in sport season creation that pre-populates a `CalendarSource` with the feed URL, tagged to the season.

**Idea 4: Import Creates Events in Sports Tab, Not Just Calendar**
The iCal import from TeamSnap should populate `SportEvent` records linked to the `SportSeason` — not just generic `Event` records in the calendar. This is the key design decision. A TeamSnap import that lands in the calendar but not in the Sports tab misses the point: the conflict detector, carpool system, and pickup assignment logic need events in `SportEvent` context to work correctly. The import needs to classify events (GAME, PRACTICE, TOURNAMENT) from the TeamSnap iCal `SUMMARY` field.

**Idea 5: After Import — Show the Conflict Detector Immediately**
The post-import state is the activation moment. After a parent imports 15 soccer games and 10 practices, immediately show the conflict detector run: "KinSync found 2 scheduling conflicts with this import." Even if the family only has one kid's season in, it primes the parent for the value of the second kid's import. This is the "holy sh*t moment" Atlas described in Memo #005 — and the import is what makes it achievable in the first session.

---

### Forge (Tech): iCal Is Already Built — This Is Wiring, Not Building

**Idea 1: The Hard Part Is Done — `lib/feed-calendar.ts` Already Parses iCal**
`lib/feed-calendar.ts` is a complete, production-ready iCal parser with:
- `webcal://` to `https://` conversion
- iCal `VEVENT` parsing (DTSTART, DTEND, SUMMARY, DESCRIPTION, LOCATION, UID)
- All-day event handling
- Composite event ID for upsert/deduplication (`feed:{sourceId}:{uid}`)
- Category auto-matching
- Cleanup of deleted events

The entire iCal fetch-and-sync pipeline is live and deployed. TeamSnap iCal feeds are standard iCal. This means the integration is not "build a parser" — it's "wire up a new entry point."

**Idea 2: The Missing Piece Is SportEvent Classification**
The current `feed-calendar.ts` syncs to the `Event` table via `CalendarSource`. For TeamSnap, we need an additional step: classify imported events as `SportEvent` records. The SUMMARY format in TeamSnap iCal follows patterns like "Soccer: Game vs. Riverside FC" or "Soccer: Practice @ North Park Fields". A simple regex + keyword classifier can extract:
- `eventType` (GAME vs. PRACTICE vs. TOURNAMENT)
- `opponent` (opponent team name from "vs." or "@ opponent")
- `homeAway` (home/away inference from location field)
- `location`

This is a 100–200 line service function. It's the only net-new code in the MVP integration.

**Idea 3: Season-Scoped Feed Sources — Minor Schema Touch**
Currently, `CalendarSource` is linked to `userId` and optionally `familyId`. For TeamSnap iCal feeds tied to a specific `SportSeason`, we need a `sportSeasonId` field on `CalendarSource`. This is a one-migration schema change. Without it, the import can work (events land in the calendar and get category-matched to "Sports"), but the connection between the iCal feed and the specific season is implicit rather than explicit. The explicit link is better for: re-sync on demand, display in the season view, and cleanup when a season is archived.

**Idea 4: MVP Integration Is 3 Days of Work**
Estimated scope for a production-ready MVP iCal integration:
- **Day 1**: Add `sportSeasonId` to `CalendarSource` schema (migration), update `CalendarSourcesSection.tsx` to support "TeamSnap" source type with dedicated instructions.
- **Day 2**: Build `teamsnap-ical.service.ts` with SUMMARY classifier → creates/updates `SportEvent` + `Event` records from feed data.
- **Day 3**: Wire classifier into `syncFeedEvents` (or a parallel `syncTeamSnapFeed`), add iCal import step to `SportSeason` creation wizard, test with real TeamSnap feed URLs.

No new API keys. No external service dependencies. No OAuth flow. A parent's TeamSnap iCal URL is a public HTTPS URL that KinSync can fetch with standard `fetch()`.

**Idea 5: Do Not Build the TeamSnap API Integration Before Launch**
The TeamSnap REST API (v3) requires OAuth 2.0, a developer application registered with TeamSnap, and TeamSnap's developer agreement. It provides richer data (roster, RSVP states, availability) but is a multi-week implementation with an external approval dependency. The iCal path provides 90% of the value (schedule data) with 0% of the approval risk. Build the API integration in Phase 2 — after launch, after you have active users who would benefit from the richer data set.

---

### Echo (Competitive): TeamSnap's Moat Is Narrow — KinSync's Wedge Is Real

**Idea 1: TeamSnap Serves the League — Not the Parent — and They Know It**
TeamSnap's recent product direction (TeamSnap ONE, brand partnerships, "$20M given back to youth sports") confirms they are deliberately moving up-market to the B2B/league-operator layer. They are not building parent-side AI features. They are not building multi-team family views. They are building an advertising and commerce platform for clubs and leagues. The parent-side product hasn't had a meaningful update in years. This is deliberate. Their business model doesn't benefit from solving the *parent's* problem more deeply.

**Idea 2: The Competitive Moat Is Install Base, Not Features**
TeamSnap's advantage is that coaches already use it and parents are required to download it. This is a strong moat — but it's also KinSync's opportunity. You don't need to get the coach to switch; you need to get the parent to layer KinSync on top. If the import is frictionless, TeamSnap's install base *becomes KinSync's distribution surface*. Every parent who already uses TeamSnap is a warm prospect.

**Idea 3: GameChanger, SportsEngine, and LeagueApps Are in the Same Boat**
The schema already lists `GAMECHANGER`, `TEAMSNAP`, `SPORTSENGINE` as link types — these are all coach/league-side platforms with the same gap: they don't do family coordination. All of them expose iCal feeds. Building for TeamSnap first (largest install base) and then extending the import pattern to GameChanger and SportsEngine is a natural Phase 2 move.

**Idea 4: No AI-Native Competitor Is Building This Integration**
No current competitor — not Cozi, not FamCal, not any Y Combinator 2025/26 family app — has built a "import from TeamSnap + AI-powered conflict detection" feature. This is an open lane. The first app to nail "import your TeamSnap feed, then let AI manage the coordination chaos" owns a unique position that's hard to copy without the full coordination layer underneath. KinSync has that layer.

**Idea 5: "TeamSnap for the Coach, KinSync for the Family" Is a Durable Positioning Line**
This framing has longevity. TeamSnap isn't going away; neither is the coach-requirement dynamic. As long as coaches use TeamSnap, parents will have data in it. As long as parents have data in TeamSnap, the import story is relevant. This positioning doesn't depend on TeamSnap failing — it depends on TeamSnap *continuing to do what it does*, which is serve coaches while leaving parents to figure out the family side themselves.

---

## Debate Round

---

### Atlas — Debate

**🚩 Flags:**

**Forge's "3 days of work"** is optimistic on the SportEvent classification piece. The SUMMARY field format in TeamSnap iCal is not guaranteed — different leagues configure their schedule titles differently. "Soccer: Game vs. Riverside FC" is a clean format; "U12 Soccr Prac Tue 5pm" is what you actually get from half of TeamSnap teams. The classifier needs a fuzzy matcher and a fallback (if classification fails, import as generic SportEvent with `eventType: GAME` and let the user correct it). Add a day for edge case handling and a UI for "review your import before saving."

**Prism's suggestion that "import creates SportEvent records directly"** has a UX ambiguity problem: what if the family already has some events manually entered for this season? The import could create duplicates. The upsert logic in `feed-calendar.ts` handles this for `Event` records via the composite UID, but `SportEvent` records don't have a `feedUid` field today. Before wiring the classifier, add an `externalId` field to `SportEvent` so the iCal UID can be used for safe upserts.

**⬆️ Elevates:**

**Echo's "TeamSnap install base is KinSync's distribution surface"** is the most important reframe in this session. The integration is not just a convenience feature — it's an acquisition channel. Every parent who does the import has already validated that they have kids in organized sports (KinSync's target user) and that they want to solve the coordination problem (they downloaded TeamSnap). They're warm. That's a meaningfully different user than a cold X.com click.

**Nova's "call out TeamSnap in the X.com thread"** is correct and should be the lead message. Don't bury it. "Already using TeamSnap? KinSync imports your schedule and then does what TeamSnap doesn't." That's the tweet.

---

### Nova — Debate

**🚩 Flags:**

**Forge's "3 days of work"** also underestimates the onboarding flow work. Wiring the import into the `SportSeason` creation wizard (Prism's Idea 1) isn't just a settings component update — it's an onboarding flow change that needs to look good on mobile, handle errors gracefully, and not block the user if the URL is wrong or the feed is temporarily down. The actual user-facing work is the hard part, not the parsing. Budget 5–7 days total, not 3.

**Atlas's concern about launch without integration** is valid but shouldn't delay launch by more than 1–2 weeks. The integration is a conversion accelerator; it's not a launch blocker. The three hard blockers from Memo #005 (OAuth, TypeScript errors, cold start) still take priority. Integration goes in the hardening sprint *alongside* those, not after.

**⬆️ Elevates:**

**Prism's "show the conflict detector immediately after import"** is the activation moment the whole product is built for. Don't skip it. The post-import screen should be: "We imported 24 events for [Child]'s soccer season. Here's what we noticed..." followed by any conflicts found. Even zero conflicts is useful: "No conflicts with your current schedule." That's the AI working in front of the parent for the first time.

**Echo's comparison to GameChanger and SportsEngine** matters for the roadmap. Build the pattern once for TeamSnap, document the SUMMARY classifier as extensible, and Phase 2 adds GameChanger without starting over.

---

### Prism — Debate

**🚩 Flags:**

**Atlas's "add externalId to SportEvent"** is correct and a prerequisite to the import being safe. Without it, every re-sync of the TeamSnap feed could create duplicate `SportEvent` records for the same game. The schema migration is small (`externalId String? @unique` on `SportEvent`), but it needs to happen before the classifier writes to that table.

**Nova's "5–7 days" estimate** may be right for full polish, but the MVP doesn't need to be polished — it needs to be functional and safe. A working import with an "are you sure?" confirmation before saving is acceptable for launch. Pixel-perfect mobile UI for the import flow is Phase 1.5.

**⬆️ Elevates:**

**Forge's point about the SUMMARY classifier needing a fuzzy matcher** is technically right, but there's a pragmatic shortcut: run the SUMMARY through GPT-4o-mini (same pattern used in `scan.service.ts` for photo scanning) and let the AI classify event type, opponent, and home/away from free text. It's 20ms and a fraction of a cent per import. That's faster and more accurate than any regex classifier, and it handles the messy real-world SUMMARY formats Atlas described.

**Atlas's point that link model already has `TEAMSNAP` as a linkType** is the right starting context. The team at some point *planned* for this. There's likely a "SportLink" the parent adds with a TEAMSNAP URL today. The import could bootstrap from that: if a `SportSeason` already has a `SportLink` with `linkType: 'TEAMSNAP'`, offer to import the iCal feed from that URL. No new URL entry required.

---

### Forge — Debate

**🚩 Flags:**

**Prism's "AI classifier for SUMMARY"** is clever but creates a dependency on OpenAI for the import flow. If the AI is down or rate-limited during a parent's import session, the classification fails. The safer path: build a deterministic regex classifier first (covers 80% of cases), fall back to AI for ambiguous summaries, and fall back to "GAME" as the default type if both fail. This keeps import reliability high regardless of AI service state.

**Atlas's "add `externalId` to `SportEvent`"** is correct and this should be done first, before any import code is written. It's a 5-line schema change and one migration. Without it, any bug in the import logic could leave orphaned or duplicate SportEvent records that are hard to clean up post-production.

**⬆️ Elevates:**

**Echo's "iCal pattern extends to GameChanger and SportsEngine"** is the architecture argument for doing this right the first time. Don't hardcode TeamSnap-specific logic into `feed-calendar.ts`. Build a `SportsFeedImporter` abstraction: `importFromUrl(url, sportSeason, options)` that accepts any iCal URL, runs the classifier, and writes to `SportEvent`. TeamSnap is the first implementation. GameChanger is the second. The abstraction costs one extra hour.

**Nova's point that the integration belongs in the onboarding flow, not just settings**, is essential for activation. If the import is only discoverable in Settings → Calendars, 80% of users will never find it. It belongs in: (1) `SportSeason` creation wizard, (2) the onboarding first-win flow, and (3) a prompt card in the Sports tab empty state.

---

### Echo — Debate

**🚩 Flags:**

**Forge's "don't use AI for SUMMARY classification" during import** is operationally conservative but underestimates the chaos of real TeamSnap feed data. Regex will fail on anything outside the common formats. A production release with a broken classifier creates SportEvents with wrong types (all GAME, no PRACTICE) — which breaks the conflict detector downstream. Prism's AI-fallback approach is actually the more reliable path. Use a 3-tier strategy: regex for obvious cases, AI for ambiguous ones, GAME as last resort. The OpenAI call can be async and non-blocking if needed.

**Nova's "5–7 days for the full import flow"** is realistic but the estimate should be broken into "functional and safe" (3 days) vs. "polished and delightful" (additional 4 days). Launch with functional and safe. Ship polish in the week-after-launch update.

**⬆️ Elevates:**

**Prism's "bootstrap import from existing SportLink"** is the most elegant onboarding shortcut in this session. If a parent already saved their TeamSnap URL as a SportLink (which they may have done following the existing "Add links to this season" UI), the import wizard can pre-fill that URL. Zero additional input from the user. The import is one button: "Import from your saved TeamSnap link." This is a 30-minute implementation add-on to the main import flow.

**Atlas's positioning framing** — integration strengthens conflict detection quality — should be the internal justification for prioritizing this above other pre-launch features. It's not just UX; it's data quality for the core product.

---

## Section 2: Synthesis — What the Agents Agree On

### Unanimous
1. **iCal integration is the MVP.** No API, no OAuth, no TeamSnap developer agreement. iCal feed URL → parse → create SportEvent + Event records. This is the path.
2. **The hard part (iCal parsing) is already built.** `lib/feed-calendar.ts` is production-ready. The new work is: schema addition (`externalId` on `SportEvent` + `sportSeasonId` on `CalendarSource`), SUMMARY classifier, import UI wiring into the season creation flow.
3. **Import needs to land in `SportSeason` context, not just the calendar.** TeamSnap events should become `SportEvent` records, not just generic `Event` records. Without this, conflict detection and carpool assignment lose their context.
4. **Add `externalId` to `SportEvent` before writing any import code.** Safe upserts require it. This is the unanimous prerequisite.
5. **Classify SUMMARY with regex-first, AI-fallback strategy.** Forge's reliability concern and Prism's accuracy concern are both addressed by a tiered approach.
6. **The import should live in three places:** Sport season creation wizard, the first-win onboarding flow, and the Sports tab empty state. Not just in Settings.
7. **Launch messaging should reference TeamSnap.** "Import your TeamSnap schedule in one click" belongs in the X.com thread, not just the settings docs.

### The Real Disagreements
| Topic | Position A | Position B | Verdict |
|-------|-----------|-----------|---------|
| **Is this a launch blocker?** | Nova: Accelerator, not blocker — can ship without it | Atlas: Every missing TeamSnap event is a false negative in the conflict detector | **Split: Not a hard blocker, but ship it in the pre-invite hardening sprint** |
| **Total engineering time** | Forge: 3 days functional | Nova: 5–7 days polished | **3 days for MVP (functional, safe); polish in post-launch update** |
| **AI vs. regex for SUMMARY classification** | Forge: Regex-first, reliability matters | Prism: AI-fallback handles real-world messy data | **Tiered: regex → AI-fallback → default GAME** |
| **TeamSnap API (OAuth) timeline** | Nova: Later-stage partnership conversation | All: Not before launch | **Post-launch, after 100+ active families** |
| **"Can KinSync launch without integration?"** | All agents: Yes | All agents: But conversion will be lower | **Launch without it if timeline forces it; prefer to include it** |

---

## Section 3: KinSync Strengths That Complement TeamSnap

| KinSync Capability | What It Does With TeamSnap Data |
|---------------------|-------------------------------|
| **Conflict Detection** (`pattern-detection.service.ts`) | Identifies overlaps between imported TeamSnap events and other family events — across kids, across teams |
| **Driver/Carpool Assignment** (`components/pickups/`, `lib/services/assignment.service.ts`) | Turns TeamSnap game events into pickup assignments with driver availability and prep time |
| **Multi-kid Family View** | Unified calendar view across all kids' imported TeamSnap seasons + school calendar + family events |
| **AI Command Center** (`/decide`) | Uses imported TeamSnap data to populate `WeekAheadCard`, `TodayPlanCard`, `NeedsAttentionCard` |
| **Morning Briefing** (`components/dashboard/MorningBriefing.tsx`) | "Logan has soccer at 4pm. You need to leave by 3:15. Sarah is picking up Kenzie from practice at the same time — conflict detected." |
| **RSVP + Notifications** (`SportEventRsvp`, push pipeline) | Parents can RSVP to SportEvents from within KinSync; conflict-triggered push notifications on import |
| **Notes Linked to Seasons** (`NoteLink`) | Coach notes, equipment lists, directions to fields — all linked to the imported season |
| **SportLink Awareness** | TEAMSNAP linkType already in schema — import bootstraps from existing link |

---

## Section 4: KinSync Gaps vs. What Needs Building

### Gaps (Pre-Integration)
| Gap | Description | Priority |
|-----|-------------|---------|
| **`externalId` on `SportEvent`** | Required for safe iCal upserts. Without it: duplicates on re-sync. | 🔴 P0 — prerequisite |
| **`sportSeasonId` on `CalendarSource`** | Links iCal feed to a specific season for scoped re-sync and cleanup. | 🔴 P0 — prerequisite |
| **SUMMARY Classifier** | Parses TeamSnap iCal SUMMARY → `eventType`, `opponent`, `homeAway`. Tiered: regex → AI → default. | 🔴 P0 — core |
| **`SportsFeedImporter` service** | `importFromUrl(url, sportSeason)` abstraction. Called by TeamSnap import; extensible to GameChanger. | 🟡 P1 — architecture |
| **Import UI in Season Creation** | Step in `SportSeason` creation wizard: "Import from TeamSnap" with "How to find this" tooltip. | 🔴 P0 — UX |
| **Import UI in Onboarding First-Win Flow** | Surface the import option in `FirstWinOnboardingForm.tsx` for sport-season step. | 🟡 P1 — activation |
| **Sports Tab Empty State Import Prompt** | If no SportEvents yet: "Have a TeamSnap schedule? Import it in 30 seconds." | 🟡 P1 — discovery |
| **Post-Import Conflict Trigger** | After import completes, immediately run conflict detector and show results card. | 🟡 P1 — activation |
| **Import Review Screen** | "We found 24 events — here's a preview. Save?" with error handling for bad URLs. | 🟡 P1 — UX polish |
| **Bootstrap from Existing SportLink** | If TEAMSNAP SportLink already saved, pre-fill the import URL field. | 🟢 P2 — nice to have |
| **GameChanger / SportsEngine iCal** | Extend `SportsFeedImporter` to parse GameChanger and SportsEngine iCal feeds. | 🟢 P2 — roadmap |
| **TeamSnap REST API (OAuth)** | Roster sync, RSVP state, availability. Requires TeamSnap developer registration. | 🟢 P3 — post-launch |

### What Does NOT Need Building
- **A new calendar parser** — `lib/feed-calendar.ts` is complete.
- **New auth flows** — iCal is a public URL, no OAuth needed.
- **New TeamSnap account connection** — no user needs to connect a TeamSnap account; they just paste a URL.
- **New notification infrastructure** — existing push pipeline handles post-import conflict alerts.

---

## Section 5: Integration Roadmap

### MVP — "iCal Import, Safe and Functional" (3 Days)
**Goal:** A parent can paste their TeamSnap iCal URL during sport season creation and have their entire schedule imported as `SportEvent` + `Event` records, with conflict detection running immediately after.

| Task | Owner | Est. |
|------|-------|------|
| Schema: add `externalId` to `SportEvent` | George | 2h |
| Schema: add `sportSeasonId` to `CalendarSource` | George | 1h |
| Service: `teamsnap-ical.service.ts` — SUMMARY classifier (regex + AI-fallback) | George | 4h |
| Service: wire classifier into `syncFeedEvents` or new `syncTeamSnapFeed` | George | 3h |
| UI: TeamSnap import step in `SportSeason` creation wizard | George | 4h |
| UI: "How to find your iCal URL" tooltip/collapsible | George | 1h |
| Test: real TeamSnap iCal URLs (2–3 different leagues/formats) | Matt | 2h |
| **Total** | | **~17h (~3 days)** |

### Phase 1 — "Activation and Discovery" (Post-Launch, Week 2–3)
- Post-import conflict trigger with results card
- Import review screen (preview events before saving, error handling for bad URLs)
- Surface import prompt in `FirstWinOnboardingForm.tsx`
- Sports tab empty state → "Import from TeamSnap" CTA
- Bootstrap from existing `SportLink` with `TEAMSNAP` linkType

### Phase 2 — "Multi-Platform Sports Import" (Post-Launch, Month 2)
- Refactor to `SportsFeedImporter` abstraction
- GameChanger iCal support (SUMMARY format differs slightly)
- SportsEngine iCal support
- Re-sync on demand (pull latest TeamSnap schedule, update existing SportEvents)
- Feed health status: "TeamSnap feed last synced 2h ago — schedule up to date"

### Phase 3 — "Full TeamSnap API" (Post-Launch, Month 3–4, requires 100+ active families)
- TeamSnap developer app registration
- OAuth 2.0 flow for parents to connect their TeamSnap account
- Roster sync (team members, positions)
- RSVP state sync (TeamSnap availability → KinSync driver availability)
- Two-way RSVP: RSVP in KinSync pushes to TeamSnap (requires write permission)
- TeamSnap partnership conversation (positioning as complementary parent layer)

---

## Section 6: Impact on Launch Timing and Positioning

### The Short Version
The iCal MVP is 3 days of work and should be in the pre-invite hardening sprint. It is not a launch delay — it runs in parallel with the existing blockers from Memo #005. The full API is a post-launch project that should not influence launch timing at all.

### Launch Timing Impact
| Scenario | Timeline | Recommendation |
|----------|----------|---------------|
| **Without any TeamSnap integration** | Launch as planned, post-Memo #005 blockers resolved | Viable but first-win conversion is lower; expect more manual entry friction |
| **With MVP iCal import** | +3 days to the hardening sprint | Recommended — close the activation gap before inviting beta families |
| **With Phase 1 polish** | +1 additional week | Nice to have for launch; can ship as a post-launch update week 2 |
| **With TeamSnap API** | +6–8 weeks + TeamSnap developer approval | Post-launch only. Never blocks beta. |

### Positioning Impact
The integration sharpens every positioning claim:

- **Before integration:** "KinSync coordinates your whole family." *(vague, requires trust)*
- **After integration:** "Import your TeamSnap schedule in one click. KinSync catches the conflicts your coach can't." *(specific, immediate value, explains the gap)*

The X.com launch thread should now include:
1. The carpool chaos story (the emotional hook — unchanged from Memo #005)
2. The conflict detection reveal (the product capability)
3. **The TeamSnap call-out** ("Already using TeamSnap? KinSync imports it and does what TeamSnap doesn't.")
4. The KinSync CTA

The third line converts TeamSnap's 30 million parent install base into warm prospects. Without it, you're positioning against a blank slate. With it, you're positioning against a known pain point that every sports parent has already named.

---

## One-Sentence Takeaways Per Agent

- **Atlas:** TeamSnap import turns "re-enter your whole schedule" into "paste one URL" — and every missing event is a false negative in the conflict detector, so this is a data quality requirement, not just a UX nicety.
- **Nova:** "Already using TeamSnap? KinSync imports it and does what TeamSnap doesn't" is the sentence that converts 30 million warm prospects — put it in the X.com thread.
- **Prism:** The import lives in three places (season creation wizard, onboarding first-win flow, Sports tab empty state), not Settings — and the post-import conflict trigger is the activation moment the whole product is built for.
- **Forge:** The iCal parser is already built; this is 3 days of wiring (schema + classifier + UI), not 3 weeks of building — but add `externalId` to `SportEvent` before writing a single line of import code.
- **Echo:** TeamSnap's moat is install base, not features — and that makes their install base KinSync's distribution surface, not a competitive threat.

---

## Open Questions for Matt

1. **Have you tested KinSync with a real TeamSnap iCal URL?** The feed parser in `lib/feed-calendar.ts` should work — but there are TeamSnap-specific URL patterns (private feed tokens in the URL, league vs. team feeds) that should be validated against a real export before writing the classifier.

2. **Is George available for a 3-day sprint on this?** The MVP estimate assumes focused work. If George is context-switching with other hardening tasks, budget 5 days.

3. **Do you have access to a TeamSnap team as a parent (not a coach)?** The "How to find your iCal URL" tooltip needs to reflect the current TeamSnap UI. This changes between app versions and the instructions should be tested on the latest iOS version.

4. **What's your preferred classification default for ambiguous SUMMARY fields?** Suggestion: default to `GAME` (more visible in the conflict detector) with a flag that lets the parent correct the type. But if you want to default to `PRACTICE` (less critical, lower stakes), that's valid too.

5. **Phase 3 (TeamSnap API) — appetite for a formal partnership conversation?** If KinSync reaches 500+ active families, a "recommended parent companion app for TeamSnap users" positioning could be a formal BD conversation with TeamSnap. They benefit from parent engagement; you benefit from distribution. Worth considering as a 6-month goal.

---

## Memo Notes
- Built from live agent outputs: Atlas, Nova, Prism, Forge, Echo ran full independent analyses; debate round ran after all 5 completed
- Supersedes no prior integration memo; this is the first TeamSnap strategy session
- Carries forward from Memo #005 (March 31, 2026) — launch readiness + blocker resolution
- Key technical finding: `lib/feed-calendar.ts` is production-ready; `TEAMSNAP` already exists as a linkType in the schema; the MVP integration is wiring, not building
- Key competitive finding: TeamSnap's parent-side product is intentionally underdeveloped (B2B pivot); parent resentment is confirmed and actionable; no AI-native competitor has built this integration
- Launch timing: iCal MVP is +3 days to hardening sprint, not a new phase; TeamSnap API is post-launch only
- Critical prerequisite: `externalId` on `SportEvent` must be added before any import code is written
