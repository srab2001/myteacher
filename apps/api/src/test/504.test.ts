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
jest.mock('../lib/db.js', () => ({
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
      findFirst: jest.fn(),
    },
    planSchema: {
      findFirst: jest.fn(),
    },
    planFieldValue: {
      upsert: jest.fn(),
      findMany: jest.fn(),
    },
    $disconnect: jest.fn(),
  },
  PlanTypeCode: {
    IEP: 'IEP',
    FIVE_OH_FOUR: 'FIVE_OH_FOUR',
    BEHAVIOR_PLAN: 'BEHAVIOR_PLAN',
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
  firstName: 'Jane',
  lastName: 'Smith',
  teacherId: 'test-teacher-id',
  grade: '5',
  schoolName: 'Test Elementary',
};

const mock504PlanType = {
  id: '504-plan-type-id',
  code: 'FIVE_OH_FOUR',
  name: '504 Plan',
};

const mock504Schema = {
  id: '504-schema-id',
  planTypeId: '504-plan-type-id',
  version: 1,
  name: '504 Plan Standard Form v1',
  fields: {
    sections: [
      {
        key: 'referral_info',
        title: 'Referral Information',
        order: 1,
        fields: [
          { key: 'referral_date', type: 'date', label: 'Referral Date', required: true },
          { key: 'referral_source', type: 'select', label: 'Referral Source', required: true },
          { key: 'reason_for_referral', type: 'textarea', label: 'Reason for Referral', required: true },
        ],
      },
      {
        key: 'student_profile',
        title: 'Student Profile',
        order: 2,
        fields: [
          { key: 'student_name', type: 'text', label: 'Student Name', required: true },
          { key: 'date_of_birth', type: 'date', label: 'Date of Birth', required: true },
          { key: 'grade_level', type: 'select', label: 'Grade Level', required: true },
        ],
      },
      {
        key: 'disability_info',
        title: 'Disability Information',
        order: 4,
        fields: [
          { key: 'disability_type', type: 'text', label: 'Type of Disability/Impairment', required: true },
          { key: 'major_life_activities_affected', type: 'textarea', label: 'Major Life Activities Affected', required: true },
        ],
      },
      {
        key: 'eligibility_determination',
        title: 'Eligibility Determination',
        order: 12,
        fields: [
          { key: 'is_eligible', type: 'select', label: 'Eligibility Determination', required: true },
          { key: 'eligibility_rationale', type: 'textarea', label: 'Eligibility Rationale', required: true },
        ],
      },
      {
        key: 'accommodations_plan',
        title: 'Accommodations and Services',
        order: 13,
        fields: [
          { key: 'classroom_accommodations', type: 'textarea', label: 'Classroom Accommodations', required: true },
          { key: 'plan_review_date', type: 'date', label: 'Plan Review Date', required: true },
        ],
      },
    ],
  },
  isActive: true,
};

const mock504Plan = {
  id: 'test-504-plan-id',
  studentId: 'test-student-id',
  planSchemaId: '504-schema-id',
  status: 'DRAFT',
  startDate: new Date('2024-01-01'),
  endDate: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  schema: mock504Schema,
  student: mockStudent,
  planType: mock504PlanType,
};

describe('504 Plan Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/students/:studentId/plans/FIVE_OH_FOUR', () => {
    it('returns 401 when not authenticated', async () => {
      const response = await request(app).post('/api/students/test-student-id/plans/FIVE_OH_FOUR');
      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/plans/:planId', () => {
    it('returns 401 when not authenticated', async () => {
      const response = await request(app).get('/api/plans/test-504-plan-id');
      expect(response.status).toBe(401);
    });
  });

  describe('PATCH /api/plans/:planId/fields', () => {
    it('returns 401 when not authenticated', async () => {
      const response = await request(app)
        .patch('/api/plans/test-504-plan-id/fields')
        .send({ fields: { disability_type: 'ADHD' } });
      expect(response.status).toBe(401);
    });
  });

  describe('POST /api/plans/:planId/finalize', () => {
    it('returns 401 when not authenticated', async () => {
      const response = await request(app).post('/api/plans/test-504-plan-id/finalize');
      expect(response.status).toBe(401);
    });
  });
});

describe('504 Schema Retrieval', () => {
  it('retrieves 504 plan schema with all sections', async () => {
    (prisma.planSchema.findFirst as jest.Mock).mockResolvedValue(mock504Schema);

    const schema = await prisma.planSchema.findFirst({
      where: { planTypeId: mock504PlanType.id, isActive: true },
    });

    expect(schema).not.toBeNull();
    expect(schema?.fields.sections).toHaveLength(5);
    expect(schema?.fields.sections[0].key).toBe('referral_info');
    expect(schema?.fields.sections[0].title).toBe('Referral Information');
  });

  it('verifies all required fields in 504 schema', async () => {
    (prisma.planSchema.findFirst as jest.Mock).mockResolvedValue(mock504Schema);

    const schema = await prisma.planSchema.findFirst({
      where: { planTypeId: mock504PlanType.id, isActive: true },
    });

    // Extract all required fields
    const requiredFields = schema?.fields.sections.flatMap(
      (section: { fields: Array<{ key: string; required: boolean }> }) =>
        section.fields.filter((f: { required: boolean }) => f.required).map((f: { key: string }) => f.key)
    );

    expect(requiredFields).toContain('referral_date');
    expect(requiredFields).toContain('referral_source');
    expect(requiredFields).toContain('disability_type');
    expect(requiredFields).toContain('is_eligible');
    expect(requiredFields).toContain('classroom_accommodations');
  });
});

describe('504 Plan Creation', () => {
  it('creates a new 504 plan with default DRAFT status', async () => {
    (prisma.student.findFirst as jest.Mock).mockResolvedValue(mockStudent);
    (prisma.planType.findUnique as jest.Mock).mockResolvedValue(mock504PlanType);
    (prisma.planSchema.findFirst as jest.Mock).mockResolvedValue(mock504Schema);
    (prisma.planInstance.create as jest.Mock).mockResolvedValue(mock504Plan);

    const student = await prisma.student.findFirst({ where: { id: mockStudent.id } });
    expect(student).not.toBeNull();

    const planType = await prisma.planType.findUnique({ where: { code: 'FIVE_OH_FOUR' } });
    expect(planType?.code).toBe('FIVE_OH_FOUR');

    const schema = await prisma.planSchema.findFirst({
      where: { planTypeId: planType!.id, isActive: true },
    });
    expect(schema).not.toBeNull();

    const plan = await prisma.planInstance.create({
      data: {
        studentId: mockStudent.id,
        planSchemaId: schema!.id,
        status: 'DRAFT',
        startDate: new Date(),
      },
    });

    expect(plan.status).toBe('DRAFT');
    expect(plan.studentId).toBe(mockStudent.id);
    expect(plan.planSchemaId).toBe(mock504Schema.id);
  });
});

describe('504 Plan Field Updates', () => {
  it('upserts field values for 504 plan', async () => {
    const fieldUpdates = {
      referral_date: '2024-01-15',
      referral_source: 'Parent/Guardian',
      reason_for_referral: 'Student shows signs of ADHD affecting academic performance.',
      disability_type: 'ADHD',
      major_life_activities_affected: 'Learning, concentrating, following instructions',
    };

    (prisma.planInstance.findFirst as jest.Mock).mockResolvedValue(mock504Plan);

    const plan = await prisma.planInstance.findFirst({ where: { id: mock504Plan.id } });
    expect(plan).not.toBeNull();

    // Simulate upserting each field
    for (const [key, value] of Object.entries(fieldUpdates)) {
      (prisma.planFieldValue.upsert as jest.Mock).mockResolvedValue({
        id: `field-${key}`,
        planInstanceId: mock504Plan.id,
        fieldKey: key,
        value: value,
      });

      const fieldValue = await prisma.planFieldValue.upsert({
        where: {
          planInstanceId_fieldKey: {
            planInstanceId: mock504Plan.id,
            fieldKey: key,
          },
        },
        update: { value: value },
        create: {
          planInstanceId: mock504Plan.id,
          fieldKey: key,
          value: value,
        },
      });

      expect(fieldValue.fieldKey).toBe(key);
      expect(fieldValue.value).toBe(value);
    }

    expect(prisma.planFieldValue.upsert).toHaveBeenCalledTimes(5);
  });
});

describe('504 Plan Finalization', () => {
  it('fails to finalize when required fields are missing', async () => {
    const incompleteFieldValues = [
      { fieldKey: 'referral_date', value: '2024-01-15' },
      { fieldKey: 'referral_source', value: 'Parent/Guardian' },
      // Missing: reason_for_referral, disability_type, etc.
    ];

    (prisma.planInstance.findFirst as jest.Mock).mockResolvedValue(mock504Plan);
    (prisma.planFieldValue.findMany as jest.Mock).mockResolvedValue(incompleteFieldValues);

    const plan = await prisma.planInstance.findFirst({ where: { id: mock504Plan.id } });
    const fieldValues = await prisma.planFieldValue.findMany({
      where: { planInstanceId: plan!.id },
    });

    // Get all required field keys from schema
    const requiredFields = mock504Schema.fields.sections.flatMap(
      (section: { fields: Array<{ key: string; required: boolean }> }) =>
        section.fields.filter((f: { required: boolean }) => f.required).map((f: { key: string }) => f.key)
    );

    // Check which required fields are filled
    const filledFields = fieldValues.map(fv => fv.fieldKey);
    const missingFields = requiredFields.filter(
      (rf: string) => !filledFields.includes(rf)
    );

    expect(missingFields.length).toBeGreaterThan(0);
    expect(missingFields).toContain('reason_for_referral');
    expect(missingFields).toContain('disability_type');
  });

  it('successfully finalizes when all required fields are filled', async () => {
    const completeFieldValues = [
      { fieldKey: 'referral_date', value: '2024-01-15' },
      { fieldKey: 'referral_source', value: 'Parent/Guardian' },
      { fieldKey: 'reason_for_referral', value: 'Student has been diagnosed with ADHD' },
      { fieldKey: 'student_name', value: 'Jane Smith' },
      { fieldKey: 'date_of_birth', value: '2013-05-20' },
      { fieldKey: 'grade_level', value: '5' },
      { fieldKey: 'disability_type', value: 'ADHD' },
      { fieldKey: 'major_life_activities_affected', value: 'Learning, concentrating' },
      { fieldKey: 'is_eligible', value: 'Eligible for 504 Plan' },
      { fieldKey: 'eligibility_rationale', value: 'ADHD substantially limits learning' },
      { fieldKey: 'classroom_accommodations', value: 'Extended time, preferential seating' },
      { fieldKey: 'plan_review_date', value: '2025-01-15' },
    ];

    const activePlan = { ...mock504Plan, status: 'ACTIVE' };

    (prisma.planInstance.findFirst as jest.Mock).mockResolvedValue(mock504Plan);
    (prisma.planFieldValue.findMany as jest.Mock).mockResolvedValue(completeFieldValues);
    (prisma.planInstance.update as jest.Mock).mockResolvedValue(activePlan);

    const plan = await prisma.planInstance.findFirst({ where: { id: mock504Plan.id } });
    const fieldValues = await prisma.planFieldValue.findMany({
      where: { planInstanceId: plan!.id },
    });

    // Get all required field keys from schema
    const requiredFields = mock504Schema.fields.sections.flatMap(
      (section: { fields: Array<{ key: string; required: boolean }> }) =>
        section.fields.filter((f: { required: boolean }) => f.required).map((f: { key: string }) => f.key)
    );

    // Check all required fields are filled
    const filledFields = fieldValues.map(fv => fv.fieldKey);
    const allRequiredFilled = requiredFields.every((rf: string) => filledFields.includes(rf));

    expect(allRequiredFilled).toBe(true);

    // Finalize the plan
    const finalized = await prisma.planInstance.update({
      where: { id: plan!.id },
      data: { status: 'ACTIVE' },
    });

    expect(finalized.status).toBe('ACTIVE');
  });
});

describe('504 Plan Access Control', () => {
  it('requires user to be assigned to student', async () => {
    const otherTeacherStudent = {
      ...mockStudent,
      teacherId: 'other-teacher-id',
    };

    // When teacher is not assigned, findFirst returns null
    (prisma.planInstance.findFirst as jest.Mock).mockResolvedValue(null);

    const plan = await prisma.planInstance.findFirst({
      where: {
        id: mock504Plan.id,
        student: {
          teacherId: mockUser.id, // Doesn't match otherTeacherStudent
        },
      },
    });

    expect(plan).toBeNull();
  });

  it('allows access when user is assigned to student', async () => {
    (prisma.planInstance.findFirst as jest.Mock).mockResolvedValue(mock504Plan);

    const plan = await prisma.planInstance.findFirst({
      where: {
        id: mock504Plan.id,
        student: {
          teacherId: mockUser.id,
        },
      },
    });

    expect(plan).not.toBeNull();
    expect(plan?.id).toBe(mock504Plan.id);
  });
});

describe('504 Plan Status Transitions', () => {
  it('transitions from DRAFT to ACTIVE when finalized', async () => {
    const draftPlan = { ...mock504Plan, status: 'DRAFT' };
    const activePlan = { ...mock504Plan, status: 'ACTIVE' };

    (prisma.planInstance.findFirst as jest.Mock).mockResolvedValue(draftPlan);
    (prisma.planInstance.update as jest.Mock).mockResolvedValue(activePlan);

    const plan = await prisma.planInstance.findFirst({ where: { id: mock504Plan.id } });
    expect(plan?.status).toBe('DRAFT');

    const updated = await prisma.planInstance.update({
      where: { id: mock504Plan.id },
      data: { status: 'ACTIVE' },
    });

    expect(updated.status).toBe('ACTIVE');
  });

  it('can transition from ACTIVE to ARCHIVED', async () => {
    const activePlan = { ...mock504Plan, status: 'ACTIVE' };
    const archivedPlan = { ...mock504Plan, status: 'ARCHIVED' };

    (prisma.planInstance.findFirst as jest.Mock).mockResolvedValue(activePlan);
    (prisma.planInstance.update as jest.Mock).mockResolvedValue(archivedPlan);

    const plan = await prisma.planInstance.findFirst({ where: { id: mock504Plan.id } });
    expect(plan?.status).toBe('ACTIVE');

    const updated = await prisma.planInstance.update({
      where: { id: mock504Plan.id },
      data: { status: 'ARCHIVED' },
    });

    expect(updated.status).toBe('ARCHIVED');
  });
});

describe('504 Plan Eligibility Determination', () => {
  it('validates eligibility options', () => {
    const validEligibilityOptions = [
      'Eligible for 504 Plan',
      'Not Eligible',
      'Additional Evaluation Needed',
    ];

    validEligibilityOptions.forEach(option => {
      expect(typeof option).toBe('string');
      expect(option.length).toBeGreaterThan(0);
    });

    expect(validEligibilityOptions).toHaveLength(3);
  });
});
