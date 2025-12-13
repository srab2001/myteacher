/**
 * Standardized API Error Codes
 * See /docs/error-catalog.md for full documentation
 */
export type ApiErrorCode =
  | 'ERR_API_AUTH_REQUIRED'
  | 'ERR_API_FORBIDDEN'
  | 'ERR_API_STUDENT_NOT_FOUND'
  | 'ERR_API_PLAN_NOT_FOUND'
  | 'ERR_API_ARTIFACT_NOT_FOUND'
  | 'ERR_API_ARTIFACT_PARSE_FAILED'
  | 'ERR_API_ARTIFACT_COMPARE_FAILED'
  | 'ERR_API_VALIDATION_FAILED'
  | 'ERR_API_FILE_NOT_FOUND'
  | 'ERR_API_INTERNAL'
  | 'ERR_API_NOT_FOUND';

/**
 * Custom API Error class for standardized error responses
 */
export class ApiError extends Error {
  code: ApiErrorCode;
  status: number;
  details?: unknown;

  constructor(code: ApiErrorCode, status: number, message: string, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
    this.details = details;

    // Maintains proper stack trace for where error was thrown
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ApiError);
    }
  }

  /**
   * Convert to JSON response format
   */
  toJSON() {
    return {
      error: {
        code: this.code,
        message: this.message,
        ...(this.details && { details: this.details }),
      },
    };
  }
}

/**
 * Helper functions for common errors
 */
export const Errors = {
  authRequired: (message = 'Authentication required') =>
    new ApiError('ERR_API_AUTH_REQUIRED', 401, message),

  forbidden: (message = 'Access denied') =>
    new ApiError('ERR_API_FORBIDDEN', 403, message),

  studentNotFound: (studentId?: string) =>
    new ApiError(
      'ERR_API_STUDENT_NOT_FOUND',
      404,
      'Student not found',
      studentId ? { studentId } : undefined
    ),

  planNotFound: (planId?: string) =>
    new ApiError(
      'ERR_API_PLAN_NOT_FOUND',
      404,
      'Plan not found',
      planId ? { planId } : undefined
    ),

  artifactNotFound: (comparisonId?: string) =>
    new ApiError(
      'ERR_API_ARTIFACT_NOT_FOUND',
      404,
      'Artifact comparison not found',
      comparisonId ? { comparisonId } : undefined
    ),

  artifactParseFailed: (filename?: string, reason?: string) =>
    new ApiError(
      'ERR_API_ARTIFACT_PARSE_FAILED',
      400,
      'Failed to extract text from file',
      { filename, reason }
    ),

  artifactCompareFailed: (reason?: string) =>
    new ApiError(
      'ERR_API_ARTIFACT_COMPARE_FAILED',
      500,
      'Failed to compare artifacts using AI',
      reason ? { reason } : undefined
    ),

  validationFailed: (details?: unknown) =>
    new ApiError('ERR_API_VALIDATION_FAILED', 400, 'Validation failed', details),

  fileNotFound: (files?: string[]) =>
    new ApiError(
      'ERR_API_FILE_NOT_FOUND',
      404,
      'Artifact files not found. They may have been deleted.',
      files ? { files } : undefined
    ),

  notFound: (resource?: string) =>
    new ApiError(
      'ERR_API_NOT_FOUND',
      404,
      resource ? `${resource} not found` : 'Resource not found'
    ),

  internal: (message = 'Internal server error') =>
    new ApiError('ERR_API_INTERNAL', 500, message),
};
