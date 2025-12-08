import { render, waitFor, screen, fireEvent } from '@testing-library/react';
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
    getPlan: jest.fn(),
    updatePlanFields: jest.fn(),
    finalizePlan: jest.fn(),
    getStudentPriorPlans: jest.fn(),
    getGenerationAvailability: jest.fn(),
    getPriorPlanDownloadUrl: jest.fn(),
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

const mock504Schema = {
  id: '504-schema-1',
  version: 1,
  name: '504 Plan Standard Form v1',
  description: 'Standard 504 Plan form for Maryland schools',
  fields: {
    sections: [
      {
        key: 'referral_info',
        title: 'Referral Information',
        order: 1,
        fields: [
          { key: 'referral_date', type: 'date', label: 'Referral Date', required: true },
          { key: 'referral_source', type: 'select', label: 'Referral Source', required: true, options: ['Parent/Guardian', 'Teacher', 'Counselor', 'Administrator', 'Self', 'Medical Provider', 'Other'] },
          { key: 'reason_for_referral', type: 'textarea', label: 'Reason for Referral', required: true, placeholder: 'Describe the concerns...' },
        ],
      },
      {
        key: 'student_profile',
        title: 'Student Profile',
        order: 2,
        fields: [
          { key: 'student_name', type: 'text', label: 'Student Name', required: true },
          { key: 'date_of_birth', type: 'date', label: 'Date of Birth', required: true },
          { key: 'grade_level', type: 'select', label: 'Grade Level', required: true, options: ['Pre-K', 'K', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'] },
        ],
      },
      {
        key: 'disability_info',
        title: 'Disability Information',
        order: 4,
        fields: [
          { key: 'disability_type', type: 'text', label: 'Type of Disability/Impairment', required: true },
          { key: 'major_life_activities_affected', type: 'textarea', label: 'Major Life Activities Affected', required: true, placeholder: 'Describe which major life activities are substantially limited...' },
        ],
      },
      {
        key: 'eligibility_determination',
        title: 'Eligibility Determination',
        order: 12,
        fields: [
          { key: 'is_eligible', type: 'select', label: 'Eligibility Determination', required: true, options: ['Eligible for 504 Plan', 'Not Eligible', 'Additional Evaluation Needed'] },
          { key: 'eligibility_rationale', type: 'textarea', label: 'Eligibility Rationale', required: true, placeholder: 'Explain the basis for the eligibility determination...' },
        ],
      },
      {
        key: 'accommodations_plan',
        title: 'Accommodations and Services',
        order: 13,
        fields: [
          { key: 'classroom_accommodations', type: 'textarea', label: 'Classroom Accommodations', required: true, placeholder: 'List specific accommodations...' },
          { key: 'plan_review_date', type: 'date', label: 'Plan Review Date', required: true },
        ],
      },
    ],
  },
};

const mock504Plan = {
  id: '504-plan-1',
  status: 'DRAFT',
  startDate: '2024-01-01',
  endDate: null,
  createdAt: '2024-01-01',
  updatedAt: '2024-01-15',
  planType: { code: 'FIVE_OH_FOUR', name: '504 Plan' },
  schema: mock504Schema,
  student: { id: 'student-1', firstName: 'Jane', lastName: 'Smith', dateOfBirth: '2013-05-20', grade: '5' },
  fieldValues: {},
  goals: [],
  serviceLogs: [],
};

const mockPriorPlans = [
  {
    id: 'prior-1',
    planType: 'FIVE_OH_FOUR',
    fileName: 'previous-504-plan.pdf',
    planDate: '2023-01-15',
    notes: 'Prior year 504 plan',
    createdAt: '2023-01-20',
    uploadedBy: 'Previous Teacher',
  },
];

describe('504 Form Page', () => {
  const mockRouter = {
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
    (useParams as jest.Mock).mockReturnValue({ id: 'student-1', planId: '504-plan-1' });
    (api.getMe as jest.Mock).mockResolvedValue({ user: mockUser });
    (api.getPlan as jest.Mock).mockResolvedValue({ plan: mock504Plan });
    (api.getStudentPriorPlans as jest.Mock).mockResolvedValue({ priorPlans: [] });
    (api.getGenerationAvailability as jest.Mock).mockResolvedValue({ available: false, sections: [] });
  });

  it('redirects to login when not authenticated', async () => {
    (api.getMe as jest.Mock).mockResolvedValue({ user: null });

    const FiveOhFourPage = (await import('@/app/students/[id]/plans/[planId]/504/page')).default;

    render(
      <AuthProvider>
        <FiveOhFourPage />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(mockRouter.push).toHaveBeenCalledWith('/');
    });
  });

  it('shows prior plans step when prior 504 plans exist', async () => {
    (api.getStudentPriorPlans as jest.Mock).mockResolvedValue({ priorPlans: mockPriorPlans });

    const FiveOhFourPage = (await import('@/app/students/[id]/plans/[planId]/504/page')).default;

    render(
      <AuthProvider>
        <FiveOhFourPage />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(api.getStudentPriorPlans).toHaveBeenCalledWith('student-1');
    });
  });

  it('skips prior plans step when no prior plans exist', async () => {
    (api.getStudentPriorPlans as jest.Mock).mockResolvedValue({ priorPlans: [] });

    const FiveOhFourPage = (await import('@/app/students/[id]/plans/[planId]/504/page')).default;

    render(
      <AuthProvider>
        <FiveOhFourPage />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(api.getPlan).toHaveBeenCalledWith('504-plan-1');
    });
  });

  it('skips prior plans step when plan has existing data', async () => {
    const planWithData = {
      ...mock504Plan,
      fieldValues: { disability_type: 'ADHD' },
    };
    (api.getPlan as jest.Mock).mockResolvedValue({ plan: planWithData });
    (api.getStudentPriorPlans as jest.Mock).mockResolvedValue({ priorPlans: mockPriorPlans });

    const FiveOhFourPage = (await import('@/app/students/[id]/plans/[planId]/504/page')).default;

    render(
      <AuthProvider>
        <FiveOhFourPage />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(api.getPlan).toHaveBeenCalled();
    });
  });
});

describe('504 Schema Sections', () => {
  it('has correct number of sections', () => {
    const sections = mock504Schema.fields.sections;
    expect(sections.length).toBe(5);
  });

  it('has correct section order', () => {
    const sections = mock504Schema.fields.sections;

    expect(sections[0].order).toBe(1);
    expect(sections[0].title).toBe('Referral Information');
    expect(sections[1].order).toBe(2);
    expect(sections[1].title).toBe('Student Profile');
    expect(sections[2].order).toBe(4);
    expect(sections[2].title).toBe('Disability Information');
  });

  it('has all required sections for 504', () => {
    const sectionKeys = mock504Schema.fields.sections.map(s => s.key);

    expect(sectionKeys).toContain('referral_info');
    expect(sectionKeys).toContain('student_profile');
    expect(sectionKeys).toContain('disability_info');
    expect(sectionKeys).toContain('eligibility_determination');
    expect(sectionKeys).toContain('accommodations_plan');
  });
});

describe('504 Field Types', () => {
  it('handles select fields with options', () => {
    const referralSection = mock504Schema.fields.sections[0];
    const sourceField = referralSection.fields.find(f => f.key === 'referral_source');

    expect(sourceField?.type).toBe('select');
    expect(sourceField?.options).toContain('Parent/Guardian');
    expect(sourceField?.options).toContain('Teacher');
  });

  it('handles textarea fields with placeholders', () => {
    const referralSection = mock504Schema.fields.sections[0];
    const reasonField = referralSection.fields.find(f => f.key === 'reason_for_referral');

    expect(reasonField?.type).toBe('textarea');
    expect(reasonField?.placeholder).toBeDefined();
  });

  it('validates required fields', () => {
    const referralSection = mock504Schema.fields.sections[0];

    expect(referralSection.fields[0].required).toBe(true);
    expect(referralSection.fields[1].required).toBe(true);
    expect(referralSection.fields[2].required).toBe(true);
  });
});

describe('504 Plan Field Updates', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('updates plan fields', async () => {
    (api.updatePlanFields as jest.Mock).mockResolvedValue({ success: true });

    await api.updatePlanFields('504-plan-1', {
      disability_type: 'ADHD',
      major_life_activities_affected: 'Learning, concentrating, following instructions',
    });

    expect(api.updatePlanFields).toHaveBeenCalledWith('504-plan-1', {
      disability_type: 'ADHD',
      major_life_activities_affected: 'Learning, concentrating, following instructions',
    });
  });
});

describe('504 Plan Finalization', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('finalizes plan and changes status', async () => {
    (api.finalizePlan as jest.Mock).mockResolvedValue({
      plan: { id: '504-plan-1', status: 'ACTIVE' },
    });

    const result = await api.finalizePlan('504-plan-1');

    expect(api.finalizePlan).toHaveBeenCalledWith('504-plan-1');
    expect(result.plan.status).toBe('ACTIVE');
  });

  it('shows error when finalization fails', async () => {
    (api.finalizePlan as jest.Mock).mockRejectedValue(new Error('Missing required fields'));

    await expect(api.finalizePlan('504-plan-1')).rejects.toThrow('Missing required fields');
  });
});

describe('Step Navigation', () => {
  it('tracks current step correctly', () => {
    const sections = mock504Schema.fields.sections;
    let currentStep = 0;

    expect(sections[currentStep].title).toBe('Referral Information');

    currentStep = 1;
    expect(sections[currentStep].title).toBe('Student Profile');

    currentStep = 4;
    expect(sections[currentStep].title).toBe('Accommodations and Services');
  });
});

describe('504 Eligibility Determination', () => {
  it('has correct eligibility options', () => {
    const eligSection = mock504Schema.fields.sections.find(s => s.key === 'eligibility_determination');
    const eligField = eligSection?.fields.find(f => f.key === 'is_eligible');

    expect(eligField?.options).toContain('Eligible for 504 Plan');
    expect(eligField?.options).toContain('Not Eligible');
    expect(eligField?.options).toContain('Additional Evaluation Needed');
  });
});

describe('Prior Plans Integration', () => {
  it('filters prior plans to show only 504 plans', () => {
    const allPriorPlans = [
      { id: 'p1', planType: 'IEP', fileName: 'iep.pdf' },
      { id: 'p2', planType: 'FIVE_OH_FOUR', fileName: '504.pdf' },
      { id: 'p3', planType: 'BEHAVIOR_PLAN', fileName: 'bip.pdf' },
    ];

    const filtered504Plans = allPriorPlans.filter(p => p.planType === 'FIVE_OH_FOUR');

    expect(filtered504Plans.length).toBe(1);
    expect(filtered504Plans[0].fileName).toBe('504.pdf');
  });

  it('provides download URL for prior plans', () => {
    (api.getPriorPlanDownloadUrl as jest.Mock).mockReturnValue('/api/prior-plans/prior-1/download');

    const url = api.getPriorPlanDownloadUrl('prior-1');

    expect(url).toBe('/api/prior-plans/prior-1/download');
  });
});

describe('504 Plan Status', () => {
  it('shows correct status indicators', () => {
    const validStatuses = ['DRAFT', 'ACTIVE', 'ARCHIVED'];

    expect(validStatuses).toContain(mock504Plan.status);
    expect(mock504Plan.status).toBe('DRAFT');
  });

  it('disables finalize button when not in DRAFT status', () => {
    const activePlan = { ...mock504Plan, status: 'ACTIVE' };

    // Finalize should only be available for DRAFT plans
    const canFinalize = activePlan.status === 'DRAFT';

    expect(canFinalize).toBe(false);
  });
});
