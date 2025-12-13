/**
 * API Error Response Types
 * See /docs/error-catalog.md for full documentation
 */
export interface ApiErrorResponse {
  error?: {
    code?: string;
    message?: string;
    details?: unknown;
  };
}

/**
 * Extract error information from various error types
 */
function extractErrorInfo(err: unknown): { code?: string; message?: string } {
  // Handle axios-style errors
  const axiosError = err as { response?: { data?: ApiErrorResponse } };
  if (axiosError.response?.data?.error) {
    return {
      code: axiosError.response.data.error.code,
      message: axiosError.response.data.error.message,
    };
  }

  // Handle fetch-style errors with parsed JSON
  const fetchError = err as { error?: { code?: string; message?: string } };
  if (fetchError.error) {
    return {
      code: fetchError.error.code,
      message: fetchError.error.message,
    };
  }

  // Handle standard Error objects
  if (err instanceof Error) {
    return { message: err.message };
  }

  return {};
}

/**
 * Map API error codes to user-friendly messages
 *
 * @param err - The error object from API call
 * @returns A user-friendly error message
 */
export function mapApiErrorToMessage(err: unknown): string {
  const { code, message } = extractErrorInfo(err);

  // Map known error codes to friendly messages
  switch (code) {
    // Authentication errors
    case 'ERR_API_AUTH_REQUIRED':
      return 'Please sign in to continue.';

    // Authorization errors
    case 'ERR_API_FORBIDDEN':
      return 'You do not have access to this resource.';

    // Resource not found errors
    case 'ERR_API_STUDENT_NOT_FOUND':
      return 'Student not found. They may have been removed.';
    case 'ERR_API_PLAN_NOT_FOUND':
      return 'Plan not found. It may have been deleted.';
    case 'ERR_API_ARTIFACT_NOT_FOUND':
      return 'Artifact comparison not found.';
    case 'ERR_API_FILE_NOT_FOUND':
      return 'Files not found. They may have been deleted. Please re-upload.';

    // Processing errors
    case 'ERR_API_ARTIFACT_PARSE_FAILED':
      return 'Could not read the file. Please try a different format.';
    case 'ERR_API_ARTIFACT_COMPARE_FAILED':
      return 'Failed to compare artifacts. Please try again.';

    // Validation errors
    case 'ERR_API_VALIDATION_FAILED':
      return 'Please check your input and try again.';

    // Internal errors
    case 'ERR_API_INTERNAL':
      return 'An unexpected error occurred. Please try again later.';

    // Not found (404)
    case 'ERR_API_NOT_FOUND':
      return 'The requested resource was not found.';

    default:
      // If we have a message from the API, use it
      if (message) {
        return message;
      }
      // Generic fallback
      return 'An error occurred. Please try again.';
  }
}

/**
 * Check if error is an authentication error
 */
export function isAuthError(err: unknown): boolean {
  const { code } = extractErrorInfo(err);
  return code === 'ERR_API_AUTH_REQUIRED';
}

/**
 * Check if error is a forbidden/authorization error
 */
export function isForbiddenError(err: unknown): boolean {
  const { code } = extractErrorInfo(err);
  return code === 'ERR_API_FORBIDDEN';
}

/**
 * Check if error is a not found error
 */
export function isNotFoundError(err: unknown): boolean {
  const { code } = extractErrorInfo(err);
  return [
    'ERR_API_STUDENT_NOT_FOUND',
    'ERR_API_PLAN_NOT_FOUND',
    'ERR_API_ARTIFACT_NOT_FOUND',
    'ERR_API_NOT_FOUND',
  ].includes(code || '');
}

/**
 * Get the error code from an error object
 */
export function getErrorCode(err: unknown): string | undefined {
  return extractErrorInfo(err).code;
}
