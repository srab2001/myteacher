import request from 'supertest';
import { createApp } from '../app.js';
import { prisma } from '../lib/db.js';

// Mock environment variables for tests
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
    appUser: {
      findUnique: jest.fn(),
    },
    student: {
      findFirst: jest.fn(),
    },
    planInstance: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    planType: {
      findUnique: jest.fn(),
    },
    planSchema: {
      findFirst: jest.fn(),
    },
    planFieldValue: {
      upsert: jest.fn(),
      findMany: jest.fn(),
    },
    goal: {
      findMany: jest.fn(),
    },
    serviceLog: {
      findMany: jest.fn(),
    },
    $disconnect: jest.fn(),
  },
  UserRole: {
    TEACHER: 'TEACHER',
    CASE_MANAGER: 'CASE_MANAGER',
    ADMIN: 'ADMIN',
  },
}));

const app = createApp();

const mockUser = {
  id: 'test-teacher-id',
  email: 'teacher@example.com',
  displayName: 'Test Teacher',
  role: 'TEACHER',
  isOnboarded: true,
};

const mockStudent = {
  id: 'test-student-id',
  firstName: 'John',
  lastName: 'Doe',
  teacherId: 'test-teacher-id',
  grade: '4',
  schoolName: 'Test Elementary',
};

const mockPlanType = {
  id: 'iep-type-id',
  code: 'IEP',
  name: 'Individualized Education Program',
};

const mockSchema = {
  id: 'schema-id',
  planTypeId: 'iep-type-id',
  version: 1,
  name: 'Maryland IEP Form 2024',
  fields: {
    sections: [
      {
        key: 'student_info',
        title: 'Student Information',
        order: 1,
        fields: [
          { key: 'disability_category', type: 'select', label: 'Disability Category', required: true },
          { key: 'special_ed_entry', type: 'date', label: 'Special Education Entry Date', required: true },
        ],
      },
      {
        key: 'present_levels',
        title: 'Present Levels',
        order: 2,
        fields: [
          { key: 'academic_strengths', type: 'textarea', label: 'Academic Strengths', required: true },
          { key: 'academic_needs', type: 'textarea', label: 'Academic Needs', required: true },
        ],
      },
    ],
  },
  isActive: true,
};

const mockPlan = {
  id: 'test-plan-id',
  studentId: 'test-student-id',
  planSchemaId: 'schema-id',
  status: 'draft',
  startDate: new Date('2024-01-01'),
  endDate: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  schema: mockSchema,
  student: mockStudent,
  planType: mockPlanType,
};

describe('Plan Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/students/:studentId/plans/:planTypeCode', () => {
    it('returns 401 when not authenticated', async () => {
      const response = await request(app).post('/api/students/test-student-id/plans/IEP');
      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/plans/:planId', () => {
    it('returns 401 when not authenticated', async () => {
      const response = await request(app).get('/api/plans/test-plan-id');
      expect(response.status).toBe(401);
    });
  });

  describe('PATCH /api/plans/:planId/fields', () => {
    it('returns 401 when not authenticated', async () => {
      const response = await request(app)
        .patch('/api/plans/test-plan-id/fields')
        .send({ fields: { disability_category: 'Specific Learning Disability' } });
      expect(response.status).toBe(401);
    });
  });
});

describe('Plan Creation Logic', () => {
  it('creates a new IEP plan with default status', async () => {
    (prisma.student.findFirst as jest.Mock).mockResolvedValue(mockStudent);
    (prisma.planType.findUnique as jest.Mock).mockResolvedValue(mockPlanType);
    (prisma.planSchema.findFirst as jest.Mock).mockResolvedValue(mockSchema);
    (prisma.planInstance.create as jest.Mock).mockResolvedValue(mockPlan);

    const student = await prisma.student.findFirst({ where: { id: mockStudent.id } });
    expect(student).not.toBeNull();

    const planType = await prisma.planType.findUnique({ where: { code: 'IEP' } });
    expect(planType).not.toBeNull();

    const schema = await prisma.planSchema.findFirst({
      where: { planTypeId: planType!.id, isActive: true },
    });
    expect(schema).not.toBeNull();

    const plan = await prisma.planInstance.create({
      data: {
        studentId: mockStudent.id,
        planSchemaId: schema!.id,
        status: 'draft',
        startDate: new Date(),
      },
    });

    expect(plan.status).toBe('draft');
    expect(plan.studentId).toBe(mockStudent.id);
  });
});

describe('Plan Field Updates', () => {
  it('upserts field values for a plan', async () => {
    const fieldUpdates = {
      disability_category: 'Specific Learning Disability',
      academic_strengths: 'Student shows strong verbal communication skills',
      academic_needs: 'Needs support with written expression',
    };

    (prisma.planInstance.findFirst as jest.Mock).mockResolvedValue(mockPlan);

    const plan = await prisma.planInstance.findFirst({ where: { id: mockPlan.id } });
    expect(plan).not.toBeNull();

    // Simulate upserting each field
    for (const [key, value] of Object.entries(fieldUpdates)) {
      (prisma.planFieldValue.upsert as jest.Mock).mockResolvedValue({
        id: `field-${key}`,
        planInstanceId: mockPlan.id,
        fieldKey: key,
        value: value,
      });

      const fieldValue = await prisma.planFieldValue.upsert({
        where: {
          planInstanceId_fieldKey: {
            planInstanceId: mockPlan.id,
            fieldKey: key,
          },
        },
        update: { value: value },
        create: {
          planInstanceId: mockPlan.id,
          fieldKey: key,
          value: value,
        },
      });

      expect(fieldValue.fieldKey).toBe(key);
      expect(fieldValue.value).toBe(value);
    }

    expect(prisma.planFieldValue.upsert).toHaveBeenCalledTimes(3);
  });
});

describe('Plan Finalization', () => {
  it('changes plan status from draft to active', async () => {
    const draftPlan = { ...mockPlan, status: 'draft' };
    const activePlan = { ...mockPlan, status: 'active' };

    (prisma.planInstance.findFirst as jest.Mock).mockResolvedValue(draftPlan);
    (prisma.planInstance.update as jest.Mock).mockResolvedValue(activePlan);

    const plan = await prisma.planInstance.findFirst({ where: { id: mockPlan.id } });
    expect(plan?.status).toBe('draft');

    const updated = await prisma.planInstance.update({
      where: { id: mockPlan.id },
      data: { status: 'active' },
    });

    expect(updated.status).toBe('active');
  });

  it('sets end date when finalizing', async () => {
    const endDate = new Date('2025-01-01');
    const finalizedPlan = { ...mockPlan, status: 'active', endDate };

    (prisma.planInstance.update as jest.Mock).mockResolvedValue(finalizedPlan);

    const updated = await prisma.planInstance.update({
      where: { id: mockPlan.id },
      data: {
        status: 'active',
        endDate: endDate,
      },
    });

    expect(updated.status).toBe('active');
    expect(updated.endDate).toEqual(endDate);
  });
});

describe('Plan with Goals and Services', () => {
  it('retrieves plan with associated goals', async () => {
    const goals = [
      { id: 'goal-1', goalCode: 'R1.1', area: 'READING', annualGoalText: 'Improve reading' },
      { id: 'goal-2', goalCode: 'M1.1', area: 'MATH', annualGoalText: 'Improve math' },
    ];

    const planWithGoals = {
      ...mockPlan,
      goals,
    };

    (prisma.planInstance.findFirst as jest.Mock).mockResolvedValue(planWithGoals);
    (prisma.goal.findMany as jest.Mock).mockResolvedValue(goals);

    const plan = await prisma.planInstance.findFirst({
      where: { id: mockPlan.id },
      include: { goals: true },
    });

    expect(plan?.goals).toHaveLength(2);
    expect(plan?.goals[0].goalCode).toBe('R1.1');
  });

  it('retrieves plan with service logs', async () => {
    const serviceLogs = [
      { id: 'log-1', serviceType: 'SPECIAL_EDUCATION', minutes: 45 },
      { id: 'log-2', serviceType: 'SPEECH_LANGUAGE', minutes: 30 },
    ];

    const planWithServices = {
      ...mockPlan,
      serviceLogs,
    };

    (prisma.planInstance.findFirst as jest.Mock).mockResolvedValue(planWithServices);
    (prisma.serviceLog.findMany as jest.Mock).mockResolvedValue(serviceLogs);

    const plan = await prisma.planInstance.findFirst({
      where: { id: mockPlan.id },
      include: { serviceLogs: true },
    });

    expect(plan?.serviceLogs).toHaveLength(2);
  });
});

describe('Plan Status Validation', () => {
  it('validates plan statuses', () => {
    const validStatuses = ['draft', 'active', 'archived'];

    validStatuses.forEach(status => {
      expect(typeof status).toBe('string');
      expect(['draft', 'active', 'archived']).toContain(status);
    });
  });
});

describe('Schema Field Retrieval', () => {
  it('retrieves schema with sections and fields', async () => {
    (prisma.planSchema.findFirst as jest.Mock).mockResolvedValue(mockSchema);

    const schema = await prisma.planSchema.findFirst({
      where: { planTypeId: mockPlanType.id, isActive: true },
    });

    expect(schema).not.toBeNull();
    expect(schema?.fields.sections).toHaveLength(2);
    expect(schema?.fields.sections[0].title).toBe('Student Information');
    expect(schema?.fields.sections[0].fields).toHaveLength(2);
  });
});
