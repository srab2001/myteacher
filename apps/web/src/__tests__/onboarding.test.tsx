import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useRouter } from 'next/navigation';
import OnboardingPage from '@/app/onboarding/page';
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
    getJurisdictions: jest.fn(),
    updateProfile: jest.fn(),
    logout: jest.fn(),
  },
}));

const mockUser = {
  id: 'test-user',
  email: 'test@example.com',
  displayName: 'Test User',
  avatarUrl: null,
  role: null,
  stateCode: null,
  districtName: null,
  schoolName: null,
  isOnboarded: false,
};

const mockJurisdictions = {
  states: [
    {
      stateCode: 'MD',
      stateName: 'Maryland',
      districts: [
        { code: 'HCPSS', name: 'Howard County Public School System' },
      ],
    },
  ],
};

describe('Onboarding Page', () => {
  const mockRouter = {
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
    (api.getMe as jest.Mock).mockResolvedValue({ user: mockUser });
    (api.getJurisdictions as jest.Mock).mockResolvedValue(mockJurisdictions);
  });

  it('renders the onboarding wizard', async () => {
    render(
      <AuthProvider>
        <OnboardingPage />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Welcome to MyTeacher')).toBeInTheDocument();
    });
  });

  it('shows role selection as first step', async () => {
    render(
      <AuthProvider>
        <OnboardingPage />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Select your role')).toBeInTheDocument();
    });

    expect(screen.getByText('Teacher')).toBeInTheDocument();
    expect(screen.getByText('Case Manager')).toBeInTheDocument();
    expect(screen.getByText('Administrator')).toBeInTheDocument();
  });

  it('progresses through onboarding steps', async () => {
    (api.updateProfile as jest.Mock).mockResolvedValue({
      user: { ...mockUser, isOnboarded: true },
    });

    render(
      <AuthProvider>
        <OnboardingPage />
      </AuthProvider>
    );

    // Step 1: Select role
    await waitFor(() => {
      expect(screen.getByText('Select your role')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Teacher'));
    fireEvent.click(screen.getByText('Continue'));

    // Step 2: Select state
    await waitFor(() => {
      expect(screen.getByText('Select your state')).toBeInTheDocument();
    });
  });

  it('redirects to dashboard after onboarding completion', async () => {
    const onboardedUser = { ...mockUser, isOnboarded: true };
    (api.getMe as jest.Mock).mockResolvedValue({ user: onboardedUser });

    render(
      <AuthProvider>
        <OnboardingPage />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(mockRouter.push).toHaveBeenCalledWith('/dashboard');
    });
  });

  it('redirects to home if not logged in', async () => {
    (api.getMe as jest.Mock).mockRejectedValue(new Error('Unauthorized'));

    render(
      <AuthProvider>
        <OnboardingPage />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(mockRouter.push).toHaveBeenCalledWith('/');
    });
  });
});
