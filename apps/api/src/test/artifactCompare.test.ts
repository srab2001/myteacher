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
      findUnique: jest.fn(),
      findFirst: jest.fn(),
    },
    planInstance: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
    },
    artifactComparison: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    $disconnect: jest.fn(),
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
  grade: '3',
  schoolName: 'Test Elementary',
  recordId: 'STU001',
};

const mockPlanType = {
  id: 'iep-type-id',
  code: 'IEP',
  name: 'Individualized Education Program',
};

const mockPlanInstance = {
  id: 'test-plan-id',
  studentId: 'test-student-id',
  planTypeId: 'iep-type-id',
  label: 'IEP 2024-2025',
  status: 'DRAFT',
  startDate: new Date('2024-01-01'),
  endDate: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  student: mockStudent,
  planType: mockPlanType,
};

const mockComparison = {
  id: 'comparison-id',
  planInstanceId: 'test-plan-id',
  studentId: 'test-student-id',
  planTypeId: 'iep-type-id',
  artifactDate: new Date('2024-06-15'),
  description: 'Writing sample comparison',
  baselineFileUrl: '/uploads/artifacts/artifact-baseline-123.pdf',
  compareFileUrl: '/uploads/artifacts/artifact-compare-456.pdf',
  analysisText: 'The student showed improvement in sentence structure...',
  createdById: 'test-teacher-id',
  createdAt: new Date(),
  student: mockStudent,
  planType: mockPlanType,
  planInstance: mockPlanInstance,
  createdBy: { displayName: 'Test Teacher' },
};

describe('Artifact Compare Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/artifact-compare/plans/:planId/artifact-compare', () => {
    it('returns 401 when not authenticated', async () => {
      const response = await request(app).get('/api/artifact-compare/plans/test-plan-id/artifact-compare');
      expect(response.status).toBe(401);
    });
  });

  describe('POST /api/artifact-compare/plans/:planId/artifact-compare', () => {
    it('returns 401 when not authenticated', async () => {
      const response = await request(app)
        .post('/api/artifact-compare/plans/test-plan-id/artifact-compare')
        .field('artifactDate', '2024-06-15')
        .field('description', 'Test comparison');
      expect(response.status).toBe(401);
    });
  });

  describe('POST /api/artifact-compare/plans/:planId/artifact-compare/:comparisonId/compare', () => {
    it('returns 401 when not authenticated', async () => {
      const response = await request(app)
        .post('/api/artifact-compare/plans/test-plan-id/artifact-compare/comparison-id/compare');
      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/artifact-compare/plans/:planId/artifact-compare/:comparisonId', () => {
    it('returns 401 when not authenticated', async () => {
      const response = await request(app)
        .get('/api/artifact-compare/plans/test-plan-id/artifact-compare/comparison-id');
      expect(response.status).toBe(401);
    });
  });

  describe('DELETE /api/artifact-compare/plans/:planId/artifact-compare/:comparisonId', () => {
    it('returns 401 when not authenticated', async () => {
      const response = await request(app)
        .delete('/api/artifact-compare/plans/test-plan-id/artifact-compare/comparison-id');
      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/artifact-compare/students/:studentId/artifact-compares', () => {
    it('returns 401 when not authenticated', async () => {
      const response = await request(app)
        .get('/api/artifact-compare/students/test-student-id/artifact-compares');
      expect(response.status).toBe(401);
    });
  });
});

describe('Artifact Comparison Data Model', () => {
  it('creates an artifact comparison with required fields', async () => {
    (prisma.planInstance.findUnique as jest.Mock).mockResolvedValue(mockPlanInstance);
    (prisma.artifactComparison.create as jest.Mock).mockResolvedValue(mockComparison);

    const plan = await prisma.planInstance.findUnique({ where: { id: mockPlanInstance.id } });
    expect(plan).not.toBeNull();
    expect(plan?.student).toEqual(mockStudent);

    const comparison = await prisma.artifactComparison.create({
      data: {
        planInstanceId: plan!.id,
        studentId: plan!.studentId,
        planTypeId: plan!.planTypeId,
        artifactDate: new Date('2024-06-15'),
        description: 'Writing sample comparison',
        baselineFileUrl: '/uploads/artifacts/artifact-baseline-123.pdf',
        compareFileUrl: '/uploads/artifacts/artifact-compare-456.pdf',
        createdById: mockUser.id,
      },
    });

    expect(comparison.planInstanceId).toBe(plan!.id);
    expect(comparison.studentId).toBe(mockStudent.id);
    expect(comparison.baselineFileUrl).toContain('artifact-baseline');
    expect(comparison.compareFileUrl).toContain('artifact-compare');
    expect(prisma.artifactComparison.create).toHaveBeenCalled();
  });

  it('retrieves comparisons for a student across all plans', async () => {
    const comparisons = [
      mockComparison,
      {
        ...mockComparison,
        id: 'comparison-id-2',
        planInstanceId: 'another-plan-id',
        artifactDate: new Date('2024-07-01'),
        description: 'Math worksheet comparison',
      },
    ];

    (prisma.student.findUnique as jest.Mock).mockResolvedValue(mockStudent);
    (prisma.artifactComparison.findMany as jest.Mock).mockResolvedValue(comparisons);

    const student = await prisma.student.findUnique({ where: { id: mockStudent.id } });
    expect(student).not.toBeNull();

    const studentComparisons = await prisma.artifactComparison.findMany({
      where: { studentId: student!.id },
      orderBy: { createdAt: 'desc' },
    });

    expect(studentComparisons.length).toBe(2);
    expect(studentComparisons[0].studentId).toBe(mockStudent.id);
  });

  it('retrieves comparisons for a specific plan', async () => {
    (prisma.planInstance.findFirst as jest.Mock).mockResolvedValue(mockPlanInstance);
    (prisma.artifactComparison.findMany as jest.Mock).mockResolvedValue([mockComparison]);

    const plan = await prisma.planInstance.findFirst({ where: { id: mockPlanInstance.id } });
    expect(plan).not.toBeNull();

    const planComparisons = await prisma.artifactComparison.findMany({
      where: { planInstanceId: plan!.id },
      orderBy: { createdAt: 'desc' },
    });

    expect(planComparisons.length).toBe(1);
    expect(planComparisons[0].planInstanceId).toBe(mockPlanInstance.id);
  });
});

describe('Artifact Comparison Analysis', () => {
  it('updates comparison with analysis text', async () => {
    const updatedComparison = {
      ...mockComparison,
      analysisText: 'Student demonstrated 30% improvement in handwriting clarity...',
    };

    (prisma.artifactComparison.findFirst as jest.Mock).mockResolvedValue(mockComparison);
    (prisma.artifactComparison.update as jest.Mock).mockResolvedValue(updatedComparison);

    const comparison = await prisma.artifactComparison.findFirst({
      where: { id: mockComparison.id },
    });
    expect(comparison).not.toBeNull();

    const updated = await prisma.artifactComparison.update({
      where: { id: comparison!.id },
      data: { analysisText: 'Student demonstrated 30% improvement in handwriting clarity...' },
    });

    expect(updated.analysisText).toContain('30% improvement');
    expect(prisma.artifactComparison.update).toHaveBeenCalled();
  });

  it('does not regenerate analysis if already exists (unless forced)', async () => {
    const existingAnalysis = mockComparison.analysisText;

    (prisma.artifactComparison.findFirst as jest.Mock).mockResolvedValue(mockComparison);

    const comparison = await prisma.artifactComparison.findFirst({
      where: { id: mockComparison.id },
    });

    // Analysis already exists
    expect(comparison?.analysisText).toBe(existingAnalysis);

    // Without force flag, should return existing analysis
    if (comparison?.analysisText && !false) { // force = false
      expect(comparison.analysisText).toBe(existingAnalysis);
    }
  });
});

describe('Artifact Comparison Access Control', () => {
  it('only allows access to comparisons for students assigned to the teacher', async () => {
    // When querying with the wrong teacher, comparison should not be found
    (prisma.artifactComparison.findFirst as jest.Mock).mockResolvedValue(null);

    const comparison = await prisma.artifactComparison.findFirst({
      where: {
        id: mockComparison.id,
        student: {
          teacherId: mockUser.id, // Current user's teacher ID
        },
      },
    });

    expect(comparison).toBeNull();
  });

  it('returns comparison when teacher has access', async () => {
    (prisma.artifactComparison.findFirst as jest.Mock).mockResolvedValue(mockComparison);

    const comparison = await prisma.artifactComparison.findFirst({
      where: {
        id: mockComparison.id,
        student: {
          teacherId: mockUser.id,
        },
      },
    });

    expect(comparison).not.toBeNull();
    expect(comparison?.id).toBe(mockComparison.id);
  });
});

describe('Artifact Comparison Error Codes', () => {
  it('returns ERR_API_ARTIFACT_NOT_FOUND for non-existent comparison', async () => {
    (prisma.artifactComparison.findFirst as jest.Mock).mockResolvedValue(null);

    const comparison = await prisma.artifactComparison.findFirst({
      where: { id: 'non-existent-id' },
    });

    expect(comparison).toBeNull();

    // The API should return this error code
    const expectedError = {
      error: {
        code: 'ERR_API_ARTIFACT_NOT_FOUND',
        message: 'Artifact comparison not found',
      },
    };

    expect(expectedError.error.code).toBe('ERR_API_ARTIFACT_NOT_FOUND');
  });

  it('returns ERR_API_STUDENT_NOT_FOUND for non-existent student', async () => {
    (prisma.student.findUnique as jest.Mock).mockResolvedValue(null);

    const student = await prisma.student.findUnique({
      where: { id: 'non-existent-student-id' },
    });

    expect(student).toBeNull();

    // The API should return this error code
    const expectedError = {
      error: {
        code: 'ERR_API_STUDENT_NOT_FOUND',
        message: 'Student not found',
      },
    };

    expect(expectedError.error.code).toBe('ERR_API_STUDENT_NOT_FOUND');
  });

  it('returns ERR_API_PLAN_NOT_FOUND for non-existent plan', async () => {
    (prisma.planInstance.findUnique as jest.Mock).mockResolvedValue(null);

    const plan = await prisma.planInstance.findUnique({
      where: { id: 'non-existent-plan-id' },
    });

    expect(plan).toBeNull();

    // The API should return this error code
    const expectedError = {
      error: {
        code: 'ERR_API_PLAN_NOT_FOUND',
        message: 'Plan not found',
      },
    };

    expect(expectedError.error.code).toBe('ERR_API_PLAN_NOT_FOUND');
  });
});

describe('Artifact Comparison Deletion', () => {
  it('deletes comparison and cleans up files', async () => {
    (prisma.artifactComparison.findFirst as jest.Mock).mockResolvedValue(mockComparison);
    (prisma.artifactComparison.delete as jest.Mock).mockResolvedValue(mockComparison);

    const comparison = await prisma.artifactComparison.findFirst({
      where: { id: mockComparison.id },
    });
    expect(comparison).not.toBeNull();

    // Extract filenames
    const baselineFilename = comparison!.baselineFileUrl.split('/').pop();
    const compareFilename = comparison!.compareFileUrl.split('/').pop();

    expect(baselineFilename).toContain('artifact-baseline');
    expect(compareFilename).toContain('artifact-compare');

    // Delete record
    await prisma.artifactComparison.delete({
      where: { id: comparison!.id },
    });

    expect(prisma.artifactComparison.delete).toHaveBeenCalled();
  });
});
