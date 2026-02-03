/**
 * Maryland Special Education Timeline Calculator
 *
 * Based on Maryland COMAR regulations and IDEA requirements
 */

import { EventType, DeadlineType } from '../db/types';

// Maryland-specific timeline rules (in days)
export const MARYLAND_TIMELINES = {
  // From consent to evaluation completion: 60 calendar days
  EVALUATION_FROM_CONSENT: 60,

  // From evaluation to IEP meeting: 30 calendar days
  IEP_MEETING_FROM_EVALUATION: 30,

  // Annual IEP review: within 365 days of previous IEP
  ANNUAL_REVIEW: 365,

  // Triennial reevaluation: within 3 years
  TRIENNIAL_YEARS: 3,

  // Response to consent request: 30 calendar days
  CONSENT_RESPONSE: 30,
} as const;

export interface CalculatedDeadline {
  deadline_type: DeadlineType;
  deadline_date: Date;
  calculated_from: string;
  source_event_type: EventType;
}

/**
 * Add calendar days to a date
 */
export function addCalendarDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

/**
 * Add years to a date
 */
export function addYears(date: Date, years: number): Date {
  const result = new Date(date);
  result.setFullYear(result.getFullYear() + years);
  return result;
}

/**
 * Add business days (excluding weekends)
 */
export function addBusinessDays(date: Date, days: number): Date {
  const result = new Date(date);
  let addedDays = 0;

  while (addedDays < days) {
    result.setDate(result.getDate() + 1);
    const dayOfWeek = result.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      addedDays++;
    }
  }

  return result;
}

/**
 * Calculate evaluation deadline from consent date
 * Maryland: 60 calendar days from written consent
 */
export function evaluationDeadline(consentDate: Date): Date {
  return addCalendarDays(consentDate, MARYLAND_TIMELINES.EVALUATION_FROM_CONSENT);
}

/**
 * Calculate IEP meeting deadline from evaluation completion
 * Maryland: 30 calendar days from evaluation completion
 */
export function iepMeetingDeadline(evaluationDate: Date): Date {
  return addCalendarDays(evaluationDate, MARYLAND_TIMELINES.IEP_MEETING_FROM_EVALUATION);
}

/**
 * Calculate annual review deadline from last IEP date
 * Maryland: within 365 days (1 year) of the IEP
 */
export function annualReviewDeadline(lastIepDate: Date): Date {
  return addCalendarDays(lastIepDate, MARYLAND_TIMELINES.ANNUAL_REVIEW);
}

/**
 * Calculate triennial reevaluation deadline
 * Maryland: within 3 years of last evaluation
 */
export function triennialDeadline(lastEvaluationDate: Date): Date {
  return addYears(lastEvaluationDate, MARYLAND_TIMELINES.TRIENNIAL_YEARS);
}

/**
 * Calculate all applicable deadlines based on an event
 */
export function calculateDeadlinesForEvent(
  eventType: EventType,
  eventDate: Date
): CalculatedDeadline[] {
  const deadlines: CalculatedDeadline[] = [];

  switch (eventType) {
    case 'consent_date':
      // Consent triggers evaluation deadline
      deadlines.push({
        deadline_type: 'evaluation_due',
        deadline_date: evaluationDeadline(eventDate),
        calculated_from: `${MARYLAND_TIMELINES.EVALUATION_FROM_CONSENT} calendar days from consent`,
        source_event_type: eventType,
      });
      break;

    case 'evaluation_date':
      // Evaluation completion triggers IEP meeting deadline
      deadlines.push({
        deadline_type: 'iep_meeting_due',
        deadline_date: iepMeetingDeadline(eventDate),
        calculated_from: `${MARYLAND_TIMELINES.IEP_MEETING_FROM_EVALUATION} calendar days from evaluation`,
        source_event_type: eventType,
      });
      // Also triggers triennial deadline
      deadlines.push({
        deadline_type: 'triennial_due',
        deadline_date: triennialDeadline(eventDate),
        calculated_from: `${MARYLAND_TIMELINES.TRIENNIAL_YEARS} years from evaluation`,
        source_event_type: eventType,
      });
      break;

    case 'iep_meeting_date':
      // IEP meeting triggers annual review deadline
      deadlines.push({
        deadline_type: 'annual_review_due',
        deadline_date: annualReviewDeadline(eventDate),
        calculated_from: `${MARYLAND_TIMELINES.ANNUAL_REVIEW} days from IEP meeting`,
        source_event_type: eventType,
      });
      break;

    case 'annual_review_date':
      // Annual review triggers next annual review
      deadlines.push({
        deadline_type: 'annual_review_due',
        deadline_date: annualReviewDeadline(eventDate),
        calculated_from: `${MARYLAND_TIMELINES.ANNUAL_REVIEW} days from annual review`,
        source_event_type: eventType,
      });
      break;

    case 'triennial_date':
      // Triennial triggers next triennial and IEP meeting
      deadlines.push({
        deadline_type: 'triennial_due',
        deadline_date: triennialDeadline(eventDate),
        calculated_from: `${MARYLAND_TIMELINES.TRIENNIAL_YEARS} years from triennial`,
        source_event_type: eventType,
      });
      deadlines.push({
        deadline_type: 'iep_meeting_due',
        deadline_date: iepMeetingDeadline(eventDate),
        calculated_from: `${MARYLAND_TIMELINES.IEP_MEETING_FROM_EVALUATION} calendar days from triennial evaluation`,
        source_event_type: eventType,
      });
      break;

    default:
      // Other event types don't trigger automatic deadlines
      break;
  }

  return deadlines;
}

/**
 * Check if a deadline is overdue
 */
export function isOverdue(deadlineDate: Date): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const deadline = new Date(deadlineDate);
  deadline.setHours(0, 0, 0, 0);
  return deadline < today;
}

/**
 * Calculate days until deadline (negative if overdue)
 */
export function daysUntil(deadlineDate: Date): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const deadline = new Date(deadlineDate);
  deadline.setHours(0, 0, 0, 0);
  const diffTime = deadline.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Get urgency level based on days remaining
 */
export function getUrgencyLevel(
  daysRemaining: number
): 'overdue' | 'urgent' | 'warning' | 'normal' {
  if (daysRemaining < 0) return 'overdue';
  if (daysRemaining <= 7) return 'urgent';
  if (daysRemaining <= 14) return 'warning';
  return 'normal';
}

/**
 * Format deadline for display
 */
export function formatDeadline(deadlineDate: Date): string {
  return deadlineDate.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * Format days remaining for display
 */
export function formatDaysRemaining(days: number): string {
  if (days < 0) {
    const absDays = Math.abs(days);
    return `${absDays} day${absDays === 1 ? '' : 's'} overdue`;
  }
  if (days === 0) return 'Due today';
  if (days === 1) return '1 day remaining';
  return `${days} days remaining`;
}

/**
 * Get human-readable deadline type name
 */
export function getDeadlineTypeName(type: DeadlineType): string {
  const names: Record<DeadlineType, string> = {
    evaluation_due: 'Evaluation Due',
    iep_meeting_due: 'IEP Meeting Due',
    annual_review_due: 'Annual Review Due',
    triennial_due: 'Triennial Reevaluation Due',
    consent_response_due: 'Consent Response Due',
  };
  return names[type] || type;
}

/**
 * Get human-readable event type name
 */
export function getEventTypeName(type: EventType): string {
  const names: Record<EventType, string> = {
    referral_date: 'Referral',
    consent_date: 'Consent Received',
    evaluation_date: 'Evaluation Completed',
    iep_meeting_date: 'IEP Meeting',
    annual_review_date: 'Annual Review',
    triennial_date: 'Triennial Reevaluation',
    amendment_date: 'IEP Amendment',
    transition_meeting_date: 'Transition Meeting',
  };
  return names[type] || type;
}
