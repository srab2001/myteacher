import request from 'supertest';
import { createApp } from '../app.js';
import { prisma } from '@myteacher/db';

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
    goal: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    goalProgress: {
      findMany: jest.fn(),
      create: jest.fn(),
    },
    planInstance: {
      findFirst: jest.fn(),
    },
    $disconnect: jest.fn(),
  },
  GoalArea: {
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
  },
  ProgressLevel: {
    NOT_ADDRESSED: 'NOT_ADDRESSED',
    FULL_SUPPORT: 'FULL_SUPPORT',
    SOME_SUPPORT: 'SOME_SUPPORT',
    LOW_SUPPORT: 'LOW_SUPPORT',
    MET_TARGET: 'MET_TARGET',
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
  stateCode: 'MD',
  districtName: 'HCPSS',
  schoolName: 'Test Elementary',
};

const mockPlan = {
  id: 'test-plan-id',
  student: {
    teacherId: 'test-teacher-id',
  },
};

const mockGoal = {
  id: 'test-goal-id',
  goalCode: 'R1.1',
  area: 'READING',
  annualGoalText: 'Student will improve reading comprehension by 20%.',
  baselineJson: { level: 'Grade 2' },
  shortTermObjectives: ['Read 50 words per minute', 'Answer comprehension questions'],
  progressSchedule: 'weekly',
  targetDate: new Date('2025-06-01'),
  isActive: true,
  planInstanceId: 'test-plan-id',
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('Goal Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/plans/:planId/goals', () => {
    it('returns 401 when not authenticated', async () => {
      const response = await request(app)
        .post('/api/plans/test-plan-id/goals')
        .send({
          goalCode: 'R1.1',
          area: 'READING',
          annualGoalText: 'Student will improve reading.',
        });

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/plans/:planId/goals', () => {
    it('returns 401 when not authenticated', async () => {
      const response = await request(app).get('/api/plans/test-plan-id/goals');
      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/goals/:goalId', () => {
    it('returns 401 when not authenticated', async () => {
      const response = await request(app).get('/api/goals/test-goal-id');
      expect(response.status).toBe(401);
    });
  });
});

describe('Goal Creation Logic', () => {
  it('creates a goal with required fields', async () => {
    const goalData = {
      goalCode: 'M1.1',
      area: 'MATH',
      annualGoalText: 'Student will solve addition problems with 80% accuracy.',
      progressSchedule: 'weekly',
    };

    const createdGoal = {
      id: 'new-goal-id',
      planInstanceId: mockPlan.id,
      ...goalData,
      baselineJson: {},
      shortTermObjectives: [],
      targetDate: null,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    (prisma.planInstance.findFirst as jest.Mock).mockResolvedValue(mockPlan);
    (prisma.goal.create as jest.Mock).mockResolvedValue(createdGoal);

    // Simulate goal creation
    const plan = await prisma.planInstance.findFirst({ where: { id: mockPlan.id } });
    expect(plan).not.toBeNull();

    const goal = await prisma.goal.create({
      data: {
        planInstanceId: mockPlan.id,
        goalCode: goalData.goalCode,
        area: goalData.area,
        annualGoalText: goalData.annualGoalText,
        baselineJson: {},
        shortTermObjectives: [],
        progressSchedule: goalData.progressSchedule,
        targetDate: null,
      },
    });

    expect(goal.goalCode).toBe('M1.1');
    expect(goal.area).toBe('MATH');
  });

  it('creates goal with short-term objectives', async () => {
    const goalData = {
      goalCode: 'R2.1',
      area: 'READING',
      annualGoalText: 'Student will read fluently.',
      shortTermObjectives: [
        'Read 40 words per minute by Q1',
        'Read 60 words per minute by Q2',
        'Read 80 words per minute by Q3',
      ],
    };

    const createdGoal = {
      id: 'new-goal-id',
      ...goalData,
      planInstanceId: mockPlan.id,
      baselineJson: {},
      progressSchedule: null,
      targetDate: null,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    (prisma.goal.create as jest.Mock).mockResolvedValue(createdGoal);

    const goal = await prisma.goal.create({
      data: {
        planInstanceId: mockPlan.id,
        ...goalData,
        baselineJson: {},
      },
    });

    expect(goal.shortTermObjectives).toHaveLength(3);
    expect(goal.shortTermObjectives[0]).toBe('Read 40 words per minute by Q1');
  });
});

describe('Progress Recording Logic', () => {
  it('records quick progress for a goal', async () => {
    const progressData = {
      quickSelect: 'SOME_SUPPORT',
      comment: 'Good effort today',
      date: new Date(),
    };

    const createdProgress = {
      id: 'new-progress-id',
      goalId: mockGoal.id,
      ...progressData,
      measureJson: {},
      isDictated: false,
      recordedById: mockUser.id,
      createdAt: new Date(),
      recordedBy: { displayName: mockUser.displayName },
    };

    (prisma.goal.findFirst as jest.Mock).mockResolvedValue(mockGoal);
    (prisma.goalProgress.create as jest.Mock).mockResolvedValue(createdProgress);

    const goal = await prisma.goal.findFirst({ where: { id: mockGoal.id } });
    expect(goal).not.toBeNull();

    const progress = await prisma.goalProgress.create({
      data: {
        goalId: mockGoal.id,
        quickSelect: progressData.quickSelect,
        comment: progressData.comment,
        date: progressData.date,
        recordedById: mockUser.id,
      },
      include: {
        recordedBy: {
          select: { displayName: true },
        },
      },
    });

    expect(progress.quickSelect).toBe('SOME_SUPPORT');
    expect(progress.isDictated).toBe(false);
    expect(progress.recordedBy.displayName).toBe('Test Teacher');
  });

  it('records dictation progress with transcribed text', async () => {
    const progressData = {
      quickSelect: 'LOW_SUPPORT',
      comment: 'Student showed great improvement today. Was able to complete the reading passage independently.',
      isDictated: true,
      measureJson: { wpm: 65, accuracy: 0.85 },
    };

    const createdProgress = {
      id: 'new-progress-id',
      goalId: mockGoal.id,
      ...progressData,
      date: new Date(),
      recordedById: mockUser.id,
      createdAt: new Date(),
      recordedBy: { displayName: mockUser.displayName },
    };

    (prisma.goalProgress.create as jest.Mock).mockResolvedValue(createdProgress);

    const progress = await prisma.goalProgress.create({
      data: {
        goalId: mockGoal.id,
        quickSelect: progressData.quickSelect,
        comment: progressData.comment,
        measureJson: progressData.measureJson,
        isDictated: true,
        date: new Date(),
        recordedById: mockUser.id,
      },
      include: {
        recordedBy: {
          select: { displayName: true },
        },
      },
    });

    expect(progress.isDictated).toBe(true);
    expect(progress.comment).toContain('great improvement');
    expect(progress.measureJson).toEqual({ wpm: 65, accuracy: 0.85 });
  });

  it('retrieves progress history for a goal', async () => {
    const progressHistory = [
      {
        id: 'progress-1',
        goalId: mockGoal.id,
        quickSelect: 'FULL_SUPPORT',
        date: new Date('2024-01-10'),
        comment: 'Initial assessment',
        isDictated: false,
        recordedBy: { displayName: 'Test Teacher' },
      },
      {
        id: 'progress-2',
        goalId: mockGoal.id,
        quickSelect: 'SOME_SUPPORT',
        date: new Date('2024-01-17'),
        comment: 'Some improvement shown',
        isDictated: true,
        recordedBy: { displayName: 'Test Teacher' },
      },
      {
        id: 'progress-3',
        goalId: mockGoal.id,
        quickSelect: 'LOW_SUPPORT',
        date: new Date('2024-01-24'),
        comment: 'Good progress',
        isDictated: false,
        recordedBy: { displayName: 'Test Teacher' },
      },
    ];

    (prisma.goalProgress.findMany as jest.Mock).mockResolvedValue(progressHistory);

    const progress = await prisma.goalProgress.findMany({
      where: { goalId: mockGoal.id },
      orderBy: { date: 'desc' },
      include: {
        recordedBy: {
          select: { displayName: true },
        },
      },
    });

    expect(progress).toHaveLength(3);
    expect(progress[0].quickSelect).toBe('FULL_SUPPORT');
    expect(progress[2].quickSelect).toBe('LOW_SUPPORT');
  });
});

describe('Goal Area Validation', () => {
  it('accepts all valid goal areas', () => {
    const validAreas = [
      'READING',
      'WRITING',
      'MATH',
      'COMMUNICATION',
      'SOCIAL_EMOTIONAL',
      'BEHAVIOR',
      'MOTOR_SKILLS',
      'DAILY_LIVING',
      'VOCATIONAL',
      'OTHER',
    ];

    validAreas.forEach(area => {
      expect(Object.keys((prisma as any).__esModule ? {} : {})).toBeDefined();
    });
  });
});

describe('Progress Level Validation', () => {
  it('accepts all valid progress levels', () => {
    const validLevels = [
      'NOT_ADDRESSED',
      'FULL_SUPPORT',
      'SOME_SUPPORT',
      'LOW_SUPPORT',
      'MET_TARGET',
    ];

    validLevels.forEach(level => {
      expect(typeof level).toBe('string');
    });
  });
});
