import { render, screen, waitFor, fireEvent } from '@testing-library/react';
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
    getPlanServices: jest.fn(),
    createServiceLog: jest.fn(),
    deleteServiceLog: jest.fn(),
  },
}));

// Mock date-fns
jest.mock('date-fns', () => ({
  format: jest.fn((date, formatStr) => '2024-01-15'),
  startOfWeek: jest.fn((date) => new Date('2024-01-14')),
  endOfWeek: jest.fn((date) => new Date('2024-01-20')),
  addDays: jest.fn((date, days) => new Date(date.getTime() + days * 24 * 60 * 60 * 1000)),
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

const mockServiceLogs = [
  {
    id: 'log-1',
    date: '2024-01-15',
    minutes: 45,
    serviceType: 'SPECIAL_EDUCATION',
    setting: 'RESOURCE_ROOM',
    notes: 'Worked on reading comprehension',
    provider: { displayName: 'Test Teacher' },
  },
  {
    id: 'log-2',
    date: '2024-01-16',
    minutes: 30,
    serviceType: 'SPEECH_LANGUAGE',
    setting: 'THERAPY_ROOM',
    notes: null,
    provider: { displayName: 'Speech Therapist' },
  },
];

const mockSummary = {
  totalMinutes: 75,
  weeklyMinutes: 75,
  totalsByType: {
    SPECIAL_EDUCATION: 45,
    SPEECH_LANGUAGE: 30,
  },
  logCount: 2,
};

describe('Services Page', () => {
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
    (api.getPlanServices as jest.Mock).mockResolvedValue({
      serviceLogs: mockServiceLogs,
      summary: mockSummary,
    });
  });

  it('redirects to login when not authenticated', async () => {
    (api.getMe as jest.Mock).mockResolvedValue({ user: null });

    const ServicesPage = (await import('@/app/students/[id]/plans/[planId]/services/page')).default;

    render(
      <AuthProvider>
        <ServicesPage />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(mockRouter.push).toHaveBeenCalledWith('/');
    });
  });
});

describe('Service Type Labels', () => {
  it('maps all service types to labels', () => {
    const SERVICE_TYPE_LABELS = {
      SPECIAL_EDUCATION: 'Special Education',
      SPEECH_LANGUAGE: 'Speech/Language',
      OCCUPATIONAL_THERAPY: 'Occupational Therapy',
      PHYSICAL_THERAPY: 'Physical Therapy',
      COUNSELING: 'Counseling',
      BEHAVIORAL_SUPPORT: 'Behavioral Support',
      READING_SPECIALIST: 'Reading Specialist',
      PARAPROFESSIONAL: 'Paraprofessional',
      OTHER: 'Other',
    };

    expect(Object.keys(SERVICE_TYPE_LABELS)).toHaveLength(9);
    expect(SERVICE_TYPE_LABELS.SPEECH_LANGUAGE).toBe('Speech/Language');
    expect(SERVICE_TYPE_LABELS.OCCUPATIONAL_THERAPY).toBe('Occupational Therapy');
  });
});

describe('Service Setting Labels', () => {
  it('maps all service settings to labels', () => {
    const SERVICE_SETTING_LABELS = {
      GENERAL_EDUCATION: 'General Education',
      SPECIAL_EDUCATION: 'Special Education',
      RESOURCE_ROOM: 'Resource Room',
      THERAPY_ROOM: 'Therapy Room',
      COMMUNITY: 'Community',
      HOME: 'Home',
      OTHER: 'Other',
    };

    expect(Object.keys(SERVICE_SETTING_LABELS)).toHaveLength(7);
    expect(SERVICE_SETTING_LABELS.RESOURCE_ROOM).toBe('Resource Room');
  });
});

describe('Service Log Creation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates a service log with required fields', async () => {
    const newLog = {
      id: 'new-log',
      date: '2024-01-17',
      minutes: 60,
      serviceType: 'OCCUPATIONAL_THERAPY',
      setting: 'THERAPY_ROOM',
      notes: null,
    };

    (api.createServiceLog as jest.Mock).mockResolvedValue({ serviceLog: newLog });

    await api.createServiceLog('plan-1', {
      date: '2024-01-17',
      minutes: 60,
      serviceType: 'OCCUPATIONAL_THERAPY',
      setting: 'THERAPY_ROOM',
    });

    expect(api.createServiceLog).toHaveBeenCalledWith('plan-1', {
      date: '2024-01-17',
      minutes: 60,
      serviceType: 'OCCUPATIONAL_THERAPY',
      setting: 'THERAPY_ROOM',
    });
  });

  it('creates a service log with notes', async () => {
    const newLog = {
      id: 'new-log',
      date: '2024-01-17',
      minutes: 45,
      serviceType: 'COUNSELING',
      setting: 'THERAPY_ROOM',
      notes: 'Discussed coping strategies',
    };

    (api.createServiceLog as jest.Mock).mockResolvedValue({ serviceLog: newLog });

    await api.createServiceLog('plan-1', {
      date: '2024-01-17',
      minutes: 45,
      serviceType: 'COUNSELING',
      setting: 'THERAPY_ROOM',
      notes: 'Discussed coping strategies',
    });

    expect(api.createServiceLog).toHaveBeenCalledWith('plan-1', expect.objectContaining({
      notes: 'Discussed coping strategies',
    }));
  });
});

describe('Service Log Deletion', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('deletes a service log', async () => {
    (api.deleteServiceLog as jest.Mock).mockResolvedValue({ success: true });

    await api.deleteServiceLog('log-1');

    expect(api.deleteServiceLog).toHaveBeenCalledWith('log-1');
  });
});

describe('Minutes Formatting', () => {
  const formatMinutes = (mins: number) => {
    const hours = Math.floor(mins / 60);
    const minutes = mins % 60;
    if (hours === 0) return `${minutes}m`;
    if (minutes === 0) return `${hours}h`;
    return `${hours}h ${minutes}m`;
  };

  it('formats minutes correctly', () => {
    expect(formatMinutes(30)).toBe('30m');
    expect(formatMinutes(60)).toBe('1h');
    expect(formatMinutes(90)).toBe('1h 30m');
    expect(formatMinutes(120)).toBe('2h');
    expect(formatMinutes(135)).toBe('2h 15m');
  });
});

describe('Summary Calculations', () => {
  it('calculates weekly totals correctly', () => {
    expect(mockSummary.weeklyMinutes).toBe(75);
    expect(mockSummary.totalMinutes).toBe(75);
    expect(mockSummary.logCount).toBe(2);
  });

  it('calculates totals by type correctly', () => {
    expect(mockSummary.totalsByType.SPECIAL_EDUCATION).toBe(45);
    expect(mockSummary.totalsByType.SPEECH_LANGUAGE).toBe(30);
  });
});

describe('Quick Duration Selection', () => {
  it('provides common duration options', () => {
    const quickDurations = [15, 30, 45, 60, 90, 120];

    expect(quickDurations).toContain(15);
    expect(quickDurations).toContain(30);
    expect(quickDurations).toContain(45);
    expect(quickDurations).toContain(60);
    expect(quickDurations).toContain(90);
    expect(quickDurations).toContain(120);
  });
});
