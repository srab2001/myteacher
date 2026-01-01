'use client';

import { useState, useEffect, useCallback } from 'react';
import { format, isPast, differenceInDays } from 'date-fns';
import {
  api,
  ReviewSchedule,
  ScheduleType,
  ReviewScheduleStatus,
  CreateReviewScheduleData,
} from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import styles from './ReviewSchedulesTab.module.css';

interface ReviewSchedulesTabProps {
  planId: string;
}

const SCHEDULE_TYPE_LABELS: Record<ScheduleType, string> = {
  IEP_ANNUAL_REVIEW: 'IEP Annual Review',
  IEP_REEVALUATION: 'IEP Reevaluation',
  PLAN_AMENDMENT_REVIEW: 'Plan Amendment Review',
  SECTION504_PERIODIC_REVIEW: 'Section 504 Periodic Review',
  BIP_REVIEW: 'BIP Review',
};

const SCHEDULE_TYPE_DESCRIPTIONS: Record<ScheduleType, string> = {
  IEP_ANNUAL_REVIEW: 'Annual review of IEP goals and services',
  IEP_REEVALUATION: 'Three-year comprehensive reevaluation',
  PLAN_AMENDMENT_REVIEW: 'Review of plan amendments',
  SECTION504_PERIODIC_REVIEW: 'Periodic review of 504 accommodations',
  BIP_REVIEW: 'Behavior Intervention Plan review',
};

export function ReviewSchedulesTab({ planId }: ReviewSchedulesTabProps) {
  const { user } = useAuth();
  const [schedules, setSchedules] = useState<ReviewSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<ReviewScheduleStatus | ''>('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState<ReviewSchedule | null>(null);
  const [showCompleteModal, setShowCompleteModal] = useState<ReviewSchedule | null>(null);

  const canManage = user?.role === 'ADMIN' || user?.role === 'CASE_MANAGER';

  const loadSchedules = useCallback(async () => {
    try {
      setLoading(true);
      const params: { status?: ReviewScheduleStatus } = {};
      if (filterStatus) params.status = filterStatus;

      const { reviewSchedules } = await api.getReviewSchedules(planId, params);
      setSchedules(reviewSchedules);
      setError(null);
    } catch (err) {
      console.error('Failed to load review schedules:', err);
      setError('Failed to load review schedules');
    } finally {
      setLoading(false);
    }
  }, [planId, filterStatus]);

  useEffect(() => {
    loadSchedules();
  }, [loadSchedules]);

  const handleCreate = async (data: CreateReviewScheduleData) => {
    try {
      await api.createReviewSchedule(planId, data);
      await loadSchedules();
      setShowAddModal(false);
    } catch (err) {
      console.error('Failed to create review schedule:', err);
      throw err;
    }
  };

  const handleComplete = async (scheduleId: string, notes?: string) => {
    try {
      await api.completeReviewSchedule(scheduleId, notes);
      await loadSchedules();
      setShowCompleteModal(null);
    } catch (err) {
      console.error('Failed to complete review schedule:', err);
      throw err;
    }
  };

  const getStatusBadgeClass = (schedule: ReviewSchedule) => {
    if (schedule.status === 'COMPLETE') return styles.statusComplete;
    if (schedule.status === 'OVERDUE' || isPast(new Date(schedule.dueDate))) {
      return styles.statusOverdue;
    }
    const daysUntilDue = differenceInDays(new Date(schedule.dueDate), new Date());
    if (daysUntilDue <= schedule.leadDays) {
      return styles.statusDueSoon;
    }
    return styles.statusOpen;
  };

  const getStatusLabel = (schedule: ReviewSchedule) => {
    if (schedule.status === 'COMPLETE') return 'Complete';
    if (schedule.status === 'OVERDUE' || isPast(new Date(schedule.dueDate))) {
      return 'Overdue';
    }
    const daysUntilDue = differenceInDays(new Date(schedule.dueDate), new Date());
    if (daysUntilDue <= schedule.leadDays) {
      return `Due in ${daysUntilDue} days`;
    }
    return 'Open';
  };

  if (loading && schedules.length === 0) {
    return (
      <div className={styles.loading}>
        <div className="spinner" />
        <p>Loading review schedules...</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2>Review Schedules</h2>
        {canManage && (
          <button
            className="btn btn-primary"
            onClick={() => setShowAddModal(true)}
          >
            Add Review
          </button>
        )}
      </div>

      {error && <div className={styles.error}>{error}</div>}

      <div className={styles.filters}>
        <div className={styles.filterGroup}>
          <label>Status</label>
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value as ReviewScheduleStatus | '')}
          >
            <option value="">All Statuses</option>
            <option value="OPEN">Open</option>
            <option value="OVERDUE">Overdue</option>
            <option value="COMPLETE">Complete</option>
          </select>
        </div>
      </div>

      {schedules.length === 0 ? (
        <div className={styles.emptyState}>
          <p>No review schedules created yet.</p>
          {canManage && (
            <p>Click &quot;Add Review&quot; to schedule a plan review.</p>
          )}
        </div>
      ) : (
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Type</th>
                <th>Due Date</th>
                <th>Status</th>
                <th>Assigned To</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {schedules.map(schedule => (
                <tr key={schedule.id} className={schedule.status === 'COMPLETE' ? styles.completeRow : ''}>
                  <td>
                    <span className={styles.typeLabel}>
                      {SCHEDULE_TYPE_LABELS[schedule.scheduleType]}
                    </span>
                  </td>
                  <td>{format(new Date(schedule.dueDate), 'MMM d, yyyy')}</td>
                  <td>
                    <span className={`${styles.statusBadge} ${getStatusBadgeClass(schedule)}`}>
                      {getStatusLabel(schedule)}
                    </span>
                  </td>
                  <td>{schedule.assignedTo?.displayName || '—'}</td>
                  <td>
                    <div className={styles.actions}>
                      <button
                        className={styles.viewBtn}
                        onClick={() => setShowDetailModal(schedule)}
                      >
                        View
                      </button>
                      {canManage && schedule.status !== 'COMPLETE' && (
                        <button
                          className={styles.completeBtn}
                          onClick={() => setShowCompleteModal(schedule)}
                        >
                          Complete
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Review Modal */}
      {showAddModal && (
        <AddReviewModal
          onClose={() => setShowAddModal(false)}
          onCreate={handleCreate}
        />
      )}

      {/* Review Detail Modal */}
      {showDetailModal && (
        <ReviewDetailModal
          schedule={showDetailModal}
          onClose={() => setShowDetailModal(null)}
          onComplete={canManage && showDetailModal.status !== 'COMPLETE' ? () => {
            setShowDetailModal(null);
            setShowCompleteModal(showDetailModal);
          } : undefined}
        />
      )}

      {/* Complete Confirmation Modal */}
      {showCompleteModal && (
        <CompleteReviewModal
          schedule={showCompleteModal}
          onClose={() => setShowCompleteModal(null)}
          onComplete={(notes) => handleComplete(showCompleteModal.id, notes)}
        />
      )}
    </div>
  );
}

interface AddReviewModalProps {
  onClose: () => void;
  onCreate: (data: CreateReviewScheduleData) => Promise<void>;
}

function AddReviewModal({ onClose, onCreate }: AddReviewModalProps) {
  const [formData, setFormData] = useState<CreateReviewScheduleData>({
    scheduleType: 'IEP_ANNUAL_REVIEW',
    dueDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16),
    leadDays: 30,
    notes: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.dueDate) {
      setError('Due date is required');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      await onCreate({
        ...formData,
        dueDate: new Date(formData.dueDate).toISOString(),
      });
    } catch {
      setError('Failed to create review schedule');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modal}>
        <div className={styles.modalHeader}>
          <h3>Add Review Schedule</h3>
          <button className={styles.closeBtn} onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className={styles.modalBody}>
            {error && <div className={styles.modalError}>{error}</div>}

            <div className={styles.formGroup}>
              <label>Review Type *</label>
              <select
                value={formData.scheduleType}
                onChange={e => setFormData({ ...formData, scheduleType: e.target.value as ScheduleType })}
              >
                {(Object.keys(SCHEDULE_TYPE_LABELS) as ScheduleType[]).map(type => (
                  <option key={type} value={type}>
                    {SCHEDULE_TYPE_LABELS[type]}
                  </option>
                ))}
              </select>
              <p className={styles.fieldHint}>
                {SCHEDULE_TYPE_DESCRIPTIONS[formData.scheduleType]}
              </p>
            </div>

            <div className={styles.formGroup}>
              <label>Due Date *</label>
              <input
                type="datetime-local"
                value={formData.dueDate}
                onChange={e => setFormData({ ...formData, dueDate: e.target.value })}
              />
            </div>

            <div className={styles.formGroup}>
              <label>Lead Days</label>
              <input
                type="number"
                min="1"
                max="365"
                value={formData.leadDays}
                onChange={e => setFormData({ ...formData, leadDays: parseInt(e.target.value) || 30 })}
              />
              <p className={styles.fieldHint}>
                Days before due date to start generating reminders
              </p>
            </div>

            <div className={styles.formGroup}>
              <label>Notes</label>
              <textarea
                value={formData.notes || ''}
                onChange={e => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Optional notes about this review"
                rows={3}
              />
            </div>
          </div>

          <div className={styles.modalFooter}>
            <button type="button" className="btn btn-outline" onClick={onClose} disabled={submitting}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Creating...' : 'Create Review'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

interface ReviewDetailModalProps {
  schedule: ReviewSchedule;
  onClose: () => void;
  onComplete?: () => void;
}

function ReviewDetailModal({ schedule, onClose, onComplete }: ReviewDetailModalProps) {
  const daysUntilDue = differenceInDays(new Date(schedule.dueDate), new Date());

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modal}>
        <div className={styles.modalHeader}>
          <h3>Review Schedule Detail</h3>
          <button className={styles.closeBtn} onClick={onClose}>×</button>
        </div>

        <div className={styles.modalBody}>
          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>Type</span>
            <span>{SCHEDULE_TYPE_LABELS[schedule.scheduleType]}</span>
          </div>

          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>Due Date</span>
            <span>{format(new Date(schedule.dueDate), 'MMM d, yyyy')}</span>
          </div>

          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>Status</span>
            <span>
              {schedule.status === 'COMPLETE' ? (
                <span className={styles.statusComplete}>Complete</span>
              ) : isPast(new Date(schedule.dueDate)) ? (
                <span className={styles.statusOverdue}>Overdue</span>
              ) : daysUntilDue <= schedule.leadDays ? (
                <span className={styles.statusDueSoon}>Due Soon ({daysUntilDue} days)</span>
              ) : (
                <span className={styles.statusOpen}>Open ({daysUntilDue} days remaining)</span>
              )}
            </span>
          </div>

          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>Lead Days</span>
            <span>{schedule.leadDays} days</span>
          </div>

          {schedule.assignedTo && (
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>Assigned To</span>
              <span>{schedule.assignedTo.displayName}</span>
            </div>
          )}

          {schedule.notes && (
            <div className={styles.detailSection}>
              <h4>Notes</h4>
              <p>{schedule.notes}</p>
            </div>
          )}

          {schedule.createdBy && (
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>Created By</span>
              <span>{schedule.createdBy.displayName}</span>
            </div>
          )}

          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>Created</span>
            <span>{format(new Date(schedule.createdAt), 'MMM d, yyyy')}</span>
          </div>

          {schedule.status === 'COMPLETE' && schedule.completedAt && (
            <>
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>Completed</span>
                <span>{format(new Date(schedule.completedAt), 'MMM d, yyyy')}</span>
              </div>
              {schedule.completedBy && (
                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>Completed By</span>
                  <span>{schedule.completedBy.displayName}</span>
                </div>
              )}
            </>
          )}
        </div>

        <div className={styles.modalFooter}>
          {onComplete && schedule.status !== 'COMPLETE' && (
            <button className="btn btn-secondary" onClick={onComplete}>
              Mark Complete
            </button>
          )}
          <button className="btn btn-primary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

interface CompleteReviewModalProps {
  schedule: ReviewSchedule;
  onClose: () => void;
  onComplete: (notes?: string) => Promise<void>;
}

function CompleteReviewModal({ schedule, onClose, onComplete }: CompleteReviewModalProps) {
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setSubmitting(true);
      setError(null);
      await onComplete(notes || undefined);
    } catch {
      setError('Failed to complete review');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modal}>
        <div className={styles.modalHeader}>
          <h3>Complete Review</h3>
          <button className={styles.closeBtn} onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className={styles.modalBody}>
            {error && <div className={styles.modalError}>{error}</div>}

            <div className={styles.completeInfo}>
              <p>
                You are about to mark the following review as complete:
              </p>
              <p className={styles.completeReviewSummary}>
                <strong>{SCHEDULE_TYPE_LABELS[schedule.scheduleType]}</strong>
                <br />
                Due: {format(new Date(schedule.dueDate), 'MMM d, yyyy')}
              </p>
            </div>

            <div className={styles.formGroup}>
              <label>Completion Notes</label>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Optional notes about the review completion"
                rows={3}
              />
            </div>
          </div>

          <div className={styles.modalFooter}>
            <button type="button" className="btn btn-outline" onClick={onClose} disabled={submitting}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Completing...' : 'Mark Complete'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
