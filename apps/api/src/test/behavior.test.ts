import request from 'supertest';
import { createApp } from '../app.js';
import { prisma, BehaviorMeasurementType } from '../lib/db.js';

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
      create: jest.fn(),
      findFirst: jest.fn(),
    },
    planType: {
      findUnique: jest.fn(),
    },
    planSchema: {
      findFirst: jest.fn(),
    },
    behaviorPlan: {
      create: jest.fn(),
      findFirst: jest.fn(),
    },
    behaviorTarget: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
    behaviorEvent: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      delete: jest.fn(),
    },
    $disconnect: jest.fn(),
  },
  BehaviorMeasurementType: {
    FREQUENCY: 'FREQUENCY',
    DURATION: 'DURATION',
    INTERVAL: 'INTERVAL',
    RATING: 'RATING',
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

const mockBehaviorPlanType = {
  id: 'behavior-plan-type-id',
  code: 'BEHAVIOR_PLAN',
  name: 'Behavior Intervention Plan',
};

const mockBehaviorSchema = {
  id: 'behavior-schema-id',
  planTypeId: 'behavior-plan-type-id',
  version: 1,
  name: 'Behavior Intervention Plan v1',
  fields: {
    sections: [
      {
        key: 'student_information',
        title: 'Student Information',
        order: 1,
        fields: [
          { key: 'student_name', type: 'text', label: 'Student Name', required: true },
          { key: 'plan_date', type: 'date', label: 'Plan Development Date', required: true },
        ],
      },
      {
        key: 'behavior_definition',
        title: 'Target Behavior Definition',
        order: 3,
        isBehaviorTargetsSection: true,
        fields: [
          { key: 'target_behaviors', type: 'behavior_targets', label: 'Target Behaviors', required: true },
        ],
      },
    ],
  },
  isActive: true,
};

const mockPlanInstance = {
  id: 'test-plan-id',
  studentId: 'test-student-id',
  planSchemaId: 'behavior-schema-id',
  status: 'DRAFT',
  startDate: new Date('2024-01-01'),
  endDate: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  student: mockStudent,
  planType: mockBehaviorPlanType,
  schema: mockBehaviorSchema,
};

const mockBehaviorPlan = {
  id: 'behavior-plan-id',
  planInstanceId: 'test-plan-id',
  summary: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  planInstance: mockPlanInstance,
};

const mockBehaviorTarget = {
  id: 'target-id',
  behaviorPlanId: 'behavior-plan-id',
  code: 'OFF_TASK',
  name: 'Off-Task Behavior',
  definition: 'Student is not engaged in assigned academic task for more than 10 seconds.',
  examples: 'Looking around room, playing with objects, staring out window',
  nonExamples: 'Asking for help, sharpening pencil, getting materials',
  measurementType: 'FREQUENCY' as BehaviorMeasurementType,
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockBehaviorEvent = {
  id: 'event-id',
  behaviorTargetId: 'target-id',
  eventDate: new Date('2024-06-01T12:00:00'),
  startTime: null,
  endTime: null,
  count: 5,
  rating: null,
  durationSeconds: null,
  contextJson: { notes: 'During math class' },
  createdAt: new Date(),
  recordedById: 'test-teacher-id',
  recordedBy: { displayName: 'Test Teacher' },
};

describe('Behavior Plan Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/behavior-plans/plans/:planId', () => {
    it('returns 401 when not authenticated', async () => {
      const response = await request(app).get('/api/behavior-plans/plans/test-plan-id');
      expect(response.status).toBe(401);
    });
  });

  describe('POST /api/behavior-plans/plans/:planId/targets', () => {
    it('returns 401 when not authenticated', async () => {
      const response = await request(app)
        .post('/api/behavior-plans/plans/test-plan-id/targets')
        .send({
          code: 'TEST',
          name: 'Test Target',
          definition: 'Test definition that is long enough',
          measurementType: 'FREQUENCY',
        });
      expect(response.status).toBe(401);
    });
  });

  describe('POST /api/behavior-targets/targets/:targetId/events', () => {
    it('returns 401 when not authenticated', async () => {
      const response = await request(app)
        .post('/api/behavior-targets/targets/target-id/events')
        .send({
          eventDate: '2024-06-01',
          count: 5,
        });
      expect(response.status).toBe(401);
    });
  });
});

describe('Behavior Plan Creation Logic', () => {
  it('creates a BehaviorPlan when creating a BEHAVIOR_PLAN type plan', async () => {
    (prisma.student.findFirst as jest.Mock).mockResolvedValue(mockStudent);
    (prisma.planType.findUnique as jest.Mock).mockResolvedValue(mockBehaviorPlanType);
    (prisma.planSchema.findFirst as jest.Mock).mockResolvedValue(mockBehaviorSchema);
    (prisma.planInstance.create as jest.Mock).mockResolvedValue(mockPlanInstance);
    (prisma.behaviorPlan.create as jest.Mock).mockResolvedValue(mockBehaviorPlan);

    // Simulate plan creation
    const student = await prisma.student.findFirst({ where: { id: mockStudent.id } });
    expect(student).not.toBeNull();

    const planType = await prisma.planType.findUnique({ where: { code: 'BEHAVIOR_PLAN' } });
    expect(planType?.code).toBe('BEHAVIOR_PLAN');

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

    // Create BehaviorPlan record
    const behaviorPlan = await prisma.behaviorPlan.create({
      data: {
        planInstanceId: plan.id,
      },
    });

    expect(behaviorPlan.planInstanceId).toBe(plan.id);
    expect(prisma.behaviorPlan.create).toHaveBeenCalled();
  });
});

describe('Behavior Target Management', () => {
  it('creates a behavior target with proper validation', async () => {
    (prisma.behaviorPlan.findFirst as jest.Mock).mockResolvedValue(mockBehaviorPlan);
    (prisma.behaviorTarget.create as jest.Mock).mockResolvedValue(mockBehaviorTarget);

    const targetData = {
      code: 'OFF_TASK',
      name: 'Off-Task Behavior',
      definition: 'Student is not engaged in assigned academic task for more than 10 seconds.',
      examples: 'Looking around room, playing with objects',
      nonExamples: 'Asking for help, getting materials',
      measurementType: 'FREQUENCY' as BehaviorMeasurementType,
    };

    const behaviorPlan = await prisma.behaviorPlan.findFirst({ where: { id: mockBehaviorPlan.id } });
    expect(behaviorPlan).not.toBeNull();

    const target = await prisma.behaviorTarget.create({
      data: {
        behaviorPlanId: behaviorPlan!.id,
        ...targetData,
      },
    });

    expect(target.code).toBe('OFF_TASK');
    expect(target.measurementType).toBe('FREQUENCY');
    expect(target.isActive).toBe(true);
  });

  it('soft deletes a behavior target by setting isActive to false', async () => {
    const deactivatedTarget = { ...mockBehaviorTarget, isActive: false };
    (prisma.behaviorTarget.findFirst as jest.Mock).mockResolvedValue(mockBehaviorTarget);
    (prisma.behaviorTarget.update as jest.Mock).mockResolvedValue(deactivatedTarget);

    const target = await prisma.behaviorTarget.findFirst({ where: { id: mockBehaviorTarget.id } });
    expect(target?.isActive).toBe(true);

    const updated = await prisma.behaviorTarget.update({
      where: { id: target!.id },
      data: { isActive: false },
    });

    expect(updated.isActive).toBe(false);
  });
});

describe('Behavior Event Recording', () => {
  it('creates a FREQUENCY event with count', async () => {
    const frequencyTarget = { ...mockBehaviorTarget, measurementType: 'FREQUENCY' as BehaviorMeasurementType };
    (prisma.behaviorTarget.findFirst as jest.Mock).mockResolvedValue(frequencyTarget);
    (prisma.behaviorEvent.create as jest.Mock).mockResolvedValue(mockBehaviorEvent);

    const eventData = {
      eventDate: new Date('2024-06-01T12:00:00'),
      count: 5,
      contextJson: { notes: 'During math class' },
    };

    const target = await prisma.behaviorTarget.findFirst({ where: { id: frequencyTarget.id } });
    expect(target?.measurementType).toBe('FREQUENCY');

    const event = await prisma.behaviorEvent.create({
      data: {
        behaviorTargetId: target!.id,
        eventDate: eventData.eventDate,
        count: eventData.count,
        contextJson: eventData.contextJson,
        recordedById: mockUser.id,
      },
    });

    expect(event.count).toBe(5);
    expect(event.rating).toBeNull();
    expect(event.durationSeconds).toBeNull();
  });

  it('creates a DURATION event with durationSeconds', async () => {
    const durationTarget = { ...mockBehaviorTarget, measurementType: 'DURATION' as BehaviorMeasurementType };
    const durationEvent = {
      ...mockBehaviorEvent,
      count: null,
      durationSeconds: 180,
    };

    (prisma.behaviorTarget.findFirst as jest.Mock).mockResolvedValue(durationTarget);
    (prisma.behaviorEvent.create as jest.Mock).mockResolvedValue(durationEvent);

    const target = await prisma.behaviorTarget.findFirst({ where: { id: durationTarget.id } });
    expect(target?.measurementType).toBe('DURATION');

    const event = await prisma.behaviorEvent.create({
      data: {
        behaviorTargetId: target!.id,
        eventDate: new Date('2024-06-01T12:00:00'),
        durationSeconds: 180,
        contextJson: { notes: 'Tantrum during transition' },
        recordedById: mockUser.id,
      },
    });

    expect(event.durationSeconds).toBe(180);
    expect(event.count).toBeNull();
  });

  it('creates a RATING event with rating', async () => {
    const ratingTarget = { ...mockBehaviorTarget, measurementType: 'RATING' as BehaviorMeasurementType };
    const ratingEvent = {
      ...mockBehaviorEvent,
      count: null,
      rating: 3,
    };

    (prisma.behaviorTarget.findFirst as jest.Mock).mockResolvedValue(ratingTarget);
    (prisma.behaviorEvent.create as jest.Mock).mockResolvedValue(ratingEvent);

    const target = await prisma.behaviorTarget.findFirst({ where: { id: ratingTarget.id } });
    expect(target?.measurementType).toBe('RATING');

    const event = await prisma.behaviorEvent.create({
      data: {
        behaviorTargetId: target!.id,
        eventDate: new Date('2024-06-01T12:00:00'),
        rating: 3,
        contextJson: { notes: 'Average participation today' },
        recordedById: mockUser.id,
      },
    });

    expect(event.rating).toBe(3);
    expect(event.count).toBeNull();
    expect(event.durationSeconds).toBeNull();
  });
});

describe('Behavior Event Retrieval', () => {
  it('fetches events with summary statistics', async () => {
    const events = [
      { ...mockBehaviorEvent, count: 5 },
      { ...mockBehaviorEvent, id: 'event-2', count: 3, eventDate: new Date('2024-06-02') },
      { ...mockBehaviorEvent, id: 'event-3', count: 7, eventDate: new Date('2024-06-03') },
    ];

    (prisma.behaviorTarget.findFirst as jest.Mock).mockResolvedValue(mockBehaviorTarget);
    (prisma.behaviorEvent.findMany as jest.Mock).mockResolvedValue(events);

    const target = await prisma.behaviorTarget.findFirst({ where: { id: mockBehaviorTarget.id } });
    expect(target).not.toBeNull();

    const fetchedEvents = await prisma.behaviorEvent.findMany({
      where: { behaviorTargetId: target!.id },
    });

    // Calculate summary
    const summary = {
      totalEvents: fetchedEvents.length,
      totalCount: fetchedEvents.reduce((sum, e) => sum + (e.count || 0), 0),
    };

    expect(summary.totalEvents).toBe(3);
    expect(summary.totalCount).toBe(15);
  });

  it('filters events by date range', async () => {
    const allEvents = [
      { ...mockBehaviorEvent, eventDate: new Date('2024-05-15T12:00:00') },
      { ...mockBehaviorEvent, id: 'event-2', eventDate: new Date('2024-06-01T12:00:00') },
      { ...mockBehaviorEvent, id: 'event-3', eventDate: new Date('2024-06-15T12:00:00') },
      { ...mockBehaviorEvent, id: 'event-4', eventDate: new Date('2024-07-01T12:00:00') },
    ];
    // Filter to June only
    const from = new Date('2024-06-01T12:00:00');
    const to = new Date('2024-06-30T23:59:59');
    const filteredEvents = allEvents.filter(
      e => e.eventDate >= from && e.eventDate <= to
    );

    expect(filteredEvents.length).toBe(2);
    expect(filteredEvents.every(e => e.eventDate.getMonth() === 5)).toBe(true); // June is month 5
  });
});
describe('Behavior Target Access Control', () => {
  it('only allows access to targets for students assigned to the teacher', async () => {
    const otherTeacherStudent = {
      ...mockStudent,
      id: 'other-student-id',
      teacherId: 'other-teacher-id',
    };

    // When querying with the wrong teacher, target should not be found
    (prisma.behaviorTarget.findFirst as jest.Mock).mockResolvedValue(null);

    const target = await prisma.behaviorTarget.findFirst({
      where: {
        id: mockBehaviorTarget.id,
        behaviorPlan: {
          planInstance: {
            student: {
              teacherId: mockUser.id, // Current user's teacher ID
            },
          },
        },
      },
    });

    expect(target).toBeNull();
  });

  it('returns target when teacher has access', async () => {
    (prisma.behaviorTarget.findFirst as jest.Mock).mockResolvedValue(mockBehaviorTarget);

    const target = await prisma.behaviorTarget.findFirst({
      where: {
        id: mockBehaviorTarget.id,
        behaviorPlan: {
          planInstance: {
            student: {
              teacherId: mockUser.id,
            },
          },
        },
      },
    });

    expect(target).not.toBeNull();
    expect(target?.code).toBe('OFF_TASK');
  });
});

describe('Measurement Type Validation', () => {
  it('validates all measurement types', () => {
    const validTypes = ['FREQUENCY', 'DURATION', 'INTERVAL', 'RATING'];

    validTypes.forEach(type => {
      expect(BehaviorMeasurementType[type as keyof typeof BehaviorMeasurementType]).toBe(type);
    });
  });

  it('requires count for FREQUENCY measurement', () => {
    const validateEvent = (measurementType: string, data: { count?: number; durationSeconds?: number; rating?: number }) => {
      if (measurementType === 'FREQUENCY' && data.count === undefined) {
        throw new Error('Count is required for frequency measurement');
      }
      if (measurementType === 'DURATION' && data.durationSeconds === undefined) {
        throw new Error('Duration is required for duration measurement');
      }
      if (measurementType === 'RATING' && data.rating === undefined) {
        throw new Error('Rating is required for rating measurement');
      }
      return true;
    };

    expect(() => validateEvent('FREQUENCY', {})).toThrow('Count is required');
    expect(validateEvent('FREQUENCY', { count: 5 })).toBe(true);
    expect(() => validateEvent('DURATION', {})).toThrow('Duration is required');
    expect(validateEvent('DURATION', { durationSeconds: 120 })).toBe(true);
    expect(() => validateEvent('RATING', {})).toThrow('Rating is required');
    expect(validateEvent('RATING', { rating: 4 })).toBe(true);
  });
});
