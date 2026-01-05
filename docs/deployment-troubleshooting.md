# Deployment Troubleshooting Guide

This document covers common deployment issues, their root causes, and solutions based on real problems encountered.

## Table of Contents

- [Database Schema Issues](#database-schema-issues)
- [Vercel Deployment Issues](#vercel-deployment-issues)
- [Prisma Migration Issues](#prisma-migration-issues)
- [API Errors](#api-errors)
- [Lessons Learned](#lessons-learned)

---

## Database Schema Issues

### Error: "The column X does not exist in the current database"

**Symptom:**
```
PrismaClientKnownRequestError: The column `Goal.templateSourceId` does not exist in the current database.
```

**Cause:**
Migration was marked as applied (in `_prisma_migrations` table) but the actual SQL didn't execute. This happens when using `prisma migrate resolve --applied` to baseline migrations.

**Solution:**
1. Check if column exists:
```sql
SELECT column_name FROM information_schema.columns
WHERE table_name = 'Goal' AND column_name = 'templateSourceId';
```

2. Manually add the missing column:
```sql
ALTER TABLE "Goal" ADD COLUMN IF NOT EXISTS "templateSourceId" TEXT;
```

3. Or run via Prisma:
```typescript
await prisma.$executeRaw`ALTER TABLE "Goal" ADD COLUMN IF NOT EXISTS "templateSourceId" TEXT`;
```

**Prevention:**
- Avoid using `prisma migrate resolve --applied` unless you're certain the migration SQL has already been run
- Use `prisma migrate deploy` for production deployments
- Test migrations locally before deploying

---

### Error: "Cannot execute ALTER TABLE on table with data"

**Symptom:**
```
Error: Changed the type of `valueEditableBy` on the `FormFieldDefinition` table.
No cast exists, the column would be dropped and recreated.
```

**Cause:**
`prisma db push` tries to modify columns with existing data in ways that require dropping and recreating them.

**Solution:**
1. Use migrations instead of `db push`:
```json
// vercel.json - WRONG
"installCommand": "... prisma db push --accept-data-loss ..."

// vercel.json - CORRECT
"installCommand": "... prisma migrate deploy ..."
```

2. Create explicit migrations for schema changes

**Prevention:**
- Always use `prisma migrate deploy` in production
- Never use `db push` in production environments

---

## Vercel Deployment Issues

### Build Cache Causing Stale Prisma Client

**Symptom:**
- API returns 500 errors
- Prisma client references fields that don't exist or are outdated
- Works locally but fails on Vercel

**Solution:**
1. Redeploy without cache:
   - Go to Vercel Dashboard → Deployments
   - Click latest deployment → "..." menu → Redeploy
   - **Uncheck** "Use existing Build Cache"
   - Click Redeploy

2. Force rebuild by changing a file:
```typescript
// api/index.ts
// Force rebuild: YYYY-MM-DD
```

---

### Missing Files in Serverless Function

**Symptom:**
- `prisma migrate deploy` fails with "No migrations found"
- Schema file not found errors

**Cause:**
Vercel's serverless bundler doesn't include all necessary files.

**Solution:**
Add files to `includeFiles` in vercel.json:
```json
{
  "builds": [{
    "src": "api/index.ts",
    "use": "@vercel/node",
    "config": {
      "includeFiles": [
        "prisma/generated/**",
        "prisma/schema.prisma",
        "prisma/migrations/**"
      ]
    }
  }]
}
```

---

### Root Directory Configuration

**Symptom:**
- Build can't find files
- Wrong package.json being used

**Solution:**
1. Set correct root directory in Vercel project settings:
   - API project: `apps/api`
   - Web project: `apps/web`

2. Enable "Include source files outside of the Root Directory" if using monorepo with shared packages

---

## Prisma Migration Issues

### Migrations Out of Sync Between Directories

**Symptom:**
- `packages/db/prisma/migrations/` has different migrations than `apps/api/prisma/migrations/`
- Deploy fails because migrations don't match database state

**Solution:**
1. Sync migrations:
```bash
rm -rf apps/api/prisma/migrations
cp -r packages/db/prisma/migrations apps/api/prisma/
```

2. Commit and push:
```bash
git add apps/api/prisma/migrations/
git commit -m "Sync migrations from packages/db"
```

**Prevention:**
- Keep migrations in one canonical location (packages/db)
- Use a script to sync migrations before deployment
- Or configure apps/api to reference packages/db migrations

---

### Migration Marked Applied But Not Executed

**Symptom:**
- `prisma migrate status` shows "Database schema is up to date"
- But queries fail with "column does not exist"

**Cause:**
Used `prisma migrate resolve --applied <migration_name>` to mark migration as complete without actually running the SQL.

**Solution:**
1. Identify missing changes by reading the migration SQL file
2. Manually execute the missing SQL statements
3. Verify columns/tables exist:
```sql
SELECT column_name FROM information_schema.columns WHERE table_name = 'YourTable';
```

---

## API Errors

### 500 Error: "Plan not found" (Actually Schema Mismatch)

**Symptom:**
- Frontend shows "Plan not found"
- Console shows 500 error (not 404)
- Vercel logs show Prisma error about missing column

**Cause:**
The error message "Failed to fetch plan" is generic - the actual cause is a Prisma schema mismatch.

**Diagnosis:**
1. Check Vercel Function Logs (Deployments → click deployment → Functions tab)
2. Look for actual Prisma error in logs
3. Common causes:
   - Missing database column
   - Schema not regenerated after changes
   - Cached Prisma client

**Solution:**
1. Fix database schema (add missing columns)
2. Regenerate Prisma client
3. Redeploy without cache

---

### 404 Error: "Student not found"

**Symptom:**
- API returns 404 for student endpoints
- Student exists in database

**Possible Causes:**
1. Wrong student ID (check full UUID)
2. User doesn't have access to student (permission issue)
3. Student's jurisdiction doesn't match user's jurisdiction

**Diagnosis:**
```typescript
// Check student exists
const student = await prisma.student.findUnique({ where: { id: studentId } });

// Check user has access
const hasAccess = await canAccessStudent(userId, studentId);
```

---

### Seed Script Failures

**Symptom:**
```
TypeError: Cannot read properties of undefined (reading 'count')
```

**Cause:**
Seed script references models that don't exist in current schema.

**Solution:**
Update seed script to match current schema:
```typescript
// OLD - references non-existent State model
const stateCount = await prisma.state.count();

// NEW - use models that exist
const jurisdictionCount = await prisma.jurisdiction.count();
```

---

## Lessons Learned

### 1. Never Use `db push` in Production

**Problem:** `prisma db push` was used in vercel.json, causing schema sync issues with existing data.

**Solution:** Always use `prisma migrate deploy` for production.

```json
// WRONG
"installCommand": "... prisma db push --accept-data-loss ..."

// CORRECT
"installCommand": "... prisma migrate deploy ..."
```

### 2. Keep Migrations Synchronized

**Problem:** `apps/api/prisma/migrations/` had different migrations than `packages/db/prisma/migrations/`.

**Solution:**
- Copy migrations: `cp -r packages/db/prisma/migrations apps/api/prisma/`
- Commit both directories
- Consider having a single source of truth

### 3. Check Actual Error in Vercel Logs

**Problem:** Frontend showed generic "Plan not found" but actual error was database schema mismatch.

**Solution:** Always check Vercel Function Logs for the real error message, not just the HTTP status code.

### 4. Vercel Build Cache Can Cause Issues

**Problem:** Stale Prisma client cached from previous build.

**Solution:** Redeploy without build cache when debugging Prisma issues.

### 5. Migration Resolve Doesn't Execute SQL

**Problem:** Using `prisma migrate resolve --applied` marks migration as done but doesn't run the SQL.

**Solution:**
- Only use `resolve` when you've manually run the SQL
- For fresh deployments, use `migrate deploy`
- If columns are missing, add them manually

### 6. Include Migrations in Vercel Build

**Problem:** Migrations folder wasn't included in serverless function bundle.

**Solution:**
```json
"includeFiles": [
  "prisma/generated/**",
  "prisma/schema.prisma",
  "prisma/migrations/**"
]
```

### 7. Test Database Connectivity Before Assuming Code Issues

**Problem:** Assumed code bug when actual issue was database schema state.

**Solution:**
```bash
# Check migration status
prisma migrate status

# Check actual columns
SELECT column_name FROM information_schema.columns WHERE table_name = 'TableName';
```

### 8. Seed Scripts Must Match Schema

**Problem:** Seed script referenced `State` and `District` models that were removed from schema.

**Solution:** Update seed scripts whenever schema changes significantly.

### 9. Make Migrations Idempotent for Failure Recovery

**Problem:** Migration ran partially (some objects created) then failed. Re-running fails with "already exists" errors.

**Solution:** Convert migration SQL to be idempotent:

```sql
-- For CREATE TYPE (enums)
DO $$ BEGIN
    CREATE TYPE "MyEnum" AS ENUM ('VALUE1', 'VALUE2');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- For CREATE TABLE
CREATE TABLE IF NOT EXISTS "MyTable" (...);

-- For CREATE INDEX
CREATE INDEX IF NOT EXISTS "my_index" ON "MyTable"("column");

-- For ADD CONSTRAINT (foreign keys)
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_name') THEN
        ALTER TABLE "MyTable" ADD CONSTRAINT "fk_name" FOREIGN KEY ...;
    END IF;
END $$;
```

**When to apply:** When `prisma migrate deploy` fails with P3018 errors like "type already exists" or "relation already exists".

---

### 9. Express Route Ordering Causes 404 Errors

**Problem:** Dashboard endpoints returned "not found" errors with the URL segment captured as a parameter ID.

**Error:**
```
{ taskId: 'dashboard' }
{ scheduleId: 'dashboard' }
```

**Cause:** Express matches routes in definition order. Parameterized routes (`:id`) before specific routes (`/dashboard`) capture everything.

**Solution:** Always define specific routes BEFORE parameterized routes:
```typescript
// CORRECT ORDER
router.get('/items/dashboard', ...);  // Specific - checked first
router.get('/items/:itemId', ...);    // Parameterized - checked last
```

**Files that needed this fix:**
- `apps/api/src/routes/complianceTasks.ts`
- `apps/api/src/routes/reviewSchedules.ts`
- `apps/api/src/routes/disputes.ts` (may need similar fix)
- `apps/api/src/routes/alerts.ts` (may need similar fix)

---

### 10. Vercel Build Cache Prevents Code Updates

**Problem:** Code changes pushed to Git but Vercel still serves old code.

**Evidence:** Build log shows "Restored build cache from previous deployment"

**Solution:**
1. Go to Vercel Dashboard → Deployments
2. Click ⋮ menu on latest deployment
3. Click "Redeploy"
4. **UNCHECK** "Use existing Build Cache"
5. Click Redeploy

**Alternative:** Project Settings → General → Build Cache → Clear

---

### 11. Environment Variables Not Applied to Production

**Problem:** Login works in Preview but fails in Production with 500 errors.

**Cause:** Environment variables set only for Preview environment, not Production.

**Solution:**
1. Go to Vercel Dashboard → Settings → Environment Variables
2. For each variable, ensure "Production" checkbox is checked
3. Required variables for API:
   - `DATABASE_URL`
   - `SESSION_SECRET` (min 32 chars)
   - `FRONTEND_URL`
   - `GOOGLE_CLIENT_ID`
   - `GOOGLE_CLIENT_SECRET`
4. Redeploy after adding variables

---

### 12. Wrong Root Directory in Vercel

**Problem:** API returns DEPLOYMENT_NOT_FOUND or 404 for all routes.

**Cause:** Vercel Root Directory set to wrong path (e.g., `apps/web` for API project).

**Solution:**
1. Go to Vercel Project → Settings → General
2. Set Root Directory:
   - API project: `apps/api`
   - Web project: `apps/web`
3. Redeploy without cache

---

### 13. Missing Database Tables in Production

**Problem:** API returns errors like "table does not exist".

**Cause:** Schema has models but migrations weren't created/deployed.

**Solution:**
1. Create migration file: `prisma/migrations/YYYYMMDDHHMMSS_name/migration.sql`
2. Use idempotent SQL:
```sql
CREATE TABLE IF NOT EXISTS "TableName" (...);
CREATE INDEX IF NOT EXISTS "idx_name" ON "TableName"("column");
DO $$ BEGIN
    ALTER TABLE "TableName" ADD CONSTRAINT "fk_name" ...;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
```
3. Commit, push, and verify Vercel runs `prisma migrate deploy`

---

## Quick Diagnosis Checklist

When deployment fails with Prisma/database errors:

- [ ] Check Vercel Function Logs for actual error
- [ ] Run `prisma migrate status` to check migration state
- [ ] Query `_prisma_migrations` table to see what's recorded
- [ ] Check if columns/tables actually exist in database
- [ ] Verify migrations are synced between directories
- [ ] Clear Vercel build cache and redeploy
- [ ] Check vercel.json uses `migrate deploy` not `db push`
- [ ] Verify `includeFiles` has migrations folder

When routes return unexpected 404 errors:

- [ ] Check if specific routes are defined BEFORE parameterized routes
- [ ] Look at error details - is a URL segment being captured as an ID?
- [ ] Verify route order in the router file
- [ ] Redeploy without cache after fixing

When authentication fails in production:

- [ ] Verify Root Directory is correct for the project type
- [ ] Check all environment variables are set for Production
- [ ] Verify FRONTEND_URL matches the actual frontend domain
- [ ] Check Google OAuth credentials are for production domain
- [ ] Clear cookies and try logging in again
