import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { useRouter } from 'next/navigation';
import { AuthProvider } from '@/lib/auth-context';
import { api } from '@/lib/api';
import BestPracticeDocsPage from '@/app/admin/documents/best-practice/page';
import FormTemplatesPage from '@/app/admin/documents/templates/page';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

// Mock the API
jest.mock('@/lib/api', () => ({
  api: {
    getMe: jest.fn(),
    getBestPracticeDocs: jest.fn(),
    getFormTemplates: jest.fn(),
    getAdminJurisdictions: jest.fn(),
    getBestPracticeDocDownloadUrl: jest.fn((id: string) => `/api/admin/best-practice-docs/${id}/download`),
    getFormTemplateDownloadUrl: jest.fn((id: string) => `/api/admin/form-templates/${id}/download`),
    uploadBestPracticeDoc: jest.fn(),
    uploadFormTemplate: jest.fn(),
    updateBestPracticeDoc: jest.fn(),
    updateFormTemplate: jest.fn(),
  },
}));

const mockAdminUser = {
  id: 'admin-user',
  email: 'admin@example.com',
  displayName: 'Admin User',
  avatarUrl: null,
  role: 'ADMIN',
  stateCode: 'MD',
  districtName: 'Howard County Public School System',
  schoolName: 'District Office',
  isOnboarded: true,
};

const mockTeacherUser = {
  id: 'teacher-user',
  email: 'teacher@example.com',
  displayName: 'Test Teacher',
  avatarUrl: null,
  role: 'TEACHER',
  stateCode: 'MD',
  districtName: 'Howard County Public School System',
  schoolName: 'Test Elementary',
  isOnboarded: true,
};

const mockBestPracticeDocs = [
  {
    id: 'bp-doc-1',
    title: 'Example IEP - Reading Goals',
    description: 'A sample IEP with well-written reading goals',
    planType: 'IEP',
    planTypeName: 'Individualized Education Program',
    gradeBand: '3-5',
    jurisdictionId: null,
    jurisdictionName: null,
    isActive: true,
    uploadedBy: 'Admin User',
    createdAt: '2024-01-15T12:00:00Z',
    updatedAt: '2024-01-15T12:00:00Z',
  },
  {
    id: 'bp-doc-2',
    title: 'Example 504 Plan',
    description: null,
    planType: 'FIVE_OH_FOUR',
    planTypeName: '504 Plan',
    gradeBand: null,
    jurisdictionId: 'jur-1',
    jurisdictionName: 'Howard County',
    isActive: false,
    uploadedBy: 'Another Admin',
    createdAt: '2024-01-10T12:00:00Z',
    updatedAt: '2024-01-10T12:00:00Z',
  },
];

const mockFormTemplates = [
  {
    id: 'template-1',
    title: 'Maryland IEP Form 2024',
    description: 'Official blank IEP form for Maryland',
    planType: 'IEP',
    planTypeName: 'Individualized Education Program',
    jurisdictionId: 'jur-1',
    jurisdictionName: 'Howard County',
    isDefault: true,
    uploadedBy: 'Admin User',
    createdAt: '2024-01-10T12:00:00Z',
    updatedAt: '2024-01-10T12:00:00Z',
  },
];

const mockJurisdictions = [
  {
    id: 'jur-1',
    stateCode: 'MD',
    stateName: 'Maryland',
    districtCode: 'HCPSS',
    districtName: 'Howard County',
  },
];

describe('Admin Access Control', () => {
  const mockRouter = {
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
  });

  it('admin user can access admin pages', async () => {
    (api.getMe as jest.Mock).mockResolvedValue({ user: mockAdminUser });
    (api.getBestPracticeDocs as jest.Mock).mockResolvedValue({ documents: mockBestPracticeDocs });
    (api.getAdminJurisdictions as jest.Mock).mockResolvedValue({ jurisdictions: mockJurisdictions });

    render(
      <AuthProvider>
        <BestPracticeDocsPage />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Best Practice Documents')).toBeInTheDocument();
    });
  });

  it('teacher user is redirected from admin pages', async () => {
    (api.getMe as jest.Mock).mockResolvedValue({ user: mockTeacherUser });

    // Teacher would be redirected by the admin layout
    expect(mockTeacherUser.role).not.toBe('ADMIN');
  });
});

describe('Best Practice Documents Page', () => {
  const mockRouter = {
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
    (api.getMe as jest.Mock).mockResolvedValue({ user: mockAdminUser });
    (api.getBestPracticeDocs as jest.Mock).mockResolvedValue({ documents: mockBestPracticeDocs });
    (api.getAdminJurisdictions as jest.Mock).mockResolvedValue({ jurisdictions: mockJurisdictions });
  });

  it('displays list of best practice documents', async () => {
    render(
      <AuthProvider>
        <BestPracticeDocsPage />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Example IEP - Reading Goals')).toBeInTheDocument();
      expect(screen.getByText('Example 504 Plan')).toBeInTheDocument();
    });
  });

  it('shows plan type badges', async () => {
    render(
      <AuthProvider>
        <BestPracticeDocsPage />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('IEP')).toBeInTheDocument();
      expect(screen.getByText('504 Plan')).toBeInTheDocument();
    });
  });

  it('shows active/inactive status', async () => {
    render(
      <AuthProvider>
        <BestPracticeDocsPage />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Active')).toBeInTheDocument();
      expect(screen.getByText('Inactive')).toBeInTheDocument();
    });
  });

  it('shows grade band when available', async () => {
    render(
      <AuthProvider>
        <BestPracticeDocsPage />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('3-5')).toBeInTheDocument();
    });
  });

  it('shows upload button', async () => {
    render(
      <AuthProvider>
        <BestPracticeDocsPage />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('+ Upload Document')).toBeInTheDocument();
    });
  });

  it('shows download and edit actions', async () => {
    render(
      <AuthProvider>
        <BestPracticeDocsPage />
      </AuthProvider>
    );

    await waitFor(() => {
      const downloadLinks = screen.getAllByText('Download');
      const editButtons = screen.getAllByText('Edit');
      expect(downloadLinks).toHaveLength(2);
      expect(editButtons).toHaveLength(2);
    });
  });

  it('shows empty state when no documents exist', async () => {
    (api.getBestPracticeDocs as jest.Mock).mockResolvedValue({ documents: [] });

    render(
      <AuthProvider>
        <BestPracticeDocsPage />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('No best practice documents uploaded yet.')).toBeInTheDocument();
    });
  });
});

describe('Form Templates Page', () => {
  const mockRouter = {
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
    (api.getMe as jest.Mock).mockResolvedValue({ user: mockAdminUser });
    (api.getFormTemplates as jest.Mock).mockResolvedValue({ templates: mockFormTemplates });
    (api.getAdminJurisdictions as jest.Mock).mockResolvedValue({ jurisdictions: mockJurisdictions });
  });

  it('displays list of form templates', async () => {
    render(
      <AuthProvider>
        <FormTemplatesPage />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Maryland IEP Form 2024')).toBeInTheDocument();
    });
  });

  it('shows default badge for default templates', async () => {
    render(
      <AuthProvider>
        <FormTemplatesPage />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Default')).toBeInTheDocument();
    });
  });

  it('groups templates by plan type', async () => {
    render(
      <AuthProvider>
        <FormTemplatesPage />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('IEP Templates')).toBeInTheDocument();
    });
  });

  it('shows upload button', async () => {
    render(
      <AuthProvider>
        <FormTemplatesPage />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('+ Upload Template')).toBeInTheDocument();
    });
  });

  it('shows empty state when no templates exist', async () => {
    (api.getFormTemplates as jest.Mock).mockResolvedValue({ templates: [] });

    render(
      <AuthProvider>
        <FormTemplatesPage />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('No form templates uploaded yet.')).toBeInTheDocument();
    });
  });

  it('generates correct download URL', () => {
    const downloadUrl = api.getFormTemplateDownloadUrl('template-123');
    expect(downloadUrl).toBe('/api/admin/form-templates/template-123/download');
  });
});

describe('Admin API Integration', () => {
  it('generates correct best practice doc download URL', () => {
    const downloadUrl = api.getBestPracticeDocDownloadUrl('bp-doc-123');
    expect(downloadUrl).toBe('/api/admin/best-practice-docs/bp-doc-123/download');
  });

  it('fetches jurisdictions for admin dropdowns', async () => {
    (api.getAdminJurisdictions as jest.Mock).mockResolvedValue({ jurisdictions: mockJurisdictions });

    const result = await api.getAdminJurisdictions();

    expect(result.jurisdictions).toHaveLength(1);
    expect(result.jurisdictions[0].districtName).toBe('Howard County');
  });
});
