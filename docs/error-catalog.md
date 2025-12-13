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
