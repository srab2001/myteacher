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
    getStudents: jest.fn(),
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

const mockStudents = [
  {
    id: 'student-1',
    studentIdNum: 'STU-001',
    firstName: 'Alex',
    lastName: 'Johnson',
    grade: '4',
    schoolName: 'Test Elementary',
    overallStatus: {
      id: 'status-1',
      scope: 'OVERALL',
      code: 'ON_TRACK',
      summary: 'Doing well',
      effectiveDate: '2024-01-15',
    },
    statuses: [],
  },
  {
    id: 'student-2',
    studentIdNum: 'STU-002',
    firstName: 'Maria',
    lastName: 'Garcia',
    grade: '5',
    schoolName: 'Test Elementary',
    overallStatus: {
      id: 'status-2',
      scope: 'OVERALL',
      code: 'CONCERN',
      summary: 'Needs support',
      effectiveDate: '2024-01-10',
    },
    statuses: [],
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
    (api.getStudents as jest.Mock).mockResolvedValue({ students: mockStudents });
  });

  it('renders the dashboard with student list', async () => {
    render(
      <AuthProvider>
        <DashboardPage />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
    });

    expect(screen.getByText('Your Students')).toBeInTheDocument();
    expect(screen.getByText('2 students')).toBeInTheDocument();
  });

  it('displays student with status badge', async () => {
    render(
      <AuthProvider>
        <DashboardPage />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Johnson, Alex')).toBeInTheDocument();
    });

    expect(screen.getByText('On Track')).toBeInTheDocument();
    expect(screen.getByText('Garcia, Maria')).toBeInTheDocument();
    expect(screen.getByText('Concern')).toBeInTheDocument();
  });

  it('navigates to student detail on click', async () => {
    render(
      <AuthProvider>
        <DashboardPage />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Johnson, Alex')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Johnson, Alex'));

    expect(mockRouter.push).toHaveBeenCalledWith('/students/student-1');
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
    (api.getStudents as jest.Mock).mockResolvedValue({ students: [] });

    render(
      <AuthProvider>
        <DashboardPage />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('No students assigned yet.')).toBeInTheDocument();
    });
  });
});
