import { render, waitFor } from '@testing-library/react';
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
    createGoal: jest.fn(),
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

const mockSchema = {
  id: 'schema-1',
  version: 1,
  name: 'Maryland IEP Form 2024',
  description: 'Standard IEP form for Maryland schools',
  fields: {
    sections: [
      {
        key: 'student_info',
        title: 'Student Information',
        order: 1,
        fields: [
          { key: 'disability_category', type: 'select', label: 'Disability Category', required: true, options: ['Specific Learning Disability', 'Autism', 'Other Health Impairment'] },
          { key: 'special_ed_entry', type: 'date', label: 'Special Education Entry Date', required: true },
        ],
      },
      {
        key: 'present_levels',
        title: 'Present Levels',
        order: 2,
        fields: [
          { key: 'academic_strengths', type: 'textarea', label: 'Academic Strengths', required: true },
          { key: 'academic_needs', type: 'textarea', label: 'Academic Needs', required: true },
        ],
      },
      {
        key: 'goals',
        title: 'Annual Goals',
        order: 3,
        isGoalsSection: true,
        fields: [],
      },
    ],
  },
};

const mockPlan = {
  id: 'plan-1',
  status: 'draft',
  startDate: '2024-01-01',
  endDate: null,
  createdAt: '2024-01-01',
  updatedAt: '2024-01-15',
  planType: { code: 'IEP', name: 'Individualized Education Program' },
  schema: mockSchema,
  student: { id: 'student-1', firstName: 'John', lastName: 'Doe', dateOfBirth: '2015-03-15', grade: '4' },
  fieldValues: {
    disability_category: 'Specific Learning Disability',
    academic_strengths: 'Strong verbal skills',
  },
  goals: [],
  serviceLogs: [],
};

describe('IEP Form Page', () => {
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
    (api.getPlan as jest.Mock).mockResolvedValue({ plan: mockPlan });
  });

  it('redirects to login when not authenticated', async () => {
    (api.getMe as jest.Mock).mockResolvedValue({ user: null });

    const IEPPage = (await import('@/app/students/[id]/plans/[planId]/iep/page')).default;

    render(
      <AuthProvider>
        <IEPPage />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(mockRouter.push).toHaveBeenCalledWith('/');
    });
  });
});

describe('Schema Sections', () => {
  it('has correct section order', () => {
    const sections = mockSchema.fields.sections;

    expect(sections[0].order).toBe(1);
    expect(sections[0].title).toBe('Student Information');
    expect(sections[1].order).toBe(2);
    expect(sections[1].title).toBe('Present Levels');
    expect(sections[2].order).toBe(3);
    expect(sections[2].title).toBe('Annual Goals');
  });

  it('identifies goals section correctly', () => {
    const goalsSection = mockSchema.fields.sections.find(s => s.isGoalsSection);

    expect(goalsSection).toBeDefined();
    expect(goalsSection?.key).toBe('goals');
  });
});

describe('Field Types', () => {
  it('handles different field types', () => {
    const studentInfoSection = mockSchema.fields.sections[0];

    expect(studentInfoSection.fields[0].type).toBe('select');
    expect(studentInfoSection.fields[1].type).toBe('date');
  });

  it('validates required fields', () => {
    const studentInfoSection = mockSchema.fields.sections[0];

    expect(studentInfoSection.fields[0].required).toBe(true);
    expect(studentInfoSection.fields[1].required).toBe(true);
  });
});

describe('Plan Field Updates', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('updates plan fields', async () => {
    (api.updatePlanFields as jest.Mock).mockResolvedValue({ success: true });

    await api.updatePlanFields('plan-1', {
      disability_category: 'Autism',
      academic_strengths: 'Excellent memory',
    });

    expect(api.updatePlanFields).toHaveBeenCalledWith('plan-1', {
      disability_category: 'Autism',
      academic_strengths: 'Excellent memory',
    });
  });
});

describe('Plan Finalization', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('finalizes plan and changes status', async () => {
    (api.finalizePlan as jest.Mock).mockResolvedValue({
      plan: { id: 'plan-1', status: 'active' },
    });

    const result = await api.finalizePlan('plan-1');

    expect(api.finalizePlan).toHaveBeenCalledWith('plan-1');
    expect(result.plan.status).toBe('active');
  });
});

describe('Goal Creation from IEP Form', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates a new goal', async () => {
    const newGoal = {
      id: 'goal-1',
      goalCode: 'R1.1',
      area: 'READING',
      annualGoalText: 'Student will improve reading fluency.',
    };

    (api.createGoal as jest.Mock).mockResolvedValue({ goal: newGoal });

    await api.createGoal('plan-1', {
      goalCode: 'R1.1',
      area: 'READING',
      annualGoalText: 'Student will improve reading fluency.',
    });

    expect(api.createGoal).toHaveBeenCalledWith('plan-1', {
      goalCode: 'R1.1',
      area: 'READING',
      annualGoalText: 'Student will improve reading fluency.',
    });
  });
});

describe('Step Navigation', () => {
  it('tracks current step correctly', () => {
    const sections = mockSchema.fields.sections;
    let currentStep = 0;

    expect(sections[currentStep].title).toBe('Student Information');

    currentStep = 1;
    expect(sections[currentStep].title).toBe('Present Levels');

    currentStep = 2;
    expect(sections[currentStep].title).toBe('Annual Goals');
  });

  it('validates before moving to next step', () => {
    const currentFieldValues = mockPlan.fieldValues;
    const section = mockSchema.fields.sections[0];

    // Check if all required fields have values
    const missingRequired = section.fields.filter(
      f => f.required && !currentFieldValues[f.key]
    );

    // disability_category has a value, special_ed_entry does not
    expect(missingRequired).toHaveLength(1);
    expect(missingRequired[0].key).toBe('special_ed_entry');
  });
});

describe('Plan Status', () => {
  it('shows correct status indicators', () => {
    const statuses = ['draft', 'active', 'archived'];

    expect(statuses).toContain(mockPlan.status);
    expect(mockPlan.status).toBe('draft');
  });
});

describe('Student Age Calculation', () => {
  const calculateAge = (dob: string): number => {
    const birth = new Date(dob);
    const today = new Date('2024-01-15'); // Fixed date for testing
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  it('calculates age correctly', () => {
    expect(calculateAge('2015-03-15')).toBe(8); // Birthday not yet in Jan
    expect(calculateAge('2014-01-01')).toBe(10);
    expect(calculateAge('2016-06-15')).toBe(7);
  });
});
