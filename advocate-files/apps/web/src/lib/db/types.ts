/**
 * Database types for Maryland Special Education Tools
 */

// User roles
export type UserRole = 'parent' | 'advocate' | 'admin';
export type PlanTier = 'free' | 'basic' | 'pro';
export type UserStatus = 'active' | 'inactive' | 'suspended';

// Plan types
export type PlanType = 'iep' | '504' | 'unknown';
export type CaseStatus = 'active' | 'closed' | 'archived';

// Event types
export type EventType =
  | 'referral_date'
  | 'consent_date'
  | 'evaluation_date'
  | 'iep_meeting_date'
  | 'annual_review_date'
  | 'triennial_date'
  | 'amendment_date'
  | 'transition_meeting_date';

// Deadline types
export type DeadlineType =
  | 'evaluation_due'
  | 'iep_meeting_due'
  | 'annual_review_due'
  | 'triennial_due'
  | 'consent_response_due';

export type DeadlineStatus = 'pending' | 'met' | 'missed' | 'waived';

// Artifact types
export type ArtifactType =
  | 'notice'
  | 'iep'
  | 'evaluation'
  | '504_plan'
  | 'progress_report'
  | 'correspondence'
  | 'other';

export type ExtractionStatus = 'pending' | 'processing' | 'completed' | 'failed';

// Document source types
export type DocumentSourceType =
  | 'comar'
  | 'msde'
  | 'county_policy'
  | 'idea'
  | 'section_504'
  | 'guidance';

// Review types
export type ReviewType =
  | 'iep_review'
  | 'evaluation_review'
  | '504_review'
  | 'compliance_check';

// Meeting types
export type MeetingType = 'initial' | 'annual' | 'triennial' | 'revision';
export type MeetingPrepStatus = 'draft' | 'generated' | 'exported';

// Message roles
export type MessageRole = 'user' | 'assistant' | 'system';

// Database models
export interface User {
  id: string;
  email: string;
  name?: string;
  role: UserRole;
  state: string;
  county?: string;
  plan_tier: PlanTier;
  status: UserStatus;
  created_at: Date;
  closed_at?: Date;
  deleted_at?: Date;
}

export interface Case {
  id: string;
  user_id: string;
  student_name: string;
  student_dob?: Date;
  student_grade?: string;
  school_name?: string;
  school_district?: string;
  disability_category?: string;
  plan_type: PlanType;
  notes?: string;
  status: CaseStatus;
  created_at: Date;
  updated_at: Date;
}

export interface CaseEvent {
  id: string;
  case_id: string;
  event_type: EventType;
  event_date: Date;
  notes?: string;
  document_ids?: string[];
  created_at: Date;
}

export interface Deadline {
  id: string;
  case_id: string;
  deadline_type: DeadlineType;
  deadline_date: Date;
  calculated_from: string;
  source_event_id?: string;
  status: DeadlineStatus;
  met_date?: Date;
  notes?: string;
  created_at: Date;
  updated_at: Date;
}

export interface Artifact {
  id: string;
  case_id: string;
  artifact_type: ArtifactType;
  file_name: string;
  blob_url: string;
  mime_type: string;
  file_size_bytes: number;
  uploaded_at: Date;
  extracted_text?: string;
  extraction_status: ExtractionStatus;
  extraction_error?: string;
}

export interface Document {
  id: string;
  source_type: DocumentSourceType;
  title: string;
  county?: string;
  url?: string;
  content?: string;
  content_hash?: string;
  created_at: Date;
  updated_at: Date;
}

export interface Chunk {
  id: string;
  document_id: string;
  chunk_index: number;
  content: string;
  embedding?: number[];
  metadata?: Record<string, unknown>;
  created_at: Date;
}

export interface Conversation {
  id: string;
  user_id: string;
  case_id?: string;
  title?: string;
  created_at: Date;
  updated_at: Date;
}

export interface Message {
  id: string;
  conversation_id: string;
  role: MessageRole;
  content: string;
  metadata?: Record<string, unknown>;
  created_at: Date;
}

export interface Review {
  id: string;
  artifact_id: string;
  review_type: ReviewType;
  findings: Record<string, unknown>;
  summary?: string;
  score?: number;
  created_at: Date;
}

export interface MeetingPrep {
  id: string;
  case_id?: string;
  user_id: string;
  meeting_type: MeetingType;
  meeting_date: Date;
  form_data: Record<string, unknown>;
  generated_materials?: Record<string, unknown>;
  status: MeetingPrepStatus;
  created_at: Date;
  updated_at: Date;
}

// Extended types with relations
export interface CaseWithEvents extends Case {
  events: CaseEvent[];
  deadlines: Deadline[];
}

export interface CaseWithArtifacts extends Case {
  artifacts: Artifact[];
}

export interface DeadlineWithCase extends Deadline {
  case: Case;
}

// API request/response types
export interface CreateCaseRequest {
  user_id?: string;
  student_name: string;
  student_dob?: string;
  student_grade?: string;
  school_name?: string;
  school_district?: string;
  disability_category?: string;
  plan_type?: PlanType;
  notes?: string;
}

export interface CreateEventRequest {
  event_type: EventType;
  event_date: string; // ISO date string
  notes?: string;
  document_ids?: string[];
}

export type UrgencyLevel = 'overdue' | 'urgent' | 'warning' | 'normal';

export interface DeadlineWithUrgency extends Deadline {
  days_remaining: number;
  urgency: UrgencyLevel;
  display_name: string;
  days_display: string;
  source_event_type?: string;
  source_event_date?: Date;
}

export interface CreateArtifactRequest {
  artifact_type: ArtifactType;
  file_name: string;
  mime_type: string;
  file_size_bytes: number;
}

export interface UpdateDeadlineRequest {
  status?: DeadlineStatus;
  met_date?: string;
  notes?: string;
}
