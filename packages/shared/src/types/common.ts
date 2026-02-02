/**
 * Common types and enums used across the application
 */

export type UUID = string;

export interface Timestamp {
  createdAt: Date;
  updatedAt: Date;
}

export interface PaginationParams {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export enum UserRole {
  PARENT = 'parent',
  ADVOCATE = 'advocate',
  ADMIN = 'admin',
}

export enum CaseStatus {
  ACTIVE = 'active',
  PENDING = 'pending',
  CLOSED = 'closed',
  ARCHIVED = 'archived',
}

export enum DocumentType {
  IEP = 'iep',
  EVALUATION = 'evaluation',
  PROGRESS_REPORT = 'progress_report',
  MEETING_NOTES = 'meeting_notes',
  CORRESPONDENCE = 'correspondence',
  MEDICAL = 'medical',
  LEGAL = 'legal',
  OTHER = 'other',
}

export enum ReviewStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  NEEDS_REVISION = 'needs_revision',
}

export enum DeadlineType {
  IEP_MEETING = 'iep_meeting',
  EVALUATION_DUE = 'evaluation_due',
  RESPONSE_REQUIRED = 'response_required',
  FILING_DEADLINE = 'filing_deadline',
  REVIEW_DUE = 'review_due',
  CUSTOM = 'custom',
}

export enum DeadlinePriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent',
}
