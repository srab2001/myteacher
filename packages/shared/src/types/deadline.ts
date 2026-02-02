/**
 * Deadline-related types and interfaces
 */

import { UUID, Timestamp, DeadlineType, DeadlinePriority } from './common';

export interface Deadline extends Timestamp {
  id: UUID;
  caseId: UUID;
  userId: UUID;
  title: string;
  description?: string;
  dueDate: Date;
  type: DeadlineType;
  priority: DeadlinePriority;
  isCompleted: boolean;
  completedAt?: Date;
  reminderSent: boolean;
  reminderDate?: Date;
  notes?: string;
}

export interface DeadlineWithCase extends Deadline {
  case: {
    id: UUID;
    studentAlias: string;
    schoolDistrict: string;
  };
}

export interface CreateDeadlineInput {
  caseId: UUID;
  title: string;
  description?: string;
  dueDate: Date;
  type: DeadlineType;
  priority?: DeadlinePriority;
  reminderDate?: Date;
  notes?: string;
}

export interface UpdateDeadlineInput {
  title?: string;
  description?: string;
  dueDate?: Date;
  type?: DeadlineType;
  priority?: DeadlinePriority;
  isCompleted?: boolean;
  reminderDate?: Date;
  notes?: string;
}

export interface DeadlineSearchParams {
  caseId?: UUID;
  type?: DeadlineType;
  priority?: DeadlinePriority;
  isCompleted?: boolean;
  isOverdue?: boolean;
  dueBefore?: Date;
  dueAfter?: Date;
}

export interface DeadlineStats {
  total: number;
  completed: number;
  pending: number;
  overdue: number;
  dueThisWeek: number;
  dueThisMonth: number;
}
