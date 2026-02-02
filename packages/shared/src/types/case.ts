/**
 * Case-related types and interfaces
 */

import { UUID, Timestamp, CaseStatus } from './common';

export interface Case extends Timestamp {
  id: UUID;
  studentAlias: string;
  userId: UUID;
  schoolDistrict: string;
  schoolName?: string;
  gradeLevel?: string;
  status: CaseStatus;
  disabilityCategories?: string[];
  primaryContact?: string;
  notes?: string;
  startDate?: Date;
  closedDate?: Date;
}

export interface CaseWithRelations extends Case {
  deadlines?: CaseDeadlineSummary[];
  documents?: CaseDocumentSummary[];
  recentActivity?: CaseActivity[];
}

export interface CaseDeadlineSummary {
  id: UUID;
  title: string;
  dueDate: Date;
  isOverdue: boolean;
}

export interface CaseDocumentSummary {
  id: UUID;
  title: string;
  type: string;
  uploadedAt: Date;
}

export interface CaseActivity {
  id: UUID;
  type: string;
  description: string;
  timestamp: Date;
}

export interface CreateCaseInput {
  studentAlias: string;
  schoolDistrict: string;
  schoolName?: string;
  gradeLevel?: string;
  disabilityCategories?: string[];
  primaryContact?: string;
  notes?: string;
}

export interface UpdateCaseInput {
  studentAlias?: string;
  schoolDistrict?: string;
  schoolName?: string;
  gradeLevel?: string;
  status?: CaseStatus;
  disabilityCategories?: string[];
  primaryContact?: string;
  notes?: string;
}

export interface CaseSearchParams {
  query?: string;
  status?: CaseStatus;
  schoolDistrict?: string;
  hasOverdueDeadlines?: boolean;
}
