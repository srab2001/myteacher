'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { format } from 'date-fns';
import { useAuth } from '@/lib/auth-context';
import { api, Referral, ReferralStatus, ReferralType, ReferralSource, CreateReferralData } from '@/lib/api';
import styles from './page.module.css';

const STATUS_LABELS: Record<ReferralStatus, string> = {
  DRAFT: 'Draft',
  SUBMITTED: 'Submitted',
  IN_REVIEW: 'In Review',
  CONSENT_REQUESTED: 'Consent Requested',
  CONSENT_RECEIVED: 'Consent Received',
  CONSENT_DECLINED: 'Consent Declined',
  CLOSED: 'Closed',
};

const STATUS_COLORS: Record<ReferralStatus, string> = {
  DRAFT: '#6b7280',
  SUBMITTED: '#3b82f6',
  IN_REVIEW: '#f59e0b',
  CONSENT_REQUESTED: '#8b5cf6',
  CONSENT_RECEIVED: '#10b981',
  CONSENT_DECLINED: '#ef4444',
  CLOSED: '#6b7280',
};

const TYPE_LABELS: Record<ReferralType, string> = {
  IDEA_EVALUATION: 'IDEA Evaluation',
  SECTION_504_EVALUATION: '504 Evaluation',
  BEHAVIOR_SUPPORT: 'Behavior Support',
};

const SOURCE_LABELS: Record<ReferralSource, string> = {
  TEACHER: 'Teacher',
  PARENT: 'Parent',
  ADMINISTRATOR: 'Administrator',
  STUDENT_SUPPORT_TEAM: 'Student Support Team',
  OTHER: 'Other',
};

export default function StudentReferralsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const studentId = params.id as string;

  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [studentName, setStudentName] = useState<string>('');
  const [loadingReferrals, setLoadingReferrals] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [statusFilter, setStatusFilter] = useState<ReferralStatus | ''>('');
  const [typeFilter, setTypeFilter] = useState<ReferralType | ''>('');

  useEffect(() => {
    if (!loading && !user) {
      router.push('/');
    }
  }, [user, loading, router]);

  const loadReferrals = useCallback(async () => {
    try {
      setLoadingReferrals(true);
      const filters: { status?: ReferralStatus; type?: ReferralType } = {};
      if (statusFilter) filters.status = statusFilter;
      if (typeFilter) filters.type = typeFilter;

      const [referralsRes, studentRes] = await Promise.all([
        api.getStudentReferrals(studentId, filters),
        api.getStudent(studentId),
      ]);

      setReferrals(referralsRes.referrals);
      setStudentName(`${studentRes.student.firstName} ${studentRes.student.lastName}`);
    } catch (err) {
      console.error('Failed to load referrals:', err);
    } finally {
      setLoadingReferrals(false);
    }
  }, [studentId, statusFilter, typeFilter]);

  useEffect(() => {
    if (user?.isOnboarded && studentId) {
      loadReferrals();
    }
  }, [user, studentId, loadReferrals]);

  const handleReferralClick = (referralId: string) => {
    router.push(`/students/${studentId}/referrals/${referralId}`);
  };

  if (loading || loadingReferrals) {
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
        <h1 className={styles.title}>Referrals - {studentName}</h1>
        <p className={styles.subtitle}>Manage special education referrals and evaluations</p>
      </div>

      <div className={styles.toolbar}>
        <div className={styles.filters}>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as ReferralStatus | '')}
            className={styles.filterSelect}
          >
            <option value="">All Statuses</option>
            {Object.entries(STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as ReferralType | '')}
            className={styles.filterSelect}
          >
            <option value="">All Types</option>
            {Object.entries(TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className={styles.createButton}
        >
          + New Referral
        </button>
      </div>

      {referrals.length === 0 ? (
        <div className={styles.emptyState}>
          <p>No referrals found for this student.</p>
          <button
            onClick={() => setShowCreateModal(true)}
            className={styles.createButton}
          >
            Create First Referral
          </button>
        </div>
      ) : (
        <div className={styles.referralList}>
          {referrals.map((referral) => (
            <div
              key={referral.id}
              className={styles.referralCard}
              onClick={() => handleReferralClick(referral.id)}
            >
              <div className={styles.cardHeader}>
                <span
                  className={styles.statusBadge}
                  style={{ backgroundColor: STATUS_COLORS[referral.status] }}
                >
                  {STATUS_LABELS[referral.status]}
                </span>
                <span className={styles.typeBadge}>
                  {TYPE_LABELS[referral.referralType]}
                </span>
              </div>
              <div className={styles.cardBody}>
                <p className={styles.reason}>
                  {referral.reasonForReferral.length > 150
                    ? `${referral.reasonForReferral.substring(0, 150)}...`
                    : referral.reasonForReferral}
                </p>
                <div className={styles.cardMeta}>
                  <span>Source: {SOURCE_LABELS[referral.source]}</span>
                  <span>Created: {format(new Date(referral.createdAt), 'MMM d, yyyy')}</span>
                  {referral.caseManager && (
                    <span>Case Manager: {referral.caseManager.displayName}</span>
                  )}
                </div>
              </div>
              <div className={styles.cardFooter}>
                {referral._count && (
                  <>
                    <span>{referral._count.attachments} attachments</span>
                    <span>{referral._count.timelineEvents} events</span>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreateModal && (
        <CreateReferralModal
          studentId={studentId}
          onClose={() => setShowCreateModal(false)}
          onCreated={() => {
            setShowCreateModal(false);
            loadReferrals();
          }}
        />
      )}
    </div>
  );
}

interface CreateReferralModalProps {
  studentId: string;
  onClose: () => void;
  onCreated: () => void;
}

function CreateReferralModal({ studentId, onClose, onCreated }: CreateReferralModalProps) {
  const [formData, setFormData] = useState<CreateReferralData>({
    referralType: 'IDEA_EVALUATION',
    source: 'TEACHER',
    reasonForReferral: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.reasonForReferral || formData.reasonForReferral.length < 10) {
      setError('Reason for referral must be at least 10 characters');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      await api.createReferral(studentId, formData);
      onCreated();
    } catch (err) {
      console.error('Failed to create referral:', err);
      setError('Failed to create referral. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2>Create New Referral</h2>
          <button onClick={onClose} className={styles.closeButton}>&times;</button>
        </div>
        <form onSubmit={handleSubmit} className={styles.modalBody}>
          {error && <div className={styles.error}>{error}</div>}

          <div className={styles.formGroup}>
            <label htmlFor="referralType">Referral Type *</label>
            <select
              id="referralType"
              value={formData.referralType}
              onChange={(e) => setFormData({ ...formData, referralType: e.target.value as ReferralType })}
              required
            >
              {Object.entries(TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="source">Referral Source *</label>
            <select
              id="source"
              value={formData.source}
              onChange={(e) => setFormData({ ...formData, source: e.target.value as ReferralSource })}
              required
            >
              {Object.entries(SOURCE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>

          {formData.source === 'OTHER' && (
            <div className={styles.formGroup}>
              <label htmlFor="sourceOther">Specify Source</label>
              <input
                type="text"
                id="sourceOther"
                value={formData.sourceOther || ''}
                onChange={(e) => setFormData({ ...formData, sourceOther: e.target.value })}
                placeholder="Enter referral source"
              />
            </div>
          )}

          <div className={styles.formGroup}>
            <label htmlFor="reasonForReferral">Reason for Referral *</label>
            <textarea
              id="reasonForReferral"
              value={formData.reasonForReferral}
              onChange={(e) => setFormData({ ...formData, reasonForReferral: e.target.value })}
              placeholder="Describe the reason for this referral..."
              rows={4}
              required
              minLength={10}
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="interventionsTried">Interventions Tried</label>
            <textarea
              id="interventionsTried"
              value={formData.interventionsTried || ''}
              onChange={(e) => setFormData({ ...formData, interventionsTried: e.target.value })}
              placeholder="Describe any interventions that have been tried..."
              rows={3}
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="parentContactEmail">Parent Contact Email</label>
            <input
              type="email"
              id="parentContactEmail"
              value={formData.parentContactEmail || ''}
              onChange={(e) => setFormData({ ...formData, parentContactEmail: e.target.value })}
              placeholder="parent@email.com"
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="parentContactPhone">Parent Contact Phone</label>
            <input
              type="tel"
              id="parentContactPhone"
              value={formData.parentContactPhone || ''}
              onChange={(e) => setFormData({ ...formData, parentContactPhone: e.target.value })}
              placeholder="(555) 123-4567"
            />
          </div>

          <div className={styles.modalFooter}>
            <button type="button" onClick={onClose} className={styles.cancelButton}>
              Cancel
            </button>
            <button type="submit" disabled={submitting} className={styles.submitButton}>
              {submitting ? 'Creating...' : 'Create Referral'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
