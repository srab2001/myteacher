import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { useRouter, useParams } from 'next/navigation';
import StudentDetailPage from '@/app/students/[id]/page';
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
    getStudentStatus: jest.fn(),
    createStudentStatus: jest.fn(),
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

const mockStudent = {
  id: 'student-1',
  recordId: 'HCPSS-000001',
  externalId: null,
  firstName: 'Alex',
  lastName: 'Johnson',
  dateOfBirth: '2015-03-15',
  grade: '4',
  schoolName: 'Test Elementary',
  statuses: [],
  plans: [],
};

const mockStatusData = {
  current: [
    {
      id: 'status-1',
      scope: 'OVERALL',
      code: 'ON_TRACK',
      summary: 'Student is doing well',
      effectiveDate: '2024-01-15',
      updatedBy: { displayName: 'Test Teacher' },
    },
  ],
  history: [
    {
      id: 'status-1',
      scope: 'OVERALL',
      code: 'ON_TRACK',
      summary: 'Student is doing well',
      effectiveDate: '2024-01-15',
      updatedBy: { displayName: 'Test Teacher' },
    },
  ],
};

describe('Student Detail Page - Status Update', () => {
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
    (api.getStudentStatus as jest.Mock).mockResolvedValue(mockStatusData);
  });

  it('renders student details with status', async () => {
    render(
      <AuthProvider>
        <StudentDetailPage />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Johnson, Alex')).toBeInTheDocument();
    });

    expect(screen.getByText('On Track')).toBeInTheDocument();
    expect(screen.getByText('Student is doing well')).toBeInTheDocument();
  });

  it('shows Update Status button', async () => {
    render(
      <AuthProvider>
        <StudentDetailPage />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Update Status')).toBeInTheDocument();
    });
  });

  it('opens status modal when Update Status is clicked', async () => {
    render(
      <AuthProvider>
        <StudentDetailPage />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Update Status')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Update Status'));

    await waitFor(() => {
      expect(screen.getByText('Updating status for')).toBeInTheDocument();
    });
  });

  it('submits new status and updates UI', async () => {
    const newStatus = {
      id: 'status-2',
      scope: 'OVERALL',
      code: 'WATCH',
      summary: 'Needs monitoring',
      effectiveDate: '2024-01-20',
      updatedBy: { displayName: 'Test Teacher' },
    };

    (api.createStudentStatus as jest.Mock).mockResolvedValue({ status: newStatus });

    // Update mock for refresh after status creation
    const updatedStatusData = {
      current: [newStatus],
      history: [newStatus, ...mockStatusData.history],
    };

    render(
      <AuthProvider>
        <StudentDetailPage />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Update Status')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Update Status'));

    await waitFor(() => {
      expect(screen.getByText('Updating status for')).toBeInTheDocument();
    });

    // Select "Watch" status
    fireEvent.click(screen.getByText('Watch'));

    // Fill in summary
    const summaryInput = screen.getByPlaceholderText('Add a brief note about this status...');
    fireEvent.change(summaryInput, { target: { value: 'Needs monitoring' } });

    // Update the mock for after submission
    (api.getStudentStatus as jest.Mock).mockResolvedValue(updatedStatusData);

    // Submit the form
    fireEvent.click(screen.getByText('Save Status'));

    await waitFor(() => {
      expect(api.createStudentStatus).toHaveBeenCalledWith(
        'student-1',
        expect.objectContaining({
          scope: 'OVERALL',
          code: 'WATCH',
          summary: 'Needs monitoring',
        })
      );
    });
  });

  it('closes modal on cancel', async () => {
    render(
      <AuthProvider>
        <StudentDetailPage />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Update Status')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Update Status'));

    await waitFor(() => {
      expect(screen.getByText('Updating status for')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Cancel'));

    await waitFor(() => {
      expect(screen.queryByText('Updating status for')).not.toBeInTheDocument();
    });
  });
});
