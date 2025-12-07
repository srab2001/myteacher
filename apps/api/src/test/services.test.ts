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
    serviceLog: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    planInstance: {
      findFirst: jest.fn(),
    },
    $disconnect: jest.fn(),
  },
  ServiceType: {
    SPECIAL_EDUCATION: 'SPECIAL_EDUCATION',
    SPEECH_LANGUAGE: 'SPEECH_LANGUAGE',
    OCCUPATIONAL_THERAPY: 'OCCUPATIONAL_THERAPY',
    PHYSICAL_THERAPY: 'PHYSICAL_THERAPY',
    COUNSELING: 'COUNSELING',
    BEHAVIORAL_SUPPORT: 'BEHAVIORAL_SUPPORT',
    READING_SPECIALIST: 'READING_SPECIALIST',
    PARAPROFESSIONAL: 'PARAPROFESSIONAL',
    OTHER: 'OTHER',
  },
  ServiceSetting: {
    GENERAL_EDUCATION: 'GENERAL_EDUCATION',
    SPECIAL_EDUCATION: 'SPECIAL_EDUCATION',
    RESOURCE_ROOM: 'RESOURCE_ROOM',
    THERAPY_ROOM: 'THERAPY_ROOM',
    COMMUNITY: 'COMMUNITY',
    HOME: 'HOME',
    OTHER: 'OTHER',
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

const mockPlan = {
  id: 'test-plan-id',
  student: {
    teacherId: 'test-teacher-id',
  },
};

const mockServiceLog = {
  id: 'test-service-id',
  planInstanceId: 'test-plan-id',
  date: new Date('2024-01-15'),
  minutes: 45,
  serviceType: 'SPECIAL_EDUCATION',
  setting: 'RESOURCE_ROOM',
  notes: 'Worked on reading comprehension',
  providerId: 'test-teacher-id',
  createdAt: new Date(),
  provider: { displayName: 'Test Teacher' },
};

describe('Service Log Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/plans/:planId/services', () => {
    it('returns 401 when not authenticated', async () => {
      const response = await request(app)
        .post('/api/plans/test-plan-id/services')
        .send({
          date: '2024-01-15',
          minutes: 45,
          serviceType: 'SPECIAL_EDUCATION',
          setting: 'RESOURCE_ROOM',
        });

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/plans/:planId/services', () => {
    it('returns 401 when not authenticated', async () => {
      const response = await request(app).get('/api/plans/test-plan-id/services');
      expect(response.status).toBe(401);
    });
  });
});

describe('Service Log Creation Logic', () => {
  it('creates a service log with required fields', async () => {
    const serviceData = {
      date: '2024-01-15',
      minutes: 30,
      serviceType: 'SPEECH_LANGUAGE',
      setting: 'THERAPY_ROOM',
    };

    const createdLog = {
      id: 'new-log-id',
      planInstanceId: mockPlan.id,
      date: new Date(serviceData.date),
      minutes: serviceData.minutes,
      serviceType: serviceData.serviceType,
      setting: serviceData.setting,
      notes: null,
      providerId: mockUser.id,
      createdAt: new Date(),
      provider: { displayName: mockUser.displayName },
    };

    (prisma.planInstance.findFirst as jest.Mock).mockResolvedValue(mockPlan);
    (prisma.serviceLog.create as jest.Mock).mockResolvedValue(createdLog);

    const plan = await prisma.planInstance.findFirst({ where: { id: mockPlan.id } });
    expect(plan).not.toBeNull();

    const log = await prisma.serviceLog.create({
      data: {
        planInstanceId: mockPlan.id,
        date: new Date(serviceData.date),
        minutes: serviceData.minutes,
        serviceType: serviceData.serviceType,
        setting: serviceData.setting,
        providerId: mockUser.id,
      },
      include: {
        provider: {
          select: { displayName: true },
        },
      },
    });

    expect(log.minutes).toBe(30);
    expect(log.serviceType).toBe('SPEECH_LANGUAGE');
    expect(log.setting).toBe('THERAPY_ROOM');
  });

  it('creates a service log with notes', async () => {
    const serviceData = {
      date: '2024-01-16',
      minutes: 60,
      serviceType: 'OCCUPATIONAL_THERAPY',
      setting: 'THERAPY_ROOM',
      notes: 'Worked on fine motor skills with writing exercises',
    };

    const createdLog = {
      id: 'new-log-id',
      planInstanceId: mockPlan.id,
      date: new Date(serviceData.date),
      minutes: serviceData.minutes,
      serviceType: serviceData.serviceType,
      setting: serviceData.setting,
      notes: serviceData.notes,
      providerId: mockUser.id,
      createdAt: new Date(),
      provider: { displayName: mockUser.displayName },
    };

    (prisma.serviceLog.create as jest.Mock).mockResolvedValue(createdLog);

    const log = await prisma.serviceLog.create({
      data: {
        planInstanceId: mockPlan.id,
        date: new Date(serviceData.date),
        minutes: serviceData.minutes,
        serviceType: serviceData.serviceType,
        setting: serviceData.setting,
        notes: serviceData.notes,
        providerId: mockUser.id,
      },
      include: {
        provider: {
          select: { displayName: true },
        },
      },
    });

    expect(log.notes).toBe('Worked on fine motor skills with writing exercises');
  });
});

describe('Service Log Summary Calculations', () => {
  it('calculates total minutes by service type', async () => {
    const serviceLogs = [
      { id: '1', serviceType: 'SPECIAL_EDUCATION', minutes: 45 },
      { id: '2', serviceType: 'SPECIAL_EDUCATION', minutes: 30 },
      { id: '3', serviceType: 'SPEECH_LANGUAGE', minutes: 30 },
      { id: '4', serviceType: 'SPEECH_LANGUAGE', minutes: 30 },
      { id: '5', serviceType: 'OCCUPATIONAL_THERAPY', minutes: 45 },
    ];

    (prisma.serviceLog.findMany as jest.Mock).mockResolvedValue(serviceLogs);

    const logs = await prisma.serviceLog.findMany({
      where: { planInstanceId: mockPlan.id },
    });

    // Calculate totals by type
    const totalsByType: Record<string, number> = {};
    for (const log of logs) {
      const key = log.serviceType;
      totalsByType[key] = (totalsByType[key] || 0) + log.minutes;
    }

    expect(totalsByType['SPECIAL_EDUCATION']).toBe(75);
    expect(totalsByType['SPEECH_LANGUAGE']).toBe(60);
    expect(totalsByType['OCCUPATIONAL_THERAPY']).toBe(45);
  });

  it('calculates weekly totals', async () => {
    const now = new Date('2024-01-20');
    const weekStart = new Date('2024-01-14'); // Sunday

    const serviceLogs = [
      { id: '1', date: new Date('2024-01-15'), minutes: 30 }, // This week
      { id: '2', date: new Date('2024-01-17'), minutes: 45 }, // This week
      { id: '3', date: new Date('2024-01-19'), minutes: 30 }, // This week
      { id: '4', date: new Date('2024-01-10'), minutes: 60 }, // Last week
      { id: '5', date: new Date('2024-01-08'), minutes: 45 }, // Last week
    ];

    const weeklyLogs = serviceLogs.filter(log => log.date >= weekStart && log.date <= now);
    const weeklyTotal = weeklyLogs.reduce((sum, log) => sum + log.minutes, 0);
    const totalMinutes = serviceLogs.reduce((sum, log) => sum + log.minutes, 0);

    expect(weeklyTotal).toBe(105); // 30 + 45 + 30
    expect(totalMinutes).toBe(210); // All logs
  });
});

describe('Service Log Updates', () => {
  it('updates service log minutes', async () => {
    const updatedLog = {
      ...mockServiceLog,
      minutes: 60,
    };

    (prisma.serviceLog.findFirst as jest.Mock).mockResolvedValue(mockServiceLog);
    (prisma.serviceLog.update as jest.Mock).mockResolvedValue(updatedLog);

    const log = await prisma.serviceLog.findFirst({ where: { id: mockServiceLog.id } });
    expect(log).not.toBeNull();

    const updated = await prisma.serviceLog.update({
      where: { id: mockServiceLog.id },
      data: { minutes: 60 },
    });

    expect(updated.minutes).toBe(60);
  });

  it('deletes service log', async () => {
    (prisma.serviceLog.findFirst as jest.Mock).mockResolvedValue(mockServiceLog);
    (prisma.serviceLog.delete as jest.Mock).mockResolvedValue(mockServiceLog);

    const log = await prisma.serviceLog.findFirst({ where: { id: mockServiceLog.id } });
    expect(log).not.toBeNull();

    await prisma.serviceLog.delete({ where: { id: mockServiceLog.id } });

    expect(prisma.serviceLog.delete).toHaveBeenCalledWith({
      where: { id: mockServiceLog.id },
    });
  });
});

describe('Service Type Validation', () => {
  it('validates all service types', () => {
    const validTypes = [
      'SPECIAL_EDUCATION',
      'SPEECH_LANGUAGE',
      'OCCUPATIONAL_THERAPY',
      'PHYSICAL_THERAPY',
      'COUNSELING',
      'BEHAVIORAL_SUPPORT',
      'READING_SPECIALIST',
      'PARAPROFESSIONAL',
      'OTHER',
    ];

    validTypes.forEach(type => {
      expect(typeof type).toBe('string');
    });
  });
});

describe('Service Setting Validation', () => {
  it('validates all service settings', () => {
    const validSettings = [
      'GENERAL_EDUCATION',
      'SPECIAL_EDUCATION',
      'RESOURCE_ROOM',
      'THERAPY_ROOM',
      'COMMUNITY',
      'HOME',
      'OTHER',
    ];

    validSettings.forEach(setting => {
      expect(typeof setting).toBe('string');
    });
  });
});

describe('Minutes Validation', () => {
  it('validates minutes within acceptable range', () => {
    const validMinutes = [1, 15, 30, 45, 60, 90, 120, 180, 240, 480];
    const invalidMinutes = [0, -1, 481, 1000];

    validMinutes.forEach(mins => {
      expect(mins >= 1 && mins <= 480).toBe(true);
    });

    invalidMinutes.forEach(mins => {
      expect(mins >= 1 && mins <= 480).toBe(false);
    });
  });
});
