'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { format } from 'date-fns';
import { useAuth } from '@/lib/auth-context';
import { api, Referral, ReferralStatus, ReferralType, ReferralSource, UpdateReferralData } from '@/lib/api';
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

export default function ReferralDetailPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const studentId = params.id as string;
  const referralId = params.referralId as string;

  const [referral, setReferral] = useState<Referral | null>(null);
  const [loadingReferral, setLoadingReferral] = useState(true);
  const [activeTab, setActiveTab] = useState<'details' | 'timeline'>('details');
  const [showAddNoteModal, setShowAddNoteModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const isAdmin = user?.role === 'ADMIN';
  const isCaseManager = user?.role === 'CASE_MANAGER';
  const canManage = isAdmin || isCaseManager;

  useEffect(() => {
    if (!loading && !user) {
      router.push('/');
    }
  }, [user, loading, router]);

  const loadReferral = useCallback(async () => {
    try {
      setLoadingReferral(true);
      const { referral: data } = await api.getReferral(referralId);
      setReferral(data);
    } catch (err) {
      console.error('Failed to load referral:', err);
    } finally {
      setLoadingReferral(false);
    }
  }, [referralId]);

  useEffect(() => {
    if (user?.isOnboarded && referralId) {
      loadReferral();
    }
  }, [user, referralId, loadReferral]);

  const handleAction = async (action: string, data?: Record<string, unknown>) => {
    if (!referral) return;

    try {
      setActionLoading(true);
      switch (action) {
        case 'submit':
          await api.submitReferral(referral.id);
          break;
        case 'request-consent':
          await api.requestReferralConsent(referral.id);
          break;
        case 'record-consent-received':
          await api.recordReferralConsent(referral.id, true);
          break;
        case 'record-consent-declined': {
          const reason = prompt('Enter the reason for declining consent:');
          if (reason) {
            await api.recordReferralConsent(referral.id, false, reason);
          }
          break;
        }
        case 'close': {
          const closeReason = prompt('Enter the reason for closing this referral:');
          if (closeReason) {
            await api.closeReferral(referral.id, closeReason);
          }
          break;
        }
        case 'update':
          if (data) {
            await api.updateReferral(referral.id, data as UpdateReferralData);
          }
          break;
      }
      await loadReferral();
    } catch (err) {
      console.error(`Failed to ${action}:`, err);
      alert(`Failed to ${action}. Please try again.`);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading || loadingReferral) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Loading...</div>
      </div>
    );
  }

  if (!referral) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>Referral not found</div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.breadcrumb}>
          <button onClick={() => router.push(`/students/${studentId}/referrals`)} className={styles.backLink}>
            &larr; Back to Referrals
          </button>
        </div>
        <div className={styles.titleRow}>
          <div>
            <h1 className={styles.title}>
              {TYPE_LABELS[referral.referralType]}
            </h1>
            <p className={styles.subtitle}>
              {referral.student?.firstName} {referral.student?.lastName}
            </p>
          </div>
          <span
            className={styles.statusBadge}
            style={{ backgroundColor: STATUS_COLORS[referral.status] }}
          >
            {STATUS_LABELS[referral.status]}
          </span>
        </div>
      </div>

      {/* Action Bar */}
      <div className={styles.actionBar}>
        {referral.status === 'DRAFT' && (
          <button
            onClick={() => handleAction('submit')}
            disabled={actionLoading}
            className={styles.primaryButton}
          >
            Submit Referral
          </button>
        )}
        {canManage && referral.status === 'SUBMITTED' && (
          <button
            onClick={() => handleAction('update', { status: 'IN_REVIEW' })}
            disabled={actionLoading}
            className={styles.primaryButton}
          >
            Start Review
          </button>
        )}
        {canManage && ['SUBMITTED', 'IN_REVIEW'].includes(referral.status) && (
          <button
            onClick={() => handleAction('request-consent')}
            disabled={actionLoading}
            className={styles.primaryButton}
          >
            Request Consent
          </button>
        )}
        {canManage && referral.status === 'CONSENT_REQUESTED' && (
          <>
            <button
              onClick={() => handleAction('record-consent-received')}
              disabled={actionLoading}
              className={styles.successButton}
            >
              Record Consent Received
            </button>
            <button
              onClick={() => handleAction('record-consent-declined')}
              disabled={actionLoading}
              className={styles.dangerButton}
            >
              Record Consent Declined
            </button>
          </>
        )}
        {canManage && referral.status !== 'CLOSED' && (
          <button
            onClick={() => handleAction('close')}
            disabled={actionLoading}
            className={styles.secondaryButton}
          >
            Close Referral
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${activeTab === 'details' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('details')}
        >
          Details
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'timeline' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('timeline')}
        >
          Timeline ({referral.timelineEvents?.length || 0})
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'details' && (
        <div className={styles.detailsPanel}>
          <div className={styles.section}>
            <h3>Referral Information</h3>
            <div className={styles.infoGrid}>
              <div className={styles.infoItem}>
                <label>Type</label>
                <span>{TYPE_LABELS[referral.referralType]}</span>
              </div>
              <div className={styles.infoItem}>
                <label>Source</label>
                <span>{SOURCE_LABELS[referral.source]}{referral.sourceOther ? ` - ${referral.sourceOther}` : ''}</span>
              </div>
              <div className={styles.infoItem}>
                <label>Created</label>
                <span>{format(new Date(referral.createdAt), 'PPp')}</span>
              </div>
              <div className={styles.infoItem}>
                <label>Created By</label>
                <span>{referral.createdBy?.displayName || 'Unknown'}</span>
              </div>
              {referral.caseManager && (
                <div className={styles.infoItem}>
                  <label>Case Manager</label>
                  <span>{referral.caseManager.displayName}</span>
                </div>
              )}
              {referral.evaluationDueDate && (
                <div className={styles.infoItem}>
                  <label>Evaluation Due</label>
                  <span>{format(new Date(referral.evaluationDueDate), 'PP')}</span>
                </div>
              )}
            </div>
          </div>

          <div className={styles.section}>
            <h3>Reason for Referral</h3>
            <p className={styles.textContent}>{referral.reasonForReferral}</p>
          </div>

          {referral.interventionsTried && (
            <div className={styles.section}>
              <h3>Interventions Tried</h3>
              <p className={styles.textContent}>{referral.interventionsTried}</p>
            </div>
          )}

          {referral.supportingData && (
            <div className={styles.section}>
              <h3>Supporting Data</h3>
              <p className={styles.textContent}>{referral.supportingData}</p>
            </div>
          )}

          <div className={styles.section}>
            <h3>Parent Contact</h3>
            <div className={styles.infoGrid}>
              {referral.parentContactEmail && (
                <div className={styles.infoItem}>
                  <label>Email</label>
                  <span>{referral.parentContactEmail}</span>
                </div>
              )}
              {referral.parentContactPhone && (
                <div className={styles.infoItem}>
                  <label>Phone</label>
                  <span>{referral.parentContactPhone}</span>
                </div>
              )}
            </div>
          </div>

          {referral.consentStatus && (
            <div className={styles.section}>
              <h3>Consent Status</h3>
              <div className={styles.infoGrid}>
                <div className={styles.infoItem}>
                  <label>Status</label>
                  <span className={referral.consentStatus === 'RECEIVED' ? styles.successText : referral.consentStatus === 'DECLINED' ? styles.dangerText : ''}>
                    {referral.consentStatus}
                  </span>
                </div>
                {referral.consentRequestedAt && (
                  <div className={styles.infoItem}>
                    <label>Requested</label>
                    <span>{format(new Date(referral.consentRequestedAt), 'PPp')}</span>
                  </div>
                )}
                {referral.consentReceivedAt && (
                  <div className={styles.infoItem}>
                    <label>Received</label>
                    <span>{format(new Date(referral.consentReceivedAt), 'PPp')}</span>
                  </div>
                )}
                {referral.consentDeclinedAt && (
                  <div className={styles.infoItem}>
                    <label>Declined</label>
                    <span>{format(new Date(referral.consentDeclinedAt), 'PPp')}</span>
                  </div>
                )}
                {referral.consentDeclineReason && (
                  <div className={styles.infoItem}>
                    <label>Decline Reason</label>
                    <span>{referral.consentDeclineReason}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {referral.closedAt && (
            <div className={styles.section}>
              <h3>Closure</h3>
              <div className={styles.infoGrid}>
                <div className={styles.infoItem}>
                  <label>Closed At</label>
                  <span>{format(new Date(referral.closedAt), 'PPp')}</span>
                </div>
                <div className={styles.infoItem}>
                  <label>Closed By</label>
                  <span>{referral.closedBy?.displayName || 'Unknown'}</span>
                </div>
                {referral.closedReason && (
                  <div className={styles.infoItem}>
                    <label>Reason</label>
                    <span>{referral.closedReason}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {referral.internalNotes && canManage && (
            <div className={styles.section}>
              <h3>Internal Notes</h3>
              <p className={styles.textContent}>{referral.internalNotes}</p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'timeline' && (
        <div className={styles.timelinePanel}>
          <div className={styles.timelineHeader}>
            <h3>Activity Timeline</h3>
            <button
              onClick={() => setShowAddNoteModal(true)}
              className={styles.addNoteButton}
            >
              + Add Note
            </button>
          </div>
          {(!referral.timelineEvents || referral.timelineEvents.length === 0) ? (
            <div className={styles.emptyTimeline}>
              <p>No timeline events yet</p>
            </div>
          ) : (
            <div className={styles.timeline}>
              {referral.timelineEvents.map((event) => (
                <div key={event.id} className={styles.timelineItem}>
                  <div className={styles.timelineDot} />
                  <div className={styles.timelineContent}>
                    <div className={styles.timelineEventType}>{event.eventType}</div>
                    <p className={styles.timelineDescription}>{event.description}</p>
                    <div className={styles.timelineMeta}>
                      <span>{event.performedBy?.displayName || 'Unknown'}</span>
                      <span>{format(new Date(event.createdAt), 'PPp')}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {showAddNoteModal && (
        <AddNoteModal
          referralId={referral.id}
          onClose={() => setShowAddNoteModal(false)}
          onAdded={() => {
            setShowAddNoteModal(false);
            loadReferral();
          }}
        />
      )}
    </div>
  );
}

interface AddNoteModalProps {
  referralId: string;
  onClose: () => void;
  onAdded: () => void;
}

function AddNoteModal({ referralId, onClose, onAdded }: AddNoteModalProps) {
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) {
      setError('Please enter a note');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      await api.addReferralTimelineEvent(referralId, {
        eventType: 'NOTE_ADDED',
        description: description.trim(),
      });
      onAdded();
    } catch (err) {
      console.error('Failed to add note:', err);
      setError('Failed to add note. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2>Add Note</h2>
          <button onClick={onClose} className={styles.closeButton}>&times;</button>
        </div>
        <form onSubmit={handleSubmit} className={styles.modalBody}>
          {error && <div className={styles.error}>{error}</div>}
          <div className={styles.formGroup}>
            <label htmlFor="note">Note</label>
            <textarea
              id="note"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter your note..."
              rows={4}
              required
            />
          </div>
          <div className={styles.modalFooter}>
            <button type="button" onClick={onClose} className={styles.cancelButton}>
              Cancel
            </button>
            <button type="submit" disabled={submitting} className={styles.submitButton}>
              {submitting ? 'Adding...' : 'Add Note'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
