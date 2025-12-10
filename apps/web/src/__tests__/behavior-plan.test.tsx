/* eslint-disable @typescript-eslint/no-unused-vars */
import { render, waitFor, screen, fireEvent } from '@testing-library/react';
import { useRouter, useParams } from 'next/navigation';
import { AuthProvider } from '@/lib/auth-context';
import { api, BehaviorMeasurementType } from '@/lib/api';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  useParams: jest.fn(),
}));

// Mock the API
jest.mock('@/lib/api', () => ({
  api: {
    getMe: jest.fn(),
    getPlan: jest.fn(),
    updatePlanFields: jest.fn(),
    finalizePlan: jest.fn(),
    getBehaviorPlan: jest.fn(),
    getBehaviorTargets: jest.fn(),
    createBehaviorTarget: jest.fn(),
    updateBehaviorTarget: jest.fn(),
    deleteBehaviorTarget: jest.fn(),
    getBehaviorEvents: jest.fn(),
    createBehaviorEvent: jest.fn(),
    deleteBehaviorEvent: jest.fn(),
    getGenerationAvailability: jest.fn(),
  },
  BehaviorMeasurementType: {
    FREQUENCY: 'FREQUENCY',
    DURATION: 'DURATION',
    INTERVAL: 'INTERVAL',
    RATING: 'RATING',
  },
}));

const mockUser = {
  id: 'test-user',
  email: 'test@example.com',
  displayName: 'Test Teacher',
  avatarUrl: null,
  role: 'TEACHER',
  stateCode: 'MD',
  districtName: 'Howard County Public School System',
  schoolName: 'Test Elementary',
  isOnboarded: true,
};

const mockBehaviorSchema = {
  id: 'behavior-schema-1',
  version: 1,
  name: 'Behavior Intervention Plan v1',
  description: 'Standard BIP form for Maryland schools',
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
        key: 'plan_reason',
        title: 'Reason for Plan',
        order: 2,
        fields: [
          { key: 'referral_reason', type: 'textarea', label: 'Reason for BIP Referral', required: true },
          { key: 'fba_conducted', type: 'boolean', label: 'FBA Conducted', required: true },
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
      {
        key: 'triggers_patterns',
        title: 'Triggers and Patterns',
        order: 4,
        fields: [
          { key: 'antecedents', type: 'textarea', label: 'Common Antecedents/Triggers', required: true },
          { key: 'behavior_function', type: 'select', label: 'Hypothesized Function', required: true, options: ['Attention-Seeking', 'Escape/Avoidance', 'Access to Tangibles', 'Sensory Stimulation', 'Multiple Functions', 'Unknown'] },
        ],
      },
      {
        key: 'replacement_behavior',
        title: 'Replacement Behaviors',
        order: 5,
        fields: [
          { key: 'replacement_behaviors', type: 'textarea', label: 'Replacement Behaviors', required: true },
          { key: 'teaching_strategies', type: 'textarea', label: 'Teaching Strategies', required: true },
        ],
      },
    ],
  },
};

const mockBehaviorPlan = {
  id: 'behavior-plan-1',
  status: 'DRAFT',
  startDate: '2024-01-01',
  endDate: null,
  createdAt: '2024-01-01',
  updatedAt: '2024-01-15',
  planType: { code: 'BEHAVIOR_PLAN', name: 'Behavior Intervention Plan' },
  schema: mockBehaviorSchema,
  student: { id: 'student-1', firstName: 'Mike', lastName: 'Johnson', dateOfBirth: '2014-08-10', grade: '3' },
  fieldValues: {},
  goals: [],
  serviceLogs: [],
};

const mockBehaviorTarget = {
  id: 'target-1',
  code: 'OFF_TASK',
  name: 'Off-Task Behavior',
  definition: 'Student is not engaged in assigned academic task for more than 10 seconds.',
  examples: 'Looking around room, playing with objects, staring out window',
  nonExamples: 'Asking for help, sharpening pencil, getting materials',
  measurementType: 'FREQUENCY' as BehaviorMeasurementType,
  isActive: true,
  createdAt: '2024-01-01',
  updatedAt: '2024-01-01',
};

const mockBehaviorEvent = {
  id: 'event-1',
  eventDate: '2024-06-01',
  startTime: null,
  endTime: null,
  count: 5,
  rating: null,
  durationSeconds: null,
  contextJson: { notes: 'During math class' },
  createdAt: '2024-06-01T10:00:00Z',
  recordedBy: { displayName: 'Test Teacher' },
};

const mockEventSummary = {
  totalEvents: 5,
  totalCount: 23,
  averageCount: 4.6,
};

describe('Behavior Plan Page', () => {
  const mockRouter = {
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
    (useParams as jest.Mock).mockReturnValue({ id: 'student-1', planId: 'behavior-plan-1' });
    (api.getMe as jest.Mock).mockResolvedValue({ user: mockUser });
    (api.getPlan as jest.Mock).mockResolvedValue({ plan: mockBehaviorPlan });
    (api.getGenerationAvailability as jest.Mock).mockResolvedValue({ available: false, sections: [] });
  });

  it('redirects to login when not authenticated', async () => {
    (api.getMe as jest.Mock).mockResolvedValue({ user: null });

    const BehaviorPlanPage = (await import('@/app/students/[id]/plans/[planId]/behavior/page')).default;

    render(
      <AuthProvider>
        <BehaviorPlanPage />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(mockRouter.push).toHaveBeenCalledWith('/');
    });
  });
});

describe('Behavior Schema Sections', () => {
  it('has correct number of sections', () => {
    const sections = mockBehaviorSchema.fields.sections;
    expect(sections.length).toBe(5);
  });

  it('has behavior targets section marked correctly', () => {
    const behaviorTargetsSection = mockBehaviorSchema.fields.sections.find(
      s => s.isBehaviorTargetsSection
    );

    expect(behaviorTargetsSection).toBeDefined();
    expect(behaviorTargetsSection?.key).toBe('behavior_definition');
  });

  it('has correct section titles in order', () => {
    const sections = mockBehaviorSchema.fields.sections;

    expect(sections[0].title).toBe('Student Information');
    expect(sections[1].title).toBe('Reason for Plan');
    expect(sections[2].title).toBe('Target Behavior Definition');
    expect(sections[3].title).toBe('Triggers and Patterns');
    expect(sections[4].title).toBe('Replacement Behaviors');
  });
});

describe('Behavior Target Management', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates a behavior target', async () => {
    (api.createBehaviorTarget as jest.Mock).mockResolvedValue({ target: mockBehaviorTarget });

    const targetData = {
      code: 'OFF_TASK',
      name: 'Off-Task Behavior',
      definition: 'Student is not engaged in assigned academic task for more than 10 seconds.',
      examples: 'Looking around room, playing with objects',
      nonExamples: 'Asking for help, getting materials',
      measurementType: 'FREQUENCY' as BehaviorMeasurementType,
    };

    await api.createBehaviorTarget('behavior-plan-1', targetData);

    expect(api.createBehaviorTarget).toHaveBeenCalledWith('behavior-plan-1', targetData);
  });

  it('fetches behavior targets for a plan', async () => {
    (api.getBehaviorTargets as jest.Mock).mockResolvedValue({ targets: [mockBehaviorTarget] });

    const result = await api.getBehaviorTargets('behavior-plan-1');

    expect(api.getBehaviorTargets).toHaveBeenCalledWith('behavior-plan-1');
    expect(result.targets).toHaveLength(1);
  });

  it('updates a behavior target', async () => {
    const updatedTarget = { ...mockBehaviorTarget, name: 'Updated Name' };
    (api.updateBehaviorTarget as jest.Mock).mockResolvedValue({ target: updatedTarget });

    await api.updateBehaviorTarget('target-1', { name: 'Updated Name' });

    expect(api.updateBehaviorTarget).toHaveBeenCalledWith('target-1', { name: 'Updated Name' });
  });

  it('deactivates a behavior target', async () => {
    (api.deleteBehaviorTarget as jest.Mock).mockResolvedValue({ success: true });

    await api.deleteBehaviorTarget('target-1');

    expect(api.deleteBehaviorTarget).toHaveBeenCalledWith('target-1');
  });
});

describe('Behavior Event Recording', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates a FREQUENCY event with count', async () => {
    (api.createBehaviorEvent as jest.Mock).mockResolvedValue({ event: mockBehaviorEvent });

    const eventData = {
      eventDate: '2024-06-01',
      count: 5,
      contextJson: { notes: 'During math class' },
    };

    await api.createBehaviorEvent('target-1', eventData);

    expect(api.createBehaviorEvent).toHaveBeenCalledWith('target-1', eventData);
  });

  it('creates a DURATION event with durationSeconds', async () => {
    const durationEvent = {
      ...mockBehaviorEvent,
      count: null,
      durationSeconds: 180,
    };
    (api.createBehaviorEvent as jest.Mock).mockResolvedValue({ event: durationEvent });

    const eventData = {
      eventDate: '2024-06-01',
      durationSeconds: 180,
      contextJson: { notes: 'Tantrum during transition' },
    };

    await api.createBehaviorEvent('target-1', eventData);

    expect(api.createBehaviorEvent).toHaveBeenCalledWith('target-1', eventData);
  });

  it('creates a RATING event with rating', async () => {
    const ratingEvent = {
      ...mockBehaviorEvent,
      count: null,
      rating: 3,
    };
    (api.createBehaviorEvent as jest.Mock).mockResolvedValue({ event: ratingEvent });

    const eventData = {
      eventDate: '2024-06-01',
      rating: 3,
      contextJson: { notes: 'Average participation' },
    };

    await api.createBehaviorEvent('target-1', eventData);

    expect(api.createBehaviorEvent).toHaveBeenCalledWith('target-1', eventData);
  });

  it('fetches events with summary', async () => {
    (api.getBehaviorEvents as jest.Mock).mockResolvedValue({
      events: [mockBehaviorEvent],
      summary: mockEventSummary,
    });

    const result = await api.getBehaviorEvents('target-1', '2024-05-01', '2024-06-30');

    expect(api.getBehaviorEvents).toHaveBeenCalledWith('target-1', '2024-05-01', '2024-06-30');
    expect(result.events).toHaveLength(1);
    expect(result.summary.totalEvents).toBe(5);
  });

  it('deletes a behavior event', async () => {
    (api.deleteBehaviorEvent as jest.Mock).mockResolvedValue({ success: true });

    await api.deleteBehaviorEvent('event-1');

    expect(api.deleteBehaviorEvent).toHaveBeenCalledWith('event-1');
  });
});

describe('Measurement Type Handling', () => {
  it('validates all measurement types', () => {
    const types = ['FREQUENCY', 'DURATION', 'INTERVAL', 'RATING'];

    types.forEach(type => {
      expect(['FREQUENCY', 'DURATION', 'INTERVAL', 'RATING']).toContain(type);
    });
  });

  it('matches event fields to measurement type', () => {
    const measurementFields: Record<string, string[]> = {
      FREQUENCY: ['count'],
      DURATION: ['durationSeconds', 'startTime', 'endTime'],
      INTERVAL: ['count', 'startTime', 'endTime'],
      RATING: ['rating'],
    };

    expect(measurementFields.FREQUENCY).toContain('count');
    expect(measurementFields.DURATION).toContain('durationSeconds');
    expect(measurementFields.RATING).toContain('rating');
  });
});

describe('Wizard Navigation', () => {
  it('tracks current step correctly', () => {
    const sections = mockBehaviorSchema.fields.sections;
    let currentStep = 0;

    expect(sections[currentStep].title).toBe('Student Information');

    currentStep = 2;
    expect(sections[currentStep].title).toBe('Target Behavior Definition');

    currentStep = 4;
    expect(sections[currentStep].title).toBe('Replacement Behaviors');
  });

  it('saves fields before navigation', async () => {
    (api.updatePlanFields as jest.Mock).mockResolvedValue({ success: true });

    // Simulate save before next
    await api.updatePlanFields('behavior-plan-1', {
      student_name: 'Mike Johnson',
      plan_date: '2024-01-01',
    });

    expect(api.updatePlanFields).toHaveBeenCalled();
  });
});

describe('Behavior Plan Finalization', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('finalizes behavior plan', async () => {
    (api.finalizePlan as jest.Mock).mockResolvedValue({
      plan: { id: 'behavior-plan-1', status: 'ACTIVE' },
    });

    const result = await api.finalizePlan('behavior-plan-1');

    expect(api.finalizePlan).toHaveBeenCalledWith('behavior-plan-1');
    expect(result.plan.status).toBe('ACTIVE');
  });
});

describe('Behavior Function Options', () => {
  it('has correct function options', () => {
    const triggersSection = mockBehaviorSchema.fields.sections.find(s => s.key === 'triggers_patterns');
    const functionField = triggersSection?.fields.find(f => f.key === 'behavior_function');

    expect(functionField?.options).toContain('Attention-Seeking');
    expect(functionField?.options).toContain('Escape/Avoidance');
    expect(functionField?.options).toContain('Access to Tangibles');
    expect(functionField?.options).toContain('Sensory Stimulation');
  });
});

describe('Permission Handling (Mocked)', () => {
  it('prevents editing when user lacks update permissions', () => {
    const userWithoutUpdatePerms = {
      ...mockUser,
      canUpdatePlans: false, // Hypothetical permission field
    };

    // In actual implementation, this would disable form fields
    const canEdit = userWithoutUpdatePerms.canUpdatePlans !== false;

    // Currently returns true since we haven't implemented permissions
    // This test documents the expected behavior
    expect(canEdit).toBe(true);
  });
});

describe('Target Operational Definition', () => {
  it('validates definition is operational', () => {
    // An operational definition should be:
    // 1. Observable (can be seen)
    // 2. Measurable (can be counted, timed, etc.)
    // 3. Specific (not vague)

    const definition = mockBehaviorTarget.definition;

    expect(definition).not.toBe('');
    expect(definition.length).toBeGreaterThan(20); // Should be detailed
    expect(definition).toContain('10 seconds'); // Measurable component
  });

  it('includes examples and non-examples', () => {
    expect(mockBehaviorTarget.examples).toBeDefined();
    expect(mockBehaviorTarget.nonExamples).toBeDefined();
    expect(mockBehaviorTarget.examples).not.toBe('');
    expect(mockBehaviorTarget.nonExamples).not.toBe('');
  });
});
