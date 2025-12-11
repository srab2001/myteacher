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
