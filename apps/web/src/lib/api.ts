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
  async startWizardSession(planId: string, goalArea: string, linkedArtifactIds?: string[]): Promise<{ sessionId: string; message: string }> {
    return this.fetch('/api/goal-wizard/session/start', {
      method: 'POST',
      body: JSON.stringify({ planId, goalArea, linkedArtifactIds }),
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

export const api = new ApiClient();
