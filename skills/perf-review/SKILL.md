# Performance Review Agent

**Trigger:** Bob runs this on every PR. George runs this before opening a PR.
**Reference:** Read PERFORMANCE.md in repo root for existing baselines.

## What This Agent Does

Reviews code changes for performance issues — N+1 queries, missing indexes, unoptimized renders, large bundle additions — before they hit production.

## Checklist

### Database / Prisma
- [ ] No N+1 queries — use `include` or batched queries instead of queries inside loops
- [ ] New relations use `select` to fetch only needed fields, not full model
- [ ] Queries on large tables filter by indexed columns (familyId, userId, createdAt)
- [ ] New models in schema.prisma have indexes on foreign keys and frequently-filtered columns
- [ ] No `findMany` without a `where` clause on user/event/chore tables (full table scan)
- [ ] Pagination (`take`/`skip` or cursor) on any list endpoint that could return > 50 rows

### API Routes
- [ ] Expensive operations (AI calls, external APIs) are not blocking the main request thread unnecessarily
- [ ] Responses include appropriate cache headers (`cache-headers.ts`) for static/semi-static data
- [ ] No redundant DB calls within the same request (fetch session once, reuse)
- [ ] Server components fetch data directly — no double-fetch (server fetch + client fetch)

### React / Client
- [ ] No expensive computation in render path — use `useMemo`/`useCallback` for heavy transforms
- [ ] Lists with > 20 items use virtualization or pagination — not rendering all at once
- [ ] Images use Next.js `<Image>` component (automatic optimization, lazy loading)
- [ ] No large libraries imported for small utility use (check bundle impact)
- [ ] `'use client'` boundary as low as possible — push server components down

### Bundle Size
- [ ] New npm packages checked for size impact (`bundlephobia.com` or `npm run build` output)
- [ ] Dynamic imports (`next/dynamic`) used for large client components loaded conditionally
- [ ] No accidental server-only imports in client components

### Slow Query Detection
- Prisma slow query middleware logs `[SLOW QUERY]` for queries > 200ms (dev) / 500ms (prod)
- Bob: After E2E run, check console output for any `[SLOW QUERY]` warnings on new routes

## Output Format

```
PERFORMANCE FINDINGS — [PR/Branch Name]

🔴 BLOCKER: [N+1 query / missing index / full table scan] at [file:line]
   Fix: [specific fix]

🟠 WARN: [issue] at [file:line]
   Fix: [specific fix]

🟡 NOTE: [bundle size / optimization opportunity]

✅ PASS: DB queries, caching, bundle size
```

🔴 BLOCKER → fix before merge. 🟠 WARN → fix this sprint. 🟡 NOTE → backlog.
