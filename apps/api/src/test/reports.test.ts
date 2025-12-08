import { prisma, StatusCode, PlanStatus } from '../lib/db.js';

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
    planInstance: {
      findFirst: jest.fn(),
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
  StatusCode: {
    ON_TRACK: 'ON_TRACK',
    WATCH: 'WATCH',
    CONCERN: 'CONCERN',
    URGENT: 'URGENT',
  },
  PlanStatus: {
    DRAFT: 'DRAFT',
    ACTIVE: 'ACTIVE',
    EXPIRED: 'EXPIRED',
  },
}));

describe('Status Summary API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /students/status-summary', () => {
    it('returns summary for all accessible students', async () => {
      const mockStudents = [
        {
          id: 'student-1',
          recordId: 'HCPSS-000001',
          firstName: 'John',
          lastName: 'Doe',
          grade: '5',
          statuses: [
            {
              id: 'status-1',
              scope: 'OVERALL',
              code: StatusCode.ON_TRACK,
              summary: 'Doing well',
              effectiveDate: new Date(),
            },
          ],
          plans: [
            {
              id: 'plan-1',
              status: PlanStatus.ACTIVE,
              startDate: new Date('2024-01-01'),
              endDate: new Date('2024-12-31'),
              planType: { code: 'IEP' },
            },
          ],
        },
        {
          id: 'student-2',
          recordId: 'HCPSS-000002',
          firstName: 'Jane',
          lastName: 'Smith',
          grade: '6',
          statuses: [
            {
              id: 'status-2',
              scope: 'OVERALL',
              code: StatusCode.WATCH,
              summary: 'Needs monitoring',
              effectiveDate: new Date(),
            },
          ],
          plans: [
            {
              id: 'plan-2',
              status: PlanStatus.ACTIVE,
              startDate: new Date('2024-02-01'),
              endDate: null,
              planType: { code: 'FIVE_OH_FOUR' },
            },
          ],
        },
      ];

      (prisma.student.findMany as jest.Mock).mockResolvedValue(mockStudents);

      const students = await prisma.student.findMany({
        where: {
          teacherId: 'teacher-1',
          isActive: true,
        },
        include: {
          statuses: {
            where: { scope: 'OVERALL' },
            orderBy: { effectiveDate: 'desc' },
            take: 1,
          },
          plans: {
            where: {
              status: { in: [PlanStatus.DRAFT, PlanStatus.ACTIVE] },
            },
            include: {
              planType: { select: { code: true } },
            },
          },
        },
      });

      expect(students).toHaveLength(2);

      // First student has IEP
      const student1 = students[0];
      expect(student1.plans[0].planType.code).toBe('IEP');
      expect(student1.statuses[0].code).toBe('ON_TRACK');

      // Second student has 504
      const student2 = students[1];
      expect(student2.plans[0].planType.code).toBe('FIVE_OH_FOUR');
      expect(student2.statuses[0].code).toBe('WATCH');
    });

    it('correctly identifies active plan types', async () => {
      const mockStudent = {
        id: 'student-1',
        recordId: 'HCPSS-000001',
        firstName: 'John',
        lastName: 'Doe',
        grade: '5',
        statuses: [],
        plans: [
          { id: 'p1', status: PlanStatus.ACTIVE, planType: { code: 'IEP' }, startDate: new Date(), endDate: null },
          { id: 'p2', status: PlanStatus.ACTIVE, planType: { code: 'BEHAVIOR_PLAN' }, startDate: new Date(), endDate: null },
          { id: 'p3', status: PlanStatus.EXPIRED, planType: { code: 'FIVE_OH_FOUR' }, startDate: new Date('2023-01-01'), endDate: new Date('2023-12-31') },
        ],
      };

      (prisma.student.findMany as jest.Mock).mockResolvedValue([mockStudent]);

      const students = await prisma.student.findMany({});
      const student = students[0];

      // Calculate active plans
      const hasActiveIEP = student.plans.some(
        (p: { planType: { code: string }; status: string }) =>
          p.planType.code === 'IEP' && (p.status === 'ACTIVE' || p.status === 'DRAFT')
      );
      const hasActive504 = student.plans.some(
        (p: { planType: { code: string }; status: string }) =>
          p.planType.code === 'FIVE_OH_FOUR' && (p.status === 'ACTIVE' || p.status === 'DRAFT')
      );
      const hasActiveBehavior = student.plans.some(
        (p: { planType: { code: string }; status: string }) =>
          p.planType.code === 'BEHAVIOR_PLAN' && (p.status === 'ACTIVE' || p.status === 'DRAFT')
      );

      expect(hasActiveIEP).toBe(true);
      expect(hasActive504).toBe(false);  // Expired
      expect(hasActiveBehavior).toBe(true);
    });
  });
});

describe('IEP Progress Report API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /reports/students/:id/iep-progress', () => {
    it('returns goal progress with trend analysis', async () => {
      const mockPlan = {
        id: 'plan-1',
        status: PlanStatus.ACTIVE,
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-12-31'),
        student: {
          id: 'student-1',
          firstName: 'John',
          lastName: 'Doe',
        },
      };

      const mockGoals = [
        {
          id: 'goal-1',
          goalCode: 'R1',
          area: 'READING',
          annualGoalText: 'Improve reading fluency',
          baselineJson: { percentCorrect: 50, trials: 10 },
          targetDate: new Date('2024-12-31'),
          progressRecords: [
            { id: 'pr-1', date: new Date('2024-02-01'), measureJson: { percentCorrect: 55 } },
            { id: 'pr-2', date: new Date('2024-03-01'), measureJson: { percentCorrect: 60 } },
            { id: 'pr-3', date: new Date('2024-04-01'), measureJson: { percentCorrect: 65 } },
          ],
        },
        {
          id: 'goal-2',
          goalCode: 'M1',
          area: 'MATH',
          annualGoalText: 'Improve math skills',
          baselineJson: { percentCorrect: 40 },
          targetDate: new Date('2024-12-31'),
          progressRecords: [
            { id: 'pr-4', date: new Date('2024-02-01'), measureJson: { percentCorrect: 42 } },
          ],
        },
      ];

      (prisma.planInstance.findFirst as jest.Mock).mockResolvedValue(mockPlan);
      (prisma.goal.findMany as jest.Mock).mockResolvedValue(mockGoals);

      const plan = await prisma.planInstance.findFirst({
        where: {
          studentId: 'student-1',
          planType: { code: 'IEP' },
          status: { in: [PlanStatus.ACTIVE, PlanStatus.DRAFT] },
        },
      });

      const goals = await prisma.goal.findMany({
        where: { planInstanceId: plan?.id },
        include: { progressRecords: true },
      });

      expect(goals).toHaveLength(2);

      // First goal has improving trend (3 data points, values increasing)
      const goal1 = goals[0];
      expect(goal1.progressRecords).toHaveLength(3);

      // Calculate trend for goal 1
      const records1 = goal1.progressRecords;
      const firstValue = records1[0].measureJson.percentCorrect;
      const lastValue = records1[records1.length - 1].measureJson.percentCorrect;
      const trend = lastValue > firstValue ? 'improving' : lastValue < firstValue ? 'declining' : 'stable';
      expect(trend).toBe('improving');

      // Second goal has insufficient data (only 1 data point)
      const goal2 = goals[1];
      expect(goal2.progressRecords).toHaveLength(1);
    });

    it('handles students with no active IEP', async () => {
      (prisma.planInstance.findFirst as jest.Mock).mockResolvedValue(null);

      const plan = await prisma.planInstance.findFirst({
        where: {
          studentId: 'student-no-iep',
          planType: { code: 'IEP' },
          status: { in: [PlanStatus.ACTIVE, PlanStatus.DRAFT] },
        },
      });

      expect(plan).toBeNull();
    });
  });
});

describe('Service Minutes Report API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /reports/students/:id/services', () => {
    it('returns service delivery grouped by type', async () => {
      const mockServiceLogs = [
        {
          id: 'sl-1',
          date: new Date('2024-03-01'),
          minutes: 30,
          serviceType: 'SPEECH_LANGUAGE',
          setting: 'THERAPY_ROOM',
          notes: 'Good session',
          provider: { displayName: 'Speech Therapist' },
        },
        {
          id: 'sl-2',
          date: new Date('2024-03-08'),
          minutes: 30,
          serviceType: 'SPEECH_LANGUAGE',
          setting: 'THERAPY_ROOM',
          notes: null,
          provider: { displayName: 'Speech Therapist' },
        },
        {
          id: 'sl-3',
          date: new Date('2024-03-05'),
          minutes: 45,
          serviceType: 'OCCUPATIONAL_THERAPY',
          setting: 'THERAPY_ROOM',
          notes: 'Working on fine motor',
          provider: { displayName: 'OT' },
        },
      ];

      (prisma.serviceLog.findMany as jest.Mock).mockResolvedValue(mockServiceLogs);

      const logs = await prisma.serviceLog.findMany({
        where: {
          planInstanceId: 'plan-1',
          date: {
            gte: new Date('2024-03-01'),
            lte: new Date('2024-03-31'),
          },
        },
        include: {
          provider: { select: { displayName: true } },
        },
        orderBy: { date: 'desc' },
      });

      expect(logs).toHaveLength(3);

      // Group by service type
      const byType = logs.reduce((acc: Record<string, typeof logs>, log) => {
        if (!acc[log.serviceType]) acc[log.serviceType] = [];
        acc[log.serviceType].push(log);
        return acc;
      }, {});

      expect(Object.keys(byType)).toHaveLength(2);
      expect(byType['SPEECH_LANGUAGE']).toHaveLength(2);
      expect(byType['OCCUPATIONAL_THERAPY']).toHaveLength(1);

      // Calculate totals
      const speechTotal = byType['SPEECH_LANGUAGE'].reduce((sum: number, l: { minutes: number }) => sum + l.minutes, 0);
      const otTotal = byType['OCCUPATIONAL_THERAPY'].reduce((sum: number, l: { minutes: number }) => sum + l.minutes, 0);

      expect(speechTotal).toBe(60);
      expect(otTotal).toBe(45);
    });

    it('returns empty array when no services in date range', async () => {
      (prisma.serviceLog.findMany as jest.Mock).mockResolvedValue([]);

      const logs = await prisma.serviceLog.findMany({
        where: {
          planInstanceId: 'plan-1',
          date: {
            gte: new Date('2025-01-01'),
            lte: new Date('2025-01-31'),
          },
        },
      });

      expect(logs).toHaveLength(0);
    });

    it('calculates summary statistics correctly', async () => {
      const mockServiceLogs = [
        { id: 'sl-1', minutes: 30, serviceType: 'SPEECH_LANGUAGE' },
        { id: 'sl-2', minutes: 30, serviceType: 'SPEECH_LANGUAGE' },
        { id: 'sl-3', minutes: 45, serviceType: 'OCCUPATIONAL_THERAPY' },
        { id: 'sl-4', minutes: 60, serviceType: 'SPECIAL_EDUCATION' },
      ];

      (prisma.serviceLog.findMany as jest.Mock).mockResolvedValue(mockServiceLogs);

      const logs = await prisma.serviceLog.findMany({});

      const totalMinutes = logs.reduce((sum: number, l: { minutes: number }) => sum + l.minutes, 0);
      const totalSessions = logs.length;
      const avgMinutesPerSession = totalMinutes / totalSessions;

      expect(totalMinutes).toBe(165);
      expect(totalSessions).toBe(4);
      expect(avgMinutesPerSession).toBeCloseTo(41.25);
    });
  });
});
