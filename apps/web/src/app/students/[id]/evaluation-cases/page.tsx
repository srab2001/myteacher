'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { format } from 'date-fns';
import { useAuth } from '@/lib/auth-context';
import { api, EvaluationCase, EvaluationCaseStatus, EvaluationCaseType, CreateEvaluationCaseData } from '@/lib/api';
import styles from './page.module.css';

const STATUS_LABELS: Record<EvaluationCaseStatus, string> = {
  OPEN: 'Open',
  ASSESSMENTS_IN_PROGRESS: 'Assessments In Progress',
  MEETING_SCHEDULED: 'Meeting Scheduled',
  DETERMINATION_COMPLETE: 'Determination Complete',
  CLOSED: 'Closed',
};

const STATUS_COLORS: Record<EvaluationCaseStatus, string> = {
  OPEN: '#3b82f6',
  ASSESSMENTS_IN_PROGRESS: '#f59e0b',
  MEETING_SCHEDULED: '#8b5cf6',
  DETERMINATION_COMPLETE: '#10b981',
  CLOSED: '#6b7280',
};

const TYPE_LABELS: Record<EvaluationCaseType, string> = {
  IDEA: 'IDEA (Special Education)',
  SECTION_504: 'Section 504',
};

export default function StudentEvaluationCasesPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const studentId = params.id as string;

  const [cases, setCases] = useState<EvaluationCase[]>([]);
  const [studentName, setStudentName] = useState<string>('');
  const [loadingCases, setLoadingCases] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [statusFilter, setStatusFilter] = useState<EvaluationCaseStatus | ''>('');
  const [typeFilter, setTypeFilter] = useState<EvaluationCaseType | ''>('');

  const isAdmin = user?.role === 'ADMIN';
  const isCaseManager = user?.role === 'CASE_MANAGER';
  const canCreate = isAdmin || isCaseManager;

  useEffect(() => {
    if (!loading && !user) {
      router.push('/');
    }
  }, [user, loading, router]);

  const loadCases = useCallback(async () => {
    try {
      setLoadingCases(true);
      const filters: { status?: EvaluationCaseStatus; type?: EvaluationCaseType } = {};
      if (statusFilter) filters.status = statusFilter;
      if (typeFilter) filters.type = typeFilter;

      const [casesRes, studentRes] = await Promise.all([
        api.getStudentEvaluationCases(studentId, filters),
        api.getStudent(studentId),
      ]);

      setCases(casesRes.evaluationCases);
      setStudentName(`${studentRes.student.firstName} ${studentRes.student.lastName}`);
    } catch (err) {
      console.error('Failed to load evaluation cases:', err);
    } finally {
      setLoadingCases(false);
    }
  }, [studentId, statusFilter, typeFilter]);

  useEffect(() => {
    if (user?.isOnboarded && studentId) {
      loadCases();
    }
  }, [user, studentId, loadCases]);

  const handleCaseClick = (caseId: string) => {
    router.push(`/students/${studentId}/evaluation-cases/${caseId}`);
  };

  if (loading || loadingCases) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Loading...</div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.breadcrumb}>
          <button onClick={() => router.push(`/students/${studentId}`)} className={styles.backLink}>
            &larr; Back to Student
          </button>
        </div>
        <h1 className={styles.title}>Evaluation Cases - {studentName}</h1>
        <p className={styles.subtitle}>Track eligibility evaluations and determinations</p>
      </div>

      <div className={styles.toolbar}>
        <div className={styles.filters}>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as EvaluationCaseStatus | '')}
            className={styles.filterSelect}
          >
            <option value="">All Statuses</option>
            {Object.entries(STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as EvaluationCaseType | '')}
            className={styles.filterSelect}
          >
            <option value="">All Types</option>
            {Object.entries(TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>
        {canCreate && (
          <button
            onClick={() => setShowCreateModal(true)}
            className={styles.createButton}
          >
            + New Evaluation Case
          </button>
        )}
      </div>

      {cases.length === 0 ? (
        <div className={styles.emptyState}>
          <p>No evaluation cases found for this student.</p>
          {canCreate && (
            <button
              onClick={() => setShowCreateModal(true)}
              className={styles.createButton}
            >
              Create First Evaluation Case
            </button>
          )}
        </div>
      ) : (
        <div className={styles.caseList}>
          {cases.map((evalCase) => (
            <div
              key={evalCase.id}
              className={styles.caseCard}
              onClick={() => handleCaseClick(evalCase.id)}
            >
              <div className={styles.cardHeader}>
                <span
                  className={styles.statusBadge}
                  style={{ backgroundColor: STATUS_COLORS[evalCase.status] }}
                >
                  {STATUS_LABELS[evalCase.status]}
                </span>
                <span className={styles.typeBadge}>
                  {TYPE_LABELS[evalCase.caseType]}
                </span>
              </div>
              <div className={styles.cardBody}>
                {evalCase.referral && (
                  <p className={styles.referralInfo}>
                    From Referral: {evalCase.referral.referralType.replace(/_/g, ' ')}
                  </p>
                )}
                <div className={styles.cardMeta}>
                  <span>Created: {format(new Date(evalCase.createdAt), 'MMM d, yyyy')}</span>
                  {evalCase.caseManager && (
                    <span>Case Manager: {evalCase.caseManager.displayName}</span>
                  )}
                  {evalCase.meetingScheduledAt && (
                    <span>Meeting: {format(new Date(evalCase.meetingScheduledAt), 'MMM d, yyyy h:mm a')}</span>
                  )}
                </div>
              </div>
              <div className={styles.cardFooter}>
                {evalCase._count && (
                  <>
                    <span>{evalCase._count.assessments} assessments</span>
                    <span>{evalCase._count.participants} participants</span>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreateModal && (
        <CreateEvaluationCaseModal
          studentId={studentId}
          onClose={() => setShowCreateModal(false)}
          onCreated={() => {
            setShowCreateModal(false);
            loadCases();
          }}
        />
      )}
    </div>
  );
}

interface CreateEvaluationCaseModalProps {
  studentId: string;
  onClose: () => void;
  onCreated: () => void;
}

function CreateEvaluationCaseModal({ studentId, onClose, onCreated }: CreateEvaluationCaseModalProps) {
  const [formData, setFormData] = useState<CreateEvaluationCaseData>({
    caseType: 'IDEA',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setSubmitting(true);
      setError(null);
      await api.createEvaluationCase(studentId, formData);
      onCreated();
    } catch (err) {
      console.error('Failed to create evaluation case:', err);
      setError('Failed to create evaluation case. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2>Create New Evaluation Case</h2>
          <button onClick={onClose} className={styles.closeButton}>&times;</button>
        </div>
        <form onSubmit={handleSubmit} className={styles.modalBody}>
          {error && <div className={styles.error}>{error}</div>}

          <div className={styles.formGroup}>
            <label htmlFor="caseType">Evaluation Type *</label>
            <select
              id="caseType"
              value={formData.caseType}
              onChange={(e) => setFormData({ ...formData, caseType: e.target.value as EvaluationCaseType })}
              required
            >
              {Object.entries(TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="meetingScheduledAt">Meeting Date/Time (Optional)</label>
            <input
              type="datetime-local"
              id="meetingScheduledAt"
              value={formData.meetingScheduledAt || ''}
              onChange={(e) => setFormData({ ...formData, meetingScheduledAt: e.target.value })}
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="meetingLocation">Meeting Location (Optional)</label>
            <input
              type="text"
              id="meetingLocation"
              value={formData.meetingLocation || ''}
              onChange={(e) => setFormData({ ...formData, meetingLocation: e.target.value })}
              placeholder="e.g., Conference Room B"
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="meetingLink">Virtual Meeting Link (Optional)</label>
            <input
              type="url"
              id="meetingLink"
              value={formData.meetingLink || ''}
              onChange={(e) => setFormData({ ...formData, meetingLink: e.target.value })}
              placeholder="https://..."
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="internalNotes">Internal Notes (Optional)</label>
            <textarea
              id="internalNotes"
              value={formData.internalNotes || ''}
              onChange={(e) => setFormData({ ...formData, internalNotes: e.target.value })}
              placeholder="Notes visible only to staff..."
              rows={3}
            />
          </div>

          <div className={styles.modalFooter}>
            <button type="button" onClick={onClose} className={styles.cancelButton}>
              Cancel
            </button>
            <button type="submit" disabled={submitting} className={styles.submitButton}>
              {submitting ? 'Creating...' : 'Create Evaluation Case'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
