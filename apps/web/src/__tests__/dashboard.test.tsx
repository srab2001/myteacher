import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { useRouter } from 'next/navigation';
import DashboardPage from '@/app/dashboard/page';
import { AuthProvider } from '@/lib/auth-context';
import { api } from '@/lib/api';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  useParams: jest.fn(() => ({})),
}));

// Mock the API
jest.mock('@/lib/api', () => ({
  api: {
    getMe: jest.fn(),
    getStudentStatusSummary: jest.fn(),
    getBestPracticeDocs: jest.fn(),
    getFormTemplates: jest.fn(),
    logout: jest.fn(),
  },
}));

const mockOnboardedUser = {
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

const mockAdminUser = {
  ...mockOnboardedUser,
  role: 'ADMIN',
};

const mockStudentsSummary = [
  {
    studentId: 'student-1',
    recordId: 'HCPSS-000001',
    firstName: 'Alex',
    lastName: 'Johnson',
    gradeLevel: '4',
    overallStatus: {
      code: 'ON_TRACK',
      summary: 'Doing well',
      effectiveDate: '2024-01-15',
    },
    hasActiveIEP: true,
    hasActive504: false,
    hasActiveBehaviorPlan: false,
    activePlanDates: {
      iepStart: '2024-01-01',
      iepEnd: '2024-12-31',
      sec504Start: null,
      sec504End: null,
      behaviorStart: null,
    },
  },
  {
    studentId: 'student-2',
    recordId: 'HCPSS-000002',
    firstName: 'Maria',
    lastName: 'Garcia',
    gradeLevel: '5',
    overallStatus: {
      code: 'CONCERN',
      summary: 'Needs support',
      effectiveDate: '2024-01-10',
    },
    hasActiveIEP: true,
    hasActive504: true,
    hasActiveBehaviorPlan: false,
    activePlanDates: {
      iepStart: '2024-02-01',
      iepEnd: null,
      sec504Start: '2024-02-01',
      sec504End: null,
      behaviorStart: null,
    },
  },
  {
    studentId: 'student-3',
    recordId: 'HCPSS-000003',
    firstName: 'Sam',
    lastName: 'Wilson',
    gradeLevel: '3',
    overallStatus: {
      code: 'WATCH',
      summary: 'Monitor progress',
      effectiveDate: '2024-01-20',
    },
    hasActiveIEP: false,
    hasActive504: false,
    hasActiveBehaviorPlan: true,
    activePlanDates: {
      iepStart: null,
      iepEnd: null,
      sec504Start: null,
      sec504End: null,
      behaviorStart: '2024-03-01',
    },
  },
];

describe('Dashboard Page', () => {
  const mockRouter = {
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
    (api.getMe as jest.Mock).mockResolvedValue({ user: mockOnboardedUser });
    (api.getStudentStatusSummary as jest.Mock).mockResolvedValue({ students: mockStudentsSummary });
    (api.getBestPracticeDocs as jest.Mock).mockResolvedValue({ documents: [] });
    (api.getFormTemplates as jest.Mock).mockResolvedValue({ templates: [] });
  });

  describe('Basic Rendering', () => {
    it('renders the dashboard with student table', async () => {
      render(
        <AuthProvider>
          <DashboardPage />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('Dashboard')).toBeInTheDocument();
      });

      expect(screen.getByText('Your Students')).toBeInTheDocument();
      expect(screen.getByText(/3 of 3 students/)).toBeInTheDocument();
    });

    it('displays students in table format with correct columns', async () => {
      render(
        <AuthProvider>
          <DashboardPage />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('Record ID')).toBeInTheDocument();
      });

      expect(screen.getByText('Name')).toBeInTheDocument();
      expect(screen.getByText('Grade')).toBeInTheDocument();
      expect(screen.getByText('Status')).toBeInTheDocument();
      expect(screen.getByText('IEP')).toBeInTheDocument();
      expect(screen.getByText('504')).toBeInTheDocument();
      expect(screen.getByText('Behavior')).toBeInTheDocument();
    });

    it('displays student data correctly', async () => {
      render(
        <AuthProvider>
          <DashboardPage />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('Johnson, Alex')).toBeInTheDocument();
      });

      expect(screen.getByText('HCPSS-000001')).toBeInTheDocument();
      expect(screen.getByText('Garcia, Maria')).toBeInTheDocument();
    });

    it('shows user name in header', async () => {
      render(
        <AuthProvider>
          <DashboardPage />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('Test Teacher')).toBeInTheDocument();
      });
    });
  });

  describe('Filtering', () => {
    it('renders filter panel with status dropdown', async () => {
      render(
        <AuthProvider>
          <DashboardPage />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByLabelText(/status/i)).toBeInTheDocument();
      });

      const statusSelect = screen.getByLabelText(/status/i);
      expect(statusSelect).toHaveValue('ALL');
    });

    it('renders plan type checkboxes', async () => {
      render(
        <AuthProvider>
          <DashboardPage />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByLabelText(/has iep/i)).toBeInTheDocument();
      });

      expect(screen.getByLabelText(/has 504/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/has behavior plan/i)).toBeInTheDocument();
    });

    it('filters students by status', async () => {
      render(
        <AuthProvider>
          <DashboardPage />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByText(/3 of 3 students/)).toBeInTheDocument();
      });

      // Select "Watch" status
      fireEvent.change(screen.getByLabelText(/status/i), { target: { value: 'WATCH' } });

      await waitFor(() => {
        expect(screen.getByText(/1 of 3 students/)).toBeInTheDocument();
      });

      expect(screen.getByText('Wilson, Sam')).toBeInTheDocument();
      expect(screen.queryByText('Johnson, Alex')).not.toBeInTheDocument();
    });

    it('filters students by IEP checkbox', async () => {
      render(
        <AuthProvider>
          <DashboardPage />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByText(/3 of 3 students/)).toBeInTheDocument();
      });

      // Check "Has IEP"
      fireEvent.click(screen.getByLabelText(/has iep/i));

      await waitFor(() => {
        expect(screen.getByText(/2 of 3 students/)).toBeInTheDocument();
      });

      expect(screen.getByText('Johnson, Alex')).toBeInTheDocument();
      expect(screen.getByText('Garcia, Maria')).toBeInTheDocument();
      expect(screen.queryByText('Wilson, Sam')).not.toBeInTheDocument();
    });

    it('shows clear filters button when filters are active', async () => {
      render(
        <AuthProvider>
          <DashboardPage />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByText(/3 of 3 students/)).toBeInTheDocument();
      });

      // Initially, clear filters should not be visible
      expect(screen.queryByText(/clear filters/i)).not.toBeInTheDocument();

      // Apply a filter
      fireEvent.click(screen.getByLabelText(/has iep/i));

      await waitFor(() => {
        expect(screen.getByText(/clear filters/i)).toBeInTheDocument();
      });
    });

    it('clears all filters when clear button is clicked', async () => {
      render(
        <AuthProvider>
          <DashboardPage />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByText(/3 of 3 students/)).toBeInTheDocument();
      });

      // Apply filters
      fireEvent.change(screen.getByLabelText(/status/i), { target: { value: 'WATCH' } });
      fireEvent.click(screen.getByLabelText(/has iep/i));

      await waitFor(() => {
        expect(screen.getByText(/0 of 3 students/)).toBeInTheDocument();
      });

      // Clear filters
      fireEvent.click(screen.getByText(/clear filters/i));

      await waitFor(() => {
        expect(screen.getByText(/3 of 3 students/)).toBeInTheDocument();
      });
    });
  });

  describe('Navigation', () => {
    it('navigates to student detail when clicking Open button', async () => {
      render(
        <AuthProvider>
          <DashboardPage />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('Johnson, Alex')).toBeInTheDocument();
      });

      const openButtons = screen.getAllByText('Open');
      fireEvent.click(openButtons[0]);

      expect(mockRouter.push).toHaveBeenCalledWith('/students/student-1');
    });

    it('handles logout', async () => {
      (api.logout as jest.Mock).mockResolvedValue(undefined);

      render(
        <AuthProvider>
          <DashboardPage />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('Logout')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Logout'));

      await waitFor(() => {
        expect(api.logout).toHaveBeenCalled();
      });
    });
  });

  describe('Empty and Loading States', () => {
    it('redirects to onboarding if not onboarded', async () => {
      const notOnboardedUser = { ...mockOnboardedUser, isOnboarded: false };
      (api.getMe as jest.Mock).mockResolvedValue({ user: notOnboardedUser });

      render(
        <AuthProvider>
          <DashboardPage />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(mockRouter.push).toHaveBeenCalledWith('/onboarding');
      });
    });

    it('shows empty state when no students', async () => {
      (api.getStudentStatusSummary as jest.Mock).mockResolvedValue({ students: [] });

      render(
        <AuthProvider>
          <DashboardPage />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('No students assigned yet.')).toBeInTheDocument();
      });
    });

    it('shows empty state when filters match no students', async () => {
      render(
        <AuthProvider>
          <DashboardPage />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByText(/3 of 3 students/)).toBeInTheDocument();
      });

      // Select "Urgent" status (no students have this)
      fireEvent.change(screen.getByLabelText(/status/i), { target: { value: 'URGENT' } });

      await waitFor(() => {
        expect(screen.getByText('No students match the current filters.')).toBeInTheDocument();
      });
    });
  });

  describe('Admin Features', () => {
    it('shows admin banner for admin users', async () => {
      (api.getMe as jest.Mock).mockResolvedValue({ user: mockAdminUser });

      render(
        <AuthProvider>
          <DashboardPage />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('Admin Access')).toBeInTheDocument();
      });
    });

    it('shows Plan Schemas button for admin users', async () => {
      (api.getMe as jest.Mock).mockResolvedValue({ user: mockAdminUser });

      render(
        <AuthProvider>
          <DashboardPage />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('Plan Schemas')).toBeInTheDocument();
      });
    });

    it('navigates to schemas page when clicking Plan Schemas', async () => {
      (api.getMe as jest.Mock).mockResolvedValue({ user: mockAdminUser });

      render(
        <AuthProvider>
          <DashboardPage />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('Plan Schemas')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Plan Schemas'));

      expect(mockRouter.push).toHaveBeenCalledWith('/admin/schemas');
    });
  });
});
