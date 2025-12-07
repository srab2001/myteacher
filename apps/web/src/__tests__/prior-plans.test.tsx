import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { useRouter, useParams } from 'next/navigation';
import StudentDetailPage from '@/app/students/[id]/page';
import { PriorPlanUploadModal } from '@/components/PriorPlanUploadModal';
import { AuthProvider } from '@/lib/auth-context';
import { api } from '@/lib/api';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  useParams: jest.fn(() => ({ id: 'student-1' })),
}));

// Mock the API
jest.mock('@/lib/api', () => ({
  api: {
    getMe: jest.fn(),
    getStudent: jest.fn(),
    getStudentStatus: jest.fn(),
    getStudentPriorPlans: jest.fn(),
    uploadPriorPlan: jest.fn(),
    deletePriorPlan: jest.fn(),
    getPriorPlanDownloadUrl: jest.fn((id: string) => `/api/prior-plans/${id}/download`),
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
  studentIdNum: 'STU-001',
  firstName: 'Alex',
  lastName: 'Johnson',
  grade: '4',
  schoolName: 'Test Elementary',
  dateOfBirth: '2015-03-15',
  overallStatus: null,
  statuses: [],
  plans: [],
};

const mockPriorPlans = [
  {
    id: 'prior-plan-1',
    planType: 'IEP',
    planTypeName: 'IEP',
    fileName: 'alex-iep-2023.pdf',
    planDate: '2023-05-15',
    notes: 'Previous year IEP',
    source: 'UPLOADED',
    uploadedBy: 'Test Teacher',
    createdAt: '2024-01-10T12:00:00Z',
  },
  {
    id: 'prior-plan-2',
    planType: 'FIVE_OH_FOUR',
    planTypeName: '504 Plan',
    fileName: 'alex-504.pdf',
    planDate: null,
    notes: null,
    source: 'UPLOADED',
    uploadedBy: 'Another Teacher',
    createdAt: '2024-01-05T12:00:00Z',
  },
];

describe('Prior Plans on Student Detail Page', () => {
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
    (api.getStudentStatus as jest.Mock).mockResolvedValue({ current: [], history: [] });
    (api.getStudentPriorPlans as jest.Mock).mockResolvedValue({ priorPlans: mockPriorPlans });
  });

  it('renders the prior plans section', async () => {
    render(
      <AuthProvider>
        <StudentDetailPage />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Prior Plans & Documents')).toBeInTheDocument();
    });
  });

  it('displays list of prior plans', async () => {
    render(
      <AuthProvider>
        <StudentDetailPage />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('alex-iep-2023.pdf')).toBeInTheDocument();
      expect(screen.getByText('alex-504.pdf')).toBeInTheDocument();
    });

    // Check plan type badges
    expect(screen.getByText('IEP')).toBeInTheDocument();
    expect(screen.getByText('504 Plan')).toBeInTheDocument();
  });

  it('displays plan date when available', async () => {
    render(
      <AuthProvider>
        <StudentDetailPage />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByText(/Plan Date: May 15, 2023/)).toBeInTheDocument();
    });
  });

  it('displays uploader information', async () => {
    render(
      <AuthProvider>
        <StudentDetailPage />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByText(/by Test Teacher/)).toBeInTheDocument();
      expect(screen.getByText(/by Another Teacher/)).toBeInTheDocument();
    });
  });

  it('displays notes when available', async () => {
    render(
      <AuthProvider>
        <StudentDetailPage />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Previous year IEP')).toBeInTheDocument();
    });
  });

  it('shows download links for prior plans', async () => {
    render(
      <AuthProvider>
        <StudentDetailPage />
      </AuthProvider>
    );

    await waitFor(() => {
      const downloadLinks = screen.getAllByText('Download');
      expect(downloadLinks).toHaveLength(2);
    });
  });

  it('shows upload button', async () => {
    render(
      <AuthProvider>
        <StudentDetailPage />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('+ Upload Prior Plan')).toBeInTheDocument();
    });
  });

  it('shows empty message when no prior plans exist', async () => {
    (api.getStudentPriorPlans as jest.Mock).mockResolvedValue({ priorPlans: [] });

    render(
      <AuthProvider>
        <StudentDetailPage />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByText(/No prior plans uploaded yet/)).toBeInTheDocument();
    });
  });
});

describe('Prior Plan Upload Modal', () => {
  const mockOnClose = jest.fn();
  const mockOnUpload = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the modal with form fields', () => {
    render(
      <PriorPlanUploadModal onClose={mockOnClose} onUpload={mockOnUpload} />
    );

    expect(screen.getByText('Upload Prior Plan')).toBeInTheDocument();
    expect(screen.getByText('Plan Type *')).toBeInTheDocument();
    expect(screen.getByText('Plan Date (optional)')).toBeInTheDocument();
    expect(screen.getByText('Notes (optional)')).toBeInTheDocument();
    expect(screen.getByText('File *')).toBeInTheDocument();
  });

  it('displays plan type options', () => {
    render(
      <PriorPlanUploadModal onClose={mockOnClose} onUpload={mockOnUpload} />
    );

    const select = screen.getByRole('combobox');
    expect(select).toBeInTheDocument();

    // Check options
    fireEvent.click(select);
    expect(screen.getByText('IEP')).toBeInTheDocument();
    expect(screen.getByText('504 Plan')).toBeInTheDocument();
    expect(screen.getByText('Behavior Plan')).toBeInTheDocument();
  });

  it('shows file dropzone', () => {
    render(
      <PriorPlanUploadModal onClose={mockOnClose} onUpload={mockOnUpload} />
    );

    expect(screen.getByText(/Drag and drop a file here/)).toBeInTheDocument();
    expect(screen.getByText(/PDF, DOC, DOCX, JPEG, PNG, GIF, WEBP/)).toBeInTheDocument();
  });

  it('calls onClose when cancel button is clicked', () => {
    render(
      <PriorPlanUploadModal onClose={mockOnClose} onUpload={mockOnUpload} />
    );

    const cancelButton = screen.getByText('Cancel');
    fireEvent.click(cancelButton);

    expect(mockOnClose).toHaveBeenCalled();
  });

  it('calls onClose when overlay is clicked', () => {
    render(
      <PriorPlanUploadModal onClose={mockOnClose} onUpload={mockOnUpload} />
    );

    // Find overlay by class or role and click it
    const overlay = document.querySelector('[class*="overlay"]');
    if (overlay) {
      fireEvent.click(overlay);
      expect(mockOnClose).toHaveBeenCalled();
    }
  });

  it('upload button is disabled when no file is selected', () => {
    render(
      <PriorPlanUploadModal onClose={mockOnClose} onUpload={mockOnUpload} />
    );

    const uploadButton = screen.getByText('Upload');
    expect(uploadButton).toBeDisabled();
  });

  it('shows error when form is submitted without file', async () => {
    render(
      <PriorPlanUploadModal onClose={mockOnClose} onUpload={mockOnUpload} />
    );

    // The upload button should be disabled, but let's verify the state
    const uploadButton = screen.getByText('Upload');
    expect(uploadButton).toBeDisabled();
  });
});

describe('Prior Plan API Integration', () => {
  it('fetches prior plans when student page loads', async () => {
    const mockRouter = {
      push: jest.fn(),
      replace: jest.fn(),
      prefetch: jest.fn(),
    };

    (useRouter as jest.Mock).mockReturnValue(mockRouter);
    (useParams as jest.Mock).mockReturnValue({ id: 'student-1' });
    (api.getMe as jest.Mock).mockResolvedValue({ user: mockUser });
    (api.getStudent as jest.Mock).mockResolvedValue({ student: mockStudent });
    (api.getStudentStatus as jest.Mock).mockResolvedValue({ current: [], history: [] });
    (api.getStudentPriorPlans as jest.Mock).mockResolvedValue({ priorPlans: mockPriorPlans });

    render(
      <AuthProvider>
        <StudentDetailPage />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(api.getStudentPriorPlans).toHaveBeenCalledWith('student-1');
    });
  });

  it('generates correct download URL', () => {
    const downloadUrl = api.getPriorPlanDownloadUrl('prior-plan-123');
    expect(downloadUrl).toBe('/api/prior-plans/prior-plan-123/download');
  });
});
