const API_BASE = process.env.NEXT_PUBLIC_API_URL || '';

export interface User {
  id: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  role: 'TEACHER' | 'CASE_MANAGER' | 'ADMIN' | null;
  stateCode: string | null;
  districtName: string | null;
  schoolName: string | null;
  isOnboarded: boolean;
}

export interface StudentStatus {
  id: string;
  scope: 'OVERALL' | 'ACADEMIC' | 'BEHAVIOR' | 'SERVICES';
  code: 'ON_TRACK' | 'WATCH' | 'CONCERN' | 'URGENT';
  summary: string | null;
  effectiveDate: string;
  updatedBy?: { displayName: string };
}

export interface Student {
  id: string;
  recordId: string;
  externalId?: string | null;
  firstName: string;
  lastName: string;
  grade: string;
  schoolName: string;
  dateOfBirth?: string;
  overallStatus: StudentStatus | null;
  statuses: StudentStatus[];
  plans?: Array<{
    id: string;
    type: string;
    startDate: string;
    endDate: string | null;
    status: string;
  }>;
}

export interface State {
  stateCode: string;
  stateName: string;
  districts: Array<{ code: string; name: string }>;
}

// Phase 2 Types
export type GoalArea = 'READING' | 'WRITING' | 'MATH' | 'COMMUNICATION' | 'SOCIAL_EMOTIONAL' | 'BEHAVIOR' | 'MOTOR_SKILLS' | 'DAILY_LIVING' | 'VOCATIONAL' | 'OTHER';
export type ProgressLevel = 'NOT_ADDRESSED' | 'FULL_SUPPORT' | 'SOME_SUPPORT' | 'LOW_SUPPORT' | 'MET_TARGET';
export type WorkSampleRating = 'BELOW_TARGET' | 'NEAR_TARGET' | 'MEETS_TARGET' | 'ABOVE_TARGET';
export type ServiceType = 'SPECIAL_EDUCATION' | 'SPEECH_LANGUAGE' | 'OCCUPATIONAL_THERAPY' | 'PHYSICAL_THERAPY' | 'COUNSELING' | 'BEHAVIORAL_SUPPORT' | 'READING_SPECIALIST' | 'PARAPROFESSIONAL' | 'OTHER';
export type ServiceSetting = 'GENERAL_EDUCATION' | 'SPECIAL_EDUCATION' | 'RESOURCE_ROOM' | 'THERAPY_ROOM' | 'COMMUNITY' | 'HOME' | 'OTHER';

export interface PlanSchema {
  id: string;
  version: number;
  name: string;
  description: string | null;
  fields: {
    sections: Array<{
      key: string;
      title: string;
      order: number;
      isGoalsSection?: boolean;
      fields: Array<{
        key: string;
        type: string;
        label: string;
        required: boolean;
        placeholder?: string;
        options?: string[];
        description?: string;
      }>;
    }>;
  };
}

export interface Plan {
  id: string;
  status: string;
  startDate: string;
  endDate: string | null;
  createdAt: string;
  updatedAt: string;
  planType: { code: string; name: string };
  schema: PlanSchema;
  student: { id: string; firstName: string; lastName: string; dateOfBirth?: string; grade?: string };
  fieldValues: Record<string, unknown>;
  goals: Goal[];
  serviceLogs: ServiceLog[];
}

export interface Goal {
  id: string;
  goalCode: string;
  area: GoalArea;
  annualGoalText: string;
  baselineJson: Record<string, unknown>;
  shortTermObjectives?: string[];
  progressSchedule: string | null;
  targetDate: string | null;
  isActive: boolean;
  progressRecords: GoalProgress[];
  workSamples: WorkSample[];
}

export interface GoalProgress {
  id: string;
  date: string;
  quickSelect: ProgressLevel;
  measureJson?: Record<string, unknown>;
  comment: string | null;
  isDictated: boolean;
  recordedBy?: { displayName: string };
}

export interface WorkSample {
  id: string;
  fileUrl: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  rating: WorkSampleRating;
  comment: string | null;
  capturedAt: string;
  uploadedBy?: { displayName: string };
}

export interface ServiceLog {
  id: string;
  date: string;
  minutes: number;
  serviceType: ServiceType;
  setting: ServiceSetting;
  notes: string | null;
  provider?: { displayName: string };
}

export interface ServiceSummary {
  totalMinutes: number;
  weeklyMinutes: number;
  totalsByType: Record<string, number>;
  logCount: number;
}

// Prior Plan Types
export type PlanTypeCode = 'IEP' | 'FIVE_OH_FOUR' | 'BEHAVIOR_PLAN';
export type PriorPlanSource = 'UPLOADED' | 'SIS_IMPORT';

export interface PriorPlanDocument {
  id: string;
  planType: PlanTypeCode;
  planTypeName: string;
  fileName: string;
  planDate: string | null;
  notes: string | null;
  source: PriorPlanSource;
  uploadedBy: string;
  createdAt: string;
}

// Admin Types
export interface BestPracticeDocument {
  id: string;
  title: string;
  description: string | null;
  planType: PlanTypeCode;
  planTypeName: string;
  gradeBand: string | null;
  jurisdictionId: string | null;
  jurisdictionName: string | null;
  isActive: boolean;
  uploadedBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface FormTemplate {
  id: string;
  title: string;
  description: string | null;
  planType: PlanTypeCode;
  planTypeName: string;
  jurisdictionId: string | null;
  jurisdictionName: string | null;
  isDefault: boolean;
  uploadedBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface Jurisdiction {
  id: string;
  stateCode: string;
  stateName: string;
  districtCode: string;
  districtName: string;
}

class ApiClient {
  private async fetch<T>(url: string, options?: RequestInit): Promise<T> {
    const response = await fetch(`${API_BASE}${url}`, {
      ...options,
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Request failed' }));
      throw new Error(error.error || 'Request failed');
    }

    return response.json();
  }

  async login(username: string, password: string): Promise<{ user: User }> {
    return this.fetch('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
  }

  async getMe(): Promise<{ user: User }> {
    return this.fetch('/auth/me');
  }

  async logout(): Promise<void> {
    await this.fetch('/auth/logout', { method: 'POST' });
  }

  async updateProfile(data: {
    role: string;
    stateCode: string;
    districtName: string;
    schoolName: string;
  }): Promise<{ user: User }> {
    return this.fetch('/api/user/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async getJurisdictions(): Promise<{ states: State[] }> {
    return this.fetch('/api/user/jurisdictions');
  }

  async getStudents(): Promise<{ students: Student[] }> {
    return this.fetch('/api/students');
  }

  async getStudent(id: string): Promise<{ student: Student }> {
    return this.fetch(`/api/students/${id}`);
  }

  async getStudentStatus(id: string): Promise<{ current: StudentStatus[]; history: StudentStatus[] }> {
    return this.fetch(`/api/students/${id}/status`);
  }

  async createStudentStatus(
    studentId: string,
    data: {
      scope: string;
      code: string;
      summary?: string;
      effectiveDate: string;
    }
  ): Promise<{ status: StudentStatus }> {
    return this.fetch(`/api/students/${studentId}/status`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Phase 2: Schema API
  async getSchema(planTypeCode: string): Promise<{ schema: PlanSchema }> {
    return this.fetch(`/api/schemas/${planTypeCode}`);
  }

  // Phase 2: Plan API
  async getStudentPlans(studentId: string): Promise<{ plans: Array<{ id: string; status: string; startDate: string; endDate: string | null; planType: string; planTypeCode: string; schemaName: string; createdAt: string }> }> {
    return this.fetch(`/api/students/${studentId}/plans`);
  }

  async createPlan(studentId: string, planTypeCode: string): Promise<{ plan: Plan }> {
    return this.fetch(`/api/students/${studentId}/plans/${planTypeCode}`, {
      method: 'POST',
    });
  }

  async getPlan(planId: string): Promise<{ plan: Plan }> {
    return this.fetch(`/api/plans/${planId}`);
  }

  async updatePlanFields(planId: string, fields: Record<string, unknown>): Promise<{ success: boolean }> {
    return this.fetch(`/api/plans/${planId}/fields`, {
      method: 'PATCH',
      body: JSON.stringify({ fields }),
    });
  }

  async finalizePlan(planId: string): Promise<{ plan: { id: string; status: string } }> {
    return this.fetch(`/api/plans/${planId}/finalize`, {
      method: 'POST',
    });
  }

  // Phase 2: Goal API
  async getPlanGoals(planId: string): Promise<{ goals: Goal[] }> {
    return this.fetch(`/api/plans/${planId}/goals`);
  }

  async createGoal(planId: string, data: {
    goalCode: string;
    area: GoalArea;
    annualGoalText: string;
    baselineJson?: Record<string, unknown>;
    shortTermObjectives?: string[];
    progressSchedule?: string;
    targetDate?: string;
  }): Promise<{ goal: Goal }> {
    return this.fetch(`/api/plans/${planId}/goals`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getGoal(goalId: string): Promise<{ goal: Goal }> {
    return this.fetch(`/api/goals/${goalId}`);
  }

  async updateGoal(goalId: string, data: Partial<{
    area: GoalArea;
    annualGoalText: string;
    baselineJson: Record<string, unknown>;
    shortTermObjectives: string[];
    progressSchedule: string;
    targetDate: string;
  }>): Promise<{ goal: Goal }> {
    return this.fetch(`/api/goals/${goalId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  // Phase 2: Quick Progress (One-Tap)
  async createQuickProgress(goalId: string, data: {
    quickSelect: ProgressLevel;
    comment?: string;
    date?: string;
  }): Promise<{ progress: GoalProgress }> {
    return this.fetch(`/api/goals/${goalId}/progress/quick`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Phase 2: Dictation Progress
  async createDictationProgress(goalId: string, data: {
    quickSelect: ProgressLevel;
    comment: string;
    measureJson?: Record<string, unknown>;
    date?: string;
  }): Promise<{ progress: GoalProgress }> {
    return this.fetch(`/api/goals/${goalId}/progress/dictation`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getGoalProgress(goalId: string): Promise<{ progress: GoalProgress[] }> {
    return this.fetch(`/api/goals/${goalId}/progress`);
  }

  // Phase 2: Service Logs
  async getPlanServices(planId: string): Promise<{ serviceLogs: ServiceLog[]; summary: ServiceSummary }> {
    return this.fetch(`/api/plans/${planId}/services`);
  }

  async createServiceLog(planId: string, data: {
    date: string;
    minutes: number;
    serviceType: ServiceType;
    setting: ServiceSetting;
    notes?: string;
  }): Promise<{ serviceLog: ServiceLog }> {
    return this.fetch(`/api/plans/${planId}/services`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateServiceLog(serviceId: string, data: Partial<{
    date: string;
    minutes: number;
    serviceType: ServiceType;
    setting: ServiceSetting;
    notes: string;
  }>): Promise<{ serviceLog: ServiceLog }> {
    return this.fetch(`/api/services/${serviceId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deleteServiceLog(serviceId: string): Promise<{ success: boolean }> {
    return this.fetch(`/api/services/${serviceId}`, {
      method: 'DELETE',
    });
  }

  // Phase 2: Work Samples
  async getGoalWorkSamples(goalId: string): Promise<{ workSamples: WorkSample[] }> {
    return this.fetch(`/api/goals/${goalId}/work-samples`);
  }

  async uploadWorkSample(goalId: string, file: File, rating: WorkSampleRating, comment?: string): Promise<{ workSample: WorkSample }> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('rating', rating);
    if (comment) formData.append('comment', comment);

    const response = await fetch(`${API_BASE}/api/goals/${goalId}/work-samples`, {
      method: 'POST',
      credentials: 'include',
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Upload failed' }));
      throw new Error(error.error || 'Upload failed');
    }

    return response.json();
  }

  async updateWorkSample(sampleId: string, data: {
    rating?: WorkSampleRating;
    comment?: string;
  }): Promise<{ workSample: WorkSample }> {
    return this.fetch(`/api/goals/work-samples/${sampleId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deleteWorkSample(sampleId: string): Promise<{ success: boolean }> {
    return this.fetch(`/api/goals/work-samples/${sampleId}`, {
      method: 'DELETE',
    });
  }

  // Prior Plan Documents API
  async getStudentPriorPlans(studentId: string): Promise<{ priorPlans: PriorPlanDocument[] }> {
    return this.fetch(`/api/students/${studentId}/prior-plans`);
  }

  async uploadPriorPlan(
    studentId: string,
    file: File,
    planType: PlanTypeCode,
    planDate?: string,
    notes?: string
  ): Promise<{ priorPlan: PriorPlanDocument }> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('planType', planType);
    if (planDate) formData.append('planDate', planDate);
    if (notes) formData.append('notes', notes);

    const response = await fetch(`${API_BASE}/api/students/${studentId}/prior-plans`, {
      method: 'POST',
      credentials: 'include',
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Upload failed' }));
      throw new Error(error.error || 'Upload failed');
    }

    return response.json();
  }

  getPriorPlanDownloadUrl(priorPlanId: string): string {
    return `${API_BASE}/api/prior-plans/${priorPlanId}/download`;
  }

  async deletePriorPlan(priorPlanId: string): Promise<{ success: boolean }> {
    return this.fetch(`/api/prior-plans/${priorPlanId}`, {
      method: 'DELETE',
    });
  }

  // Admin: Best Practice Documents
  async getBestPracticeDocs(): Promise<{ documents: BestPracticeDocument[] }> {
    return this.fetch('/api/admin/best-practice-docs');
  }

  async uploadBestPracticeDoc(
    file: File,
    data: {
      title: string;
      description?: string;
      planType: PlanTypeCode;
      gradeBand?: string;
      jurisdictionId?: string;
    }
  ): Promise<{ document: BestPracticeDocument }> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('title', data.title);
    formData.append('planType', data.planType);
    if (data.description) formData.append('description', data.description);
    if (data.gradeBand) formData.append('gradeBand', data.gradeBand);
    if (data.jurisdictionId) formData.append('jurisdictionId', data.jurisdictionId);

    const response = await fetch(`${API_BASE}/api/admin/best-practice-docs`, {
      method: 'POST',
      credentials: 'include',
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Upload failed' }));
      throw new Error(error.error || 'Upload failed');
    }

    return response.json();
  }

  async updateBestPracticeDoc(
    docId: string,
    data: { title?: string; description?: string | null; isActive?: boolean }
  ): Promise<{ document: BestPracticeDocument }> {
    return this.fetch(`/api/admin/best-practice-docs/${docId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  getBestPracticeDocDownloadUrl(docId: string): string {
    return `${API_BASE}/api/admin/best-practice-docs/${docId}/download`;
  }

  // Admin: Form Templates
  async getFormTemplates(): Promise<{ templates: FormTemplate[] }> {
    return this.fetch('/api/admin/form-templates');
  }

  async uploadFormTemplate(
    file: File,
    data: {
      title: string;
      description?: string;
      planType: PlanTypeCode;
      jurisdictionId?: string;
      isDefault?: boolean;
    }
  ): Promise<{ template: FormTemplate }> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('title', data.title);
    formData.append('planType', data.planType);
    if (data.description) formData.append('description', data.description);
    if (data.jurisdictionId) formData.append('jurisdictionId', data.jurisdictionId);
    if (data.isDefault !== undefined) formData.append('isDefault', String(data.isDefault));

    const response = await fetch(`${API_BASE}/api/admin/form-templates`, {
      method: 'POST',
      credentials: 'include',
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Upload failed' }));
      throw new Error(error.error || 'Upload failed');
    }

    return response.json();
  }

  async updateFormTemplate(
    templateId: string,
    data: { title?: string; description?: string | null; isDefault?: boolean }
  ): Promise<{ template: FormTemplate }> {
    return this.fetch(`/api/admin/form-templates/${templateId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  getFormTemplateDownloadUrl(templateId: string): string {
    return `${API_BASE}/api/admin/form-templates/${templateId}/download`;
  }

  // Admin: Jurisdictions
  async getAdminJurisdictions(): Promise<{ jurisdictions: Jurisdiction[] }> {
    return this.fetch('/api/admin/jurisdictions');
  }
}

export const api = new ApiClient();
