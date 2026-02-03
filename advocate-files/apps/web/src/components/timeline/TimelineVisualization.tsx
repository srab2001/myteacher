'use client';

import { CaseEvent, DeadlineWithUrgency } from '@/lib/db/types';
import { getEventTypeName, formatDeadline } from '@/lib/timeline/calculator';
import styles from './Timeline.module.css';

interface TimelineItem {
  id: string;
  date: Date;
  type: 'event' | 'deadline';
  title: string;
  description?: string;
  urgency?: string;
  isPast: boolean;
}

interface TimelineVisualizationProps {
  events: CaseEvent[];
  deadlines: DeadlineWithUrgency[];
}

export function TimelineVisualization({ events, deadlines }: TimelineVisualizationProps) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Combine events and deadlines into timeline items
  const timelineItems: TimelineItem[] = [
    ...events.map((event): TimelineItem => ({
      id: `event-${event.id}`,
      date: new Date(event.event_date),
      type: 'event',
      title: getEventTypeName(event.event_type),
      description: event.notes,
      isPast: new Date(event.event_date) < today,
    })),
    ...deadlines.map((deadline): TimelineItem => ({
      id: `deadline-${deadline.id}`,
      date: new Date(deadline.deadline_date),
      type: 'deadline',
      title: deadline.display_name,
      description: deadline.calculated_from,
      urgency: deadline.urgency,
      isPast: new Date(deadline.deadline_date) < today,
    })),
  ];

  // Sort by date
  timelineItems.sort((a, b) => a.date.getTime() - b.date.getTime());

  if (timelineItems.length === 0) {
    return (
      <div className={styles.emptyState}>
        <p>No timeline events yet</p>
        <p className={styles.emptyHint}>
          Add events to build your case timeline
        </p>
      </div>
    );
  }

  const getItemClass = (item: TimelineItem): string => {
    if (item.type === 'event') {
      return item.isPast ? styles.timelineEventPast : styles.timelineEventFuture;
    }
    // Deadline styling based on urgency
    switch (item.urgency) {
      case 'overdue':
        return styles.timelineDeadlineOverdue;
      case 'urgent':
        return styles.timelineDeadlineUrgent;
      case 'warning':
        return styles.timelineDeadlineWarning;
      default:
        return styles.timelineDeadlineNormal;
    }
  };

  const getItemIcon = (item: TimelineItem): string => {
    if (item.type === 'event') {
      return item.isPast ? '✓' : '○';
    }
    // Deadline icons based on urgency
    switch (item.urgency) {
      case 'overdue':
        return '⚠';
      case 'urgent':
        return '!';
      case 'warning':
        return '◐';
      default:
        return '◯';
    }
  };

  // Find today's position in the timeline
  const todayIndex = timelineItems.findIndex(
    (item) => item.date >= today
  );

  return (
    <div className={styles.timeline}>
      <h3 className={styles.sectionTitle}>Timeline</h3>

      <div className={styles.timelineContainer}>
        {timelineItems.map((item, index) => (
          <div key={item.id}>
            {/* Insert today marker */}
            {index === todayIndex && todayIndex !== 0 && (
              <div className={styles.todayMarker}>
                <span className={styles.todayLine}></span>
                <span className={styles.todayLabel}>Today</span>
                <span className={styles.todayLine}></span>
              </div>
            )}

            <div className={`${styles.timelineItem} ${getItemClass(item)}`}>
              <div className={styles.timelineItemIcon}>
                {getItemIcon(item)}
              </div>

              <div className={styles.timelineItemContent}>
                <div className={styles.timelineItemHeader}>
                  <span className={styles.timelineItemTitle}>{item.title}</span>
                  <span className={styles.timelineItemType}>
                    {item.type === 'event' ? 'Event' : 'Deadline'}
                  </span>
                </div>

                <div className={styles.timelineItemDate}>
                  {formatDeadline(item.date)}
                </div>

                {item.description && (
                  <div className={styles.timelineItemDescription}>
                    {item.description}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}

        {/* Today marker at end if all items are past */}
        {todayIndex === -1 && (
          <div className={styles.todayMarker}>
            <span className={styles.todayLine}></span>
            <span className={styles.todayLabel}>Today</span>
            <span className={styles.todayLine}></span>
          </div>
        )}
      </div>
    </div>
  );
}
