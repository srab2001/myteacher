# Required Updates for Deployment

This document lists all commands required to deploy the Cases and Audit Log features.

---

## Database Updates

### 1. Apply Prisma Schema Changes

The following models were added:
- AuditLog (with AuditActionType and AuditEntityType enums)

Run the following commands to apply database changes:

```bash
# From project root
cd packages/db

# Generate Prisma client with new models
pnpm exec prisma generate

# Push schema changes to database (development)
pnpm exec prisma db push

# OR create and apply migration (production)
pnpm exec prisma migrate dev --name add_audit_log
```

### 2. Sync Migrations to API

Copy migrations to the API project for deployment:

```bash
cp -r packages/db/prisma/migrations apps/api/prisma/
cp packages/db/prisma/schema.prisma apps/api/prisma/
```

---

## Build Commands

### API Build

```bash
cd apps/api
pnpm build
```

### Web Build

```bash
cd apps/web
pnpm build
```

---

## Run Tests

```bash
# API tests
cd apps/api
pnpm test

# Web type check
cd apps/web
npx tsc --noEmit
```

---

## Production Deployment

### Vercel API Deployment

1. Ensure environment variables are set:
   - `DATABASE_URL`
   - `GOOGLE_CLIENT_ID`
   - `GOOGLE_CLIENT_SECRET`
   - `SESSION_SECRET`
   - `OPENAI_API_KEY`
   - `FRONTEND_URL`

2. Deploy triggers automatic migration:
   ```bash
   npx prisma migrate deploy
   ```

### Vercel Web Deployment

1. Ensure environment variables are set:
   - `API_URL` (server-side)
   - `NEXT_PUBLIC_API_URL` (client-side, dev only)

2. Standard Next.js deployment

---

## New Files Created

### API Files
- `apps/api/src/services/auditLog.ts` - Audit logging service
- `apps/api/src/routes/audit.ts` - Audit API routes

### Web Files
- `apps/web/src/app/students/[id]/cases/page.tsx` - Cases list page
- `apps/web/src/app/students/[id]/cases/page.module.css` - Cases list styles
- `apps/web/src/app/students/[id]/cases/[caseId]/page.tsx` - Case detail page
- `apps/web/src/app/students/[id]/cases/[caseId]/page.module.css` - Case detail styles
- `apps/web/src/app/admin/audit/page.tsx` - Admin audit log page
- `apps/web/src/app/admin/audit/page.module.css` - Admin audit log styles

### Documentation
- `docs/cases-audit-guide.md` - User guide for Cases and Audit features
- `docs/DEPLOYMENT-UPDATES.md` - This file

### Modified Files
- `packages/db/prisma/schema.prisma` - Added AuditLog model and enums
- `apps/api/src/app.ts` - Registered audit routes
- `apps/api/src/routes/planVersions.ts` - Added audit logging for finalize/download
- `apps/api/src/routes/signatures.ts` - Added audit logging for signature
- `apps/api/src/routes/disputes.ts` - Added audit logging for case view
- `apps/web/src/lib/api.ts` - Added audit types and API methods
- `apps/web/src/app/admin/layout.tsx` - Added Audit Log link to sidebar
- `docs/BLUEPRINT.md` - Updated with new features

---

## Quick Start Commands

```bash
# Full rebuild and deploy preparation
cd /path/to/myteacher

# 1. Generate Prisma client
pnpm --filter @myteacher/db exec prisma generate

# 2. Push schema changes (dev)
pnpm --filter @myteacher/db exec prisma db push

# 3. Build API
pnpm --filter @myteacher/api build

# 4. Type check web
cd apps/web && npx tsc --noEmit

# 5. Sync migrations for production
cp -r packages/db/prisma/migrations apps/api/prisma/
```

---

## RBAC Summary for New Features

| Feature | TEACHER | CASE_MANAGER | ADMIN |
|---------|---------|--------------|-------|
| View Cases | - | Yes | Yes |
| Create/Edit Cases | - | Yes | Yes |
| Add Case Events | - | Yes | Yes |
| View Audit Log | - | - | Yes |
| Export Audit CSV | - | - | Yes |
