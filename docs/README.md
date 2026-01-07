# MyTeacher Documentation

## User Guides

| Document | Purpose |
|----------|---------|
| [USER-GUIDE-OVERVIEW.md](./USER-GUIDE-OVERVIEW.md) | Quick start guide - get up and running fast |
| [USER-GUIDE-DETAILED.md](./USER-GUIDE-DETAILED.md) | Comprehensive guide to all features |

---

## Technical Documentation

| Document | Purpose |
|----------|---------|
| [BLUEPRINT.md](./BLUEPRINT.md) | Complete system overview - features, architecture, APIs |
| [error-catalog.md](./error-catalog.md) | Error codes, troubleshooting, lessons learned |
| [deployment-troubleshooting.md](./deployment-troubleshooting.md) | Deployment issues and fixes |
| [cases-audit-guide.md](./cases-audit-guide.md) | Audit logging and compliance tracking |

---

## Feature Documentation

### Rules Engine

| Document | Purpose |
|----------|---------|
| [rules-user-guide.md](./rules-user-guide.md) | Complete workflow for creating and deploying rule packs |
| [admin.md](./admin.md) | Admin API reference for rule pack management |
| [creating-rule-packs.md](./creating-rule-packs.md) | Step-by-step guide for creating rule packs |
| [rules.md](./rules.md) | Rules system reference (rule keys, evidence types) |
| [rules-engine.md](./rules-engine.md) | Technical implementation details |
| [rules-schema.md](./rules-schema.md) | Database schema for rules |

### Reporting

| Document | Purpose |
|----------|---------|
| [looker-queries.sql](./looker-queries.sql) | SQL queries for Google Looker compliance reports |

---

## Development & Troubleshooting

| Document | Purpose |
|----------|---------|
| [TESTING.md](./TESTING.md) | Testing guide |
| [google-oauth-troubleshooting.md](./google-oauth-troubleshooting.md) | OAuth setup and issues |
| [VERCEL_DEPLOYMENT_FIXES.md](./VERCEL_DEPLOYMENT_FIXES.md) | Vercel-specific fixes |

---

## Historical/Phase Docs

| Document | Purpose |
|----------|---------|
| [phase3.md](./phase3.md) | Phase 3 implementation notes |
| [PHASE_5_ADMIN_USERS.md](./PHASE_5_ADMIN_USERS.md) | Phase 5 admin users feature |

---

## Key Patterns (Quick Reference)

### Admin Authorization Bypass

Any route checking `teacherId` must include admin bypass:

```typescript
const isAdmin = req.user!.role === 'ADMIN';
const resource = await prisma.model.findFirst({
  where: {
    id: resourceId,
    ...(isAdmin ? {} : { student: { teacherId: req.user!.id } }),
  },
});
```

### React Async State

Return values directly from async functions:

```typescript
const startSession = async (): Promise<string | null> => {
  const result = await api.startSession();
  setSessionId(result.sessionId);
  return result.sessionId; // Return directly!
};
```

### Vercel Cache Issues

Redeploy without build cache when debugging Prisma issues:
1. Vercel Dashboard → Deployments
2. Click deployment → "..." → Redeploy
3. Uncheck "Use existing Build Cache"

---

## Document Status

| Document | Last Updated | Status |
|----------|--------------|--------|
| USER-GUIDE-OVERVIEW.md | 2026-01 | Current |
| USER-GUIDE-DETAILED.md | 2026-01 | Current |
| BLUEPRINT.md | 2024-12 | Current |
| error-catalog.md | 2026-01 | Current |
| deployment-troubleshooting.md | 2026-01 | Current |
| rules-user-guide.md | 2024-12 | Current |
| looker-queries.sql | 2024-12 | Current |
