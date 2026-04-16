# Threat Model Agent

**Trigger:** "run threat model" / "update threat model" / "scan attack surface"
**Owner:** Jarvis (runs on demand or after major new features)
**Output:** Updates `THREAT_MODEL.md` in repo root

## What This Agent Does

Scans the KinSync codebase to:
1. Enumerate all API routes and classify each as: session-gated / cron-gated / admin-gated / public
2. Find routes missing authentication checks
3. Find DB queries not scoped to familyId/userId from session
4. Identify new third-party integrations and their secret requirements
5. Update THREAT_MODEL.md with findings

## Scan Procedure

```
1. List all app/api/**/route.ts files
2. For each route file:
   - Check for getServerSession call
   - Check for authCron call (cron routes)
   - Check for isAdmin check (admin routes)
   - Check that DB queries include familyId or userId from session
   - Flag any that appear public without documentation
3. Check lib/ for new encryption usage, new API clients
4. Check prisma/schema.prisma for new models with sensitive fields
5. Update THREAT_MODEL.md sections 3 and 6 with new findings
6. Add revision history entry
```

## Rules

- Never remove existing threat entries without explicit instruction
- Flag IDOR risks on every new route with a dynamic [id] segment
- Mark accepted risks as "Accepted" with rationale, not just delete them
- After update: commit THREAT_MODEL.md with message `docs: update threat model [date]`
