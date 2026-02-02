/**
 * Review-related types and interfaces
 */

import { UUID, Timestamp, ReviewStatus } from './common';

export interface Review extends Timestamp {
  id: UUID;
  documentId: UUID;
  caseId: UUID;
  userId: UUID;
  reviewerId?: UUID;
  title: string;
  status: ReviewStatus;
  summary?: string;
  findings?: ReviewFinding[];
  recommendations?: string[];
  dueDate?: Date;
  completedAt?: Date;
  notes?: string;
}

export interface ReviewFinding {
  id: UUID;
  category: ReviewFindingCategory;
  severity: ReviewFindingSeverity;
  title: string;
  description: string;
  pageReference?: string;
  recommendation?: string;
}

export type ReviewFindingCategory =
  | 'compliance'
  | 'goal_quality'
  | 'service_delivery'
  | 'evaluation'
  | 'procedural'
  | 'documentation'
  | 'other';

export type ReviewFindingSeverity =
  | 'low'
  | 'medium'
  | 'high'
  | 'critical';

export interface ReviewWithRelations extends Review {
  document: {
    id: UUID;
    title: string;
    type: string;
  };
  case: {
    id: UUID;
    studentAlias: string;
  };
  reviewer?: {
    id: UUID;
    name: string;
  };
}

export interface CreateReviewInput {
  documentId: UUID;
  caseId: UUID;
  title: string;
  dueDate?: Date;
  notes?: string;
}

export interface UpdateReviewInput {
  title?: string;
  status?: ReviewStatus;
  summary?: string;
  findings?: ReviewFinding[];
  recommendations?: string[];
  dueDate?: Date;
  notes?: string;
}

export interface AddFindingInput {
  category: ReviewFindingCategory;
  severity: ReviewFindingSeverity;
  title: string;
  description: string;
  pageReference?: string;
  recommendation?: string;
}

export interface ReviewSearchParams {
  caseId?: UUID;
  documentId?: UUID;
  status?: ReviewStatus;
  reviewerId?: UUID;
  dueBefore?: Date;
  dueAfter?: Date;
}

export interface ReviewStats {
  total: number;
  pending: number;
  inProgress: number;
  completed: number;
  needsRevision: number;
  averageCompletionDays: number;
}

export interface AIReviewSuggestion {
  category: ReviewFindingCategory;
  severity: ReviewFindingSeverity;
  title: string;
  description: string;
  confidence: number;
  sourceText?: string;
}
