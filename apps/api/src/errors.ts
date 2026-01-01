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
  | 'ERR_API_NOT_FOUND'
  // Decision Ledger errors
  | 'ERR_DECISION_CREATE_FOR_NON_IEP'
  | 'ERR_DECISION_VOID_REQUIRES_REASON'
  | 'ERR_DECISION_NOT_FOUND'
  | 'ERR_DECISION_ALREADY_VOIDED'
  // Signature errors
  | 'ERR_SIGN_PACKET_EXISTS'
  | 'ERR_SIGN_PACKET_NOT_FOUND'
  | 'ERR_SIGN_ALREADY_SIGNED'
  | 'ERR_SIGN_UNAUTHORIZED_ROLE'
  | 'ERR_SIGN_PACKET_COMPLETE'
  // Version errors
  | 'ERR_VERSION_NOT_FOUND'
  | 'ERR_VERSION_ALREADY_DISTRIBUTED'
  | 'ERR_VERSION_REQUIRES_CM_SIGNATURE'
  | 'ERR_VERSION_STATUS_INVALID'
  // Scheduled Services errors
  | 'ERR_SCHEDULED_PLAN_EXISTS'
  | 'ERR_SCHEDULED_PLAN_NOT_FOUND'
  // Review Schedule errors
  | 'ERR_REVIEW_SCHEDULE_NOT_FOUND'
  | 'ERR_REVIEW_SCHEDULE_ALREADY_COMPLETE'
  // Compliance Task errors
  | 'ERR_COMPLIANCE_TASK_NOT_FOUND'
  | 'ERR_COMPLIANCE_TASK_ALREADY_COMPLETE'
  // Dispute Case errors
  | 'ERR_DISPUTE_CASE_NOT_FOUND'
  | 'ERR_DISPUTE_EVENT_NOT_FOUND'
  | 'ERR_DISPUTE_ATTACHMENT_NOT_FOUND'
  // In-App Alert errors
  | 'ERR_ALERT_NOT_FOUND';

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

  // ============================================
  // DECISION LEDGER ERRORS
  // ============================================

  decisionCreateForNonIep: (planType?: string) =>
    new ApiError(
      'ERR_DECISION_CREATE_FOR_NON_IEP',
      400,
      'Decision ledger entries can only be created for IEP plans',
      planType ? { planType } : undefined
    ),

  decisionVoidRequiresReason: () =>
    new ApiError(
      'ERR_DECISION_VOID_REQUIRES_REASON',
      400,
      'A reason is required to void a decision'
    ),

  decisionNotFound: (decisionId?: string) =>
    new ApiError(
      'ERR_DECISION_NOT_FOUND',
      404,
      'Decision not found',
      decisionId ? { decisionId } : undefined
    ),

  decisionAlreadyVoided: (decisionId?: string) =>
    new ApiError(
      'ERR_DECISION_ALREADY_VOIDED',
      400,
      'This decision has already been voided',
      decisionId ? { decisionId } : undefined
    ),

  // ============================================
  // SIGNATURE ERRORS
  // ============================================

  signaturePacketExists: (versionId?: string) =>
    new ApiError(
      'ERR_SIGN_PACKET_EXISTS',
      400,
      'A signature packet already exists for this version',
      versionId ? { versionId } : undefined
    ),

  signaturePacketNotFound: (packetId?: string) =>
    new ApiError(
      'ERR_SIGN_PACKET_NOT_FOUND',
      404,
      'Signature packet not found',
      packetId ? { packetId } : undefined
    ),

  signatureAlreadySigned: (signatureId?: string) =>
    new ApiError(
      'ERR_SIGN_ALREADY_SIGNED',
      400,
      'This signature has already been recorded',
      signatureId ? { signatureId } : undefined
    ),

  signatureUnauthorizedRole: (requiredRole?: string) =>
    new ApiError(
      'ERR_SIGN_UNAUTHORIZED_ROLE',
      403,
      'You are not authorized to sign for this role',
      requiredRole ? { requiredRole } : undefined
    ),

  signaturePacketComplete: () =>
    new ApiError(
      'ERR_SIGN_PACKET_COMPLETE',
      400,
      'All signatures have been collected for this packet'
    ),

  // ============================================
  // VERSION ERRORS
  // ============================================

  versionNotFound: (versionId?: string) =>
    new ApiError(
      'ERR_VERSION_NOT_FOUND',
      404,
      'Plan version not found',
      versionId ? { versionId } : undefined
    ),

  versionAlreadyDistributed: (versionId?: string) =>
    new ApiError(
      'ERR_VERSION_ALREADY_DISTRIBUTED',
      400,
      'This version has already been distributed',
      versionId ? { versionId } : undefined
    ),

  versionRequiresCmSignature: () =>
    new ApiError(
      'ERR_VERSION_REQUIRES_CM_SIGNATURE',
      400,
      'Case manager signature is required before distribution'
    ),

  versionStatusInvalid: (currentStatus?: string, requiredStatus?: string) =>
    new ApiError(
      'ERR_VERSION_STATUS_INVALID',
      400,
      `Version must be in ${requiredStatus || 'FINAL'} status to perform this operation`,
      { currentStatus, requiredStatus }
    ),

  // ============================================
  // SCHEDULED SERVICES ERRORS
  // ============================================

  scheduledPlanExists: (planId?: string) =>
    new ApiError(
      'ERR_SCHEDULED_PLAN_EXISTS',
      400,
      'A scheduled service plan already exists for this plan',
      planId ? { planId } : undefined
    ),

  scheduledPlanNotFound: (planId?: string) =>
    new ApiError(
      'ERR_SCHEDULED_PLAN_NOT_FOUND',
      404,
      'Scheduled service plan not found',
      planId ? { planId } : undefined
    ),

  // ============================================
  // REVIEW SCHEDULE ERRORS
  // ============================================

  reviewScheduleNotFound: (scheduleId?: string) =>
    new ApiError(
      'ERR_REVIEW_SCHEDULE_NOT_FOUND',
      404,
      'Review schedule not found',
      scheduleId ? { scheduleId } : undefined
    ),

  reviewScheduleAlreadyComplete: (scheduleId?: string) =>
    new ApiError(
      'ERR_REVIEW_SCHEDULE_ALREADY_COMPLETE',
      400,
      'This review schedule has already been completed',
      scheduleId ? { scheduleId } : undefined
    ),

  // ============================================
  // COMPLIANCE TASK ERRORS
  // ============================================

  complianceTaskNotFound: (taskId?: string) =>
    new ApiError(
      'ERR_COMPLIANCE_TASK_NOT_FOUND',
      404,
      'Compliance task not found',
      taskId ? { taskId } : undefined
    ),

  complianceTaskAlreadyComplete: (taskId?: string) =>
    new ApiError(
      'ERR_COMPLIANCE_TASK_ALREADY_COMPLETE',
      400,
      'This compliance task has already been completed',
      taskId ? { taskId } : undefined
    ),

  // ============================================
  // DISPUTE CASE ERRORS
  // ============================================

  disputeCaseNotFound: (caseId?: string) =>
    new ApiError(
      'ERR_DISPUTE_CASE_NOT_FOUND',
      404,
      'Dispute case not found',
      caseId ? { caseId } : undefined
    ),

  disputeEventNotFound: (eventId?: string) =>
    new ApiError(
      'ERR_DISPUTE_EVENT_NOT_FOUND',
      404,
      'Dispute event not found',
      eventId ? { eventId } : undefined
    ),

  disputeAttachmentNotFound: (attachmentId?: string) =>
    new ApiError(
      'ERR_DISPUTE_ATTACHMENT_NOT_FOUND',
      404,
      'Dispute attachment not found',
      attachmentId ? { attachmentId } : undefined
    ),

  // ============================================
  // IN-APP ALERT ERRORS
  // ============================================

  alertNotFound: (alertId?: string) =>
    new ApiError(
      'ERR_ALERT_NOT_FOUND',
      404,
      'Alert not found',
      alertId ? { alertId } : undefined
    ),
};
