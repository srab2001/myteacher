// Runtime enum objects for Zod validation (z.nativeEnum requires runtime values, not just types)
// These must match the enums in prisma/schema.prisma

export const UserRole = {
  TEACHER: 'TEACHER',
  CASE_MANAGER: 'CASE_MANAGER',
  ADMIN: 'ADMIN',
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

// Prisma namespace mock for InputJsonValue
export namespace Prisma {
  export type InputJsonValue = string | number | boolean | null | { [key: string]: InputJsonValue } | InputJsonValue[];
}
