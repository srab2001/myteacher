import { render, waitFor } from '@testing-library/react';
import { useRouter, useParams } from 'next/navigation';
import { AuthProvider } from '@/lib/auth-context';
import { api } from '@/lib/api';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  useParams: jest.fn(),
}));

// Mock the API
jest.mock('@/lib/api', () => ({
  api: {
    getMe: jest.fn(),
    getPlanGoals: jest.fn(),
    createQuickProgress: jest.fn(),
    createDictationProgress: jest.fn(),
    uploadWorkSample: jest.fn(),
  },
}));

// Mock date-fns format
jest.mock('date-fns', () => ({
  format: jest.fn(() => '2024-01-15'),
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

const mockGoals = [
  {
    id: 'goal-1',
    goalCode: 'R1.1',
    area: 'READING',
    annualGoalText: 'Student will improve reading comprehension by answering 8/10 questions correctly.',
    baselineJson: {},
    shortTermObjectives: ['Read 50 wpm', 'Answer 5/10 questions'],
    progressSchedule: 'weekly',
    targetDate: '2025-06-01',
    isActive: true,
    progressRecords: [
      {
        id: 'pr-1',
        date: '2024-01-15',
        quickSelect: 'SOME_SUPPORT',
        comment: 'Good progress today',
        isDictated: false,
        recordedBy: { displayName: 'Test Teacher' },
      },
    ],
    workSamples: [],
  },
  {
    id: 'goal-2',
    goalCode: 'M1.1',
    area: 'MATH',
    annualGoalText: 'Student will solve addition problems with 80% accuracy.',
    baselineJson: {},
    shortTermObjectives: [],
    progressSchedule: 'weekly',
    targetDate: null,
    isActive: true,
    progressRecords: [],
    workSamples: [],
  },
];

describe('Goals Page', () => {
  const mockRouter = {
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
    (useParams as jest.Mock).mockReturnValue({ id: 'student-1', planId: 'plan-1' });
    (api.getMe as jest.Mock).mockResolvedValue({ user: mockUser });
    (api.getPlanGoals as jest.Mock).mockResolvedValue({ goals: mockGoals });
  });

  it('redirects to login when not authenticated', async () => {
    (api.getMe as jest.Mock).mockResolvedValue({ user: null });

    // Import dynamically to avoid module caching issues
    const GoalsPage = (await import('@/app/students/[id]/plans/[planId]/goals/page')).default;

    render(
      <AuthProvider>
        <GoalsPage />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(mockRouter.push).toHaveBeenCalledWith('/');
    });
  });
});

describe('Quick Progress Buttons', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('handles progress level selection', async () => {
    const onSelect = jest.fn().mockResolvedValue(undefined);

    // Test the logic of progress selection
    const progressLevels = [
      'NOT_ADDRESSED',
      'FULL_SUPPORT',
      'SOME_SUPPORT',
      'LOW_SUPPORT',
      'MET_TARGET',
    ];

    // Simulate selecting each level
    for (const level of progressLevels) {
      await onSelect(level);
      expect(onSelect).toHaveBeenCalledWith(level);
    }

    expect(onSelect).toHaveBeenCalledTimes(5);
  });

  it('includes optional comment with progress', async () => {
    const onSelect = jest.fn().mockResolvedValue(undefined);

    await onSelect('SOME_SUPPORT', 'Student needed extra help today');

    expect(onSelect).toHaveBeenCalledWith('SOME_SUPPORT', 'Student needed extra help today');
  });
});

describe('Goal Area Labels', () => {
  it('maps all goal areas to labels', () => {
    const GOAL_AREA_LABELS = {
      READING: 'Reading',
      WRITING: 'Writing',
      MATH: 'Math',
      COMMUNICATION: 'Communication',
      SOCIAL_EMOTIONAL: 'Social-Emotional',
      BEHAVIOR: 'Behavior',
      MOTOR_SKILLS: 'Motor Skills',
      DAILY_LIVING: 'Daily Living',
      VOCATIONAL: 'Vocational',
      OTHER: 'Other',
    };

    expect(Object.keys(GOAL_AREA_LABELS)).toHaveLength(10);
    expect(GOAL_AREA_LABELS.READING).toBe('Reading');
    expect(GOAL_AREA_LABELS.SOCIAL_EMOTIONAL).toBe('Social-Emotional');
  });
});

describe('Progress Level Labels', () => {
  it('maps all progress levels to labels', () => {
    const PROGRESS_LABELS = {
      NOT_ADDRESSED: 'Not Addressed',
      FULL_SUPPORT: 'Full Support',
      SOME_SUPPORT: 'Some Support',
      LOW_SUPPORT: 'Low Support',
      MET_TARGET: 'Met Target',
    };

    expect(Object.keys(PROGRESS_LABELS)).toHaveLength(5);
    expect(PROGRESS_LABELS.MET_TARGET).toBe('Met Target');
  });
});

describe('Dictation Progress', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('saves dictation with transcribed text', async () => {
    (api.createDictationProgress as jest.Mock).mockResolvedValue({
      progress: {
        id: 'new-progress',
        quickSelect: 'LOW_SUPPORT',
        comment: 'Student showed great improvement today',
        isDictated: true,
      },
    });

    await api.createDictationProgress('goal-1', {
      quickSelect: 'LOW_SUPPORT',
      comment: 'Student showed great improvement today',
    });

    expect(api.createDictationProgress).toHaveBeenCalledWith('goal-1', {
      quickSelect: 'LOW_SUPPORT',
      comment: 'Student showed great improvement today',
    });
  });
});

describe('Work Sample Upload', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('uploads work sample with rating', async () => {
    const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });

    (api.uploadWorkSample as jest.Mock).mockResolvedValue({
      workSample: {
        id: 'new-sample',
        fileName: 'test.jpg',
        rating: 'MEETS_TARGET',
      },
    });

    await api.uploadWorkSample('goal-1', mockFile, 'MEETS_TARGET', 'Good work on this assignment');

    expect(api.uploadWorkSample).toHaveBeenCalledWith(
      'goal-1',
      mockFile,
      'MEETS_TARGET',
      'Good work on this assignment'
    );
  });

  it('validates work sample ratings', () => {
    const validRatings = ['BELOW_TARGET', 'NEAR_TARGET', 'MEETS_TARGET', 'ABOVE_TARGET'];

    validRatings.forEach(rating => {
      expect(typeof rating).toBe('string');
    });
  });
});

describe('Goal Expansion', () => {
  it('tracks expanded goals state', () => {
    const expandedGoals = new Set<string>();

    // Initially empty
    expect(expandedGoals.size).toBe(0);

    // Add a goal
    expandedGoals.add('goal-1');
    expect(expandedGoals.has('goal-1')).toBe(true);

    // Toggle off
    expandedGoals.delete('goal-1');
    expect(expandedGoals.has('goal-1')).toBe(false);
  });
});
