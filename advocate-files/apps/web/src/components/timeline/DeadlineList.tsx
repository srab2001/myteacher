'use client';

import { DeadlineWithUrgency } from '@/lib/db/types';
import { formatDeadline } from '@/lib/timeline/calculator';
import styles from './Timeline.module.css';

interface DeadlineListProps {
  deadlines: DeadlineWithUrgency[];
  onMarkComplete?: (deadlineId: string) => void;
  isLoading?: boolean;
}

export function DeadlineList({ deadlines, onMarkComplete, isLoading }: DeadlineListProps) {
  if (deadlines.length === 0) {
    return (
      <div className={styles.emptyState}>
        <p>No upcoming deadlines</p>
        <p className={styles.emptyHint}>
          Add events to your case to automatically calculate deadlines based on Maryland regulations
        </p>
      </div>
    );
  }

  const getUrgencyClass = (urgency: string): string => {
    switch (urgency) {
      case 'overdue':
        return styles.urgencyOverdue;
      case 'urgent':
        return styles.urgencyUrgent;
      case 'warning':
        return styles.urgencyWarning;
      default:
        return styles.urgencyNormal;
    }
  };

  const getUrgencyIcon = (urgency: string): string => {
    switch (urgency) {
      case 'overdue':
        return '⚠️';
      case 'urgent':
        return '🔴';
      case 'warning':
        return '🟡';
      default:
        return '🟢';
    }
  };

  return (
    <div className={styles.deadlineList}>
      <h3 className={styles.sectionTitle}>Upcoming Deadlines</h3>

      <div className={styles.deadlineItems}>
        {deadlines.map((deadline) => (
          <div
            key={deadline.id}
            className={`${styles.deadlineItem} ${getUrgencyClass(deadline.urgency)}`}
          >
            <div className={styles.deadlineHeader}>
              <span className={styles.urgencyIcon}>
                {getUrgencyIcon(deadline.urgency)}
              </span>
              <span className={styles.deadlineName}>{deadline.display_name}</span>
              <span className={`${styles.urgencyBadge} ${getUrgencyClass(deadline.urgency)}`}>
                {deadline.days_display}
              </span>
            </div>

            <div className={styles.deadlineDetails}>
              <div className={styles.deadlineDate}>
                {formatDeadline(new Date(deadline.deadline_date))}
              </div>
              <div className={styles.deadlineCalculation}>
                {deadline.calculated_from}
              </div>
            </div>

            {onMarkComplete && deadline.status === 'pending' && (
              <button
                onClick={() => onMarkComplete(deadline.id)}
                className={styles.buttonSmall}
                disabled={isLoading}
              >
                Mark Complete
              </button>
            )}

            {deadline.status === 'met' && (
              <span className={styles.completedBadge}>Completed</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

interface DeadlineSummaryProps {
  summary: {
    overdue: number;
    urgent: number;
    warning: number;
    normal: number;
    total: number;
  };
}

export function DeadlineSummary({ summary }: DeadlineSummaryProps) {
  return (
    <div className={styles.summaryGrid}>
      <div className={`${styles.summaryCard} ${styles.urgencyOverdue}`}>
        <span className={styles.summaryNumber}>{summary.overdue}</span>
        <span className={styles.summaryLabel}>Overdue</span>
      </div>
      <div className={`${styles.summaryCard} ${styles.urgencyUrgent}`}>
        <span className={styles.summaryNumber}>{summary.urgent}</span>
        <span className={styles.summaryLabel}>Due in 7 days</span>
      </div>
      <div className={`${styles.summaryCard} ${styles.urgencyWarning}`}>
        <span className={styles.summaryNumber}>{summary.warning}</span>
        <span className={styles.summaryLabel}>Due in 14 days</span>
      </div>
      <div className={`${styles.summaryCard} ${styles.urgencyNormal}`}>
        <span className={styles.summaryNumber}>{summary.normal}</span>
        <span className={styles.summaryLabel}>On Track</span>
      </div>
    </div>
  );
}
