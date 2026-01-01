// Runtime enum objects for Zod validation (z.nativeEnum requires runtime values, not just types)
// These must match the enums in prisma/schema.prisma

export const UserRole = {
  TEACHER: 'TEACHER',
  CASE_MANAGER: 'CASE_MANAGER',
  ADMIN: 'ADMIN',
  RELATED_SERVICE_PROVIDER: 'RELATED_SERVICE_PROVIDER',
  READ_ONLY: 'READ_ONLY',
} as const;
export type UserRole = (typeof UserRole)[keyof typeof UserRole];

export const PlanTypeCode = {
  IEP: 'IEP',
  FIVE_OH_FOUR: 'FIVE_OH_FOUR',
  BEHAVIOR_PLAN: 'BEHAVIOR_PLAN',
} as const;
export type PlanTypeCode = (typeof PlanTypeCode)[keyof typeof PlanTypeCode];

export const StatusScope = {
  OVERALL: 'OVERALL',
  ACADEMIC: 'ACADEMIC',
  BEHAVIOR: 'BEHAVIOR',
  SERVICES: 'SERVICES',
} as const;
export type StatusScope = (typeof StatusScope)[keyof typeof StatusScope];

export const StatusCode = {
  ON_TRACK: 'ON_TRACK',
  WATCH: 'WATCH',
  CONCERN: 'CONCERN',
  URGENT: 'URGENT',
} as const;
export type StatusCode = (typeof StatusCode)[keyof typeof StatusCode];

export const GoalArea = {
  READING: 'READING',
  WRITING: 'WRITING',
  MATH: 'MATH',
  COMMUNICATION: 'COMMUNICATION',
  SOCIAL_EMOTIONAL: 'SOCIAL_EMOTIONAL',
  BEHAVIOR: 'BEHAVIOR',
  MOTOR_SKILLS: 'MOTOR_SKILLS',
  DAILY_LIVING: 'DAILY_LIVING',
  VOCATIONAL: 'VOCATIONAL',
  OTHER: 'OTHER',
} as const;
export type GoalArea = (typeof GoalArea)[keyof typeof GoalArea];

export const ProgressLevel = {
  NOT_ADDRESSED: 'NOT_ADDRESSED',
  FULL_SUPPORT: 'FULL_SUPPORT',
  SOME_SUPPORT: 'SOME_SUPPORT',
  LOW_SUPPORT: 'LOW_SUPPORT',
  MET_TARGET: 'MET_TARGET',
} as const;
export type ProgressLevel = (typeof ProgressLevel)[keyof typeof ProgressLevel];

export const ServiceType = {
  SPECIAL_EDUCATION: 'SPECIAL_EDUCATION',
  SPEECH_LANGUAGE: 'SPEECH_LANGUAGE',
  OCCUPATIONAL_THERAPY: 'OCCUPATIONAL_THERAPY',
  PHYSICAL_THERAPY: 'PHYSICAL_THERAPY',
  COUNSELING: 'COUNSELING',
  BEHAVIORAL_SUPPORT: 'BEHAVIORAL_SUPPORT',
  READING_SPECIALIST: 'READING_SPECIALIST',
  PARAPROFESSIONAL: 'PARAPROFESSIONAL',
  OTHER: 'OTHER',
} as const;
export type ServiceType = (typeof ServiceType)[keyof typeof ServiceType];

export const ServiceSetting = {
  GENERAL_EDUCATION: 'GENERAL_EDUCATION',
  SPECIAL_EDUCATION: 'SPECIAL_EDUCATION',
  RESOURCE_ROOM: 'RESOURCE_ROOM',
  THERAPY_ROOM: 'THERAPY_ROOM',
  COMMUNITY: 'COMMUNITY',
  HOME: 'HOME',
  OTHER: 'OTHER',
} as const;
export type ServiceSetting = (typeof ServiceSetting)[keyof typeof ServiceSetting];

export const WorkSampleRating = {
  BELOW_TARGET: 'BELOW_TARGET',
  NEAR_TARGET: 'NEAR_TARGET',
  MEETS_TARGET: 'MEETS_TARGET',
  ABOVE_TARGET: 'ABOVE_TARGET',
} as const;
export type WorkSampleRating = (typeof WorkSampleRating)[keyof typeof WorkSampleRating];

export const BehaviorMeasurementType = {
  FREQUENCY: 'FREQUENCY',
  DURATION: 'DURATION',
  INTERVAL: 'INTERVAL',
  RATING: 'RATING',
} as const;
export type BehaviorMeasurementType = (typeof BehaviorMeasurementType)[keyof typeof BehaviorMeasurementType];

export const IngestionStatus = {
  PENDING: 'PENDING',
  PROCESSING: 'PROCESSING',
  COMPLETE: 'COMPLETE',
  ERROR: 'ERROR',
} as const;
export type IngestionStatus = (typeof IngestionStatus)[keyof typeof IngestionStatus];

export const PriorPlanSource = {
  UPLOADED: 'UPLOADED',
  SIS_IMPORT: 'SIS_IMPORT',
} as const;
export type PriorPlanSource = (typeof PriorPlanSource)[keyof typeof PriorPlanSource];

export const SchoolType = {
  ELEMENTARY: 'ELEMENTARY',
  MIDDLE: 'MIDDLE',
  HIGH: 'HIGH',
  K8: 'K8',
  K12: 'K12',
  OTHER: 'OTHER',
} as const;
export type SchoolType = (typeof SchoolType)[keyof typeof SchoolType];

export const FormType = {
  IEP: 'IEP',
  IEP_REPORT: 'IEP_REPORT',
  FIVE_OH_FOUR: 'FIVE_OH_FOUR',
  BIP: 'BIP',
} as const;
export type FormType = (typeof FormType)[keyof typeof FormType];

export const ControlType = {
  TEXT: 'TEXT',
  TEXTAREA: 'TEXTAREA',
  DROPDOWN: 'DROPDOWN',
  RADIO: 'RADIO',
  SIGNATURE: 'SIGNATURE',
  CHECKBOX: 'CHECKBOX',
  CHECKBOX_GROUP: 'CHECKBOX_GROUP',
  DATE: 'DATE',
} as const;
export type ControlType = (typeof ControlType)[keyof typeof ControlType];

export const OptionsEditableBy = {
  ADMIN_ONLY: 'ADMIN_ONLY',
  TEACHER_ALLOWED: 'TEACHER_ALLOWED',
  NONE: 'NONE',
} as const;
export type OptionsEditableBy = (typeof OptionsEditableBy)[keyof typeof OptionsEditableBy];

export const AssessmentType = {
  AUDIOLOGICAL: 'AUDIOLOGICAL',
  EDUCATIONAL: 'EDUCATIONAL',
  OCCUPATIONAL_THERAPY: 'OCCUPATIONAL_THERAPY',
  PHYSICAL_THERAPY: 'PHYSICAL_THERAPY',
  PSYCHOLOGICAL: 'PSYCHOLOGICAL',
  SPEECH_LANGUAGE: 'SPEECH_LANGUAGE',
  OTHER: 'OTHER',
} as const;
export type AssessmentType = (typeof AssessmentType)[keyof typeof AssessmentType];

// ============================================
// COMPLIANCE RULES ENUMS
// ============================================

export const RuleScopeType = {
  STATE: 'STATE',
  DISTRICT: 'DISTRICT',
  SCHOOL: 'SCHOOL',
} as const;
export type RuleScopeType = (typeof RuleScopeType)[keyof typeof RuleScopeType];

export const RulePlanType = {
  IEP: 'IEP',
  PLAN504: 'PLAN504',
  BIP: 'BIP',
  ALL: 'ALL',
} as const;
export type RulePlanType = (typeof RulePlanType)[keyof typeof RulePlanType];

export const MeetingTypeCode = {
  INITIAL: 'INITIAL',
  ANNUAL: 'ANNUAL',
  REVIEW: 'REVIEW',
  AMENDMENT: 'AMENDMENT',
  CONTINUED: 'CONTINUED',
} as const;
export type MeetingTypeCode = (typeof MeetingTypeCode)[keyof typeof MeetingTypeCode];

export const MeetingStatus = {
  SCHEDULED: 'SCHEDULED',
  HELD: 'HELD',
  CLOSED: 'CLOSED',
  CANCELED: 'CANCELED',
} as const;
export type MeetingStatus = (typeof MeetingStatus)[keyof typeof MeetingStatus];

export const ParentDeliveryMethod = {
  SEND_HOME: 'SEND_HOME',
  US_MAIL: 'US_MAIL',
  PICK_UP: 'PICK_UP',
} as const;
export type ParentDeliveryMethod = (typeof ParentDeliveryMethod)[keyof typeof ParentDeliveryMethod];

export const ScheduledServiceStatus = {
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
} as const;
export type ScheduledServiceStatus = (typeof ScheduledServiceStatus)[keyof typeof ScheduledServiceStatus];

// ============================================
// REVIEW SCHEDULE ENUMS
// ============================================

export const ScheduleType = {
  IEP_ANNUAL_REVIEW: 'IEP_ANNUAL_REVIEW',
  IEP_REEVALUATION: 'IEP_REEVALUATION',
  PLAN_AMENDMENT_REVIEW: 'PLAN_AMENDMENT_REVIEW',
  SECTION504_PERIODIC_REVIEW: 'SECTION504_PERIODIC_REVIEW',
  BIP_REVIEW: 'BIP_REVIEW',
} as const;
export type ScheduleType = (typeof ScheduleType)[keyof typeof ScheduleType];

export const ReviewScheduleStatus = {
  OPEN: 'OPEN',
  COMPLETE: 'COMPLETE',
  OVERDUE: 'OVERDUE',
} as const;
export type ReviewScheduleStatus = (typeof ReviewScheduleStatus)[keyof typeof ReviewScheduleStatus];

export const ComplianceTaskType = {
  REVIEW_DUE_SOON: 'REVIEW_DUE_SOON',
  REVIEW_OVERDUE: 'REVIEW_OVERDUE',
  DOCUMENT_REQUIRED: 'DOCUMENT_REQUIRED',
  SIGNATURE_NEEDED: 'SIGNATURE_NEEDED',
  MEETING_REQUIRED: 'MEETING_REQUIRED',
} as const;
export type ComplianceTaskType = (typeof ComplianceTaskType)[keyof typeof ComplianceTaskType];

export const ComplianceTaskStatus = {
  OPEN: 'OPEN',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETE: 'COMPLETE',
  DISMISSED: 'DISMISSED',
} as const;
export type ComplianceTaskStatus = (typeof ComplianceTaskStatus)[keyof typeof ComplianceTaskStatus];

export const AlertType = {
  REVIEW_DUE_SOON: 'REVIEW_DUE_SOON',
  REVIEW_OVERDUE: 'REVIEW_OVERDUE',
  COMPLIANCE_TASK: 'COMPLIANCE_TASK',
  SIGNATURE_REQUESTED: 'SIGNATURE_REQUESTED',
  MEETING_SCHEDULED: 'MEETING_SCHEDULED',
  DOCUMENT_UPLOADED: 'DOCUMENT_UPLOADED',
  GENERAL: 'GENERAL',
} as const;
export type AlertType = (typeof AlertType)[keyof typeof AlertType];

// ============================================
// DISPUTE CASE ENUMS
// ============================================

export const DisputeCaseType = {
  SECTION504_COMPLAINT: 'SECTION504_COMPLAINT',
  IEP_DISPUTE: 'IEP_DISPUTE',
  RECORDS_REQUEST: 'RECORDS_REQUEST',
  OTHER: 'OTHER',
} as const;
export type DisputeCaseType = (typeof DisputeCaseType)[keyof typeof DisputeCaseType];

export const DisputeCaseStatus = {
  OPEN: 'OPEN',
  IN_REVIEW: 'IN_REVIEW',
  RESOLVED: 'RESOLVED',
  CLOSED: 'CLOSED',
} as const;
export type DisputeCaseStatus = (typeof DisputeCaseStatus)[keyof typeof DisputeCaseStatus];

export const DisputeEventType = {
  INTAKE: 'INTAKE',
  MEETING: 'MEETING',
  RESPONSE_SENT: 'RESPONSE_SENT',
  DOCUMENT_RECEIVED: 'DOCUMENT_RECEIVED',
  RESOLUTION: 'RESOLUTION',
  STATUS_CHANGE: 'STATUS_CHANGE',
  NOTE: 'NOTE',
} as const;
export type DisputeEventType = (typeof DisputeEventType)[keyof typeof DisputeEventType];

// ============================================
// AUDIT LOG ENUMS
// ============================================

export const AuditActionType = {
  PLAN_VIEWED: 'PLAN_VIEWED',
  PLAN_UPDATED: 'PLAN_UPDATED',
  PLAN_FINALIZED: 'PLAN_FINALIZED',
  PDF_EXPORTED: 'PDF_EXPORTED',
  PDF_DOWNLOADED: 'PDF_DOWNLOADED',
  SIGNATURE_ADDED: 'SIGNATURE_ADDED',
  REVIEW_SCHEDULE_CREATED: 'REVIEW_SCHEDULE_CREATED',
  CASE_VIEWED: 'CASE_VIEWED',
  CASE_EXPORTED: 'CASE_EXPORTED',
  PERMISSION_DENIED: 'PERMISSION_DENIED',
} as const;
export type AuditActionType = (typeof AuditActionType)[keyof typeof AuditActionType];

export const AuditEntityType = {
  PLAN: 'PLAN',
  PLAN_VERSION: 'PLAN_VERSION',
  PLAN_EXPORT: 'PLAN_EXPORT',
  STUDENT: 'STUDENT',
  GOAL: 'GOAL',
  SERVICE: 'SERVICE',
  REVIEW_SCHEDULE: 'REVIEW_SCHEDULE',
  COMPLIANCE_TASK: 'COMPLIANCE_TASK',
  DISPUTE_CASE: 'DISPUTE_CASE',
  SIGNATURE_PACKET: 'SIGNATURE_PACKET',
  MEETING: 'MEETING',
} as const;
export type AuditEntityType = (typeof AuditEntityType)[keyof typeof AuditEntityType];

// Prisma namespace mock for InputJsonValue
export namespace Prisma {
  export type InputJsonValue = string | number | boolean | null | { [key: string]: InputJsonValue } | InputJsonValue[];
}
