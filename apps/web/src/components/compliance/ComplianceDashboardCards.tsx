'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { api, ReviewDashboard, ComplianceDashboard, ReviewSchedule, ComplianceTask } from '@/lib/api';
import styles from './ComplianceDashboardCards.module.css';

const SCHEDULE_TYPE_LABELS: Record<string, string> = {
  IEP_ANNUAL_REVIEW: 'IEP Annual',
  IEP_REEVALUATION: 'IEP Reeval',
  PLAN_AMENDMENT_REVIEW: 'Amendment',
  SECTION504_PERIODIC_REVIEW: '504 Review',
  BIP_REVIEW: 'BIP Review',
};

export function ComplianceDashboardCards() {
  const [reviewData, setReviewData] = useState<ReviewDashboard | null>(null);
  const [complianceData, setComplianceData] = useState<ComplianceDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedSection, setExpandedSection] = useState<'reviews' | 'tasks' | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [reviewRes, complianceRes] = await Promise.all([
          api.getReviewDashboard(30).catch(() => null),
          api.getComplianceDashboard().catch(() => null),
        ]);
        if (reviewRes) setReviewData(reviewRes);
        if (complianceRes) setComplianceData(complianceRes);
        // If both failed, show error; otherwise show partial data
        if (!reviewRes && !complianceRes) {
          setError('Compliance features are currently unavailable');
        }
      } catch (err) {
        console.error('Failed to load compliance data:', err);
        setError('Compliance features are currently unavailable');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>
          <div className="spinner" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>{error}</div>
      </div>
    );
  }

  const totalOverdue = (reviewData?.summary.overdueCount || 0) + (complianceData?.summary.overdue || 0);
  const totalDueSoon = (reviewData?.summary.upcomingCount || 0) + (complianceData?.summary.dueIn30Days || 0);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h3>Compliance Overview</h3>
      </div>

      <div className={styles.cardsGrid}>
        {/* Overdue Card */}
        <div className={`${styles.card} ${totalOverdue > 0 ? styles.cardOverdue : ''}`}>
          <div className={styles.cardNumber}>{totalOverdue}</div>
          <div className={styles.cardLabel}>Overdue</div>
          {totalOverdue > 0 && (
            <div className={styles.cardDetail}>
              {reviewData?.summary.overdueCount || 0} reviews, {complianceData?.summary.overdue || 0} tasks
            </div>
          )}
        </div>

        {/* Due in 30 Days Card */}
        <div className={`${styles.card} ${totalDueSoon > 0 ? styles.cardDueSoon : ''}`}>
          <div className={styles.cardNumber}>{totalDueSoon}</div>
          <div className={styles.cardLabel}>Due in 30 Days</div>
          {totalDueSoon > 0 && (
            <div className={styles.cardDetail}>
              {reviewData?.summary.upcomingCount || 0} reviews, {complianceData?.summary.dueIn30Days || 0} tasks
            </div>
          )}
        </div>

        {/* Open Tasks Card */}
        <div className={styles.card}>
          <div className={styles.cardNumber}>{complianceData?.summary.open || 0}</div>
          <div className={styles.cardLabel}>Open Tasks</div>
          {(complianceData?.summary.inProgress || 0) > 0 && (
            <div className={styles.cardDetail}>
              {complianceData?.summary.inProgress} in progress
            </div>
          )}
        </div>
      </div>

      {/* Expandable Sections */}
      {(reviewData?.overdue?.length || 0) > 0 || (reviewData?.upcoming?.length || 0) > 0 ? (
        <div className={styles.expandableSection}>
          <button
            className={styles.expandBtn}
            onClick={() => setExpandedSection(expandedSection === 'reviews' ? null : 'reviews')}
          >
            <span>Upcoming Reviews</span>
            <span className={styles.expandIcon}>{expandedSection === 'reviews' ? '▼' : '▶'}</span>
          </button>
          {expandedSection === 'reviews' && (
            <div className={styles.expandedContent}>
              {reviewData?.overdue && reviewData.overdue.length > 0 && (
                <div className={styles.listSection}>
                  <h4 className={styles.overdueLabel}>Overdue</h4>
                  {reviewData.overdue.slice(0, 5).map((review: ReviewSchedule) => (
                    <div key={review.id} className={styles.listItem}>
                      <div className={styles.listItemMain}>
                        <span className={styles.listItemType}>
                          {SCHEDULE_TYPE_LABELS[review.scheduleType] || review.scheduleType}
                        </span>
                        <span className={styles.listItemStudent}>
                          {review.planInstance?.student?.firstName} {review.planInstance?.student?.lastName}
                        </span>
                      </div>
                      <span className={styles.listItemDate}>
                        Due: {format(new Date(review.dueDate), 'MMM d')}
                      </span>
                    </div>
                  ))}
                </div>
              )}
              {reviewData?.upcoming && reviewData.upcoming.length > 0 && (
                <div className={styles.listSection}>
                  <h4>Upcoming</h4>
                  {reviewData.upcoming.slice(0, 5).map((review: ReviewSchedule) => (
                    <div key={review.id} className={styles.listItem}>
                      <div className={styles.listItemMain}>
                        <span className={styles.listItemType}>
                          {SCHEDULE_TYPE_LABELS[review.scheduleType] || review.scheduleType}
                        </span>
                        <span className={styles.listItemStudent}>
                          {review.planInstance?.student?.firstName} {review.planInstance?.student?.lastName}
                        </span>
                      </div>
                      <span className={styles.listItemDate}>
                        Due: {format(new Date(review.dueDate), 'MMM d')}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      ) : null}

      {(complianceData?.recentTasks?.length || 0) > 0 && (
        <div className={styles.expandableSection}>
          <button
            className={styles.expandBtn}
            onClick={() => setExpandedSection(expandedSection === 'tasks' ? null : 'tasks')}
          >
            <span>Recent Tasks</span>
            <span className={styles.expandIcon}>{expandedSection === 'tasks' ? '▼' : '▶'}</span>
          </button>
          {expandedSection === 'tasks' && (
            <div className={styles.expandedContent}>
              {complianceData?.recentTasks?.slice(0, 5).map((task: ComplianceTask) => (
                <div key={task.id} className={styles.listItem}>
                  <div className={styles.listItemMain}>
                    <span className={styles.listItemTitle}>{task.title}</span>
                    {task.student && (
                      <span className={styles.listItemStudent}>
                        {task.student.firstName} {task.student.lastName}
                      </span>
                    )}
                  </div>
                  {task.dueDate && (
                    <span className={styles.listItemDate}>
                      Due: {format(new Date(task.dueDate), 'MMM d')}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
