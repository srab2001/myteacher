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
  mustChangePassword?: boolean;
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

// Phase 3 Behavior Types
export type BehaviorMeasurementType = 'FREQUENCY' | 'DURATION' | 'INTERVAL' | 'RATING';

export interface BehaviorTarget {
  id: string;
  code: string;
  name: string;
  definition: string;
  examples: string | null;
  nonExamples: string | null;
  measurementType: BehaviorMeasurementType;
  isActive: boolean;
  events: BehaviorEvent[];
}

export interface BehaviorEvent {
  id: string;
  eventDate: string;
  startTime: string | null;
  endTime: string | null;
  count: number | null;
  rating: number | null;
  durationSeconds: number | null;
  contextJson: Record<string, unknown> | null;
  createdAt: string;
  recordedBy?: { displayName: string };
}

export interface BehaviorPlan {
  id: string;
  summary: string | null;
  planInstance: Plan;
  targets: BehaviorTarget[];
}

export interface BehaviorEventSummary {
  totalEvents: number;
  totalCount: number;
  totalDurationSeconds: number;
  averageRating: number;
  averageCount?: number;
  averageDurationSeconds?: number;
}

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
export type IngestionStatus = 'PENDING' | 'PROCESSING' | 'COMPLETE' | 'ERROR';

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
  ingestionStatus: IngestionStatus;
  ingestionMessage: string | null;
  ingestionAt: string | null;
  chunkCount: number;
  uploadedBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface ChunkStats {
  totalChunks: number;
  bySection: Record<string, number>;
}

export interface GeneratedDraft {
  text: string;
  sectionTag: string;
  sourceCount: number;
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

// Phase 4: Status Summary Types
export interface StudentStatusSummary {
  studentId: string;
  recordId: string;
  firstName: string;
  lastName: string;
  gradeLevel: string;
  overallStatus: {
    code: 'ON_TRACK' | 'WATCH' | 'CONCERN' | 'URGENT';
    summary: string | null;
    effectiveDate: string;
  } | null;
  hasActiveIEP: boolean;
  hasActive504: boolean;
  hasActiveBehaviorPlan: boolean;
  activePlanDates: {
    iepStart: string | null;
    iepEnd: string | null;
    sec504Start: string | null;
    sec504End: string | null;
    behaviorStart: string | null;
  };
}

// Phase 4: IEP Progress Report Types
export interface GoalProgressReport {
  goalId: string;
  goalCode: string;
  area: GoalArea;
  annualGoalText: string;
  baselineValue: number | null;
  targetValue: number | null;
  targetDate: string | null;
  progressSummary: {
    totalRecords: number;
    latestValue: number | null;
    latestDate: string | null;
    firstValue: number | null;
    trend: 'improving' | 'stable' | 'declining' | 'insufficient_data';
    isOnTrack: boolean | null;
  };
  recentProgress: Array<{
    id: string;
    date: string;
    percentCorrect: number | null;
    trials: number | null;
    notes: string | null;
  }>;
}

export interface IEPProgressReport {
  studentId: string;
  studentName: string;
  planId: string;
  planStatus: string;
  planStartDate: string;
  planEndDate: string | null;
  totalGoals: number;
  goals: GoalProgressReport[];
}

// Phase 4: Service Minutes Report Types
export interface ServiceMinutesReport {
  studentId: string;
  studentName: string;
  planId: string;
  dateRange: {
    from: string;
    to: string;
  };
  summary: {
    totalMinutes: number;
    totalSessions: number;
    averageMinutesPerSession: number;
  };
  services: Array<{
    serviceType: string;
    totalMinutes: number;
    sessionCount: number;
    logs: Array<{
      id: string;
      date: string;
      minutes: number;
      notes: string | null;
      provider: string | null;
    }>;
  }>;
}

// Phase 5: Admin User Management Types
export type AdminUserRole = 'TEACHER' | 'CASE_MANAGER' | 'ADMIN';

export interface AdminPermissions {
  canCreatePlans: boolean;
  canUpdatePlans: boolean;
  canReadAll: boolean;
  canManageUsers: boolean;
  canManageDocs: boolean;
}

export interface AdminUser {
  id: string;
  email: string;
  displayName: string;
  role: AdminUserRole;
  isActive: boolean;
  jurisdictionId: string | null;
  jurisdictionName: string | null;
  permissions: AdminPermissions | null;
  studentAccessCount?: number;
  createdAt: string;
  lastLoginAt: string | null;
}

export interface AdminUserDetail extends AdminUser {
  studentAccess: StudentAccessEntry[];
}

export interface StudentAccessEntry {
  id: string;
  studentId: string;
  recordId: string;
  firstName?: string;
  lastName?: string;
  studentName: string;
  grade: string;
  schoolName?: string;
  isActive?: boolean;
  canEdit: boolean;
  grantedAt: string;
}

export interface StudentAccessResponse {
  canReadAll: boolean;
  studentAccess: StudentAccessEntry[];
  message?: string;
}

// Phase 4: Admin Schema Types
export interface AdminSchema {
  id: string;
  name: string;
  description: string | null;
  version: number;
  planType: PlanTypeCode;
  planTypeName: string;
  jurisdictionId: string | null;
  jurisdictionName: string;
  isActive: boolean;
  planCount: number;
  fields?: PlanSchema['fields'];
  createdAt: string;
  updatedAt: string;
}

export interface SchemaPlanInstance {
  id: string;
  status: string;
  startDate: string;
  endDate: string | null;
  studentId: string;
  studentName: string;
  studentGrade: string;
  planType: PlanTypeCode;
  planTypeName: string;
  createdAt: string;
  updatedAt: string;
}

// Schema Field Configuration Types
export interface SchemaFieldConfig {
  key: string;
  label: string;
  type: string;
  schemaRequired: boolean;
  effectiveRequired: boolean;
  hasOverride: boolean;
}

export interface SchemaSectionConfig {
  key: string;
  title: string;
  order?: number;
  fields: SchemaFieldConfig[];
}

export interface SchemaFieldsResponse {
  id: string;
  planTypeCode: PlanTypeCode;
  sections: SchemaSectionConfig[];
}

export interface FieldConfigUpdate {
  sectionKey: string;
  fieldKey: string;
  isRequired: boolean;
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

  async changePassword(currentPassword: string, newPassword: string, confirmPassword: string): Promise<{ success: boolean; message: string }> {
    return this.fetch('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword, confirmPassword }),
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
    draftStatus?: 'DRAFT' | 'FINAL' | 'WIZARD_DRAFT' | 'FINALIZED';
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

  async reingestBestPracticeDoc(docId: string): Promise<{ success: boolean; message: string }> {
    return this.fetch(`/api/admin/best-practice-docs/${docId}/reingest`, {
      method: 'POST',
    });
  }

  async getBestPracticeDocChunks(docId: string): Promise<ChunkStats> {
    return this.fetch(`/api/admin/best-practice-docs/${docId}/chunks`);
  }

  // Content Generation
  async generateDraft(
    planId: string,
    sectionKey: string,
    fieldKey: string,
    userPrompt?: string
  ): Promise<GeneratedDraft> {
    return this.fetch(`/api/plans/${planId}/generate-draft`, {
      method: 'POST',
      body: JSON.stringify({ sectionKey, fieldKey, userPrompt }),
    });
  }

  async getGenerationAvailability(planId: string): Promise<{
    available: boolean;
    sections: string[];
    planTypeCode: string;
  }> {
    return this.fetch(`/api/plans/${planId}/generation-availability`);
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

  // Phase 3: Behavior Plan API
  async getBehaviorPlan(planId: string): Promise<{ behaviorPlan: BehaviorPlan }> {
    return this.fetch(`/api/behavior-plans/plans/${planId}`);
  }

  async getBehaviorTargets(planId: string): Promise<{ targets: BehaviorTarget[] }> {
    return this.fetch(`/api/behavior-plans/plans/${planId}/targets`);
  }

  async createBehaviorTarget(planId: string, data: {
    code: string;
    name: string;
    definition: string;
    examples?: string;
    nonExamples?: string;
    measurementType: BehaviorMeasurementType;
  }): Promise<{ target: BehaviorTarget }> {
    return this.fetch(`/api/behavior-plans/plans/${planId}/targets`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateBehaviorTarget(targetId: string, data: Partial<{
    name: string;
    definition: string;
    examples: string;
    nonExamples: string;
    measurementType: BehaviorMeasurementType;
    isActive: boolean;
  }>): Promise<{ target: BehaviorTarget }> {
    return this.fetch(`/api/behavior-targets/targets/${targetId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deleteBehaviorTarget(targetId: string): Promise<{ success: boolean }> {
    return this.fetch(`/api/behavior-targets/targets/${targetId}`, {
      method: 'DELETE',
    });
  }

  async getBehaviorEvents(targetId: string, from?: string, to?: string): Promise<{
    events: BehaviorEvent[];
    summary: BehaviorEventSummary;
    measurementType: BehaviorMeasurementType;
  }> {
    const params = new URLSearchParams();
    if (from) params.append('from', from);
    if (to) params.append('to', to);
    const queryString = params.toString();
    return this.fetch(`/api/behavior-targets/targets/${targetId}/events${queryString ? `?${queryString}` : ''}`);
  }

  async createBehaviorEvent(targetId: string, data: {
    eventDate: string;
    startTime?: string;
    endTime?: string;
    count?: number;
    rating?: number;
    durationSeconds?: number;
    contextJson?: Record<string, unknown>;
  }): Promise<{ event: BehaviorEvent }> {
    return this.fetch(`/api/behavior-targets/targets/${targetId}/events`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async deleteBehaviorEvent(eventId: string): Promise<{ success: boolean }> {
    return this.fetch(`/api/behavior-events/events/${eventId}`, {
      method: 'DELETE',
    });
  }

  // Phase 4: Status Summary API
  async getStudentStatusSummary(): Promise<{ students: StudentStatusSummary[] }> {
    return this.fetch('/api/students/status-summary');
  }

  // Phase 4: Reports API
  async getIEPProgressReport(studentId: string, from?: string, to?: string): Promise<IEPProgressReport> {
    const params = new URLSearchParams();
    if (from) params.append('from', from);
    if (to) params.append('to', to);
    const queryString = params.toString();
    return this.fetch(`/api/students/${studentId}/iep-progress${queryString ? `?${queryString}` : ''}`);
  }

  async getServiceMinutesReport(studentId: string, from?: string, to?: string): Promise<ServiceMinutesReport> {
    const params = new URLSearchParams();
    if (from) params.append('from', from);
    if (to) params.append('to', to);
    const queryString = params.toString();
    return this.fetch(`/api/students/${studentId}/service-minutes${queryString ? `?${queryString}` : ''}`);
  }

  // Phase 4: Admin Schema API
  async getAdminSchemas(filters?: {
    planType?: PlanTypeCode;
    jurisdictionId?: string;
    activeOnly?: boolean;
  }): Promise<{ schemas: AdminSchema[] }> {
    const params = new URLSearchParams();
    if (filters?.planType) params.append('planType', filters.planType);
    if (filters?.jurisdictionId) params.append('jurisdictionId', filters.jurisdictionId);
    if (filters?.activeOnly !== undefined) params.append('activeOnly', String(filters.activeOnly));
    const queryString = params.toString();
    return this.fetch(`/api/admin/schemas${queryString ? `?${queryString}` : ''}`);
  }

  async getAdminSchema(schemaId: string): Promise<{ schema: AdminSchema }> {
    return this.fetch(`/api/admin/schemas/${schemaId}`);
  }

  async getSchemaPlans(schemaId: string, page?: number, limit?: number): Promise<{
    plans: SchemaPlanInstance[];
    total: number;
    page: number;
    limit: number;
  }> {
    const params = new URLSearchParams();
    if (page !== undefined) params.append('page', String(page));
    if (limit !== undefined) params.append('limit', String(limit));
    const queryString = params.toString();
    return this.fetch(`/api/admin/schemas/${schemaId}/plans${queryString ? `?${queryString}` : ''}`);
  }

  async getSchemaFields(schemaId: string): Promise<SchemaFieldsResponse> {
    return this.fetch(`/api/admin/schemas/${schemaId}/fields`);
  }

  async updateSchemaFields(schemaId: string, updates: FieldConfigUpdate[]): Promise<{ success: boolean; message: string }> {
    return this.fetch(`/api/admin/schemas/${schemaId}/fields`, {
      method: 'PATCH',
      body: JSON.stringify({ updates }),
    });
  }

  async addSchemaField(schemaId: string, field: {
    sectionKey: string;
    fieldKey: string;
    label: string;
    type: string;
    required: boolean;
    options?: string[];
  }): Promise<{ success: boolean; message: string }> {
    return this.fetch(`/api/admin/schemas/${schemaId}/fields`, {
      method: 'POST',
      body: JSON.stringify(field),
    });
  }

  // PDF Export URLs
  getIepPdfUrl(studentId: string, planId: string): string {
    return `${API_BASE}/api/plans/students/${studentId}/plans/${planId}/iep-pdf`;
  }

  get504PdfUrl(studentId: string, planId: string): string {
    return `${API_BASE}/api/plans/students/${studentId}/plans/${planId}/504-pdf`;
  }

  // Phase 5: Admin User Management API
  async getAdminUsers(filters?: {
    role?: AdminUserRole;
    search?: string;
  }): Promise<{ users: AdminUser[] }> {
    const params = new URLSearchParams();
    if (filters?.role) params.append('role', filters.role);
    if (filters?.search) params.append('search', filters.search);
    const queryString = params.toString();
    return this.fetch(`/api/admin/users${queryString ? `?${queryString}` : ''}`);
  }

  async getAdminUser(userId: string): Promise<{ user: AdminUserDetail }> {
    return this.fetch(`/api/admin/users/${userId}`);
  }

  async createAdminUser(data: {
    email: string;
    displayName: string;
    role: AdminUserRole;
    jurisdictionId?: string | null;
    permissions?: Partial<AdminPermissions>;
  }): Promise<{ user: AdminUser }> {
    return this.fetch('/api/admin/users', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateAdminUser(userId: string, data: {
    displayName?: string;
    role?: AdminUserRole;
    isActive?: boolean;
    jurisdictionId?: string | null;
  }): Promise<{ user: AdminUser }> {
    return this.fetch(`/api/admin/users/${userId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async updateAdminUserPermissions(userId: string, permissions: Partial<AdminPermissions>): Promise<{ permissions: AdminPermissions }> {
    return this.fetch(`/api/admin/users/${userId}/permissions`, {
      method: 'PATCH',
      body: JSON.stringify(permissions),
    });
  }

  // Phase 5: Student Access Management API
  async getUserStudentAccess(userId: string): Promise<StudentAccessResponse> {
    return this.fetch(`/api/admin/users/${userId}/students`);
  }

  async addStudentAccess(userId: string, recordId: string, canEdit?: boolean): Promise<{ studentAccess: StudentAccessEntry }> {
    return this.fetch(`/api/admin/users/${userId}/students`, {
      method: 'POST',
      body: JSON.stringify({ recordId, canEdit: canEdit ?? false }),
    });
  }

  async updateStudentAccess(userId: string, accessId: string, canEdit: boolean): Promise<{ studentAccess: StudentAccessEntry }> {
    return this.fetch(`/api/admin/users/${userId}/students/${accessId}`, {
      method: 'PATCH',
      body: JSON.stringify({ canEdit }),
    });
  }

  async removeStudentAccess(userId: string, accessId: string): Promise<{ success: boolean; message: string }> {
    return this.fetch(`/api/admin/users/${userId}/students/${accessId}`, {
      method: 'DELETE',
    });
  }

  // Admin Student Management
  async getAdminStudents(params?: { search?: string; limit?: number; offset?: number }): Promise<{
    students: AdminStudent[];
    total: number;
    limit: number;
    offset: number;
  }> {
    const queryString = new URLSearchParams();
    if (params?.search) queryString.set('search', params.search);
    if (params?.limit) queryString.set('limit', params.limit.toString());
    if (params?.offset) queryString.set('offset', params.offset.toString());
    return this.fetch(`/api/admin/students${queryString.toString() ? `?${queryString}` : ''}`);
  }

  async createStudent(data: {
    firstName: string;
    lastName: string;
    dateOfBirth?: string;
    grade?: string;
    schoolId?: string;
    schoolName?: string;
    districtName?: string;
  }): Promise<{ student: AdminStudent }> {
    return this.fetch('/api/admin/students', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Reference Data API (States, Districts, Schools)
  async getReferenceStates(): Promise<ReferenceState[]> {
    return this.fetch('/api/reference/states');
  }

  async getReferenceDistricts(stateId: string): Promise<ReferenceDistrict[]> {
    return this.fetch(`/api/reference/states/${stateId}/districts`);
  }

  async getReferenceSchools(districtId: string): Promise<ReferenceSchool[]> {
    return this.fetch(`/api/reference/districts/${districtId}/schools`);
  }

  // ============================================
  // Artifact Compare API
  // ============================================

  async getArtifactComparisons(planId: string): Promise<{ comparisons: ArtifactComparison[] }> {
    return this.fetch(`/api/plans/${planId}/artifact-compare`);
  }

  async getArtifactComparison(planId: string, comparisonId: string): Promise<ArtifactComparison> {
    return this.fetch(`/api/plans/${planId}/artifact-compare/${comparisonId}`);
  }

  async createArtifactComparison(
    planId: string,
    data: {
      artifactDate: string;
      description?: string;
      baselineFile: File;
      compareFile: File;
    }
  ): Promise<ArtifactComparison> {
    const formData = new FormData();
    formData.append('artifactDate', data.artifactDate);
    if (data.description) {
      formData.append('description', data.description);
    }
    formData.append('baselineFile', data.baselineFile);
    formData.append('compareFile', data.compareFile);

    const response = await fetch(`${API_BASE}/api/plans/${planId}/artifact-compare`, {
      method: 'POST',
      credentials: 'include',
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Request failed with status ${response.status}`);
    }

    return response.json();
  }

  async runArtifactComparison(planId: string, comparisonId: string, force?: boolean): Promise<ArtifactComparison> {
    return this.fetch(`/api/plans/${planId}/artifact-compare/${comparisonId}/compare`, {
      method: 'POST',
      body: JSON.stringify({ force: force ?? false }),
    });
  }

  async deleteArtifactComparison(planId: string, comparisonId: string): Promise<{ success: boolean }> {
    return this.fetch(`/api/plans/${planId}/artifact-compare/${comparisonId}`, {
      method: 'DELETE',
    });
  }

  // Student-level artifact compares
  async getStudentArtifactCompares(studentId: string): Promise<{ comparisons: ArtifactComparison[] }> {
    return this.fetch(`/api/artifact-compare/students/${studentId}/artifact-compares`);
  }

  async getPlanArtifactCompares(planId: string): Promise<{ comparisons: ArtifactComparison[] }> {
    return this.fetch(`/api/artifact-compare/plans/${planId}/artifact-compare`);
  }

  async alignArtifactCompare(studentId: string, comparisonId: string, planId: string): Promise<ArtifactComparison> {
    return this.fetch(`/api/artifact-compare/students/${studentId}/artifact-compares/${comparisonId}/align`, {
      method: 'PATCH',
      body: JSON.stringify({ planId }),
    });
  }

  // ============================================
  // Goal Wizard API
  // ============================================

  // Present Levels
  async getPresentLevelsHelpers(studentId: string, goalArea?: string): Promise<PresentLevelsHelpers> {
    const params = new URLSearchParams();
    if (goalArea) params.append('goalArea', goalArea);
    const queryString = params.toString();
    return this.fetch(`/api/students/${studentId}/present-levels/helpers${queryString ? `?${queryString}` : ''}`);
  }

  async generatePresentLevels(studentId: string, goalArea?: string, planId?: string): Promise<PresentLevelData> {
    return this.fetch(`/api/students/${studentId}/present-levels/generate`, {
      method: 'POST',
      body: JSON.stringify({ goalArea, planId }),
    });
  }

  async getGoalContext(studentId: string, goalArea?: string): Promise<{
    student: { id: string; firstName: string; lastName: string; grade: string };
    recentStatuses: Array<{ scope: string; code: string; summary: string | null; effectiveDate: string }>;
    artifactComparisons: Array<{ id: string; artifactDate: string; description: string | null; analysisText: string | null }>;
    existingGoals: Array<{ id: string; area: string; annualGoalText: string }>;
  }> {
    const params = new URLSearchParams();
    if (goalArea) params.append('goalArea', goalArea);
    const queryString = params.toString();
    return this.fetch(`/api/students/${studentId}/goal-context${queryString ? `?${queryString}` : ''}`);
  }

  // Goal Templates
  async getGoalTemplates(area?: string, gradeBand?: string): Promise<{ templates: Record<string, GoalTemplate[]> | GoalTemplate[] }> {
    const params = new URLSearchParams();
    if (area) params.append('area', area);
    if (gradeBand) params.append('gradeBand', gradeBand);
    const queryString = params.toString();
    return this.fetch(`/api/goal-templates${queryString ? `?${queryString}` : ''}`);
  }

  // Goal Draft Generation
  async generateGoalDraft(data: {
    planId: string;
    goalArea: string;
    userPrompt?: string;
    templateId?: string;
    linkedArtifactIds?: string[];
    presentLevels?: {
      currentPerformance: string;
      strengthsNoted: string[];
      challengesNoted: string[];
      recentProgress: string;
      dataSourceSummary: string;
    };
  }): Promise<{ draft: GoalDraft }> {
    return this.fetch('/api/goal-wizard/draft', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Wizard Sessions
  async startWizardSession(
    planId: string,
    goalArea: string,
    linkedArtifactIds?: string[],
    presentLevels?: PresentLevelData
  ): Promise<{ sessionId: string; message: string }> {
    return this.fetch('/api/goal-wizard/session/start', {
      method: 'POST',
      body: JSON.stringify({ planId, goalArea, linkedArtifactIds, presentLevels }),
    });
  }


  async sendWizardMessage(sessionId: string, message: string): Promise<{ response: string; currentDraft: GoalDraft | null }> {
    return this.fetch(`/api/goal-wizard/session/${sessionId}/chat`, {
      method: 'POST',
      body: JSON.stringify({ message }),
    });
  }

  async getWizardSession(sessionId: string): Promise<{ goalArea: string; currentDraft: GoalDraft | null; messageCount: number }> {
    return this.fetch(`/api/goal-wizard/session/${sessionId}`);
  }

  async saveWizardDraft(sessionId: string): Promise<{ goalId: string; message: string }> {
    return this.fetch(`/api/goal-wizard/session/${sessionId}/save`, {
      method: 'POST',
    });
  }

  // Goal Validation
  async quickValidateGoal(goalText: string): Promise<QuickValidationResult> {
    return this.fetch('/api/goal-wizard/validate/quick', {
      method: 'POST',
      body: JSON.stringify({ goalText }),
    });
  }

  async validateGoal(data: {
    annualGoalText: string;
    area: string;
    objectives?: Array<{ objectiveText: string; measurementCriteria?: string }>;
    baselineDescription?: string;
    studentGrade?: string;
  }): Promise<ValidationResult> {
    return this.fetch('/api/goal-wizard/validate', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async validateGoalWithAI(data: {
    annualGoalText: string;
    area: string;
    objectives?: Array<{ objectiveText: string; measurementCriteria?: string }>;
    baselineDescription?: string;
    studentGrade?: string;
  }): Promise<ValidationResult> {
    return this.fetch('/api/goal-wizard/validate/ai', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async improveGoal(data: {
    annualGoalText: string;
    area: string;
    baselineDescription?: string;
    studentGrade?: string;
  }): Promise<{ improvedGoal: string; explanation: string }> {
    return this.fetch('/api/goal-wizard/improve', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Goal Artifact Links
  async linkArtifactToGoal(goalId: string, artifactComparisonId: string, relevanceNote?: string): Promise<{ link: GoalArtifactLink }> {
    return this.fetch(`/api/goals/${goalId}/artifacts`, {
      method: 'POST',
      body: JSON.stringify({ artifactComparisonId, relevanceNote }),
    });
  }

  async getGoalArtifacts(goalId: string): Promise<{ artifacts: GoalArtifactLink[] }> {
    return this.fetch(`/api/goals/${goalId}/artifacts`);
  }

  async unlinkArtifactFromGoal(goalId: string, linkId: string): Promise<{ message: string }> {
    return this.fetch(`/api/goals/${goalId}/artifacts/${linkId}`, {
      method: 'DELETE',
    });
  }

  // Goal Objectives
  async getGoalObjectives(goalId: string): Promise<{ objectives: GoalObjective[] }> {
    return this.fetch(`/api/goals/${goalId}/objectives`);
  }

  async addGoalObjective(goalId: string, data: {
    objectiveText: string;
    measurementCriteria?: string;
    targetDate?: string;
    draftStatus?: 'DRAFT' | 'FINAL' | 'WIZARD_DRAFT' | 'FINALIZED';
  }): Promise<{ objective: GoalObjective }> {
    return this.fetch(`/api/goals/${goalId}/objectives`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateGoalObjective(goalId: string, objectiveId: string, data: {
    objectiveText?: string;
    measurementCriteria?: string;
    targetDate?: string;
    draftStatus?: 'DRAFT' | 'FINAL' | 'WIZARD_DRAFT' | 'FINALIZED';
  }): Promise<{ objective: GoalObjective }> {
    return this.fetch(`/api/goals/${goalId}/objectives/${objectiveId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async completeGoalObjective(goalId: string, objectiveId: string): Promise<{ objective: GoalObjective }> {
    return this.fetch(`/api/goals/${goalId}/objectives/${objectiveId}/complete`, {
      method: 'POST',
    });
  }

  async finalizeGoal(goalId: string): Promise<{ message: string }> {
    return this.fetch(`/api/goals/${goalId}/finalize`, {
      method: 'POST',
    });
  }

  // ============================================
  // IEP Independent Assessment Review (IEP Reports)
  // Based on Howard County "Review of Independent Assessment" form
  // ============================================

  async getIEPReports(studentId: string): Promise<{ reviews: IEPIndependentAssessmentReview[] }> {
    return this.fetch(`/api/students/${studentId}/iep-reports`);
  }

  async getIEPReport(reportId: string): Promise<{ review: IEPIndependentAssessmentReview }> {
    return this.fetch(`/api/iep-reports/${reportId}`);
  }

  async createIEPReport(studentId: string, data: CreateIEPReportData): Promise<{ review: IEPIndependentAssessmentReview; message: string }> {
    return this.fetch(`/api/students/${studentId}/iep-reports`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateIEPReport(reportId: string, data: Partial<CreateIEPReportData>): Promise<{ review: IEPIndependentAssessmentReview; message: string }> {
    return this.fetch(`/api/iep-reports/${reportId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteIEPReport(reportId: string): Promise<{ message: string }> {
    return this.fetch(`/api/iep-reports/${reportId}`, {
      method: 'DELETE',
    });
  }

  // ============================================
  // Form Field Definitions API
  // ============================================

  async getFormFieldDefinitions(formType: 'IEP' | 'IEP_REPORT' | 'FIVE_OH_FOUR' = 'IEP'): Promise<FormFieldsResponse> {
    return this.fetch(`/api/forms/fields?formType=${formType}`);
  }

  async getSchools(): Promise<{ schools: School[] }> {
    return this.fetch('/api/schools');
  }

  async saveFormFieldValues(data: {
    planId?: string;
    studentId?: string;
    formType: 'IEP' | 'IEP_REPORT' | 'FIVE_OH_FOUR';
    values: Array<{ fieldKey: string; value: unknown }>;
  }): Promise<{ saved: number; errors?: Array<{ fieldKey: string; message: string }> }> {
    return this.fetch('/api/forms/values', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getFormFieldValues(params: {
    planId?: string;
    studentId?: string;
  }): Promise<{ values: Array<{ fieldKey: string; value: unknown }> }> {
    const queryParams = new URLSearchParams();
    if (params.planId) queryParams.append('planId', params.planId);
    if (params.studentId) queryParams.append('studentId', params.studentId);
    return this.fetch(`/api/forms/values?${queryParams.toString()}`);
  }

  async validateRequiredFields(data: {
    planId?: string;
    studentId?: string;
    formType: 'IEP' | 'IEP_REPORT' | 'FIVE_OH_FOUR';
  }): Promise<RequiredFieldValidation> {
    return this.fetch('/api/forms/validate-required', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Admin: Form Field Management
  async createFormField(data: CreateFieldData): Promise<{ field: FormFieldDefinition }> {
    return this.fetch('/api/admin/forms/fields', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateFormField(fieldId: string, data: UpdateFieldData): Promise<{ field: FormFieldDefinition }> {
    return this.fetch(`/api/admin/forms/fields/${fieldId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deleteFormField(fieldId: string): Promise<{ message: string }> {
    return this.fetch(`/api/admin/forms/fields/${fieldId}`, {
      method: 'DELETE',
    });
  }

  async createFieldOption(fieldId: string, data: { value: string; label: string; sortOrder?: number }): Promise<{ option: FormFieldOption }> {
    return this.fetch(`/api/admin/forms/fields/${fieldId}/options`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateFieldOption(optionId: string, data: { value?: string; label?: string; sortOrder?: number; isActive?: boolean }): Promise<{ option: FormFieldOption }> {
    return this.fetch(`/api/admin/forms/options/${optionId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deleteFieldOption(optionId: string): Promise<{ message: string }> {
    return this.fetch(`/api/admin/forms/options/${optionId}`, {
      method: 'DELETE',
    });
  }

  // Admin: School Management
  async getAdminSchoolsList(): Promise<{ schools: School[] }> {
    return this.fetch('/api/admin/schools');
  }

  async createSchool(data: { name: string; code?: string; stateCode?: string; districtId?: string; address?: string }): Promise<{ school: School }> {
    return this.fetch('/api/admin/schools', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateSchool(schoolId: string, data: { name?: string; code?: string; stateCode?: string; isActive?: boolean }): Promise<{ school: School }> {
    return this.fetch(`/api/admin/schools/${schoolId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deleteSchool(schoolId: string): Promise<{ message: string }> {
    return this.fetch(`/api/admin/schools/${schoolId}`, {
      method: 'DELETE',
    });
  }

  // ============================================
  // Admin Rule Packs API
  // ============================================

  async getAdminRulePacks(filters?: {
    scopeType?: string;
    scopeId?: string;
    planType?: string;
    isActive?: boolean;
  }): Promise<{ rulePacks: RulePack[] }> {
    const params = new URLSearchParams();
    if (filters?.scopeType) params.append('scopeType', filters.scopeType);
    if (filters?.scopeId) params.append('scopeId', filters.scopeId);
    if (filters?.planType) params.append('planType', filters.planType);
    if (filters?.isActive !== undefined) params.append('isActive', String(filters.isActive));
    const queryString = params.toString();
    return this.fetch(`/api/admin/rule-packs${queryString ? `?${queryString}` : ''}`);
  }

  async getAdminRulePack(id: string): Promise<{ rulePack: RulePack }> {
    return this.fetch(`/api/admin/rule-packs/${id}`);
  }

  async createAdminRulePack(data: {
    scopeType: string;
    scopeId: string;
    planType: string;
    name: string;
    effectiveFrom: string;
    effectiveTo?: string | null;
    isActive?: boolean;
  }): Promise<{ rulePack: RulePack }> {
    return this.fetch('/api/admin/rule-packs', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateAdminRulePack(id: string, data: {
    name?: string;
    isActive?: boolean;
    effectiveFrom?: string;
    effectiveTo?: string | null;
  }): Promise<{ rulePack: RulePack }> {
    return this.fetch(`/api/admin/rule-packs/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deleteAdminRulePack(id: string): Promise<void> {
    await this.fetch(`/api/admin/rule-packs/${id}`, {
      method: 'DELETE',
    });
  }

  async updateAdminRulePackRules(id: string, rules: BulkRuleUpdate[]): Promise<{ rulePack: RulePack }> {
    return this.fetch(`/api/admin/rule-packs/${id}/rules`, {
      method: 'PUT',
      body: JSON.stringify({ rules }),
    });
  }

  async updateAdminRulePackEvidence(id: string, data: BulkEvidenceUpdate): Promise<{ rule: RulePackRule }> {
    return this.fetch(`/api/admin/rule-packs/${id}/evidence`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async getAdminRuleDefinitions(): Promise<{ definitions: RuleDefinition[] }> {
    return this.fetch('/api/admin/rule-packs/definitions');
  }

  async createAdminRuleDefinition(data: {
    key: string;
    name: string;
    description?: string | null;
    defaultConfig?: Record<string, unknown> | null;
  }): Promise<{ definition: RuleDefinition }> {
    return this.fetch('/api/admin/rule-packs/definitions', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateAdminRuleDefinition(id: string, data: {
    name?: string;
    description?: string | null;
    defaultConfig?: Record<string, unknown> | null;
  }): Promise<{ definition: RuleDefinition }> {
    return this.fetch(`/api/admin/rule-packs/definitions/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deleteAdminRuleDefinition(id: string): Promise<void> {
    await this.fetch(`/api/admin/rule-packs/definitions/${id}`, {
      method: 'DELETE',
    });
  }

  async getAdminEvidenceTypes(): Promise<{ evidenceTypes: RuleEvidenceType[] }> {
    return this.fetch('/api/admin/rule-packs/evidence-types');
  }

  async createAdminEvidenceType(data: {
    key: string;
    name: string;
    planType: RulePlanType;
  }): Promise<{ evidenceType: RuleEvidenceType }> {
    return this.fetch('/api/admin/rule-packs/evidence-types', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateAdminEvidenceType(id: string, data: {
    name?: string;
    planType?: RulePlanType;
  }): Promise<{ evidenceType: RuleEvidenceType }> {
    return this.fetch(`/api/admin/rule-packs/evidence-types/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deleteAdminEvidenceType(id: string): Promise<void> {
    await this.fetch(`/api/admin/rule-packs/evidence-types/${id}`, {
      method: 'DELETE',
    });
  }

  async getAdminMeetingTypes(): Promise<{ meetingTypes: MeetingType[] }> {
    return this.fetch('/api/admin/rule-packs/meeting-types');
  }

  async getAdminVersionStats(): Promise<VersionStatsResponse> {
    return this.fetch('/api/admin/stats/versions');
  }

  // ============================================
  // Referral API
  // ============================================

  async getStudentReferrals(studentId: string, filters?: { status?: ReferralStatus; type?: ReferralType }): Promise<{ referrals: Referral[] }> {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.type) params.append('type', filters.type);
    const queryString = params.toString();
    return this.fetch(`/api/students/${studentId}/referrals${queryString ? `?${queryString}` : ''}`);
  }

  async getReferral(referralId: string): Promise<{ referral: Referral }> {
    return this.fetch(`/api/referrals/${referralId}`);
  }

  async createReferral(studentId: string, data: CreateReferralData): Promise<{ referral: Referral }> {
    return this.fetch(`/api/students/${studentId}/referrals`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateReferral(referralId: string, data: UpdateReferralData): Promise<{ referral: Referral }> {
    return this.fetch(`/api/referrals/${referralId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async submitReferral(referralId: string): Promise<{ referral: Referral }> {
    return this.fetch(`/api/referrals/${referralId}/submit`, {
      method: 'POST',
    });
  }

  async requestReferralConsent(referralId: string): Promise<{ referral: Referral }> {
    return this.fetch(`/api/referrals/${referralId}/request-consent`, {
      method: 'POST',
    });
  }

  async recordReferralConsent(referralId: string, received: boolean, declineReason?: string): Promise<{ referral: Referral }> {
    return this.fetch(`/api/referrals/${referralId}/record-consent`, {
      method: 'POST',
      body: JSON.stringify({ received, declineReason }),
    });
  }

  async closeReferral(referralId: string, reason?: string): Promise<{ referral: Referral }> {
    return this.fetch(`/api/referrals/${referralId}/close`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  }

  async assignReferralCaseManager(referralId: string, caseManagerId: string | null): Promise<{ referral: Referral }> {
    return this.fetch(`/api/referrals/${referralId}/assign`, {
      method: 'POST',
      body: JSON.stringify({ caseManagerId }),
    });
  }

  async deleteReferral(referralId: string): Promise<{ success: boolean }> {
    return this.fetch(`/api/referrals/${referralId}`, {
      method: 'DELETE',
    });
  }

  async getReferralTimeline(referralId: string): Promise<{ events: ReferralTimelineEvent[] }> {
    return this.fetch(`/api/referrals/${referralId}/timeline`);
  }

  async addReferralTimelineEvent(referralId: string, data: { eventType: string; description: string; eventData?: Record<string, unknown> }): Promise<{ event: ReferralTimelineEvent }> {
    return this.fetch(`/api/referrals/${referralId}/timeline`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // ============================================
  // Evaluation Case API
  // ============================================

  async getStudentEvaluationCases(studentId: string, filters?: { status?: EvaluationCaseStatus; type?: EvaluationCaseType }): Promise<{ evaluationCases: EvaluationCase[] }> {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.type) params.append('type', filters.type);
    const queryString = params.toString();
    return this.fetch(`/api/students/${studentId}/evaluation-cases${queryString ? `?${queryString}` : ''}`);
  }

  async getEvaluationCase(caseId: string): Promise<{ evaluationCase: EvaluationCase }> {
    return this.fetch(`/api/evaluation-cases/${caseId}`);
  }

  async createEvaluationCase(studentId: string, data: CreateEvaluationCaseData): Promise<{ evaluationCase: EvaluationCase }> {
    return this.fetch(`/api/students/${studentId}/evaluation-cases`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateEvaluationCase(caseId: string, data: UpdateEvaluationCaseData): Promise<{ evaluationCase: EvaluationCase }> {
    return this.fetch(`/api/evaluation-cases/${caseId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deleteEvaluationCase(caseId: string): Promise<{ message: string }> {
    return this.fetch(`/api/evaluation-cases/${caseId}`, {
      method: 'DELETE',
    });
  }

  async scheduleMeeting(caseId: string, data: { meetingScheduledAt: string; meetingLocation?: string; meetingLink?: string }): Promise<{ evaluationCase: EvaluationCase }> {
    return this.fetch(`/api/evaluation-cases/${caseId}/schedule-meeting`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async closeEvaluationCase(caseId: string, reason?: string): Promise<{ evaluationCase: EvaluationCase }> {
    return this.fetch(`/api/evaluation-cases/${caseId}/close`, {
      method: 'POST',
      body: JSON.stringify({ closedReason: reason }),
    });
  }

  async assignEvaluationCaseManager(caseId: string, caseManagerId: string | null): Promise<{ evaluationCase: EvaluationCase }> {
    return this.fetch(`/api/evaluation-cases/${caseId}/assign`, {
      method: 'POST',
      body: JSON.stringify({ caseManagerId }),
    });
  }

  // Assessment methods
  async addAssessment(caseId: string, data: CreateAssessmentData): Promise<{ assessment: EvaluationAssessment }> {
    return this.fetch(`/api/evaluation-cases/${caseId}/assessments`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateAssessment(caseId: string, assessmentId: string, data: UpdateAssessmentData): Promise<{ assessment: EvaluationAssessment }> {
    return this.fetch(`/api/evaluation-cases/${caseId}/assessments/${assessmentId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deleteAssessment(caseId: string, assessmentId: string): Promise<{ message: string }> {
    return this.fetch(`/api/evaluation-cases/${caseId}/assessments/${assessmentId}`, {
      method: 'DELETE',
    });
  }

  // Participant methods
  async addParticipant(caseId: string, data: CreateParticipantData): Promise<{ participant: EvaluationParticipant }> {
    return this.fetch(`/api/evaluation-cases/${caseId}/participants`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateParticipant(caseId: string, participantId: string, data: UpdateParticipantData): Promise<{ participant: EvaluationParticipant }> {
    return this.fetch(`/api/evaluation-cases/${caseId}/participants/${participantId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async removeParticipant(caseId: string, participantId: string): Promise<{ message: string }> {
    return this.fetch(`/api/evaluation-cases/${caseId}/participants/${participantId}`, {
      method: 'DELETE',
    });
  }

  // Determination methods
  async createDetermination(caseId: string, data: CreateDeterminationData): Promise<{ determination: EligibilityDetermination }> {
    return this.fetch(`/api/evaluation-cases/${caseId}/determination`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Timeline event methods
  async addEvaluationCaseTimelineEvent(caseId: string, data: { eventType: string; description: string; eventData?: Record<string, unknown> }): Promise<{ event: EvaluationCaseTimelineEvent }> {
    return this.fetch(`/api/evaluation-cases/${caseId}/timeline`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // ============================================
  // PLAN VERSIONING METHODS
  // ============================================

  async finalizePlan(planId: string, data: FinalizePlanData): Promise<FinalizePlanResponse> {
    return this.fetch(`/api/plans/${planId}/finalize`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getPlanVersions(planId: string): Promise<{ versions: PlanVersion[] }> {
    return this.fetch(`/api/plans/${planId}/versions`);
  }

  async getPlanVersion(versionId: string): Promise<{ version: PlanVersion }> {
    return this.fetch(`/api/plan-versions/${versionId}`);
  }

  async downloadExport(exportId: string): Promise<Blob> {
    const response = await fetch(`${API_BASE}/api/plan-exports/${exportId}/download`, {
      credentials: 'include',
    });
    if (!response.ok) {
      throw new Error('Failed to download export');
    }
    return response.blob();
  }

  async distributePlanVersion(versionId: string): Promise<{ version: PlanVersion }> {
    return this.fetch(`/api/plan-versions/${versionId}/distribute`, {
      method: 'POST',
    });
  }

  // ============================================
  // DECISION LEDGER METHODS
  // ============================================

  async createDecision(planId: string, data: CreateDecisionData): Promise<{ decision: DecisionLedgerEntry }> {
    return this.fetch(`/api/plans/${planId}/decisions`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getDecisions(planId: string, params?: { type?: DecisionType; status?: DecisionStatus; section?: string }): Promise<{ decisions: DecisionLedgerEntry[] }> {
    const searchParams = new URLSearchParams();
    if (params?.type) searchParams.set('type', params.type);
    if (params?.status) searchParams.set('status', params.status);
    if (params?.section) searchParams.set('section', params.section);
    const query = searchParams.toString();
    return this.fetch(`/api/plans/${planId}/decisions${query ? `?${query}` : ''}`);
  }

  async getDecision(decisionId: string): Promise<{ decision: DecisionLedgerEntry }> {
    return this.fetch(`/api/decisions/${decisionId}`);
  }

  async voidDecision(decisionId: string, data: VoidDecisionData): Promise<{ decision: DecisionLedgerEntry }> {
    return this.fetch(`/api/decisions/${decisionId}/void`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getDecisionTypes(): Promise<{ decisionTypes: DecisionTypeInfo[] }> {
    return this.fetch('/api/decision-types');
  }

  // ============================================
  // MEETING METHODS (for Decision linking)
  // ============================================

  async getMeetings(studentId: string, params?: { planType?: string; status?: MeetingStatus }): Promise<{ meetings: PlanMeeting[] }> {
    const searchParams = new URLSearchParams();
    if (params?.planType) searchParams.set('planType', params.planType);
    if (params?.status) searchParams.set('status', params.status);
    const query = searchParams.toString();
    return this.fetch(`/api/meetings/student/${studentId}${query ? `?${query}` : ''}`);
  }

  // ============================================
  // SIGNATURE METHODS
  // ============================================

  async createSignaturePacket(versionId: string, data: CreateSignaturePacketData): Promise<{ packet: SignaturePacket }> {
    return this.fetch(`/api/plan-versions/${versionId}/signature-packets`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getSignatures(versionId: string): Promise<{ packet: SignaturePacket }> {
    return this.fetch(`/api/plan-versions/${versionId}/signatures`);
  }

  async signDocument(packetId: string, data: SignDocumentData): Promise<{ signature: SignatureRecord; packetComplete: boolean }> {
    return this.fetch(`/api/signature-packets/${packetId}/sign`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async declineSignature(packetId: string, data: DeclineSignatureData): Promise<{ signature: SignatureRecord }> {
    return this.fetch(`/api/signature-packets/${packetId}/decline`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async addSignatureRecord(packetId: string, data: AddSignatureRecordData): Promise<{ signature: SignatureRecord }> {
    return this.fetch(`/api/signature-packets/${packetId}/records`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getSignatureRoles(): Promise<{ roles: SignatureRoleInfo[]; attestationText: string }> {
    return this.fetch('/api/signature-roles');
  }

  // ============================================
  // SCHEDULED SERVICES METHODS
  // ============================================

  async getScheduledServices(planId: string): Promise<{ scheduledPlan: ScheduledServicePlan | null }> {
    return this.fetch(`/api/plans/${planId}/scheduled-services`);
  }

  async createScheduledServices(planId: string, data: CreateScheduledServicePlanData): Promise<{ scheduledPlan: ScheduledServicePlan }> {
    return this.fetch(`/api/plans/${planId}/scheduled-services`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateScheduledServices(scheduledPlanId: string, data: UpdateScheduledServicePlanData): Promise<{ scheduledPlan: ScheduledServicePlan }> {
    return this.fetch(`/api/scheduled-services/${scheduledPlanId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async getServiceVariance(planId: string, startDate: string, endDate: string): Promise<ServiceVarianceReport> {
    return this.fetch(`/api/plans/${planId}/service-variance?start=${startDate}&end=${endDate}`);
  }

  // ============================================
  // REVIEW SCHEDULE METHODS
  // ============================================

  async getReviewSchedules(planId: string, params?: { status?: ReviewScheduleStatus; type?: ScheduleType }): Promise<{ reviewSchedules: ReviewSchedule[] }> {
    const searchParams = new URLSearchParams();
    if (params?.status) searchParams.append('status', params.status);
    if (params?.type) searchParams.append('type', params.type);
    const query = searchParams.toString();
    return this.fetch(`/api/plans/${planId}/review-schedules${query ? `?${query}` : ''}`);
  }

  async getReviewSchedule(scheduleId: string): Promise<{ reviewSchedule: ReviewSchedule }> {
    return this.fetch(`/api/review-schedules/${scheduleId}`);
  }

  async createReviewSchedule(planId: string, data: CreateReviewScheduleData): Promise<{ reviewSchedule: ReviewSchedule }> {
    return this.fetch(`/api/plans/${planId}/review-schedules`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateReviewSchedule(scheduleId: string, data: UpdateReviewScheduleData): Promise<{ reviewSchedule: ReviewSchedule }> {
    return this.fetch(`/api/review-schedules/${scheduleId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async completeReviewSchedule(scheduleId: string, notes?: string): Promise<{ reviewSchedule: ReviewSchedule }> {
    return this.fetch(`/api/review-schedules/${scheduleId}/complete`, {
      method: 'POST',
      body: JSON.stringify({ notes }),
    });
  }

  async deleteReviewSchedule(scheduleId: string): Promise<{ success: boolean }> {
    return this.fetch(`/api/review-schedules/${scheduleId}`, {
      method: 'DELETE',
    });
  }

  async getReviewDashboard(days?: number): Promise<ReviewDashboard> {
    return this.fetch(`/api/review-schedules/dashboard${days ? `?days=${days}` : ''}`);
  }

  async getScheduleTypes(): Promise<{ scheduleTypes: ScheduleTypeInfo[] }> {
    return this.fetch('/api/schedule-types');
  }

  // ============================================
  // COMPLIANCE TASK METHODS
  // ============================================

  async getComplianceTasks(params?: {
    status?: ComplianceTaskStatus;
    type?: ComplianceTaskType;
    assignedTo?: string;
    studentId?: string;
    planId?: string;
    overdue?: boolean;
  }): Promise<{ tasks: ComplianceTask[] }> {
    const searchParams = new URLSearchParams();
    if (params?.status) searchParams.append('status', params.status);
    if (params?.type) searchParams.append('type', params.type);
    if (params?.assignedTo) searchParams.append('assignedTo', params.assignedTo);
    if (params?.studentId) searchParams.append('studentId', params.studentId);
    if (params?.planId) searchParams.append('planId', params.planId);
    if (params?.overdue) searchParams.append('overdue', 'true');
    const query = searchParams.toString();
    return this.fetch(`/api/compliance-tasks${query ? `?${query}` : ''}`);
  }

  async getMyComplianceTasks(status?: ComplianceTaskStatus): Promise<{ tasks: ComplianceTask[] }> {
    return this.fetch(`/api/compliance-tasks/my-tasks${status ? `?status=${status}` : ''}`);
  }

  async getComplianceTask(taskId: string): Promise<{ task: ComplianceTask }> {
    return this.fetch(`/api/compliance-tasks/${taskId}`);
  }

  async createComplianceTask(data: CreateComplianceTaskData): Promise<{ task: ComplianceTask }> {
    return this.fetch('/api/compliance-tasks', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateComplianceTask(taskId: string, data: UpdateComplianceTaskData): Promise<{ task: ComplianceTask }> {
    return this.fetch(`/api/compliance-tasks/${taskId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async completeComplianceTask(taskId: string, notes?: string): Promise<{ task: ComplianceTask }> {
    return this.fetch(`/api/compliance-tasks/${taskId}/complete`, {
      method: 'POST',
      body: JSON.stringify({ notes }),
    });
  }

  async dismissComplianceTask(taskId: string, reason: string): Promise<{ task: ComplianceTask }> {
    return this.fetch(`/api/compliance-tasks/${taskId}/dismiss`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  }

  async getComplianceDashboard(): Promise<ComplianceDashboard> {
    return this.fetch('/api/compliance-tasks/dashboard');
  }

  async getTaskTypes(): Promise<{ taskTypes: TaskTypeInfo[] }> {
    return this.fetch('/api/task-types');
  }

  // ============================================
  // DISPUTE CASE METHODS
  // ============================================

  async getStudentDisputes(studentId: string, params?: { status?: DisputeCaseStatus; type?: DisputeCaseType }): Promise<{ disputeCases: DisputeCase[] }> {
    const searchParams = new URLSearchParams();
    if (params?.status) searchParams.append('status', params.status);
    if (params?.type) searchParams.append('type', params.type);
    const query = searchParams.toString();
    return this.fetch(`/api/students/${studentId}/disputes${query ? `?${query}` : ''}`);
  }

  async getAllDisputes(params?: { status?: DisputeCaseStatus; type?: DisputeCaseType; assignedTo?: string }): Promise<{ disputeCases: DisputeCase[] }> {
    const searchParams = new URLSearchParams();
    if (params?.status) searchParams.append('status', params.status);
    if (params?.type) searchParams.append('type', params.type);
    if (params?.assignedTo) searchParams.append('assignedTo', params.assignedTo);
    const query = searchParams.toString();
    return this.fetch(`/api/disputes${query ? `?${query}` : ''}`);
  }

  async getDispute(caseId: string): Promise<{ disputeCase: DisputeCase }> {
    return this.fetch(`/api/disputes/${caseId}`);
  }

  async createDispute(studentId: string, data: CreateDisputeData): Promise<{ disputeCase: DisputeCase }> {
    return this.fetch(`/api/students/${studentId}/disputes`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateDispute(caseId: string, data: UpdateDisputeData): Promise<{ disputeCase: DisputeCase }> {
    return this.fetch(`/api/disputes/${caseId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async getDisputeEvents(caseId: string): Promise<{ events: DisputeEvent[] }> {
    return this.fetch(`/api/disputes/${caseId}/events`);
  }

  async createDisputeEvent(caseId: string, data: CreateDisputeEventData): Promise<{ event: DisputeEvent }> {
    return this.fetch(`/api/disputes/${caseId}/events`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getDisputeAttachments(caseId: string): Promise<{ attachments: DisputeAttachment[] }> {
    return this.fetch(`/api/disputes/${caseId}/attachments`);
  }

  async createDisputeAttachment(caseId: string, data: CreateDisputeAttachmentData): Promise<{ attachment: DisputeAttachment }> {
    return this.fetch(`/api/disputes/${caseId}/attachments`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async deleteDisputeAttachment(attachmentId: string): Promise<{ success: boolean }> {
    return this.fetch(`/api/disputes/attachments/${attachmentId}`, {
      method: 'DELETE',
    });
  }

  async exportDisputePdf(caseId: string): Promise<{ exportData: { case: DisputeCase; exportedAt: string; exportedBy: string }; message: string }> {
    return this.fetch(`/api/disputes/${caseId}/export-pdf`);
  }

  async getDisputeDashboard(): Promise<DisputeDashboard> {
    return this.fetch('/api/disputes/dashboard');
  }

  async getDisputeCaseTypes(): Promise<{ caseTypes: DisputeCaseTypeInfo[] }> {
    return this.fetch('/api/case-types');
  }

  async getDisputeEventTypes(): Promise<{ eventTypes: DisputeEventTypeInfo[] }> {
    return this.fetch('/api/event-types');
  }

  // ============================================
  // IN-APP ALERT METHODS
  // ============================================

  async getAlerts(unreadOnly?: boolean, limit?: number): Promise<{ alerts: InAppAlert[]; unreadCount: number }> {
    const searchParams = new URLSearchParams();
    if (unreadOnly) searchParams.append('unreadOnly', 'true');
    if (limit) searchParams.append('limit', limit.toString());
    const query = searchParams.toString();
    return this.fetch(`/api/alerts${query ? `?${query}` : ''}`);
  }

  async getUnreadAlertCount(): Promise<{ unreadCount: number }> {
    return this.fetch('/api/alerts/unread-count');
  }

  async markAlertRead(alertId: string): Promise<{ alert: InAppAlert }> {
    return this.fetch(`/api/alerts/${alertId}/read`, {
      method: 'POST',
    });
  }

  async markAllAlertsRead(): Promise<{ success: boolean }> {
    return this.fetch('/api/alerts/mark-all-read', {
      method: 'POST',
    });
  }

  async deleteAlert(alertId: string): Promise<{ success: boolean }> {
    return this.fetch(`/api/alerts/${alertId}`, {
      method: 'DELETE',
    });
  }

  async clearReadAlerts(): Promise<{ success: boolean }> {
    return this.fetch('/api/alerts/clear-read', {
      method: 'DELETE',
    });
  }

  async createAlert(data: CreateAlertData): Promise<{ alert: InAppAlert }> {
    return this.fetch('/api/alerts', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async bulkCreateAlerts(data: BulkCreateAlertData): Promise<{ created: number }> {
    return this.fetch('/api/alerts/bulk', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getAlertTypes(): Promise<{ alertTypes: AlertTypeInfo[] }> {
    return this.fetch('/api/alert-types');
  }

  // ============================================
  // AUDIT LOG API METHODS
  // ============================================

  async getAuditLogs(
    filters?: AuditLogFilters,
    page = 1,
    limit = 50
  ): Promise<{
    auditLogs: AuditLog[];
    pagination: { page: number; limit: number; total: number; totalPages: number };
  }> {
    const searchParams = new URLSearchParams();
    searchParams.append('page', page.toString());
    searchParams.append('limit', limit.toString());
    if (filters?.dateFrom) searchParams.append('dateFrom', filters.dateFrom);
    if (filters?.dateTo) searchParams.append('dateTo', filters.dateTo);
    if (filters?.userId) searchParams.append('userId', filters.userId);
    if (filters?.studentId) searchParams.append('studentId', filters.studentId);
    if (filters?.actionType) searchParams.append('actionType', filters.actionType);
    if (filters?.entityType) searchParams.append('entityType', filters.entityType);
    return this.fetch(`/api/admin/audit?${searchParams.toString()}`);
  }

  async getAuditLog(id: string): Promise<{ auditLog: AuditLog }> {
    return this.fetch(`/api/admin/audit/${id}`);
  }

  async exportAuditLogs(filters?: AuditLogFilters): Promise<Blob> {
    const searchParams = new URLSearchParams();
    if (filters?.dateFrom) searchParams.append('dateFrom', filters.dateFrom);
    if (filters?.dateTo) searchParams.append('dateTo', filters.dateTo);
    if (filters?.userId) searchParams.append('userId', filters.userId);
    if (filters?.studentId) searchParams.append('studentId', filters.studentId);
    if (filters?.actionType) searchParams.append('actionType', filters.actionType);
    if (filters?.entityType) searchParams.append('entityType', filters.entityType);
    const response = await fetch(`${API_BASE}/api/admin/audit/export?${searchParams.toString()}`, {
      credentials: 'include',
    });
    if (!response.ok) {
      throw new Error('Failed to export audit logs');
    }
    return response.blob();
  }

  async getAuditActionTypes(): Promise<{ actionTypes: AuditActionTypeInfo[] }> {
    return this.fetch('/api/admin/audit/action-types');
  }

  async getAuditEntityTypes(): Promise<{ entityTypes: AuditEntityTypeInfo[] }> {
    return this.fetch('/api/admin/audit/entity-types');
  }

  async getAuditUsers(): Promise<{ users: AuditUser[] }> {
    return this.fetch('/api/admin/audit/users');
  }
}

// ============================================
// IEP Independent Assessment Review Types
// ============================================

export type AssessmentType =
  | 'AUDIOLOGICAL'
  | 'EDUCATIONAL'
  | 'OCCUPATIONAL_THERAPY'
  | 'PHYSICAL_THERAPY'
  | 'PSYCHOLOGICAL'
  | 'SPEECH_LANGUAGE'
  | 'OTHER';

export interface IEPIndependentAssessmentReview {
  id: string;
  studentId: string;
  planInstanceId?: string;

  // Header
  school?: string;
  grade?: string;
  dateOfBirth?: string;
  dateOfReport?: string;
  dateOfTeamReview?: string;
  assessmentType: AssessmentType;
  assessmentTypeOther?: string;

  // Part I: Review by Qualified Personnel
  schoolReviewerName?: string;
  schoolReviewerTitle?: string;
  schoolReviewerCredentials?: string;
  examinerName?: string;
  examinerTitle?: string;
  examinerLicensed?: boolean;
  examinerLicenseDetails?: string;
  examinerQualified?: boolean;
  examinerQualificationNotes?: string;
  reportWrittenDatedSigned?: boolean;
  materialsTechnicallySound?: boolean;
  materialsFollowedInstructions?: boolean;
  materialsInstructionsNotes?: string;
  materialsLanguageAccurate?: boolean;
  materialsLanguageNotes?: string;
  materialsBiasFree?: boolean;
  materialsBiasNotes?: string;
  materialsValidPurpose?: boolean;
  materialsValidNotes?: string;
  resultsReflectAptitude?: boolean;
  resultsReflectAptitudeNA?: boolean;
  resultsNotes?: string;

  // Part II: Review by Team
  describesPerformanceAllAreas?: boolean;
  performanceAreasNotes?: string;
  includesVariedAssessmentData?: boolean;
  assessmentDataNotes?: string;
  includesInstructionalImplications?: boolean;
  instructionalNotes?: string;

  // Part III: Conclusions
  findingsMatchData?: boolean;
  findingsMatchDataNote?: string;
  dataMatchExistingSchoolData?: boolean;
  dataMatchExistingNote?: string;
  recommendationsSupported?: boolean;
  recommendationsToConsider?: string;
  schoolAssessmentWaived?: boolean;
  schoolAssessmentWaivedNote?: string;

  // Part IV: IEP Teams Only
  includesDataForIEPContent?: boolean;
  iepContentNotes?: string;
  disabilityConsistentWithCOMAR?: boolean;
  comarDisabilityNotes?: string;

  // Additional
  additionalNotes?: string;
  teamMembers?: Array<{ name: string; role: string }>;

  // Metadata
  createdAt: string;
  updatedAt: string;
  createdBy?: { id: string; displayName: string };
  student?: { id: string; firstName: string; lastName: string };
  planInstance?: { id: string; startDate: string; status: string };
}

export interface CreateIEPReportData {
  assessmentType: AssessmentType;
  assessmentTypeOther?: string;
  planInstanceId?: string;

  // Header
  school?: string;
  grade?: string;
  dateOfBirth?: string;
  dateOfReport?: string;
  dateOfTeamReview?: string;

  // Part I
  schoolReviewerName?: string;
  schoolReviewerTitle?: string;
  schoolReviewerCredentials?: string;
  examinerName?: string;
  examinerTitle?: string;
  examinerLicensed?: boolean;
  examinerLicenseDetails?: string;
  examinerQualified?: boolean;
  examinerQualificationNotes?: string;
  reportWrittenDatedSigned?: boolean;
  materialsTechnicallySound?: boolean;
  materialsFollowedInstructions?: boolean;
  materialsInstructionsNotes?: string;
  materialsLanguageAccurate?: boolean;
  materialsLanguageNotes?: string;
  materialsBiasFree?: boolean;
  materialsBiasNotes?: string;
  materialsValidPurpose?: boolean;
  materialsValidNotes?: string;
  resultsReflectAptitude?: boolean;
  resultsReflectAptitudeNA?: boolean;
  resultsNotes?: string;

  // Part II
  describesPerformanceAllAreas?: boolean;
  performanceAreasNotes?: string;
  includesVariedAssessmentData?: boolean;
  assessmentDataNotes?: string;
  includesInstructionalImplications?: boolean;
  instructionalNotes?: string;

  // Part III
  findingsMatchData?: boolean;
  findingsMatchDataNote?: string;
  dataMatchExistingSchoolData?: boolean;
  dataMatchExistingNote?: string;
  recommendationsSupported?: boolean;
  recommendationsToConsider?: string;
  schoolAssessmentWaived?: boolean;
  schoolAssessmentWaivedNote?: string;

  // Part IV
  includesDataForIEPContent?: boolean;
  iepContentNotes?: string;
  disabilityConsistentWithCOMAR?: boolean;
  comarDisabilityNotes?: string;

  // Additional
  additionalNotes?: string;
  teamMembers?: Array<{ name: string; role: string }>;
}

export interface AdminStudent {
  id: string;
  recordId: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string | null;
  grade: string | null;
  schoolId: string | null;
  schoolName: string | null;
  districtName: string | null;
  isActive: boolean;
  createdAt?: string;
  school?: {
    id: string;
    name: string;
    district: {
      id: string;
      name: string;
      state: {
        id: string;
        code: string;
        name: string;
      };
    };
  } | null;
}

// Reference Data Types
export type SchoolType = 'ELEMENTARY' | 'MIDDLE' | 'HIGH' | 'K8' | 'K12' | 'OTHER';

export interface ReferenceState {
  id: string;
  code: string;
  name: string;
}

export interface ReferenceDistrict {
  id: string;
  code: string;
  name: string;
  stateId: string;
}

export interface ReferenceSchool {
  id: string;
  code: string | null;
  name: string;
  schoolType: SchoolType;
  districtId: string;
}

// Goal Wizard Types
export interface PresentLevelData {
  area: string;
  currentPerformance: string;
  strengthsNoted: string[];
  challengesNoted: string[];
  recentProgress: string;
  dataSourceSummary: string;
  suggestedGoalAreas?: string[];
  // Enhanced fields with standards references
  gradeStandardsComparison?: string;
  standardsReferenced?: Array<{
    standard: string;
    code: string;
    studentPerformance: string;
    gapAnalysis: string;
  }>;
  impactOnGeneralEducation?: string;
  accommodationsNeeded?: string[];
  assessmentResults?: Array<{
    assessmentName: string;
    date: string;
    score: string;
    interpretation: string;
  }>;
  parentConcerns?: string;
  functionalImplications?: string;
  baselineData?: Array<{
    metric: string;
    currentLevel: string;
    expectedLevel: string;
    measurementMethod: string;
  }>;
}

export interface PresentLevelsHelpers {
  statusSummary: Record<string, { latestCode: string; latestSummary: string | null }>;
  artifactHighlights: Array<{ date: string; summary: string }>;
  progressTrend: string;
}

export interface GoalObjective {
  id?: string;
  sequence: number;
  objectiveText: string;
  measurementCriteria?: string;
  targetDate?: string;
    draftStatus?: 'DRAFT' | 'FINAL' | 'WIZARD_DRAFT' | 'FINALIZED';
  isCompleted?: boolean;
}

export interface GoalDraft {
  goalArea: string;
  annualGoalText: string;
  objectives: Array<{
    sequence: number;
    objectiveText: string;
    measurementCriteria: string;
    suggestedTargetWeeks: number;
  }>;
  baselineDescription: string;
  measurementMethod: string;
  progressSchedule: string;
  comarReference: string | null;
  rationale: string;
}

export interface GoalTemplate {
  template: string;
  comarRef: string;
}

export interface ValidationIssue {
  type: 'error' | 'warning' | 'suggestion';
  code: string;
  message: string;
  comarReference?: string;
  suggestion?: string;
}

export interface ValidationResult {
  isValid: boolean;
  score: number;
  issues: ValidationIssue[];
  comarCompliance: {
    measurable: boolean;
    gradeAligned: boolean;
    needsBased: boolean;
    geAccessEnabled: boolean;
  };
  suggestions: string[];
}

export interface QuickValidationResult {
  status: 'good' | 'needs-work' | 'incomplete';
  hints: string[];
}

export interface GoalArtifactLink {
  linkId: string;
  relevanceNote: string | null;
  linkedAt: string;
  id: string;
  artifactDate: string;
  description: string | null;
  analysisText: string | null;
  baselineFileUrl: string;
  compareFileUrl: string;
}

// Artifact Compare Types
export interface ArtifactComparison {
  id: string;
  planInstanceId?: string;
  planLabel?: string;
  artifactDate: string;
  description: string | null;
  baselineFileUrl: string;
  compareFileUrl: string;
  analysisText: string | null;
  studentName?: string;
  planTypeCode: string;
  planTypeName?: string;
  createdBy?: string;
  createdAt: string;
}

// ============================================
// Form Field Definition Types
// ============================================

export type FormType = 'IEP' | 'IEP_REPORT' | 'FIVE_OH_FOUR';
export type ControlType = 'TEXT' | 'TEXTAREA' | 'DROPDOWN' | 'RADIO' | 'SIGNATURE' | 'CHECKBOX' | 'DATE';
export type OptionsEditableBy = 'ADMIN_ONLY' | 'TEACHER_ALLOWED' | 'NONE';

export interface FormFieldOption {
  id: string;
  value: string;
  label: string;
  sortOrder: number;
  isDefault: boolean;
  isActive: boolean;
}

export interface FormFieldDefinition {
  id: string;
  formType: FormType;
  section: string;
  sectionOrder: number;
  fieldKey: string;
  fieldLabel: string;
  controlType: ControlType;
  isRequired: boolean;
  valueEditableBy: string[];
  optionsEditableBy: OptionsEditableBy;
  helpText: string | null;
  placeholder: string | null;
  sortOrder: number;
  isActive: boolean;
  options: FormFieldOption[];
}

export interface FormFieldsResponse {
  formType: FormType;
  fields: FormFieldDefinition[];
  sections: Record<string, FormFieldDefinition[]>;
  totalFields: number;
}

export interface School {
  id: string;
  name: string;
  code: string | null;
  stateCode: string | null;
  districtId: string | null;
  address: string | null;
  isActive: boolean;
}

export interface RequiredFieldValidation {
  isValid: boolean;
  missingFields?: Array<{ section: string; fieldKey: string; fieldLabel: string }>;
  message: string;
}

export interface CreateFieldData {
  formType: FormType;
  section: string;
  sectionOrder?: number;
  fieldKey: string;
  fieldLabel: string;
  controlType: ControlType;
  isRequired?: boolean;
  valueEditableBy: string[];
  optionsEditableBy?: OptionsEditableBy;
  helpText?: string;
  placeholder?: string;
  sortOrder?: number;
}

export interface UpdateFieldData {
  section?: string;
  sectionOrder?: number;
  fieldLabel?: string;
  controlType?: ControlType;
  isRequired?: boolean;
  valueEditableBy?: string[];
  optionsEditableBy?: OptionsEditableBy;
  helpText?: string | null;
  placeholder?: string | null;
  sortOrder?: number;
  isActive?: boolean;
}

// ============================================
// Admin Rule Pack Types
// ============================================

export type RuleScopeType = 'STATE' | 'DISTRICT' | 'SCHOOL';
export type RulePlanType = 'IEP' | 'PLAN504' | 'BIP' | 'ALL';

export interface RuleDefinition {
  id: string;
  key: string;
  name: string;
  description: string | null;
  defaultConfig: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

export interface RuleEvidenceType {
  id: string;
  key: string;
  name: string;
  planType: RulePlanType | null;
  createdAt: string;
  updatedAt: string;
}

export interface MeetingType {
  id: string;
  code: string;
  name: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface RulePackEvidenceRequirement {
  id: string;
  rulePackRuleId: string;
  evidenceTypeId: string;
  isRequired: boolean;
  evidenceType: RuleEvidenceType;
}

export interface RulePackRule {
  id: string;
  rulePackId: string;
  ruleDefinitionId: string;
  isEnabled: boolean;
  config: Record<string, unknown> | null;
  sortOrder: number;
  ruleDefinition: RuleDefinition;
  evidenceRequirements: RulePackEvidenceRequirement[];
}

export interface RulePack {
  id: string;
  scopeType: RuleScopeType;
  scopeId: string;
  planType: RulePlanType;
  name: string;
  version: number;
  isActive: boolean;
  effectiveFrom: string;
  effectiveTo: string | null;
  createdAt: string;
  updatedAt: string;
  rules: RulePackRule[];
}

export interface BulkRuleUpdate {
  ruleDefinitionId: string;
  isEnabled: boolean;
  config?: Record<string, unknown> | null;
  sortOrder?: number;
}

export interface BulkEvidenceUpdate {
  ruleId: string;
  evidenceRequirements: Array<{
    evidenceTypeId: string;
    isRequired: boolean;
  }>;
}

// ============================================
// Referral Types
// ============================================

export type ReferralStatus = 'DRAFT' | 'SUBMITTED' | 'IN_REVIEW' | 'CONSENT_REQUESTED' | 'CONSENT_RECEIVED' | 'CONSENT_DECLINED' | 'CLOSED';
export type ReferralType = 'IDEA_EVALUATION' | 'SECTION_504_EVALUATION' | 'BEHAVIOR_SUPPORT';
export type ReferralSource = 'TEACHER' | 'PARENT' | 'ADMINISTRATOR' | 'STUDENT_SUPPORT_TEAM' | 'OTHER';

export interface ReferralTimelineEvent {
  id: string;
  referralId: string;
  eventType: string;
  eventData: Record<string, unknown> | null;
  description: string;
  performedByUserId: string;
  createdAt: string;
  performedBy?: {
    id: string;
    displayName: string;
  };
}

export interface ReferralAttachment {
  id: string;
  referralId: string;
  fileUploadId: string;
  title: string | null;
  description: string | null;
  attachmentType: string | null;
  createdByUserId: string;
  createdAt: string;
  fileUpload?: {
    id: string;
    filename: string;
    originalName: string;
    mimeType: string;
    size: number;
    storageKey: string;
  };
  createdBy?: {
    id: string;
    displayName: string;
  };
}

export interface Referral {
  id: string;
  studentId: string;
  referralType: ReferralType;
  status: ReferralStatus;
  source: ReferralSource;
  sourceOther: string | null;
  referredByUserId: string | null;
  referredByName: string | null;
  referredByEmail: string | null;
  reasonForReferral: string;
  areasOfConcern: string[] | null;
  interventionsTried: string | null;
  supportingData: string | null;
  caseManagerId: string | null;
  consentStatus: string | null;
  consentRequestedAt: string | null;
  consentReceivedAt: string | null;
  consentDeclinedAt: string | null;
  consentDeclineReason: string | null;
  parentContactEmail: string | null;
  parentContactPhone: string | null;
  evaluationDueDate: string | null;
  consentDueDate: string | null;
  internalNotes: string | null;
  submittedAt: string | null;
  closedAt: string | null;
  closedByUserId: string | null;
  closedReason: string | null;
  createdByUserId: string;
  createdAt: string;
  updatedAt: string;
  student?: {
    id: string;
    firstName: string;
    lastName: string;
    grade?: string;
    schoolName?: string;
    dateOfBirth?: string;
  };
  caseManager?: {
    id: string;
    displayName: string;
    email: string;
  } | null;
  referredBy?: {
    id: string;
    displayName: string;
    email?: string;
  } | null;
  closedBy?: {
    id: string;
    displayName: string;
  } | null;
  createdBy?: {
    id: string;
    displayName: string;
  };
  attachments?: ReferralAttachment[];
  timelineEvents?: ReferralTimelineEvent[];
  _count?: {
    attachments: number;
    timelineEvents: number;
  };
}

export interface CreateReferralData {
  referralType: ReferralType;
  source: ReferralSource;
  sourceOther?: string;
  referredByName?: string;
  referredByEmail?: string;
  reasonForReferral: string;
  areasOfConcern?: string[];
  interventionsTried?: string;
  supportingData?: string;
  parentContactEmail?: string;
  parentContactPhone?: string;
  evaluationDueDate?: string;
  consentDueDate?: string;
  internalNotes?: string;
}

export interface UpdateReferralData extends Partial<CreateReferralData> {
  status?: ReferralStatus;
  caseManagerId?: string | null;
  closedReason?: string;
}

// ============================================
// Evaluation Case Types
// ============================================

export type EvaluationCaseStatus = 'OPEN' | 'ASSESSMENTS_IN_PROGRESS' | 'MEETING_SCHEDULED' | 'DETERMINATION_COMPLETE' | 'CLOSED';
export type EvaluationCaseType = 'IDEA' | 'SECTION_504';
export type DeterminationOutcome = 'ELIGIBLE' | 'NOT_ELIGIBLE' | 'PENDING_ADDITIONAL_DATA';
export type IDEADisabilityCategory =
  | 'AUTISM' | 'DEAF_BLINDNESS' | 'DEAFNESS' | 'DEVELOPMENTAL_DELAY' | 'EMOTIONAL_DISTURBANCE'
  | 'HEARING_IMPAIRMENT' | 'INTELLECTUAL_DISABILITY' | 'MULTIPLE_DISABILITIES' | 'ORTHOPEDIC_IMPAIRMENT'
  | 'OTHER_HEALTH_IMPAIRMENT' | 'SPECIFIC_LEARNING_DISABILITY' | 'SPEECH_LANGUAGE_IMPAIRMENT'
  | 'TRAUMATIC_BRAIN_INJURY' | 'VISUAL_IMPAIRMENT';
export type AssessmentStatusType = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
export type ParticipantRole =
  | 'PARENT' | 'GENERAL_ED_TEACHER' | 'SPECIAL_ED_TEACHER' | 'SCHOOL_PSYCHOLOGIST' | 'ADMINISTRATOR'
  | 'SPEECH_LANGUAGE_PATHOLOGIST' | 'OCCUPATIONAL_THERAPIST' | 'PHYSICAL_THERAPIST' | 'SCHOOL_COUNSELOR'
  | 'BEHAVIOR_SPECIALIST' | 'STUDENT' | 'OTHER';

export interface EvaluationCaseTimelineEvent {
  id: string;
  evaluationCaseId: string;
  eventType: string;
  eventData: Record<string, unknown> | null;
  description: string;
  performedByUserId: string;
  createdAt: string;
  performedBy?: {
    id: string;
    displayName: string;
  };
}

export interface EvaluationAssessment {
  id: string;
  evaluationCaseId: string;
  assessmentType: AssessmentType;
  assessmentName: string;
  assessorName: string | null;
  assessorTitle: string | null;
  status: AssessmentStatusType;
  scheduledAt: string | null;
  completedAt: string | null;
  resultsJson: Record<string, unknown> | null;
  resultsSummary: string | null;
  reportFileUploadId: string | null;
  notes: string | null;
  createdByUserId: string;
  createdAt: string;
  updatedAt: string;
  createdBy?: {
    id: string;
    displayName: string;
  };
}

export interface EvaluationParticipant {
  id: string;
  evaluationCaseId: string;
  role: ParticipantRole;
  roleOther: string | null;
  name: string;
  title: string | null;
  email: string | null;
  phone: string | null;
  isRequired: boolean;
  invitedAt: string | null;
  confirmedAt: string | null;
  attended: boolean | null;
  attendanceNotes: string | null;
  userId: string | null;
  createdAt: string;
  updatedAt: string;
  user?: {
    id: string;
    displayName: string;
    email: string;
  } | null;
}

export interface EligibilityDetermination {
  id: string;
  evaluationCaseId: string;
  isEligible: boolean;
  determinationDate: string;
  primaryDisabilityCategory: IDEADisabilityCategory | null;
  secondaryDisabilities: IDEADisabilityCategory[] | null;
  eligibilityCriteriaMet: Record<string, unknown> | null;
  nonEligibilityReason: string | null;
  alternativeRecommendations: string | null;
  rationale: string;
  parentNotifiedAt: string | null;
  parentAgreement: 'AGREE' | 'DISAGREE' | 'PENDING' | null;
  parentDisagreementReason: string | null;
  resultingPlanInstanceId: string | null;
  signatureRequestId: string | null;
  createdByUserId: string;
  createdAt: string;
  updatedAt: string;
  createdBy?: {
    id: string;
    displayName: string;
  };
}

export interface EvaluationCase {
  id: string;
  studentId: string;
  referralId: string | null;
  caseType: EvaluationCaseType;
  status: EvaluationCaseStatus;
  caseManagerId: string | null;
  meetingScheduledAt: string | null;
  meetingLocation: string | null;
  meetingLink: string | null;
  meetingHeldAt: string | null;
  determinationOutcome: DeterminationOutcome | null;
  determinationDate: string | null;
  determinationRationale: string | null;
  primaryDisabilityCategory: IDEADisabilityCategory | null;
  secondaryDisabilities: IDEADisabilityCategory[] | null;
  qualifyingImpairment: string | null;
  nonEligibilityReason: string | null;
  alternativeRecommendations: string | null;
  parentNotifiedAt: string | null;
  parentAgreement: 'AGREE' | 'DISAGREE' | 'PENDING' | null;
  parentDisagreementReason: string | null;
  internalNotes: string | null;
  createdByUserId: string;
  closedAt: string | null;
  closedByUserId: string | null;
  closedReason: string | null;
  createdAt: string;
  updatedAt: string;
  student?: {
    id: string;
    firstName: string;
    lastName: string;
    grade?: string;
    schoolName?: string;
  };
  caseManager?: {
    id: string;
    displayName: string;
    email: string;
  } | null;
  referral?: {
    id: string;
    referralType: ReferralType;
    status: ReferralStatus;
    reasonForReferral?: string;
  } | null;
  createdBy?: {
    id: string;
    displayName: string;
  };
  closedBy?: {
    id: string;
    displayName: string;
  } | null;
  assessments?: EvaluationAssessment[];
  participants?: EvaluationParticipant[];
  determination?: EligibilityDetermination | null;
  timelineEvents?: EvaluationCaseTimelineEvent[];
  _count?: {
    assessments: number;
    participants: number;
    timelineEvents: number;
  };
}

export interface CreateEvaluationCaseData {
  caseType: EvaluationCaseType;
  referralId?: string | null;
  caseManagerId?: string | null;
  meetingScheduledAt?: string;
  meetingLocation?: string;
  meetingLink?: string;
  internalNotes?: string;
}

export interface UpdateEvaluationCaseData extends Partial<CreateEvaluationCaseData> {
  status?: EvaluationCaseStatus;
  meetingHeldAt?: string;
  determinationOutcome?: DeterminationOutcome | null;
  determinationDate?: string;
  determinationRationale?: string;
  primaryDisabilityCategory?: IDEADisabilityCategory | null;
  secondaryDisabilities?: IDEADisabilityCategory[];
  qualifyingImpairment?: string;
  nonEligibilityReason?: string;
  alternativeRecommendations?: string;
  parentNotifiedAt?: string;
  parentAgreement?: 'AGREE' | 'DISAGREE' | 'PENDING';
  parentDisagreementReason?: string;
  closedReason?: string;
}

export interface CreateAssessmentData {
  assessmentType: AssessmentType;
  assessmentName: string;
  assessorName?: string;
  assessorTitle?: string;
  scheduledAt?: string;
  notes?: string;
}

export interface UpdateAssessmentData extends Partial<CreateAssessmentData> {
  status?: AssessmentStatusType;
  completedAt?: string;
  resultsJson?: Record<string, unknown>;
  resultsSummary?: string;
}

export interface CreateParticipantData {
  role: ParticipantRole;
  roleOther?: string;
  name: string;
  title?: string;
  email?: string;
  phone?: string;
  isRequired?: boolean;
  userId?: string | null;
}

export interface UpdateParticipantData extends Partial<CreateParticipantData> {
  invitedAt?: string;
  confirmedAt?: string;
  attended?: boolean | null;
  attendanceNotes?: string;
}

export interface CreateDeterminationData {
  isEligible: boolean;
  determinationDate: string;
  rationale: string;
  primaryDisabilityCategory?: IDEADisabilityCategory | null;
  secondaryDisabilities?: IDEADisabilityCategory[];
  eligibilityCriteriaMet?: Record<string, unknown>;
  nonEligibilityReason?: string;
  alternativeRecommendations?: string;
}

// ============================================
// PLAN VERSIONING TYPES
// ============================================

export type PlanVersionStatus = 'FINAL' | 'DISTRIBUTED' | 'SUPERSEDED';

export interface PlanVersion {
  id: string;
  planInstanceId: string;
  versionNumber: number;
  status: PlanVersionStatus;
  snapshotJson: Record<string, unknown>;
  finalizedAt: string;
  finalizedByUserId: string;
  distributedAt?: string | null;
  distributedByUserId?: string | null;
  versionNotes?: string | null;
  createdAt: string;
  updatedAt: string;
  finalizedBy?: { id: string; displayName: string };
  distributedBy?: { id: string; displayName: string } | null;
  exports?: PlanExport[];
  signaturePacket?: SignaturePacket | null;
  decisions?: DecisionLedgerEntry[];
  planInstance?: {
    id: string;
    student: { id: string; firstName: string; lastName: string };
    planType: { code: string; name: string };
  };
}

export interface PlanExport {
  id: string;
  planVersionId: string;
  format: string;
  fileName: string;
  storageKey: string;
  mimeType: string;
  fileSizeBytes?: number | null;
  exportedAt: string;
  exportedByUserId: string;
  exportedBy?: { id: string; displayName: string };
}

export interface FinalizePlanData {
  versionNotes?: string;
  decisions?: {
    decisionType: DecisionType;
    summary: string;
    rationale: string;
    optionsConsidered?: string;
    participants?: string;
  }[];
  createSignaturePacket?: boolean;
  requiredSignatureRoles?: SignatureRole[];
}

export interface FinalizePlanResponse {
  version: PlanVersion;
  signaturePacket: SignaturePacket | null;
  message: string;
}

// ============================================
// DECISION LEDGER TYPES
// ============================================

export type DecisionType =
  | 'ELIGIBILITY_CATEGORY'
  | 'PLACEMENT_LRE'
  | 'SERVICES_CHANGE'
  | 'GOALS_CHANGE'
  | 'ACCOMMODATIONS_CHANGE'
  | 'ESY_DECISION'
  | 'ASSESSMENT_PARTICIPATION'
  | 'BEHAVIOR_SUPPORTS'
  | 'TRANSITION_SERVICES'
  | 'OTHER';

export type DecisionStatus = 'ACTIVE' | 'VOID';

export interface DecisionLedgerEntry {
  id: string;
  planInstanceId: string;
  planVersionId?: string | null;
  meetingId?: string | null;
  decisionType: DecisionType;
  sectionKey?: string | null;
  summary: string;
  rationale: string;
  optionsConsidered?: string | null;
  participants?: string | null;
  decidedAt: string;
  decidedByUserId: string;
  status: DecisionStatus;
  voidedAt?: string | null;
  voidedByUserId?: string | null;
  voidReason?: string | null;
  createdAt: string;
  updatedAt: string;
  decidedBy?: { id: string; displayName: string };
  voidedBy?: { id: string; displayName: string } | null;
  planVersion?: { id: string; versionNumber: number; finalizedAt?: string } | null;
  meeting?: {
    id: string;
    scheduledAt: string;
    heldAt?: string | null;
    meetingType?: { name: string };
  } | null;
  planInstance?: {
    id: string;
    student: { id: string; firstName: string; lastName: string };
    planType: { code: string; name: string };
  };
}

export interface DecisionTypeInfo {
  value: DecisionType;
  label: string;
  description: string;
}

export interface CreateDecisionData {
  decisionType: DecisionType;
  sectionKey?: string;
  summary: string;
  rationale: string;
  optionsConsidered?: string;
  participants?: string;
  meetingId?: string;
  planVersionId?: string;
  decidedAt?: string;
}

export interface VoidDecisionData {
  voidReason: string;
}

// ============================================
// SIGNATURE TYPES
// ============================================

export type SignaturePacketStatus = 'OPEN' | 'COMPLETE' | 'EXPIRED';

export type SignatureRole =
  | 'PARENT_GUARDIAN'
  | 'CASE_MANAGER'
  | 'SPECIAL_ED_TEACHER'
  | 'GENERAL_ED_TEACHER'
  | 'RELATED_SERVICE_PROVIDER'
  | 'ADMINISTRATOR'
  | 'STUDENT'
  | 'OTHER';

export type SignatureMethod = 'ELECTRONIC' | 'IN_PERSON' | 'PAPER_RETURNED';

export type SignatureStatus = 'PENDING' | 'SIGNED' | 'DECLINED';

export interface SignaturePacket {
  id: string;
  planVersionId: string;
  status: SignaturePacketStatus;
  requiredRoles: SignatureRole[];
  expiresAt?: string | null;
  completedAt?: string | null;
  createdByUserId: string;
  createdAt: string;
  updatedAt: string;
  signatures?: SignatureRecord[];
  createdBy?: { id: string; displayName: string };
  planVersion?: {
    id: string;
    versionNumber: number;
    planInstance?: {
      student: { firstName: string; lastName: string };
      planType: { name: string };
    };
  };
}

export interface SignatureRecord {
  id: string;
  packetId: string;
  role: SignatureRole;
  signerUserId?: string | null;
  signerName: string;
  signerEmail?: string | null;
  signerTitle?: string | null;
  method?: SignatureMethod | null;
  status: SignatureStatus;
  signedAt?: string | null;
  attestationText?: string | null;
  ipAddress?: string | null;
  declinedAt?: string | null;
  declineReason?: string | null;
  createdAt: string;
  updatedAt: string;
  signerUser?: { id: string; displayName: string } | null;
}

export interface SignatureRoleInfo {
  value: SignatureRole;
  label: string;
}

export interface CreateSignaturePacketData {
  requiredRoles: SignatureRole[];
  expiresAt?: string;
  signers?: {
    role: SignatureRole;
    signerName: string;
    signerEmail?: string;
    signerTitle?: string;
    signerUserId?: string;
  }[];
}

export interface SignDocumentData {
  signatureRecordId: string;
  method: SignatureMethod;
  signerName: string;
  attestation?: boolean;
}

export interface DeclineSignatureData {
  signatureRecordId: string;
  declineReason: string;
}

export interface AddSignatureRecordData {
  role: SignatureRole;
  signerName: string;
  signerEmail?: string;
  signerTitle?: string;
  signerUserId?: string;
}

// ============================================
// MEETING TYPES (for Decision linking)
// ============================================

export type MeetingStatus = 'SCHEDULED' | 'HELD' | 'CLOSED' | 'CANCELLED';

export interface PlanMeeting {
  id: string;
  studentId: string;
  planType: string;
  planInstanceId?: string | null;
  meetingTypeId: string;
  status: MeetingStatus;
  scheduledAt: string;
  heldAt?: string | null;
  closedAt?: string | null;
  cancelledAt?: string | null;
  cancelReason?: string | null;
  location?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  meetingType?: MeetingType;
  planInstance?: {
    id: string;
    planType?: { code: string; name: string };
  };
}

// ============================================
// SCHEDULED SERVICES TYPES
// ============================================

export type ScheduledServiceStatus = 'ACTIVE' | 'INACTIVE';

export interface ScheduledServiceItem {
  id: string;
  serviceType: ServiceType;
  expectedMinutesPerWeek: number;
  startDate: string;
  endDate?: string | null;
  providerRole?: string | null;
  location?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ScheduledServicePlan {
  id: string;
  status: ScheduledServiceStatus;
  planInstanceId: string;
  createdAt: string;
  updatedAt: string;
  items: ScheduledServiceItem[];
  createdBy?: { id: string; displayName: string };
  updatedBy?: { id: string; displayName: string } | null;
}

export interface CreateScheduledServiceItem {
  serviceType: ServiceType;
  expectedMinutesPerWeek: number;
  startDate: string;
  endDate?: string | null;
  providerRole?: string | null;
  location?: string | null;
  notes?: string | null;
}

export interface CreateScheduledServicePlanData {
  items: CreateScheduledServiceItem[];
}

export interface UpdateScheduledServicePlanData {
  status?: ScheduledServiceStatus;
  items?: CreateScheduledServiceItem[];
}

export interface ServiceVarianceByType {
  serviceType: ServiceType;
  expectedMinutes: number;
  deliveredMinutes: number;
  varianceMinutes: number;
  missedSessions: number;
}

export interface ServiceVarianceWeek {
  weekOf: string;
  weekEnd: string;
  byServiceType: ServiceVarianceByType[];
  totalExpected: number;
  totalDelivered: number;
  totalVariance: number;
}

export interface ServiceVarianceReport {
  variance: ServiceVarianceWeek[];
  summary: {
    totalExpected: number;
    totalDelivered: number;
    totalVariance: number;
  };
}

// ============================================
// ADMIN DASHBOARD STATS TYPES
// ============================================

export interface VersionStatsVersionItem {
  id: string;
  versionNumber: number;
  finalizedAt: string;
  planInstance: {
    id: string;
    student: { id: string; firstName: string; lastName: string };
    planType: { name: string };
  };
  signaturePacket?: {
    status: string;
    signatures: Array<{ role: string; status: string }>;
  };
}

export interface VoidedDecisionItem {
  id: string;
  decisionType: DecisionType;
  summary: string;
  voidedAt: string;
  voidReason: string;
  planInstance: {
    id: string;
    student: { id: string; firstName: string; lastName: string };
  };
  voidedBy: { displayName: string };
}

export interface VersionStatsResponse {
  summary: {
    totalVersions: number;
    finalVersions: number;
    distributedVersions: number;
    totalDecisions: number;
    voidedDecisions: number;
    pendingSignatures: number;
  };
  versionsMissingCmSignature: VersionStatsVersionItem[];
  versionsNotDistributed: VersionStatsVersionItem[];
  decisionsVoidedRecently: VoidedDecisionItem[];
}

// ============================================
// REVIEW SCHEDULE TYPES
// ============================================

export type ScheduleType = 'IEP_ANNUAL_REVIEW' | 'IEP_REEVALUATION' | 'PLAN_AMENDMENT_REVIEW' | 'SECTION504_PERIODIC_REVIEW' | 'BIP_REVIEW';
export type ReviewScheduleStatus = 'OPEN' | 'COMPLETE' | 'OVERDUE';

export interface ReviewSchedule {
  id: string;
  planInstanceId: string;
  scheduleType: ScheduleType;
  dueDate: string;
  leadDays: number;
  status: ReviewScheduleStatus;
  notes?: string | null;
  completedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  assignedTo?: { id: string; displayName: string; email?: string } | null;
  createdBy?: { id: string; displayName: string };
  completedBy?: { id: string; displayName: string } | null;
  planInstance?: {
    id: string;
    student: { id: string; firstName: string; lastName: string };
    planType: { code: string; name: string };
  };
  complianceTasks?: ComplianceTask[];
}

export interface CreateReviewScheduleData {
  scheduleType: ScheduleType;
  dueDate: string;
  leadDays?: number;
  notes?: string;
  assignedToUserId?: string;
}

export interface UpdateReviewScheduleData {
  dueDate?: string;
  leadDays?: number;
  notes?: string;
  assignedToUserId?: string | null;
}

export interface ScheduleTypeInfo {
  value: ScheduleType;
  label: string;
  description: string;
}

// ============================================
// COMPLIANCE TASK TYPES
// ============================================

export type ComplianceTaskType = 'REVIEW_DUE_SOON' | 'REVIEW_OVERDUE' | 'DOCUMENT_REQUIRED' | 'SIGNATURE_NEEDED' | 'MEETING_REQUIRED';
export type ComplianceTaskStatus = 'OPEN' | 'IN_PROGRESS' | 'COMPLETE' | 'DISMISSED';

export interface ComplianceTask {
  id: string;
  taskType: ComplianceTaskType;
  status: ComplianceTaskStatus;
  title: string;
  description?: string | null;
  dueDate?: string | null;
  priority: number;
  completedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  assignedTo?: { id: string; displayName: string; email?: string } | null;
  createdBy?: { id: string; displayName: string };
  completedBy?: { id: string; displayName: string } | null;
  student?: { id: string; firstName: string; lastName: string } | null;
  planInstance?: {
    id: string;
    planType: { code: string; name: string };
  } | null;
  reviewSchedule?: {
    id: string;
    scheduleType: ScheduleType;
    dueDate: string;
    status?: ReviewScheduleStatus;
  } | null;
}

export interface CreateComplianceTaskData {
  taskType: ComplianceTaskType;
  title: string;
  description?: string;
  dueDate?: string;
  priority?: number;
  assignedToUserId?: string;
  reviewScheduleId?: string;
  planInstanceId?: string;
  studentId?: string;
}

export interface UpdateComplianceTaskData {
  title?: string;
  description?: string;
  dueDate?: string | null;
  priority?: number;
  status?: ComplianceTaskStatus;
  assignedToUserId?: string | null;
}

export interface TaskTypeInfo {
  value: ComplianceTaskType;
  label: string;
  description: string;
}

export interface ComplianceDashboard {
  summary: {
    open: number;
    inProgress: number;
    overdue: number;
    dueIn30Days: number;
  };
  recentTasks: ComplianceTask[];
}

export interface ReviewDashboard {
  overdue: ReviewSchedule[];
  upcoming: ReviewSchedule[];
  summary: {
    overdueCount: number;
    upcomingCount: number;
    totalDueWithin30Days: number;
  };
}

// ============================================
// DISPUTE CASE TYPES
// ============================================

export type DisputeCaseType = 'SECTION504_COMPLAINT' | 'IEP_DISPUTE' | 'RECORDS_REQUEST' | 'OTHER';
export type DisputeCaseStatus = 'OPEN' | 'IN_REVIEW' | 'RESOLVED' | 'CLOSED';
export type DisputeEventType = 'INTAKE' | 'MEETING' | 'RESPONSE_SENT' | 'DOCUMENT_RECEIVED' | 'RESOLUTION' | 'STATUS_CHANGE' | 'NOTE';

export interface DisputeCase {
  id: string;
  caseNumber: string;
  studentId: string;
  planInstanceId?: string | null;
  caseType: DisputeCaseType;
  status: DisputeCaseStatus;
  summary: string;
  filedDate: string;
  externalReference?: string | null;
  resolutionSummary?: string | null;
  resolvedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  student?: { id: string; firstName: string; lastName: string; stateStudentId?: string };
  planInstance?: {
    id: string;
    planType: { code: string; name: string };
    startDate?: string;
    endDate?: string | null;
  } | null;
  assignedTo?: { id: string; displayName: string; email?: string } | null;
  createdBy?: { id: string; displayName: string };
  resolvedBy?: { id: string; displayName: string } | null;
  events?: DisputeEvent[];
  attachments?: DisputeAttachment[];
  _count?: { events: number; attachments: number };
}

export interface DisputeEvent {
  id: string;
  disputeCaseId: string;
  eventType: DisputeEventType;
  eventDate: string;
  summary: string;
  details?: string | null;
  createdAt: string;
  createdBy?: { id: string; displayName: string };
}

export interface DisputeAttachment {
  id: string;
  disputeCaseId: string;
  fileName: string;
  fileUrl: string;
  mimeType?: string | null;
  fileSize?: number | null;
  description?: string | null;
  uploadedAt: string;
  uploadedBy?: { id: string; displayName: string };
}

export interface CreateDisputeData {
  caseType: DisputeCaseType;
  planInstanceId?: string;
  summary: string;
  filedDate?: string;
  externalReference?: string;
  assignedToUserId?: string;
}

export interface UpdateDisputeData {
  summary?: string;
  status?: DisputeCaseStatus;
  externalReference?: string;
  assignedToUserId?: string | null;
  resolutionSummary?: string;
}

export interface CreateDisputeEventData {
  eventType: DisputeEventType;
  eventDate?: string;
  summary: string;
  details?: string;
}

export interface CreateDisputeAttachmentData {
  fileName: string;
  fileUrl: string;
  mimeType?: string;
  fileSize?: number;
  description?: string;
}

export interface DisputeCaseTypeInfo {
  value: DisputeCaseType;
  label: string;
  description: string;
}

export interface DisputeEventTypeInfo {
  value: DisputeEventType;
  label: string;
  description: string;
}

export interface DisputeDashboard {
  summary: {
    open: number;
    inReview: number;
    resolved: number;
    closed: number;
    active: number;
  };
  recentCases: DisputeCase[];
}

// ============================================
// IN-APP ALERT TYPES
// ============================================

export type AlertType = 'REVIEW_DUE_SOON' | 'REVIEW_OVERDUE' | 'COMPLIANCE_TASK' | 'SIGNATURE_REQUESTED' | 'MEETING_SCHEDULED' | 'DOCUMENT_UPLOADED' | 'GENERAL';

export interface InAppAlert {
  id: string;
  userId: string;
  alertType: AlertType;
  title: string;
  message: string;
  linkUrl?: string | null;
  isRead: boolean;
  readAt?: string | null;
  relatedEntityType?: string | null;
  relatedEntityId?: string | null;
  createdAt: string;
}

export interface CreateAlertData {
  userId: string;
  alertType: AlertType;
  title: string;
  message: string;
  linkUrl?: string;
  relatedEntityType?: string;
  relatedEntityId?: string;
}

export interface BulkCreateAlertData {
  userIds: string[];
  alertType: AlertType;
  title: string;
  message: string;
  linkUrl?: string;
  relatedEntityType?: string;
  relatedEntityId?: string;
}

export interface AlertTypeInfo {
  value: AlertType;
  label: string;
  description: string;
}

// ============================================
// AUDIT LOG TYPES
// ============================================

export type AuditActionType =
  | 'PLAN_VIEWED'
  | 'PLAN_UPDATED'
  | 'PLAN_FINALIZED'
  | 'PDF_EXPORTED'
  | 'PDF_DOWNLOADED'
  | 'SIGNATURE_ADDED'
  | 'REVIEW_SCHEDULE_CREATED'
  | 'CASE_VIEWED'
  | 'CASE_EXPORTED'
  | 'PERMISSION_DENIED';

export type AuditEntityType =
  | 'PLAN'
  | 'PLAN_VERSION'
  | 'PLAN_EXPORT'
  | 'STUDENT'
  | 'GOAL'
  | 'SERVICE'
  | 'REVIEW_SCHEDULE'
  | 'COMPLIANCE_TASK'
  | 'DISPUTE_CASE'
  | 'SIGNATURE_PACKET'
  | 'MEETING';

export interface AuditLog {
  id: string;
  timestamp: string;
  actionType: AuditActionType;
  entityType: AuditEntityType;
  entityId: string;
  studentId?: string | null;
  planId?: string | null;
  planVersionId?: string | null;
  metadata?: Record<string, unknown> | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  actor: {
    id: string;
    displayName: string;
    email: string;
    role?: string;
  };
  student?: {
    id: string;
    recordId: string;
    name: string;
  } | null;
  plan?: {
    id: string;
    planTypeCode: string;
    planTypeName: string;
    status: string;
  } | null;
}

export interface AuditLogFilters {
  dateFrom?: string;
  dateTo?: string;
  userId?: string;
  studentId?: string;
  actionType?: AuditActionType;
  entityType?: AuditEntityType;
}

export interface AuditActionTypeInfo {
  value: AuditActionType;
  label: string;
}

export interface AuditEntityTypeInfo {
  value: AuditEntityType;
  label: string;
}

export interface AuditUser {
  id: string;
  displayName: string;
  email: string;
}

export const api = new ApiClient();
