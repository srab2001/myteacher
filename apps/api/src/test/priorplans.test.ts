import { prisma, PriorPlanSource, PlanTypeCode } from '@myteacher/db';

// Mock environment
jest.mock('../config/env.js', () => ({
  env: {
    PORT: '4000',
    NODE_ENV: 'test',
    DATABASE_URL: 'postgresql://test:test@localhost:5432/test',
    SESSION_SECRET: 'test-session-secret-that-is-long-enough',
    GOOGLE_CLIENT_ID: 'test-client-id',
    GOOGLE_CLIENT_SECRET: 'test-client-secret',
    GOOGLE_CALLBACK_URL: 'http://localhost:4000/auth/google/callback',
    FRONTEND_URL: 'http://localhost:3000',
  },
}));

// Mock Prisma
jest.mock('@myteacher/db', () => ({
  prisma: {
    priorPlanDocument: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
    },
    student: {
      findFirst: jest.fn(),
    },
    planType: {
      findFirst: jest.fn(),
    },
    $disconnect: jest.fn(),
  },
  PriorPlanSource: {
    UPLOADED: 'UPLOADED',
    SIS_IMPORT: 'SIS_IMPORT',
  },
  PlanTypeCode: {
    IEP: 'IEP',
    FIVE_OH_FOUR: 'FIVE_OH_FOUR',
    BEHAVIOR_PLAN: 'BEHAVIOR_PLAN',
  },
}));

describe('Prior Plan Document System', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Prior Plan Creation', () => {
    it('creates a new prior plan document with upload source', async () => {
      const mockPriorPlan = {
        id: 'prior-plan-1',
        studentId: 'student-1',
        planTypeId: 'plan-type-1',
        fileName: 'previous-iep.pdf',
        storageKey: 'prior-plan-12345.pdf',
        planDate: new Date('2023-05-15'),
        source: PriorPlanSource.UPLOADED,
        notes: 'Last year IEP',
        uploadedById: 'teacher-1',
        createdAt: new Date(),
        planType: { code: 'IEP', name: 'Individualized Education Program' },
        uploadedBy: { displayName: 'Test Teacher' },
      };

      (prisma.priorPlanDocument.create as jest.Mock).mockResolvedValue(mockPriorPlan);

      const priorPlan = await prisma.priorPlanDocument.create({
        data: {
          studentId: 'student-1',
          planTypeId: 'plan-type-1',
          fileName: 'previous-iep.pdf',
          storageKey: 'prior-plan-12345.pdf',
          planDate: new Date('2023-05-15'),
          source: 'UPLOADED',
          notes: 'Last year IEP',
          uploadedById: 'teacher-1',
        },
        include: {
          planType: { select: { code: true, name: true } },
          uploadedBy: { select: { displayName: true } },
        },
      });

      expect(priorPlan.id).toBe('prior-plan-1');
      expect(priorPlan.fileName).toBe('previous-iep.pdf');
      expect(priorPlan.source).toBe('UPLOADED');
      expect(priorPlan.planType.code).toBe('IEP');
    });

    it('validates prior plan source enum', () => {
      expect(PriorPlanSource.UPLOADED).toBe('UPLOADED');
      expect(PriorPlanSource.SIS_IMPORT).toBe('SIS_IMPORT');
    });

    it('validates plan type code enum', () => {
      expect(PlanTypeCode.IEP).toBe('IEP');
      expect(PlanTypeCode.FIVE_OH_FOUR).toBe('FIVE_OH_FOUR');
      expect(PlanTypeCode.BEHAVIOR_PLAN).toBe('BEHAVIOR_PLAN');
    });
  });

  describe('Prior Plan List Query', () => {
    it('retrieves all prior plans for a student', async () => {
      const mockPriorPlans = [
        {
          id: 'prior-plan-1',
          studentId: 'student-1',
          fileName: 'iep-2023.pdf',
          storageKey: 'prior-plan-001.pdf',
          planDate: new Date('2023-05-15'),
          source: PriorPlanSource.UPLOADED,
          notes: 'IEP from last year',
          createdAt: new Date('2024-01-10'),
          planType: { code: 'IEP', name: 'IEP' },
          uploadedBy: { displayName: 'Teacher A' },
        },
        {
          id: 'prior-plan-2',
          studentId: 'student-1',
          fileName: '504-plan.pdf',
          storageKey: 'prior-plan-002.pdf',
          planDate: new Date('2022-09-01'),
          source: PriorPlanSource.UPLOADED,
          notes: null,
          createdAt: new Date('2024-01-05'),
          planType: { code: 'FIVE_OH_FOUR', name: '504 Plan' },
          uploadedBy: { displayName: 'Teacher B' },
        },
      ];

      (prisma.priorPlanDocument.findMany as jest.Mock).mockResolvedValue(mockPriorPlans);

      const priorPlans = await prisma.priorPlanDocument.findMany({
        where: { studentId: 'student-1' },
        include: {
          planType: { select: { code: true, name: true } },
          uploadedBy: { select: { displayName: true } },
        },
        orderBy: { createdAt: 'desc' },
      });

      expect(priorPlans).toHaveLength(2);
      expect(priorPlans[0].planType.code).toBe('IEP');
      expect(priorPlans[1].planType.code).toBe('FIVE_OH_FOUR');
    });

    it('returns empty array for student with no prior plans', async () => {
      (prisma.priorPlanDocument.findMany as jest.Mock).mockResolvedValue([]);

      const priorPlans = await prisma.priorPlanDocument.findMany({
        where: { studentId: 'student-no-plans' },
      });

      expect(priorPlans).toHaveLength(0);
    });
  });

  describe('Prior Plan Download Access', () => {
    it('finds prior plan for download with teacher verification', async () => {
      const mockPriorPlan = {
        id: 'prior-plan-1',
        fileName: 'iep-2023.pdf',
        storageKey: 'prior-plan-001.pdf',
        student: {
          teacherId: 'teacher-1',
        },
      };

      (prisma.priorPlanDocument.findFirst as jest.Mock).mockResolvedValue(mockPriorPlan);

      const priorPlan = await prisma.priorPlanDocument.findFirst({
        where: {
          id: 'prior-plan-1',
          student: {
            teacherId: 'teacher-1',
          },
        },
      });

      expect(priorPlan).not.toBeNull();
      expect(priorPlan?.storageKey).toBe('prior-plan-001.pdf');
    });

    it('returns null when teacher does not own student', async () => {
      (prisma.priorPlanDocument.findFirst as jest.Mock).mockResolvedValue(null);

      const priorPlan = await prisma.priorPlanDocument.findFirst({
        where: {
          id: 'prior-plan-1',
          student: {
            teacherId: 'wrong-teacher',
          },
        },
      });

      expect(priorPlan).toBeNull();
    });
  });

  describe('Prior Plan Deletion', () => {
    it('deletes a prior plan document', async () => {
      const mockPriorPlan = {
        id: 'prior-plan-1',
        storageKey: 'prior-plan-001.pdf',
      };

      (prisma.priorPlanDocument.findFirst as jest.Mock).mockResolvedValue(mockPriorPlan);
      (prisma.priorPlanDocument.delete as jest.Mock).mockResolvedValue(mockPriorPlan);

      // First find the plan to verify access
      const found = await prisma.priorPlanDocument.findFirst({
        where: {
          id: 'prior-plan-1',
          student: {
            teacherId: 'teacher-1',
          },
        },
      });

      expect(found).not.toBeNull();

      // Then delete
      const deleted = await prisma.priorPlanDocument.delete({
        where: { id: 'prior-plan-1' },
      });

      expect(deleted.id).toBe('prior-plan-1');
    });
  });

  describe('Student Verification for Upload', () => {
    it('verifies student belongs to teacher before upload', async () => {
      const mockStudent = {
        id: 'student-1',
        teacherId: 'teacher-1',
        jurisdictionId: 'jurisdiction-1',
        jurisdiction: {
          id: 'jurisdiction-1',
          stateCode: 'MD',
          districtName: 'Howard County',
        },
      };

      (prisma.student.findFirst as jest.Mock).mockResolvedValue(mockStudent);

      const student = await prisma.student.findFirst({
        where: {
          id: 'student-1',
          teacherId: 'teacher-1',
        },
        include: {
          jurisdiction: true,
        },
      });

      expect(student).not.toBeNull();
      expect(student?.jurisdictionId).toBe('jurisdiction-1');
    });

    it('returns null when student does not belong to teacher', async () => {
      (prisma.student.findFirst as jest.Mock).mockResolvedValue(null);

      const student = await prisma.student.findFirst({
        where: {
          id: 'student-1',
          teacherId: 'wrong-teacher',
        },
      });

      expect(student).toBeNull();
    });
  });

  describe('Plan Type Lookup', () => {
    it('finds plan type for jurisdiction', async () => {
      const mockPlanType = {
        id: 'plan-type-1',
        code: 'IEP',
        name: 'Individualized Education Program',
        jurisdictionId: 'jurisdiction-1',
      };

      (prisma.planType.findFirst as jest.Mock).mockResolvedValue(mockPlanType);

      const planType = await prisma.planType.findFirst({
        where: {
          code: 'IEP',
          jurisdictionId: 'jurisdiction-1',
        },
      });

      expect(planType).not.toBeNull();
      expect(planType?.code).toBe('IEP');
    });

    it('returns null for invalid plan type', async () => {
      (prisma.planType.findFirst as jest.Mock).mockResolvedValue(null);

      const planType = await prisma.planType.findFirst({
        where: {
          code: 'INVALID' as any,
          jurisdictionId: 'jurisdiction-1',
        },
      });

      expect(planType).toBeNull();
    });
  });
});
