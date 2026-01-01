'use client';

import { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import {
  api,
  DisputeCase,
  DisputeCaseType,
  DisputeCaseStatus,
  CreateDisputeData,
} from '@/lib/api';
import styles from './DisputeCasesSection.module.css';

interface DisputeCasesSectionProps {
  studentId: string;
  studentName: string;
  readOnly?: boolean;
}

const CASE_TYPE_LABELS: Record<DisputeCaseType, string> = {
  SECTION504_COMPLAINT: 'Section 504 Complaint',
  IEP_DISPUTE: 'IEP Dispute',
  RECORDS_REQUEST: 'Records Request',
  OTHER: 'Other',
};

const STATUS_LABELS: Record<DisputeCaseStatus, string> = {
  OPEN: 'Open',
  IN_REVIEW: 'In Review',
  RESOLVED: 'Resolved',
  CLOSED: 'Closed',
};

export function DisputeCasesSection({ studentId, studentName, readOnly = false }: DisputeCasesSectionProps) {
  const [cases, setCases] = useState<DisputeCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [filterStatus, setFilterStatus] = useState<DisputeCaseStatus | ''>('');

  const loadCases = useCallback(async () => {
    try {
      setLoading(true);
      const params: { status?: DisputeCaseStatus } = {};
      if (filterStatus) params.status = filterStatus;

      const { disputeCases } = await api.getStudentDisputes(studentId, params);
      setCases(disputeCases);
      setError(null);
    } catch (err) {
      console.error('Failed to load dispute cases:', err);
      setError('Failed to load dispute cases');
    } finally {
      setLoading(false);
    }
  }, [studentId, filterStatus]);

  useEffect(() => {
    loadCases();
  }, [loadCases]);

  const handleCreate = async (data: CreateDisputeData) => {
    try {
      await api.createDispute(studentId, data);
      await loadCases();
      setShowAddModal(false);
    } catch (err) {
      console.error('Failed to create dispute case:', err);
      throw err;
    }
  };

  const getStatusBadgeClass = (status: DisputeCaseStatus) => {
    switch (status) {
      case 'OPEN':
        return styles.statusOpen;
      case 'IN_REVIEW':
        return styles.statusInReview;
      case 'RESOLVED':
        return styles.statusResolved;
      case 'CLOSED':
        return styles.statusClosed;
      default:
        return '';
    }
  };

  if (loading && cases.length === 0) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <h3>Dispute Cases</h3>
        </div>
        <div className={styles.loading}>
          <div className="spinner" />
          <p>Loading cases...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h3>Dispute Cases</h3>
        {!readOnly && (
          <button
            className="btn btn-primary btn-sm"
            onClick={() => setShowAddModal(true)}
          >
            + New Case
          </button>
        )}
      </div>

      {error && <div className={styles.error}>{error}</div>}

      <div className={styles.filters}>
        <div className={styles.filterGroup}>
          <label>Status</label>
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value as DisputeCaseStatus | '')}
          >
            <option value="">All Statuses</option>
            {(Object.keys(STATUS_LABELS) as DisputeCaseStatus[]).map(status => (
              <option key={status} value={status}>
                {STATUS_LABELS[status]}
              </option>
            ))}
          </select>
        </div>
      </div>

      {cases.length === 0 ? (
        <div className={styles.emptyState}>
          <p>No dispute cases filed yet.</p>
          <p>Click &quot;+ New Case&quot; to create a dispute or complaint record.</p>
        </div>
      ) : (
        <div className={styles.casesList}>
          {cases.map(disputeCase => (
            <div key={disputeCase.id} className={styles.caseCard}>
              <div className={styles.caseHeader}>
                <span className={styles.caseNumber}>{disputeCase.caseNumber}</span>
                <span className={`${styles.statusBadge} ${getStatusBadgeClass(disputeCase.status)}`}>
                  {STATUS_LABELS[disputeCase.status]}
                </span>
              </div>
              <div className={styles.caseType}>
                {CASE_TYPE_LABELS[disputeCase.caseType]}
              </div>
              <p className={styles.caseSummary}>{disputeCase.summary}</p>
              <div className={styles.caseMeta}>
                <span>Filed: {format(new Date(disputeCase.filedDate), 'MMM d, yyyy')}</span>
                {disputeCase.assignedTo && (
                  <span>Assigned to: {disputeCase.assignedTo.displayName}</span>
                )}
                {disputeCase._count && (
                  <span>{disputeCase._count.events} events</span>
                )}
              </div>
              <div className={styles.caseActions}>
                <a
                  href={`/students/${studentId}/disputes/${disputeCase.id}`}
                  className={styles.viewLink}
                >
                  View Details
                </a>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Case Modal */}
      {showAddModal && (
        <AddCaseModal
          studentName={studentName}
          onClose={() => setShowAddModal(false)}
          onCreate={handleCreate}
        />
      )}
    </div>
  );
}

interface AddCaseModalProps {
  studentName: string;
  onClose: () => void;
  onCreate: (data: CreateDisputeData) => Promise<void>;
}

function AddCaseModal({ studentName, onClose, onCreate }: AddCaseModalProps) {
  const [formData, setFormData] = useState<CreateDisputeData>({
    caseType: 'OTHER',
    summary: '',
    filedDate: new Date().toISOString().slice(0, 16),
    externalReference: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.summary.trim()) {
      setError('Summary is required');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      await onCreate({
        ...formData,
        filedDate: formData.filedDate ? new Date(formData.filedDate).toISOString() : undefined,
        externalReference: formData.externalReference || undefined,
      });
    } catch {
      setError('Failed to create case');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modal}>
        <div className={styles.modalHeader}>
          <h3>New Dispute Case</h3>
          <button className={styles.closeBtn} onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className={styles.modalBody}>
            {error && <div className={styles.modalError}>{error}</div>}

            <p className={styles.studentNameInfo}>
              Student: <strong>{studentName}</strong>
            </p>

            <div className={styles.formGroup}>
              <label>Case Type *</label>
              <select
                value={formData.caseType}
                onChange={e => setFormData({ ...formData, caseType: e.target.value as DisputeCaseType })}
              >
                {(Object.keys(CASE_TYPE_LABELS) as DisputeCaseType[]).map(type => (
                  <option key={type} value={type}>
                    {CASE_TYPE_LABELS[type]}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.formGroup}>
              <label>Summary *</label>
              <textarea
                value={formData.summary}
                onChange={e => setFormData({ ...formData, summary: e.target.value })}
                placeholder="Brief description of the dispute or complaint"
                rows={4}
              />
            </div>

            <div className={styles.formGroup}>
              <label>Filed Date</label>
              <input
                type="datetime-local"
                value={formData.filedDate || ''}
                onChange={e => setFormData({ ...formData, filedDate: e.target.value })}
              />
            </div>

            <div className={styles.formGroup}>
              <label>External Reference</label>
              <input
                type="text"
                value={formData.externalReference || ''}
                onChange={e => setFormData({ ...formData, externalReference: e.target.value })}
                placeholder="e.g., State complaint number, case ID"
              />
              <p className={styles.fieldHint}>
                Optional reference number from external agencies
              </p>
            </div>
          </div>

          <div className={styles.modalFooter}>
            <button type="button" className="btn btn-outline" onClick={onClose} disabled={submitting}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Creating...' : 'Create Case'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
