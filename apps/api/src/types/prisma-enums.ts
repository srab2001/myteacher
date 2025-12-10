// Prisma enum types - manually defined to avoid build-time dependency on Prisma generation
// These must match the enums in prisma/schema.prisma

export type UserRole = 'TEACHER' | 'CASE_MANAGER' | 'ADMIN';

export type PlanTypeCode = 'IEP' | 'FIVE_OH_FOUR' | 'BEHAVIOR_PLAN';

export type StatusScope = 'OVERALL' | 'ACADEMIC' | 'BEHAVIOR' | 'SERVICES';

export type StatusCode = 'ON_TRACK' | 'WATCH' | 'CONCERN' | 'URGENT';

export type GoalArea =
  | 'READING'
  | 'WRITING'
  | 'MATH'
  | 'COMMUNICATION'
  | 'SOCIAL_EMOTIONAL'
  | 'BEHAVIOR'
  | 'MOTOR_SKILLS'
  | 'DAILY_LIVING'
  | 'VOCATIONAL'
  | 'OTHER';

export type ProgressLevel =
  | 'NOT_ADDRESSED'
  | 'FULL_SUPPORT'
  | 'SOME_SUPPORT'
  | 'LOW_SUPPORT'
  | 'MET_TARGET';

export type ServiceType =
  | 'SPECIAL_EDUCATION'
  | 'SPEECH_LANGUAGE'
  | 'OCCUPATIONAL_THERAPY'
  | 'PHYSICAL_THERAPY'
  | 'COUNSELING'
  | 'BEHAVIORAL_SUPPORT'
  | 'READING_SPECIALIST'
  | 'PARAPROFESSIONAL'
  | 'OTHER';

export type ServiceSetting =
  | 'GENERAL_EDUCATION'
  | 'SPECIAL_EDUCATION'
  | 'RESOURCE_ROOM'
  | 'THERAPY_ROOM'
  | 'COMMUNITY'
  | 'HOME'
  | 'OTHER';

export type WorkSampleRating =
  | 'BELOW_TARGET'
  | 'NEAR_TARGET'
  | 'MEETS_TARGET'
  | 'ABOVE_TARGET';

export type BehaviorMeasurementType =
  | 'FREQUENCY'
  | 'DURATION'
  | 'INTERVAL'
  | 'RATING';

export type IngestionStatus =
  | 'PENDING'
  | 'PROCESSING'
  | 'COMPLETE'
  | 'ERROR';

export type PriorPlanSource =
  | 'UPLOADED'
  | 'SIS_IMPORT';

// Prisma namespace mock for InputJsonValue
export namespace Prisma {
  export type InputJsonValue = string | number | boolean | null | { [key: string]: InputJsonValue } | InputJsonValue[];
}
