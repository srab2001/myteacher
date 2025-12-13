// Mock db module for testing
// This provides mocked prisma client and all enum exports
import { jest } from '@jest/globals';

const createMockModel = () => ({
  findUnique: jest.fn(),
  findFirst: jest.fn(),
  findMany: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  upsert: jest.fn(),
  count: jest.fn(),
  deleteMany: jest.fn(),
  updateMany: jest.fn(),
  createMany: jest.fn(),
  aggregate: jest.fn(),
  groupBy: jest.fn(),
});

const appUserModel = createMockModel();
export const prisma = {
  appUser: appUserModel,
  user: appUserModel, // Alias for tests that use prisma.user
  student: createMockModel(),
  planInstance: createMockModel(),
  planType: createMockModel(),
  planSchema: createMockModel(),
  planFieldValue: createMockModel(),
  planFieldConfig: createMockModel(),
  formFieldDefinition: createMockModel(),
  formFieldOption: createMockModel(),
  goal: createMockModel(),
  goalObjective: createMockModel(),
  goalProgress: createMockModel(),
  studentStatus: createMockModel(),
  serviceLog: createMockModel(),
  behaviorPlan: createMockModel(),
  behaviorTarget: createMockModel(),
  behaviorEvent: createMockModel(),
  priorPlanDocument: createMockModel(),
  artifactComparison: createMockModel(),
  goalArtifactLink: createMockModel(),
  jurisdiction: createMockModel(),
  school: createMockModel(),
  userPermission: createMockModel(),
  studentAccess: createMockModel(),
  studentFieldValue: createMockModel(),
  iEPService: createMockModel(),
  iEPAccommodation: createMockModel(),
  iEPAssessmentDecision: createMockModel(),
  iEPTransition: createMockModel(),
  iEPExtendedSchoolYear: createMockModel(),
  iEPIndependentAssessmentReview: createMockModel(),
  bestPracticeDocument: createMockModel(),
  bestPracticeChunk: createMockModel(),
  formTemplate: createMockModel(),
  goalTemplate: createMockModel(),
  workSample: createMockModel(),
  $disconnect: jest.fn(() => Promise.resolve()),
  $connect: jest.fn(() => Promise.resolve()),
  $transaction: jest.fn((fn: (tx: typeof prisma) => Promise<unknown>) => fn(prisma)),
};

export const UserRole = {
  TEACHER: 'TEACHER',
  CASE_MANAGER: 'CASE_MANAGER',
  ADMIN: 'ADMIN',
  RELATED_SERVICE_PROVIDER: 'RELATED_SERVICE_PROVIDER',
  READ_ONLY: 'READ_ONLY',
} as const;

export const PlanTypeCode = {
  IEP: 'IEP',
  FIVE_OH_FOUR: 'FIVE_OH_FOUR',
  BEHAVIOR_PLAN: 'BEHAVIOR_PLAN',
} as const;

export const StatusScope = {
  OVERALL: 'OVERALL',
  ACADEMIC: 'ACADEMIC',
  BEHAVIOR: 'BEHAVIOR',
  SERVICES: 'SERVICES',
} as const;

export const StatusCode = {
  ON_TRACK: 'ON_TRACK',
  WATCH: 'WATCH',
  CONCERN: 'CONCERN',
  URGENT: 'URGENT',
} as const;

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

export const ProgressLevel = {
  NOT_ADDRESSED: 'NOT_ADDRESSED',
  FULL_SUPPORT: 'FULL_SUPPORT',
  SOME_SUPPORT: 'SOME_SUPPORT',
  LOW_SUPPORT: 'LOW_SUPPORT',
  MET_TARGET: 'MET_TARGET',
} as const;

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

export const ServiceSetting = {
  GENERAL_EDUCATION: 'GENERAL_EDUCATION',
  SPECIAL_EDUCATION: 'SPECIAL_EDUCATION',
  RESOURCE_ROOM: 'RESOURCE_ROOM',
  THERAPY_ROOM: 'THERAPY_ROOM',
  COMMUNITY: 'COMMUNITY',
  HOME: 'HOME',
  OTHER: 'OTHER',
} as const;

export const BehaviorMeasurementType = {
  FREQUENCY: 'FREQUENCY',
  DURATION: 'DURATION',
  INTERVAL: 'INTERVAL',
  RATING: 'RATING',
} as const;

export const PriorPlanSource = {
  UPLOADED: 'UPLOADED',
  SIS_IMPORT: 'SIS_IMPORT',
} as const;

export const IngestionStatus = {
  PENDING: 'PENDING',
  PROCESSING: 'PROCESSING',
  COMPLETE: 'COMPLETE',
  ERROR: 'ERROR',
} as const;

export const FormType = {
  IEP: 'IEP',
  IEP_REPORT: 'IEP_REPORT',
  FIVE_OH_FOUR: 'FIVE_OH_FOUR',
  BIP: 'BIP',
} as const;

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

export const PlanStatus = {
  DRAFT: 'DRAFT',
  ACTIVE: 'ACTIVE',
  EXPIRED: 'EXPIRED',
  SUPERSEDED: 'SUPERSEDED',
} as const;

export const WorkSampleRating = {
  BELOW_TARGET: 'BELOW_TARGET',
  NEAR_TARGET: 'NEAR_TARGET',
  MEETS_TARGET: 'MEETS_TARGET',
  ABOVE_TARGET: 'ABOVE_TARGET',
} as const;

export const OptionsEditableBy = {
  ADMIN_ONLY: 'ADMIN_ONLY',
  TEACHER_ALLOWED: 'TEACHER_ALLOWED',
  NONE: 'NONE',
} as const;

export class PrismaClient {
  constructor() {}
  $connect() { return Promise.resolve(); }
  $disconnect() { return Promise.resolve(); }
}

export const Prisma = {
  PrismaClientKnownRequestError: class extends Error {
    code: string;
    constructor(message: string, { code }: { code: string }) {
      super(message);
      this.code = code;
    }
  },
};

export type UserRoleType = typeof UserRole[keyof typeof UserRole];
export type PlanTypeCodeType = typeof PlanTypeCode[keyof typeof PlanTypeCode];
export type StatusScopeType = typeof StatusScope[keyof typeof StatusScope];
export type StatusCodeType = typeof StatusCode[keyof typeof StatusCode];
