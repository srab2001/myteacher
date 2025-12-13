/* eslint-disable @typescript-eslint/no-unused-vars */
import { render, waitFor, screen, fireEvent } from '@testing-library/react';
import { ArtifactComparesSection } from '@/components/artifact/ArtifactComparesSection';
import { api, ArtifactComparison } from '@/lib/api';

// Mock the API
jest.mock('@/lib/api', () => ({
  api: {
    getStudentArtifactCompares: jest.fn(),
    getPlanArtifactCompares: jest.fn(),
  },
}));

// Mock the error mapping
jest.mock('@/lib/errorMapping', () => ({
  mapApiErrorToMessage: jest.fn((err) => 'An error occurred'),
}));

const mockComparison: ArtifactComparison = {
  id: 'comparison-1',
  planInstanceId: 'plan-1',
  planLabel: 'IEP 2024-2025',
  planTypeCode: 'IEP',
  planTypeName: 'Individualized Education Program',
  artifactDate: '2024-06-15T00:00:00.000Z',
  description: 'Writing sample comparison',
  baselineFileUrl: '/uploads/artifacts/baseline-123.pdf',
  compareFileUrl: '/uploads/artifacts/compare-456.pdf',
  analysisText: 'The student showed significant improvement in sentence structure...',
  createdBy: 'Test Teacher',
  createdAt: '2024-06-15T10:00:00.000Z',
};

const mockComparisonWithoutAnalysis: ArtifactComparison = {
  ...mockComparison,
  id: 'comparison-2',
  analysisText: null,
  description: 'Math worksheet comparison',
};

const mockComparisons = [mockComparison, mockComparisonWithoutAnalysis];

describe('ArtifactComparesSection Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Loading State', () => {
    it('shows loading indicator initially', () => {
      (api.getStudentArtifactCompares as jest.Mock).mockImplementation(
        () => new Promise(() => {}) // Never resolves
      );

      render(<ArtifactComparesSection studentId="student-1" />);

      expect(screen.getByText('Loading artifact comparisons...')).toBeInTheDocument();
    });
  });

  describe('Empty State', () => {
    it('shows empty message when no comparisons exist', async () => {
      (api.getStudentArtifactCompares as jest.Mock).mockResolvedValue({
        comparisons: [],
      });

      render(<ArtifactComparesSection studentId="student-1" />);

      await waitFor(() => {
        expect(
          screen.getByText(/No artifact comparisons yet/i)
        ).toBeInTheDocument();
      });
    });

    it('shows empty state when neither studentId nor planId is provided', async () => {
      render(<ArtifactComparesSection />);

      await waitFor(() => {
        expect(
          screen.getByText(/No artifact comparisons yet/i)
        ).toBeInTheDocument();
      });
    });
  });

  describe('Comparisons Display', () => {
    it('fetches and displays comparisons for a student', async () => {
      (api.getStudentArtifactCompares as jest.Mock).mockResolvedValue({
        comparisons: mockComparisons,
      });

      render(<ArtifactComparesSection studentId="student-1" />);

      await waitFor(() => {
        expect(screen.getByText('Jun 15, 2024')).toBeInTheDocument();
        expect(screen.getByText('Writing sample comparison')).toBeInTheDocument();
      });
    });

    it('fetches and displays comparisons for a plan', async () => {
      (api.getPlanArtifactCompares as jest.Mock).mockResolvedValue({
        comparisons: [mockComparison],
      });

      render(<ArtifactComparesSection planId="plan-1" />);

      await waitFor(() => {
        expect(api.getPlanArtifactCompares).toHaveBeenCalledWith('plan-1');
        expect(screen.getByText('Jun 15, 2024')).toBeInTheDocument();
      });
    });

    it('shows plan type info when showPlanInfo is true', async () => {
      (api.getStudentArtifactCompares as jest.Mock).mockResolvedValue({
        comparisons: [mockComparison],
      });

      render(<ArtifactComparesSection studentId="student-1" showPlanInfo={true} />);

      await waitFor(() => {
        expect(screen.getByText(/IEP/)).toBeInTheDocument();
      });
    });

    it('shows "Analysis complete" for analyzed comparisons', async () => {
      (api.getStudentArtifactCompares as jest.Mock).mockResolvedValue({
        comparisons: [mockComparison],
      });

      render(<ArtifactComparesSection studentId="student-1" />);

      await waitFor(() => {
        expect(screen.getByText('Analysis complete')).toBeInTheDocument();
      });
    });

    it('shows "Pending analysis" for comparisons without analysis', async () => {
      (api.getStudentArtifactCompares as jest.Mock).mockResolvedValue({
        comparisons: [mockComparisonWithoutAnalysis],
      });

      render(<ArtifactComparesSection studentId="student-1" />);

      await waitFor(() => {
        expect(screen.getByText('Pending analysis')).toBeInTheDocument();
      });
    });
  });

  describe('Detail Modal', () => {
    it('opens detail modal when View Details is clicked', async () => {
      (api.getStudentArtifactCompares as jest.Mock).mockResolvedValue({
        comparisons: [mockComparison],
      });

      render(<ArtifactComparesSection studentId="student-1" />);

      await waitFor(() => {
        expect(screen.getByText('View Details')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('View Details'));

      await waitFor(() => {
        expect(screen.getByText('Artifact Comparison')).toBeInTheDocument();
        expect(screen.getByText('Baseline Artifact')).toBeInTheDocument();
        expect(screen.getByText('Student Artifact')).toBeInTheDocument();
      });
    });

    it('shows analysis text in modal for analyzed comparison', async () => {
      (api.getStudentArtifactCompares as jest.Mock).mockResolvedValue({
        comparisons: [mockComparison],
      });

      render(<ArtifactComparesSection studentId="student-1" />);

      await waitFor(() => {
        expect(screen.getByText('View Details')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('View Details'));

      await waitFor(() => {
        expect(screen.getByText(/significant improvement in sentence structure/i)).toBeInTheDocument();
      });
    });

    it('shows "Analysis not yet run" for comparison without analysis', async () => {
      (api.getStudentArtifactCompares as jest.Mock).mockResolvedValue({
        comparisons: [mockComparisonWithoutAnalysis],
      });

      render(<ArtifactComparesSection studentId="student-1" />);

      await waitFor(() => {
        expect(screen.getByText('View Details')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('View Details'));

      await waitFor(() => {
        expect(screen.getByText(/Analysis not yet run/i)).toBeInTheDocument();
      });
    });

    it('closes modal when close button is clicked', async () => {
      (api.getStudentArtifactCompares as jest.Mock).mockResolvedValue({
        comparisons: [mockComparison],
      });

      render(<ArtifactComparesSection studentId="student-1" />);

      await waitFor(() => {
        expect(screen.getByText('View Details')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('View Details'));

      await waitFor(() => {
        expect(screen.getByText('Artifact Comparison')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Close'));

      await waitFor(() => {
        expect(screen.queryByText('Artifact Comparison')).not.toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('displays error message when API call fails', async () => {
      const errorResponse = {
        error: {
          code: 'ERR_API_STUDENT_NOT_FOUND',
          message: 'Student not found',
        },
      };

      (api.getStudentArtifactCompares as jest.Mock).mockRejectedValue(errorResponse);

      render(<ArtifactComparesSection studentId="student-1" />);

      await waitFor(() => {
        expect(screen.getByText('An error occurred')).toBeInTheDocument();
      });
    });
  });

  describe('Plan Type Labels', () => {
    it('displays IEP label correctly', async () => {
      (api.getStudentArtifactCompares as jest.Mock).mockResolvedValue({
        comparisons: [{ ...mockComparison, planTypeCode: 'IEP' }],
      });

      render(<ArtifactComparesSection studentId="student-1" showPlanInfo={true} />);

      await waitFor(() => {
        expect(screen.getByText(/IEP/)).toBeInTheDocument();
      });
    });

    it('displays 504 Plan label correctly', async () => {
      (api.getStudentArtifactCompares as jest.Mock).mockResolvedValue({
        comparisons: [{ ...mockComparison, planTypeCode: 'FIVE_OH_FOUR' }],
      });

      render(<ArtifactComparesSection studentId="student-1" showPlanInfo={true} />);

      await waitFor(() => {
        expect(screen.getByText(/504 Plan/)).toBeInTheDocument();
      });
    });

    it('displays Behavior Plan label correctly', async () => {
      (api.getStudentArtifactCompares as jest.Mock).mockResolvedValue({
        comparisons: [{ ...mockComparison, planTypeCode: 'BEHAVIOR_PLAN' }],
      });

      render(<ArtifactComparesSection studentId="student-1" showPlanInfo={true} />);

      await waitFor(() => {
        expect(screen.getByText(/Behavior Plan/)).toBeInTheDocument();
      });
    });
  });
});

describe('Error Mapping', () => {
  it('maps ERR_API_ARTIFACT_NOT_FOUND to user-friendly message', () => {
    const { mapApiErrorToMessage } = jest.requireActual('@/lib/errorMapping');

    const error = {
      error: {
        code: 'ERR_API_ARTIFACT_NOT_FOUND',
        message: 'Artifact comparison not found',
      },
    };

    const message = mapApiErrorToMessage(error);
    expect(message).toBe('Artifact comparison not found.');
  });

  it('maps ERR_API_STUDENT_NOT_FOUND to user-friendly message', () => {
    const { mapApiErrorToMessage } = jest.requireActual('@/lib/errorMapping');

    const error = {
      error: {
        code: 'ERR_API_STUDENT_NOT_FOUND',
        message: 'Student not found',
      },
    };

    const message = mapApiErrorToMessage(error);
    expect(message).toBe('Student not found. They may have been removed.');
  });

  it('maps ERR_API_PLAN_NOT_FOUND to user-friendly message', () => {
    const { mapApiErrorToMessage } = jest.requireActual('@/lib/errorMapping');

    const error = {
      error: {
        code: 'ERR_API_PLAN_NOT_FOUND',
        message: 'Plan not found',
      },
    };

    const message = mapApiErrorToMessage(error);
    expect(message).toBe('Plan not found. It may have been deleted.');
  });

  it('maps ERR_API_FILE_NOT_FOUND to user-friendly message', () => {
    const { mapApiErrorToMessage } = jest.requireActual('@/lib/errorMapping');

    const error = {
      error: {
        code: 'ERR_API_FILE_NOT_FOUND',
        message: 'Files not found',
      },
    };

    const message = mapApiErrorToMessage(error);
    expect(message).toBe('Files not found. They may have been deleted. Please re-upload.');
  });
});
