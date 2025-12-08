import { prisma, StatusScope, StatusCode } from '../lib/db.js';

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
jest.mock('../lib/db.js', () => ({
  prisma: {
    student: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
    },
    studentStatus: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
    $disconnect: jest.fn(),
  },
  StatusScope: {
    OVERALL: 'OVERALL',
    ACADEMIC: 'ACADEMIC',
    BEHAVIOR: 'BEHAVIOR',
    SERVICES: 'SERVICES',
  },
  StatusCode: {
    ON_TRACK: 'ON_TRACK',
    WATCH: 'WATCH',
    CONCERN: 'CONCERN',
    URGENT: 'URGENT',
  },
}));

describe('Student Status System', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Status Creation', () => {
    it('creates a new status for a student', async () => {
      const mockStatus = {
        id: 'status-1',
        studentId: 'student-1',
        scope: StatusScope.OVERALL,
        code: StatusCode.ON_TRACK,
        summary: 'Student is doing well',
        effectiveDate: new Date('2024-01-15'),
        createdAt: new Date(),
        updatedById: 'teacher-1',
        updatedBy: { displayName: 'Test Teacher' },
      };

      (prisma.studentStatus.create as jest.Mock).mockResolvedValue(mockStatus);

      const status = await prisma.studentStatus.create({
        data: {
          studentId: 'student-1',
          scope: StatusScope.OVERALL,
          code: StatusCode.ON_TRACK,
          summary: 'Student is doing well',
          effectiveDate: new Date('2024-01-15'),
          updatedById: 'teacher-1',
        },
        include: {
          updatedBy: { select: { displayName: true } },
        },
      });

      expect(status.id).toBe('status-1');
      expect(status.scope).toBe('OVERALL');
      expect(status.code).toBe('ON_TRACK');
      expect(status.summary).toBe('Student is doing well');
    });

    it('validates status scope enum', () => {
      expect(StatusScope.OVERALL).toBe('OVERALL');
      expect(StatusScope.ACADEMIC).toBe('ACADEMIC');
      expect(StatusScope.BEHAVIOR).toBe('BEHAVIOR');
      expect(StatusScope.SERVICES).toBe('SERVICES');
    });

    it('validates status code enum', () => {
      expect(StatusCode.ON_TRACK).toBe('ON_TRACK');
      expect(StatusCode.WATCH).toBe('WATCH');
      expect(StatusCode.CONCERN).toBe('CONCERN');
      expect(StatusCode.URGENT).toBe('URGENT');
    });
  });

  describe('Latest Status Query', () => {
    it('retrieves latest status for each scope', async () => {
      const mockStatuses = [
        {
          id: 'status-1',
          studentId: 'student-1',
          scope: StatusScope.OVERALL,
          code: StatusCode.ON_TRACK,
          summary: 'Overall good',
          effectiveDate: new Date('2024-01-15'),
          updatedBy: { displayName: 'Teacher 1' },
        },
        {
          id: 'status-2',
          studentId: 'student-1',
          scope: StatusScope.ACADEMIC,
          code: StatusCode.WATCH,
          summary: 'Needs attention in math',
          effectiveDate: new Date('2024-01-10'),
          updatedBy: { displayName: 'Teacher 1' },
        },
        {
          id: 'status-3',
          studentId: 'student-1',
          scope: StatusScope.BEHAVIOR,
          code: StatusCode.ON_TRACK,
          summary: 'Great behavior',
          effectiveDate: new Date('2024-01-12'),
          updatedBy: { displayName: 'Teacher 2' },
        },
      ];

      (prisma.studentStatus.findMany as jest.Mock).mockResolvedValue(mockStatuses);

      const statuses = await prisma.studentStatus.findMany({
        where: { studentId: 'student-1' },
        orderBy: { effectiveDate: 'desc' },
        distinct: ['scope'],
        include: {
          updatedBy: { select: { displayName: true } },
        },
      });

      expect(statuses).toHaveLength(3);
      expect(statuses[0].scope).toBe('OVERALL');
      expect(statuses[1].scope).toBe('ACADEMIC');
      expect(statuses[2].scope).toBe('BEHAVIOR');
    });

    it('returns empty array for student with no statuses', async () => {
      (prisma.studentStatus.findMany as jest.Mock).mockResolvedValue([]);

      const statuses = await prisma.studentStatus.findMany({
        where: { studentId: 'student-no-status' },
      });

      expect(statuses).toHaveLength(0);
    });
  });

  describe('Student List with Statuses', () => {
    it('fetches students with their overall status', async () => {
      const mockStudents = [
        {
          id: 'student-1',
          recordId: 'HCPSS-000001',
          externalId: null,
          firstName: 'John',
          lastName: 'Doe',
          grade: '5',
          schoolName: 'Test Elementary',
          statuses: [
            {
              id: 'status-1',
              scope: StatusScope.OVERALL,
              code: StatusCode.ON_TRACK,
              summary: 'Doing well',
              effectiveDate: new Date(),
            },
          ],
        },
        {
          id: 'student-2',
          recordId: 'HCPSS-000002',
          externalId: null,
          firstName: 'Jane',
          lastName: 'Smith',
          grade: '5',
          schoolName: 'Test Elementary',
          statuses: [
            {
              id: 'status-2',
              scope: StatusScope.OVERALL,
              code: StatusCode.CONCERN,
              summary: 'Needs support',
              effectiveDate: new Date(),
            },
          ],
        },
      ];

      (prisma.student.findMany as jest.Mock).mockResolvedValue(mockStudents);

      const students = await prisma.student.findMany({
        where: { teacherId: 'teacher-1', isActive: true },
        include: {
          statuses: {
            orderBy: { effectiveDate: 'desc' },
            take: 4,
            distinct: ['scope'],
          },
        },
      });

      expect(students).toHaveLength(2);
      expect(students[0].statuses[0].code).toBe('ON_TRACK');
      expect(students[1].statuses[0].code).toBe('CONCERN');
    });
  });
});
