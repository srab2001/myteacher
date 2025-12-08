import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { useRouter, useParams } from 'next/navigation';
import ReportsPage from '@/app/students/[id]/reports/page';
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
    getStudent: jest.fn(),
    getIEPProgressReport: jest.fn(),
    getServiceMinutesReport: jest.fn(),
  },
}));

const mockUser = {
  id: 'test-user',
  email: 'test@example.com',
  displayName: 'Test Teacher',
  avatarUrl: null,
  role: 'TEACHER',
  stateCode: 'MD',
  districtName: 'Howard County',
  schoolName: 'Test Elementary',
  isOnboarded: true,
};

const mockStudent = {
  id: 'student-1',
  recordId: 'HCPSS-000001',
  firstName: 'Alex',
  lastName: 'Johnson',
  grade: '4',
  schoolName: 'Test Elementary',
  dateOfBirth: '2014-05-15',
};

const mockIEPReport = {
  studentId: 'student-1',
  studentName: 'Alex Johnson',
  planId: 'plan-1',
  planStatus: 'ACTIVE',
  planStartDate: '2024-01-01',
  planEndDate: '2024-12-31',
  totalGoals: 2,
  goals: [
    {
      goalId: 'goal-1',
      goalCode: 'R1',
      area: 'READING',
      annualGoalText: 'Improve reading fluency',
      baselineValue: 50,
      targetValue: 80,
      targetDate: '2024-12-31',
      progressSummary: {
        totalRecords: 5,
        latestValue: 65,
        latestDate: '2024-04-01',
        firstValue: 52,
        trend: 'improving',
        isOnTrack: true,
      },
      recentProgress: [],
    },
    {
      goalId: 'goal-2',
      goalCode: 'M1',
      area: 'MATH',
      annualGoalText: 'Improve math calculation',
      baselineValue: 40,
      targetValue: 70,
      targetDate: '2024-12-31',
      progressSummary: {
        totalRecords: 3,
        latestValue: 42,
        latestDate: '2024-03-15',
        firstValue: 41,
        trend: 'stable',
        isOnTrack: false,
      },
      recentProgress: [],
    },
  ],
};

const mockServiceReport = {
  studentId: 'student-1',
  studentName: 'Alex Johnson',
  planId: 'plan-1',
  dateRange: {
    from: '2024-01-01',
    to: '2024-04-30',
  },
  summary: {
    totalMinutes: 180,
    totalSessions: 6,
    averageMinutesPerSession: 30,
  },
  services: [
    {
      serviceType: 'SPEECH_LANGUAGE',
      totalMinutes: 120,
      sessionCount: 4,
      logs: [
        { id: 'log-1', date: '2024-03-01', minutes: 30, notes: 'Good session', provider: 'Speech Therapist' },
        { id: 'log-2', date: '2024-03-15', minutes: 30, notes: null, provider: 'Speech Therapist' },
      ],
    },
    {
      serviceType: 'OCCUPATIONAL_THERAPY',
      totalMinutes: 60,
      sessionCount: 2,
      logs: [
        { id: 'log-3', date: '2024-03-05', minutes: 30, notes: 'Fine motor work', provider: 'OT' },
      ],
    },
  ],
};

describe('Reports Page', () => {
  const mockRouter = {
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
    (useParams as jest.Mock).mockReturnValue({ id: 'student-1' });
    (api.getMe as jest.Mock).mockResolvedValue({ user: mockUser });
    (api.getStudent as jest.Mock).mockResolvedValue({ student: mockStudent });
    (api.getIEPProgressReport as jest.Mock).mockResolvedValue(mockIEPReport);
    (api.getServiceMinutesReport as jest.Mock).mockResolvedValue(mockServiceReport);
  });

  describe('Page Rendering', () => {
    it('renders the reports page with student info', async () => {
      render(
        <AuthProvider>
          <ReportsPage />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('Reports')).toBeInTheDocument();
      });

      expect(screen.getByText(/Johnson, Alex/)).toBeInTheDocument();
      expect(screen.getByText(/Grade 4/)).toBeInTheDocument();
    });

    it('shows report type tabs', async () => {
      render(
        <AuthProvider>
          <ReportsPage />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('IEP Progress')).toBeInTheDocument();
      });

      expect(screen.getByText('Service Minutes')).toBeInTheDocument();
    });

    it('shows back button linking to student page', async () => {
      render(
        <AuthProvider>
          <ReportsPage />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByText(/back to student/i)).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText(/back to student/i));
      expect(mockRouter.push).toHaveBeenCalledWith('/students/student-1');
    });
  });

  describe('IEP Progress Report', () => {
    it('shows IEP progress report form by default', async () => {
      render(
        <AuthProvider>
          <ReportsPage />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('IEP Progress Report')).toBeInTheDocument();
      });

      expect(screen.getByText(/track goal progress/i)).toBeInTheDocument();
    });

    it('shows date range inputs', async () => {
      render(
        <AuthProvider>
          <ReportsPage />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('From')).toBeInTheDocument();
      });

      expect(screen.getByText('To')).toBeInTheDocument();
    });

    it('generates report when clicking button', async () => {
      render(
        <AuthProvider>
          <ReportsPage />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('Generate Report')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Generate Report'));

      await waitFor(() => {
        expect(api.getIEPProgressReport).toHaveBeenCalled();
      });

      // Check report content is displayed
      await waitFor(() => {
        expect(screen.getByText('Plan Status:')).toBeInTheDocument();
      });

      expect(screen.getByText('Total Goals:')).toBeInTheDocument();
    });

    it('displays goal progress data', async () => {
      render(
        <AuthProvider>
          <ReportsPage />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('Generate Report')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Generate Report'));

      await waitFor(() => {
        expect(screen.getByText('R1')).toBeInTheDocument();
      });

      expect(screen.getByText('M1')).toBeInTheDocument();
      expect(screen.getByText('Improving')).toBeInTheDocument();
      expect(screen.getByText('Stable')).toBeInTheDocument();
    });

    it('shows export buttons when report is generated', async () => {
      render(
        <AuthProvider>
          <ReportsPage />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('Generate Report')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Generate Report'));

      await waitFor(() => {
        expect(screen.getByText('Export JSON')).toBeInTheDocument();
      });

      expect(screen.getByText('Export CSV')).toBeInTheDocument();
    });
  });

  describe('Service Minutes Report', () => {
    it('switches to service minutes report on tab click', async () => {
      render(
        <AuthProvider>
          <ReportsPage />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('Service Minutes')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Service Minutes'));

      await waitFor(() => {
        expect(screen.getByText('Service Minutes Report')).toBeInTheDocument();
      });

      expect(screen.getByText(/track service delivery/i)).toBeInTheDocument();
    });

    it('generates service report when clicking button', async () => {
      render(
        <AuthProvider>
          <ReportsPage />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('Service Minutes')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Service Minutes'));

      await waitFor(() => {
        expect(screen.getByText('Generate Report')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Generate Report'));

      await waitFor(() => {
        expect(api.getServiceMinutesReport).toHaveBeenCalled();
      });
    });

    it('displays service summary cards', async () => {
      render(
        <AuthProvider>
          <ReportsPage />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('Service Minutes')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Service Minutes'));

      await waitFor(() => {
        expect(screen.getByText('Generate Report')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Generate Report'));

      await waitFor(() => {
        expect(screen.getByText('Total Minutes')).toBeInTheDocument();
      });

      expect(screen.getByText('Total Sessions')).toBeInTheDocument();
      expect(screen.getByText('Avg Minutes/Session')).toBeInTheDocument();
      expect(screen.getByText('180')).toBeInTheDocument();
      expect(screen.getByText('6')).toBeInTheDocument();
    });

    it('displays service breakdown by type', async () => {
      render(
        <AuthProvider>
          <ReportsPage />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('Service Minutes')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Service Minutes'));

      await waitFor(() => {
        expect(screen.getByText('Generate Report')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Generate Report'));

      await waitFor(() => {
        expect(screen.getByText(/speech language/i)).toBeInTheDocument();
      });

      expect(screen.getByText(/occupational therapy/i)).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('shows error message when IEP report fails', async () => {
      (api.getIEPProgressReport as jest.Mock).mockRejectedValue(new Error('No active IEP found'));

      render(
        <AuthProvider>
          <ReportsPage />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('Generate Report')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Generate Report'));

      await waitFor(() => {
        expect(screen.getByText(/no active iep found/i)).toBeInTheDocument();
      });
    });

    it('shows error message when service report fails', async () => {
      (api.getServiceMinutesReport as jest.Mock).mockRejectedValue(new Error('Failed to load'));

      render(
        <AuthProvider>
          <ReportsPage />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('Service Minutes')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Service Minutes'));

      await waitFor(() => {
        expect(screen.getByText('Generate Report')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Generate Report'));

      await waitFor(() => {
        expect(screen.getByText(/failed to load/i)).toBeInTheDocument();
      });
    });
  });

  describe('Loading States', () => {
    it('shows loading state while generating report', async () => {
      // Delay the API response
      (api.getIEPProgressReport as jest.Mock).mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve(mockIEPReport), 100))
      );

      render(
        <AuthProvider>
          <ReportsPage />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('Generate Report')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Generate Report'));

      expect(screen.getByText('Loading...')).toBeInTheDocument();

      await waitFor(() => {
        expect(screen.getByText('Plan Status:')).toBeInTheDocument();
      });
    });
  });

  describe('Student Not Found', () => {
    it('shows not found message when student does not exist', async () => {
      (api.getStudent as jest.Mock).mockRejectedValue(new Error('Student not found'));

      render(
        <AuthProvider>
          <ReportsPage />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('Student not found')).toBeInTheDocument();
      });
    });
  });
});
