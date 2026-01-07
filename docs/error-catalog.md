# Error Catalog

This document catalogs all standardized API error codes used in the MyTeacher application.

## Error Response Format

All API errors follow this JSON structure:

```json
{
  "error": {
    "code": "ERR_API_*",
    "message": "Human-readable error message",
    "details": { /* optional context-specific data */ }
  }
}
```

## Error Codes

### Authentication Errors

| Code | HTTP Status | Description | Common Causes |
|------|-------------|-------------|---------------|
| `ERR_API_AUTH_REQUIRED` | 401 | User is not authenticated | Missing or expired session, invalid token |

### Authorization Errors

| Code | HTTP Status | Description | Common Causes |
|------|-------------|-------------|---------------|
| `ERR_API_FORBIDDEN` | 403 | User lacks permission for requested action | Accessing another teacher's student data, admin-only routes |

### Resource Not Found Errors

| Code | HTTP Status | Description | Common Causes |
|------|-------------|-------------|---------------|
| `ERR_API_STUDENT_NOT_FOUND` | 404 | Requested student does not exist | Invalid student ID, student was deleted |
| `ERR_API_PLAN_NOT_FOUND` | 404 | Requested plan does not exist | Invalid plan ID, plan was deleted |
| `ERR_API_ARTIFACT_NOT_FOUND` | 404 | Artifact comparison does not exist | Invalid comparison ID, comparison was deleted |
| `ERR_API_FILE_NOT_FOUND` | 404 | Referenced files not found on disk | Files were deleted or moved |
| `ERR_API_NOT_FOUND` | 404 | Generic resource not found | Various resources |

### Processing Errors

| Code | HTTP Status | Description | Common Causes |
|------|-------------|-------------|---------------|
| `ERR_API_ARTIFACT_PARSE_FAILED` | 400 | Could not extract text from uploaded file | Corrupt file, unsupported format, empty file |
| `ERR_API_ARTIFACT_COMPARE_FAILED` | 500 | AI comparison service failed | OpenAI API errors, timeout, rate limiting |

### Validation Errors

| Code | HTTP Status | Description | Common Causes |
|------|-------------|-------------|---------------|
| `ERR_API_VALIDATION_FAILED` | 400 | Request data failed validation | Missing required fields, invalid data types |

### Internal Errors

| Code | HTTP Status | Description | Common Causes |
|------|-------------|-------------|---------------|
| `ERR_API_INTERNAL` | 500 | Unexpected server error | Database errors, unhandled exceptions |

## Frontend Error Mapping

The frontend maps these error codes to user-friendly messages in `apps/web/src/lib/errorMapping.ts`.

| Error Code | User-Friendly Message |
|------------|----------------------|
| `ERR_API_AUTH_REQUIRED` | "Please sign in to continue." |
| `ERR_API_FORBIDDEN` | "You do not have access to this resource." |
| `ERR_API_STUDENT_NOT_FOUND` | "Student not found. They may have been removed." |
| `ERR_API_PLAN_NOT_FOUND` | "Plan not found. It may have been deleted." |
| `ERR_API_ARTIFACT_NOT_FOUND` | "Artifact comparison not found." |
| `ERR_API_FILE_NOT_FOUND` | "Files not found. They may have been deleted. Please re-upload." |
| `ERR_API_ARTIFACT_PARSE_FAILED` | "Could not read the file. Please try a different format." |
| `ERR_API_ARTIFACT_COMPARE_FAILED` | "Failed to compare artifacts. Please try again." |
| `ERR_API_VALIDATION_FAILED` | "Please check your input and try again." |
| `ERR_API_INTERNAL` | "An unexpected error occurred. Please try again later." |

## Usage in Code

### Backend (Express)

```typescript
import { ApiError, Errors } from '../errors.js';

// Throw specific errors
if (!student) {
  throw Errors.studentNotFound(studentId);
}

if (!plan) {
  throw Errors.planNotFound(planId);
}

// The global error handler will convert these to JSON responses
```

### Frontend (React)

```typescript
import { mapApiErrorToMessage } from '@/lib/errorMapping';

try {
  await api.getStudent(studentId);
} catch (err) {
  const message = mapApiErrorToMessage(err);
  setError(message);
}
```

## Adding New Error Codes

1. Add the code to `ApiErrorCode` type in `apps/api/src/errors.ts`
2. Add a helper function in the `Errors` object
3. Add the mapping in `apps/web/src/lib/errorMapping.ts`
4. Document the code in this file

---

## Troubleshooting Guide

This section documents common errors encountered during development and their resolutions.

### 1. Student.schoolId Column Missing

**Error:**
```
Invalid `prisma.student.create()` invocation:
Unknown argument `schoolId`. Did you mean `schoolName`?
```

**Cause:** The `admin.ts` student creation endpoint was referencing a `schoolId` field and `School` model that don't exist in the Prisma schema. The schema uses `schoolName` (a string field) instead of a foreign key relationship to a School table.

**Resolution:**
- Removed all `schoolId` references from the student creation endpoint in `apps/api/src/routes/admin.ts`
- Changed code to use `schoolName` string field instead
- File: `apps/api/src/routes/admin.ts`

---

### 2. Manage Goals Navigation Redirecting to Wrong Page

**Error:** Clicking "Manage Goals" within the IEP brought the user back to the student home page instead of the goals page.

**Cause:** The navigation was using `router.push()` which can have issues with Next.js client-side navigation in certain scenarios.

**Resolution:**
- Changed from `router.push()` to Next.js `Link` component for more reliable navigation
- Added `import Link from 'next/link';` to IEP page
- File: `apps/web/src/app/students/[id]/plans/[planId]/iep/page.tsx`

---

### 3. PlanInstance.label Field Doesn't Exist

**Error:**
```
Invalid `prisma.planInstance.findFirst()` invocation:
Unknown field `label` for select statement on model PlanInstance.
```
Console showed: `GET /api/students/.../artifact-compare 500`

**Cause:** The `artifactCompare.ts` route was selecting a `label` field on `PlanInstance` that doesn't exist in the Prisma schema.

**Resolution:**
- Changed `select: { id: true, label: true }` to `select: { id: true, status: true, startDate: true }`
- Constructed `planLabel` dynamically from status and startDate: `${status} - ${date.toLocaleDateString()}`
- File: `apps/api/src/routes/artifactCompare.ts` (lines ~500 and ~586)

---

### 4. PlanSchema.planInstances Relation Doesn't Exist

**Error:**
```
Invalid `prisma.planSchema.findMany()` invocation:
Unknown field `planInstances` for select statement on model PlanSchemaCountOutputType.
```

**Cause:** The `admin.ts` route was using `_count: { select: { planInstances: true } }` but the PlanSchema model uses `instances` as the relation name, not `planInstances`.

**Resolution:**
- Changed `_count: { select: { planInstances: true } }` to `_count: { select: { instances: true } }`
- Updated in two places in `apps/api/src/routes/admin.ts` (lines ~648 and ~1087)
- File: `apps/api/src/routes/admin.ts`

---

### 5. Goal Wizard Not Launching from IEP Page

**Error:** Clicking "Goal Wizard" or "Add Goals" button within the IEP took user back to the student screen instead of launching the Goal Wizard panel.

**Cause:** Multiple potential issues:
1. Button event handling could trigger unintended navigation
2. Schema section might not have `isGoalsSection: true` flag set
3. Potential event bubbling or form submission issues

**Resolution:**
Applied multiple fixes to make the Goal Wizard more robust:

1. **Button Event Handling** (`apps/web/src/app/students/[id]/plans/[planId]/iep/page.tsx`):
   - Added `type="button"` to prevent form submission
   - Added `e.preventDefault()` and `e.stopPropagation()` to prevent event bubbling
   - Added defensive check `&& plan` before rendering overlay
   - Added optional chaining `plan.student?.grade` for safety
   - Added click-outside-to-close behavior for overlay

2. **Robust Section Detection** - Made the goals section detection check multiple conditions:
   ```typescript
   {(currentSectionData.isGoalsSection ||
     currentSectionData.key === 'goals' ||
     currentSectionData.fields?.some(f => f.type === 'goals')) ? (
     // Show Goal Wizard UI
   ) : (
     // Show regular fields
   )}
   ```

This ensures the Goal Wizard appears even if:
- The `isGoalsSection` flag is missing (older schemas)
- The section key is 'goals'
- Any field in the section has type 'goals'

---

### 6. Admin Field Management UI Missing

**Error:** Admin interface didn't show capability to change field "required" status or add new custom fields.

**Cause:** The schema detail page had field editing functionality hidden behind a button and lacked UI for adding new fields.

**Resolution:**
- Modified `apps/web/src/app/admin/schemas/[id]/page.tsx`:
  - Field editor now shows by default (removed toggle)
  - Added "+ Add Field" button to each section
  - Created modal for adding new fields with type selection (text, textarea, date, select, checkbox, number)
  - Added dropdown options input for select fields
- Added `addSchemaField` API method to `apps/web/src/lib/api.ts`
- Added POST `/admin/schemas/:id/fields` backend endpoint to `apps/api/src/routes/admin.ts`
- Added modal styles to `apps/web/src/app/admin/schemas/[id]/page.module.css`

---

## Quick Reference: Common Prisma Schema Mismatches

| Incorrect Reference | Correct Reference | Model |
|---------------------|-------------------|-------|
| `Student.schoolId` | `Student.schoolName` | Student |
| `PlanInstance.label` | Construct from `status` + `startDate` | PlanInstance |
| `PlanSchema.planInstances` | `PlanSchema.instances` | PlanSchema |

## Quick Reference: Section Detection for Special Sections

For sections that need special UI (like Goals), use multiple detection methods:

```typescript
// Goals section detection
const isGoalsSection =
  section.isGoalsSection ||           // Explicit flag
  section.key === 'goals' ||          // Key-based detection
  section.fields?.some(f => f.type === 'goals');  // Field type detection

// Behavior targets section detection
const isBehaviorSection =
  section.isBehaviorTargetsSection ||
  section.key === 'behavior_targets' ||
  section.fields?.some(f => f.type === 'behavior_targets');
```

---

### 7. Goal Wizard Send Button Not Working (404 Errors)

**Error:**
```
POST /api/goal-wizard/session/start 404
{error: 'Plan not found'}
```

Console showed the request was reaching the API but returning 404 "Plan not found".

**Cause:** The `goalWizard.ts` route was checking `student: { teacherId: req.user!.id }` without an admin bypass. Admin users were blocked because they don't own students directly.

**Resolution:**
Added admin authorization bypass to the session start route:

```typescript
// Before (broken for admins)
const plan = await prisma.planInstance.findFirst({
  where: {
    id: data.planId,
    student: { teacherId: req.user!.id },
  },
});

// After (works for admins)
const isAdmin = req.user!.role === 'ADMIN';
const plan = await prisma.planInstance.findFirst({
  where: {
    id: data.planId,
    ...(isAdmin ? {} : { student: { teacherId: req.user!.id } }),
  },
});
```

- File: `apps/api/src/routes/goalWizard.ts` (session start route)

---

### 8. Goal Wizard Save Goal Fails (404 Errors)

**Error:**
```
POST /api/plans/{planId}/goals 404
{error: 'Plan not found'}
```

After fixing the session start, the Goal Wizard could chat but failed when trying to save goals.

**Cause:** Same authorization issue in `goals.ts` - both POST (create goal) and GET (list goals) routes were checking teacher ownership without admin bypass.

**Resolution:**
Applied the same admin bypass pattern to goals routes:

```typescript
// POST /plans/:planId/goals
const isAdmin = req.user!.role === 'ADMIN';
const plan = await prisma.planInstance.findFirst({
  where: {
    id: req.params.planId,
    ...(isAdmin ? {} : { student: { teacherId: req.user!.id } }),
  },
});

// GET /plans/:planId/goals
const isAdmin = req.user!.role === 'ADMIN';
const goals = await prisma.goal.findMany({
  where: {
    planInstanceId: req.params.planId,
    ...(isAdmin ? {} : { planInstance: { student: { teacherId: req.user!.id } } }),
  },
});
```

- File: `apps/api/src/routes/goals.ts` (lines 20-35, 64-73)

---

### 9. React Async State Timing Issue

**Error:** Goal Wizard send button appeared to do nothing. The session started but the message was sent to `null` sessionId.

**Cause:** React's `setState` is asynchronous. Code was calling `setSessionId(result.sessionId)` then immediately using `sessionId` state variable, which was still the old value.

```typescript
// Broken pattern
const startSession = async () => {
  const result = await api.startSession();
  setSessionId(result.sessionId);
  // sessionId is STILL null here!
};

const sendMessage = async () => {
  if (!sessionId) await startSession();
  // sessionId is STILL null here because setState is async!
  await api.sendMessage(sessionId, message);
};
```

**Resolution:** Return the value directly from the async function instead of relying on state:

```typescript
// Fixed pattern
const startSession = async (): Promise<string | null> => {
  const result = await api.startSession();
  setSessionId(result.sessionId);
  return result.sessionId; // Return the value directly
};

const sendMessage = async () => {
  let currentSessionId = sessionId;
  if (!currentSessionId) {
    currentSessionId = await startSession(); // Get returned value
    if (!currentSessionId) return;
  }
  await api.sendMessage(currentSessionId, message); // Use local variable
};
```

- File: `apps/web/src/components/goals/GoalWizardPanel.tsx`

---

### 10. TypeScript Null Index Error

**Error:**
```
Type 'null' cannot be used as an index type.
```

In the Rules Setup Wizard when displaying created evidence type's plan type.

**Cause:** Code was using a potentially null value as an object key without null check:

```typescript
// Broken
PLAN_TYPE_LABELS[createdEvidence.planType] // planType could be null
```

**Resolution:** Add null check with fallback:

```typescript
// Fixed
createdEvidence.planType ? PLAN_TYPE_LABELS[createdEvidence.planType] : 'All'
```

- File: `apps/web/src/app/admin/rules/wizard/page.tsx`

---

### 11. Git Push Rejected - Large File

**Error:**
```
remote: error: File wireframes/Screen Recording... is 101.85 MB; this exceeds GitHub's file size limit of 100.00 MB
```

**Cause:** Large video file was accidentally staged for commit.

**Resolution:**
1. Reset the commit: `git reset HEAD~1`
2. Remove large files from staging
3. Recommit only code changes
4. Push successfully

**Prevention:** Add large file patterns to `.gitignore`:
```
*.mov
*.mp4
*.avi
```

---

## Quick Reference: Admin Authorization Pattern

**CRITICAL:** Any route that checks `teacherId` for authorization must include admin bypass.

```typescript
// Standard pattern for all plan/student access routes
const isAdmin = req.user!.role === 'ADMIN';
const resource = await prisma.model.findFirst({
  where: {
    id: resourceId,
    // Admin bypass: empty object for admins, teacher check for others
    ...(isAdmin ? {} : { student: { teacherId: req.user!.id } }),
  },
});
```

**Routes that need this pattern:**
- `goals.ts` - POST/GET `/plans/:planId/goals`
- `goalWizard.ts` - POST `/goal-wizard/session/start`
- `plans.ts` - GET/PATCH `/plans/:planId`
- `services.ts` - GET/POST `/plans/:planId/services`
- `behavior.ts` - GET/POST behavior-related routes
- Any other route checking `teacherId`

---

## Quick Reference: Async State in React

**Problem:** React `setState` is asynchronous - state doesn't update immediately.

**Solution:** Return values directly from async functions instead of relying on state:

```typescript
// Return the value directly
const startSession = async (): Promise<string | null> => {
  const result = await api.startSession();
  setSessionId(result.sessionId);
  return result.sessionId; // <-- Return it
};

// Use local variable
let currentId = existingId || await startSession();
```

---

## Debugging Checklist

When encountering 404 errors on routes that should work:

1. [ ] Check Vercel Function Logs for actual error message
2. [ ] Look for authorization checks using `teacherId`
3. [ ] If user is admin, verify admin bypass pattern exists
4. [ ] Check if route has conditional where clause
5. [ ] Test with a teacher account to isolate admin-specific issue

When encountering "nothing happens" on button clicks:

1. [ ] Add console.log statements to trace execution
2. [ ] Check browser console for errors
3. [ ] Verify async/await is handled correctly
4. [ ] Check if setState timing is affecting logic
5. [ ] Use local variables for values needed immediately after async calls

---

### 12. Express Route Ordering - Parameter Capture Issue

**Error:**
```
[ERR_COMPLIANCE_TASK_NOT_FOUND] Compliance task not found { taskId: 'dashboard' }
[ERR_REVIEW_SCHEDULE_NOT_FOUND] Review schedule not found { scheduleId: 'dashboard' }
```

**Cause:** Express matches routes in the order they are defined. A parameterized route like `/:taskId` defined BEFORE a specific route like `/dashboard` will capture "dashboard" as the taskId parameter.

**Bad Order:**
```typescript
router.get('/compliance-tasks/:taskId', ...);  // Line 237 - catches "dashboard"
router.get('/compliance-tasks/dashboard', ...); // Line 516 - never reached!
```

**Resolution:**
Move specific routes BEFORE parameterized routes:

```typescript
// GOOD - Specific routes first
router.get('/compliance-tasks/my-tasks', ...);   // Specific route
router.get('/compliance-tasks/dashboard', ...);  // Specific route
router.get('/compliance-tasks/:taskId', ...);    // Parameterized route LAST
```

**Files Fixed:**
- `apps/api/src/routes/complianceTasks.ts` - moved `/dashboard` before `/:taskId`
- `apps/api/src/routes/reviewSchedules.ts` - moved `/dashboard` before `/:scheduleId`

**Prevention:**
Always define specific routes before parameterized routes in Express routers.

---

### 13. Missing Database Tables After Schema Changes

**Error:**
```
Invalid `prisma.disputeCase.count()` invocation:
The table `public.DisputeCase` does not exist in the current database.
```

**Cause:** Prisma schema includes models that haven't been migrated to the database.

**Resolution:**
1. Create a manual migration SQL file with `CREATE TABLE IF NOT EXISTS`
2. Place in `prisma/migrations/YYYYMMDDHHMMSS_migration_name/migration.sql`
3. Run `pnpm --filter @myteacher/api build` to apply

**Prevention:**
- Always create migrations when adding new models
- Check `prisma migrate status` before deploying

---

### 14. Vercel Build Cache Serving Old Code

**Error:** Route fixes deployed but Vercel still serves old code.

**Evidence in Build Log:**
```
Restored build cache from previous deployment (xxx)
```

**Resolution:**
1. Go to Vercel Dashboard → Deployments
2. Click three dots (⋮) on latest deployment → "Redeploy"
3. **UNCHECK** "Use existing Build Cache"
4. Click Redeploy

---

### 15. Google OAuth 401/500 Errors on Production

**Cause:** Multiple possible issues:
1. Vercel Root Directory incorrect (should be `apps/api` for API)
2. Environment variables not set for Production
3. Missing DATABASE_URL, SESSION_SECRET, FRONTEND_URL

**Resolution:**
1. Verify Root Directory in Vercel project settings
2. Set all environment variables for **Production** (not just Preview)
3. Redeploy without cache

---

## Quick Reference: Express Route Ordering

**CRITICAL:** Routes are matched in definition order. Always define:
1. Static routes (`/health`)
2. Specific path routes (`/dashboard`, `/my-tasks`)
3. Parameterized routes (`/:id`) - LAST

---

## Quick Reference: Vercel Deployment Checklist

1. [ ] Root Directory correct (api vs web)
2. [ ] Environment Variables set for Production
3. [ ] Build Logs show no errors
4. [ ] Runtime Logs checked for actual errors
5. [ ] If code changes aren't reflected, redeploy WITHOUT cache
6. [ ] Database migrations applied
