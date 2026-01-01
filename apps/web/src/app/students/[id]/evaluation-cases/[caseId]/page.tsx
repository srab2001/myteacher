'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { format } from 'date-fns';
import { useAuth } from '@/lib/auth-context';
import {
  api, EvaluationCase, EvaluationCaseStatus, EvaluationCaseType,
  AssessmentType, ParticipantRole,
  IDEADisabilityCategory, CreateAssessmentData, CreateParticipantData, CreateDeterminationData,
} from '@/lib/api';
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

const ASSESSMENT_TYPE_LABELS: Record<AssessmentType, string> = {
  AUDIOLOGICAL: 'Audiological',
  EDUCATIONAL: 'Educational',
  OCCUPATIONAL_THERAPY: 'Occupational Therapy',
  PHYSICAL_THERAPY: 'Physical Therapy',
  PSYCHOLOGICAL: 'Psychological',
  SPEECH_LANGUAGE: 'Speech/Language',
  OTHER: 'Other',
};

const PARTICIPANT_ROLE_LABELS: Record<ParticipantRole, string> = {
  PARENT: 'Parent/Guardian',
  GENERAL_ED_TEACHER: 'General Education Teacher',
  SPECIAL_ED_TEACHER: 'Special Education Teacher',
  SCHOOL_PSYCHOLOGIST: 'School Psychologist',
  ADMINISTRATOR: 'Administrator',
  SPEECH_LANGUAGE_PATHOLOGIST: 'Speech-Language Pathologist',
  OCCUPATIONAL_THERAPIST: 'Occupational Therapist',
  PHYSICAL_THERAPIST: 'Physical Therapist',
  SCHOOL_COUNSELOR: 'School Counselor',
  BEHAVIOR_SPECIALIST: 'Behavior Specialist',
  STUDENT: 'Student',
  OTHER: 'Other',
};

const DISABILITY_CATEGORY_LABELS: Record<IDEADisabilityCategory, string> = {
  AUTISM: 'Autism',
  DEAF_BLINDNESS: 'Deaf-Blindness',
  DEAFNESS: 'Deafness',
  DEVELOPMENTAL_DELAY: 'Developmental Delay',
  EMOTIONAL_DISTURBANCE: 'Emotional Disturbance',
  HEARING_IMPAIRMENT: 'Hearing Impairment',
  INTELLECTUAL_DISABILITY: 'Intellectual Disability',
  MULTIPLE_DISABILITIES: 'Multiple Disabilities',
  ORTHOPEDIC_IMPAIRMENT: 'Orthopedic Impairment',
  OTHER_HEALTH_IMPAIRMENT: 'Other Health Impairment',
  SPECIFIC_LEARNING_DISABILITY: 'Specific Learning Disability',
  SPEECH_LANGUAGE_IMPAIRMENT: 'Speech/Language Impairment',
  TRAUMATIC_BRAIN_INJURY: 'Traumatic Brain Injury',
  VISUAL_IMPAIRMENT: 'Visual Impairment',
};

export default function EvaluationCaseDetailPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const studentId = params.id as string;
  const caseId = params.caseId as string;

  const [evalCase, setEvalCase] = useState<EvaluationCase | null>(null);
  const [loadingCase, setLoadingCase] = useState(true);
  const [activeTab, setActiveTab] = useState<'details' | 'assessments' | 'participants' | 'timeline'>('details');
  const [actionLoading, setActionLoading] = useState(false);
  const [showAddAssessmentModal, setShowAddAssessmentModal] = useState(false);
  const [showAddParticipantModal, setShowAddParticipantModal] = useState(false);
  const [showDeterminationModal, setShowDeterminationModal] = useState(false);
  const [showScheduleMeetingModal, setShowScheduleMeetingModal] = useState(false);

  const isAdmin = user?.role === 'ADMIN';
  const isCaseManager = user?.role === 'CASE_MANAGER';
  const canManage = isAdmin || isCaseManager;

  useEffect(() => {
    if (!loading && !user) {
      router.push('/');
    }
  }, [user, loading, router]);

  const loadCase = useCallback(async () => {
    try {
      setLoadingCase(true);
      const { evaluationCase: data } = await api.getEvaluationCase(caseId);
      setEvalCase(data);
    } catch (err) {
      console.error('Failed to load evaluation case:', err);
    } finally {
      setLoadingCase(false);
    }
  }, [caseId]);

  useEffect(() => {
    if (user?.isOnboarded && caseId) {
      loadCase();
    }
  }, [user, caseId, loadCase]);

  const handleCloseCase = async () => {
    if (!evalCase) return;
    const reason = prompt('Enter the reason for closing this case:');
    if (reason) {
      try {
        setActionLoading(true);
        await api.closeEvaluationCase(evalCase.id, reason);
        await loadCase();
      } catch (err) {
        console.error('Failed to close case:', err);
        alert('Failed to close case. Please try again.');
      } finally {
        setActionLoading(false);
      }
    }
  };

  if (loading || loadingCase) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Loading...</div>
      </div>
    );
  }

  if (!evalCase) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>Evaluation case not found</div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.breadcrumb}>
          <button onClick={() => router.push(`/students/${studentId}/evaluation-cases`)} className={styles.backLink}>
            &larr; Back to Evaluation Cases
          </button>
        </div>
        <div className={styles.titleRow}>
          <div>
            <h1 className={styles.title}>
              {TYPE_LABELS[evalCase.caseType]}
            </h1>
            <p className={styles.subtitle}>
              {evalCase.student?.firstName} {evalCase.student?.lastName}
            </p>
          </div>
          <span
            className={styles.statusBadge}
            style={{ backgroundColor: STATUS_COLORS[evalCase.status] }}
          >
            {STATUS_LABELS[evalCase.status]}
          </span>
        </div>
      </div>

      {/* Action Bar */}
      {canManage && evalCase.status !== 'CLOSED' && (
        <div className={styles.actionBar}>
          {evalCase.status === 'OPEN' && (
            <button
              onClick={() => setShowScheduleMeetingModal(true)}
              disabled={actionLoading}
              className={styles.primaryButton}
            >
              Schedule Meeting
            </button>
          )}
          {['ASSESSMENTS_IN_PROGRESS', 'MEETING_SCHEDULED'].includes(evalCase.status) && !evalCase.determination && (
            <button
              onClick={() => setShowDeterminationModal(true)}
              disabled={actionLoading}
              className={styles.successButton}
            >
              Record Determination
            </button>
          )}
          <button
            onClick={handleCloseCase}
            disabled={actionLoading}
            className={styles.secondaryButton}
          >
            Close Case
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${activeTab === 'details' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('details')}
        >
          Details
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'assessments' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('assessments')}
        >
          Assessments ({evalCase.assessments?.length || 0})
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'participants' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('participants')}
        >
          Participants ({evalCase.participants?.length || 0})
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'timeline' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('timeline')}
        >
          Timeline ({evalCase.timelineEvents?.length || 0})
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'details' && (
        <DetailsTab evalCase={evalCase} canManage={canManage} />
      )}

      {activeTab === 'assessments' && (
        <AssessmentsTab
          evalCase={evalCase}
          canManage={canManage}
          onAddClick={() => setShowAddAssessmentModal(true)}
          onRefresh={loadCase}
        />
      )}

      {activeTab === 'participants' && (
        <ParticipantsTab
          evalCase={evalCase}
          canManage={canManage}
          onAddClick={() => setShowAddParticipantModal(true)}
          onRefresh={loadCase}
        />
      )}

      {activeTab === 'timeline' && (
        <TimelineTab evalCase={evalCase} />
      )}

      {/* Modals */}
      {showAddAssessmentModal && (
        <AddAssessmentModal
          caseId={evalCase.id}
          onClose={() => setShowAddAssessmentModal(false)}
          onAdded={() => {
            setShowAddAssessmentModal(false);
            loadCase();
          }}
        />
      )}

      {showAddParticipantModal && (
        <AddParticipantModal
          caseId={evalCase.id}
          onClose={() => setShowAddParticipantModal(false)}
          onAdded={() => {
            setShowAddParticipantModal(false);
            loadCase();
          }}
        />
      )}

      {showDeterminationModal && (
        <DeterminationModal
          evalCase={evalCase}
          onClose={() => setShowDeterminationModal(false)}
          onCreated={() => {
            setShowDeterminationModal(false);
            loadCase();
          }}
        />
      )}

      {showScheduleMeetingModal && (
        <ScheduleMeetingModal
          evalCase={evalCase}
          onClose={() => setShowScheduleMeetingModal(false)}
          onScheduled={() => {
            setShowScheduleMeetingModal(false);
            loadCase();
          }}
        />
      )}
    </div>
  );
}

// Details Tab Component
function DetailsTab({ evalCase, canManage }: { evalCase: EvaluationCase; canManage: boolean }) {
  return (
    <div className={styles.detailsPanel}>
      <div className={styles.section}>
        <h3>Case Information</h3>
        <div className={styles.infoGrid}>
          <div className={styles.infoItem}>
            <label>Type</label>
            <span>{TYPE_LABELS[evalCase.caseType]}</span>
          </div>
          <div className={styles.infoItem}>
            <label>Created</label>
            <span>{format(new Date(evalCase.createdAt), 'PPp')}</span>
          </div>
          <div className={styles.infoItem}>
            <label>Created By</label>
            <span>{evalCase.createdBy?.displayName || 'Unknown'}</span>
          </div>
          {evalCase.caseManager && (
            <div className={styles.infoItem}>
              <label>Case Manager</label>
              <span>{evalCase.caseManager.displayName}</span>
            </div>
          )}
        </div>
      </div>

      {evalCase.referral && (
        <div className={styles.section}>
          <h3>Linked Referral</h3>
          <div className={styles.infoGrid}>
            <div className={styles.infoItem}>
              <label>Referral Type</label>
              <span>{evalCase.referral.referralType.replace(/_/g, ' ')}</span>
            </div>
            <div className={styles.infoItem}>
              <label>Referral Status</label>
              <span>{evalCase.referral.status}</span>
            </div>
          </div>
          {evalCase.referral.reasonForReferral && (
            <p className={styles.textContent}>{evalCase.referral.reasonForReferral}</p>
          )}
        </div>
      )}

      {evalCase.meetingScheduledAt && (
        <div className={styles.section}>
          <h3>Meeting Information</h3>
          <div className={styles.infoGrid}>
            <div className={styles.infoItem}>
              <label>Scheduled Date/Time</label>
              <span>{format(new Date(evalCase.meetingScheduledAt), 'PPp')}</span>
            </div>
            {evalCase.meetingLocation && (
              <div className={styles.infoItem}>
                <label>Location</label>
                <span>{evalCase.meetingLocation}</span>
              </div>
            )}
            {evalCase.meetingLink && (
              <div className={styles.infoItem}>
                <label>Virtual Link</label>
                <a href={evalCase.meetingLink} target="_blank" rel="noopener noreferrer" className={styles.link}>
                  Join Meeting
                </a>
              </div>
            )}
            {evalCase.meetingHeldAt && (
              <div className={styles.infoItem}>
                <label>Meeting Held</label>
                <span>{format(new Date(evalCase.meetingHeldAt), 'PPp')}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {evalCase.determination && (
        <div className={styles.section}>
          <h3>Eligibility Determination</h3>
          <div className={styles.infoGrid}>
            <div className={styles.infoItem}>
              <label>Outcome</label>
              <span className={evalCase.determination.isEligible ? styles.successText : styles.dangerText}>
                {evalCase.determination.isEligible ? 'ELIGIBLE' : 'NOT ELIGIBLE'}
              </span>
            </div>
            <div className={styles.infoItem}>
              <label>Determination Date</label>
              <span>{format(new Date(evalCase.determination.determinationDate), 'PP')}</span>
            </div>
            {evalCase.determination.primaryDisabilityCategory && (
              <div className={styles.infoItem}>
                <label>Primary Disability</label>
                <span>{DISABILITY_CATEGORY_LABELS[evalCase.determination.primaryDisabilityCategory]}</span>
              </div>
            )}
          </div>
          <div style={{ marginTop: '1rem' }}>
            <label style={{ fontWeight: 500, color: '#374151', display: 'block', marginBottom: '0.5rem' }}>Rationale</label>
            <p className={styles.textContent}>{evalCase.determination.rationale}</p>
          </div>
        </div>
      )}

      {evalCase.internalNotes && canManage && (
        <div className={styles.section}>
          <h3>Internal Notes</h3>
          <p className={styles.textContent}>{evalCase.internalNotes}</p>
        </div>
      )}

      {evalCase.closedAt && (
        <div className={styles.section}>
          <h3>Closure</h3>
          <div className={styles.infoGrid}>
            <div className={styles.infoItem}>
              <label>Closed At</label>
              <span>{format(new Date(evalCase.closedAt), 'PPp')}</span>
            </div>
            <div className={styles.infoItem}>
              <label>Closed By</label>
              <span>{evalCase.closedBy?.displayName || 'Unknown'}</span>
            </div>
            {evalCase.closedReason && (
              <div className={styles.infoItem}>
                <label>Reason</label>
                <span>{evalCase.closedReason}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Assessments Tab Component
function AssessmentsTab({
  evalCase,
  canManage,
  onAddClick,
  onRefresh,
}: {
  evalCase: EvaluationCase;
  canManage: boolean;
  onAddClick: () => void;
  onRefresh: () => void;
}) {
  const handleDelete = async (assessmentId: string) => {
    if (confirm('Are you sure you want to delete this assessment?')) {
      try {
        await api.deleteAssessment(evalCase.id, assessmentId);
        onRefresh();
      } catch (err) {
        console.error('Failed to delete assessment:', err);
        alert('Failed to delete assessment.');
      }
    }
  };

  return (
    <div className={styles.assessmentsPanel}>
      <div className={styles.panelHeader}>
        <h3>Assessments</h3>
        {canManage && evalCase.status !== 'CLOSED' && (
          <button onClick={onAddClick} className={styles.addButton}>
            + Add Assessment
          </button>
        )}
      </div>
      {(!evalCase.assessments || evalCase.assessments.length === 0) ? (
        <div className={styles.emptyPanel}>
          <p>No assessments scheduled yet</p>
        </div>
      ) : (
        <div className={styles.assessmentsList}>
          {evalCase.assessments.map((assessment) => (
            <div key={assessment.id} className={styles.assessmentCard}>
              <div className={styles.assessmentHeader}>
                <span className={styles.assessmentType}>
                  {ASSESSMENT_TYPE_LABELS[assessment.assessmentType]}
                </span>
                <span className={`${styles.assessmentStatus} ${styles[`status_${assessment.status}`]}`}>
                  {assessment.status.replace(/_/g, ' ')}
                </span>
              </div>
              <h4>{assessment.assessmentName}</h4>
              {assessment.assessorName && (
                <p className={styles.assessorInfo}>
                  Assessor: {assessment.assessorName}
                  {assessment.assessorTitle && ` (${assessment.assessorTitle})`}
                </p>
              )}
              {assessment.scheduledAt && (
                <p className={styles.scheduledDate}>
                  Scheduled: {format(new Date(assessment.scheduledAt), 'PP')}
                </p>
              )}
              {assessment.completedAt && (
                <p className={styles.completedDate}>
                  Completed: {format(new Date(assessment.completedAt), 'PP')}
                </p>
              )}
              {assessment.resultsSummary && (
                <p className={styles.resultsSummary}>{assessment.resultsSummary}</p>
              )}
              {canManage && assessment.status !== 'COMPLETED' && (
                <button
                  onClick={() => handleDelete(assessment.id)}
                  className={styles.deleteButton}
                >
                  Delete
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Participants Tab Component
function ParticipantsTab({
  evalCase,
  canManage,
  onAddClick,
  onRefresh,
}: {
  evalCase: EvaluationCase;
  canManage: boolean;
  onAddClick: () => void;
  onRefresh: () => void;
}) {
  const handleRemove = async (participantId: string) => {
    if (confirm('Are you sure you want to remove this participant?')) {
      try {
        await api.removeParticipant(evalCase.id, participantId);
        onRefresh();
      } catch (err) {
        console.error('Failed to remove participant:', err);
        alert('Failed to remove participant.');
      }
    }
  };

  return (
    <div className={styles.participantsPanel}>
      <div className={styles.panelHeader}>
        <h3>Team Participants</h3>
        {canManage && evalCase.status !== 'CLOSED' && (
          <button onClick={onAddClick} className={styles.addButton}>
            + Add Participant
          </button>
        )}
      </div>
      {(!evalCase.participants || evalCase.participants.length === 0) ? (
        <div className={styles.emptyPanel}>
          <p>No participants added yet</p>
        </div>
      ) : (
        <table className={styles.participantsTable}>
          <thead>
            <tr>
              <th>Name</th>
              <th>Role</th>
              <th>Contact</th>
              <th>Required</th>
              <th>Attended</th>
              {canManage && <th></th>}
            </tr>
          </thead>
          <tbody>
            {evalCase.participants.map((participant) => (
              <tr key={participant.id}>
                <td>
                  {participant.name}
                  {participant.title && <small> ({participant.title})</small>}
                </td>
                <td>{PARTICIPANT_ROLE_LABELS[participant.role]}</td>
                <td>{participant.email || participant.phone || '-'}</td>
                <td>{participant.isRequired ? 'Yes' : 'No'}</td>
                <td>
                  {participant.attended === null ? '-' : participant.attended ? 'Yes' : 'No'}
                </td>
                {canManage && (
                  <td>
                    <button
                      onClick={() => handleRemove(participant.id)}
                      className={styles.removeLink}
                    >
                      Remove
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

// Timeline Tab Component
function TimelineTab({ evalCase }: { evalCase: EvaluationCase }) {
  return (
    <div className={styles.timelinePanel}>
      <div className={styles.panelHeader}>
        <h3>Activity Timeline</h3>
      </div>
      {(!evalCase.timelineEvents || evalCase.timelineEvents.length === 0) ? (
        <div className={styles.emptyPanel}>
          <p>No timeline events yet</p>
        </div>
      ) : (
        <div className={styles.timeline}>
          {evalCase.timelineEvents.map((event) => (
            <div key={event.id} className={styles.timelineItem}>
              <div className={styles.timelineDot} />
              <div className={styles.timelineContent}>
                <div className={styles.timelineEventType}>{event.eventType.replace(/_/g, ' ')}</div>
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
  );
}

// Add Assessment Modal
function AddAssessmentModal({
  caseId,
  onClose,
  onAdded,
}: {
  caseId: string;
  onClose: () => void;
  onAdded: () => void;
}) {
  const [formData, setFormData] = useState<CreateAssessmentData>({
    assessmentType: 'EDUCATIONAL',
    assessmentName: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.assessmentName.trim()) {
      setError('Assessment name is required');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      await api.addAssessment(caseId, formData);
      onAdded();
    } catch (err) {
      console.error('Failed to add assessment:', err);
      setError('Failed to add assessment. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2>Add Assessment</h2>
          <button onClick={onClose} className={styles.closeButton}>&times;</button>
        </div>
        <form onSubmit={handleSubmit} className={styles.modalBody}>
          {error && <div className={styles.error}>{error}</div>}

          <div className={styles.formGroup}>
            <label htmlFor="assessmentType">Assessment Type *</label>
            <select
              id="assessmentType"
              value={formData.assessmentType}
              onChange={(e) => setFormData({ ...formData, assessmentType: e.target.value as AssessmentType })}
              required
            >
              {Object.entries(ASSESSMENT_TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="assessmentName">Assessment Name *</label>
            <input
              type="text"
              id="assessmentName"
              value={formData.assessmentName}
              onChange={(e) => setFormData({ ...formData, assessmentName: e.target.value })}
              placeholder="e.g., WISC-V, Woodcock-Johnson IV"
              required
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="assessorName">Assessor Name</label>
            <input
              type="text"
              id="assessorName"
              value={formData.assessorName || ''}
              onChange={(e) => setFormData({ ...formData, assessorName: e.target.value })}
              placeholder="e.g., Dr. Smith"
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="assessorTitle">Assessor Title</label>
            <input
              type="text"
              id="assessorTitle"
              value={formData.assessorTitle || ''}
              onChange={(e) => setFormData({ ...formData, assessorTitle: e.target.value })}
              placeholder="e.g., School Psychologist"
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="scheduledAt">Scheduled Date</label>
            <input
              type="datetime-local"
              id="scheduledAt"
              value={formData.scheduledAt || ''}
              onChange={(e) => setFormData({ ...formData, scheduledAt: e.target.value })}
            />
          </div>

          <div className={styles.modalFooter}>
            <button type="button" onClick={onClose} className={styles.cancelButton}>
              Cancel
            </button>
            <button type="submit" disabled={submitting} className={styles.submitButton}>
              {submitting ? 'Adding...' : 'Add Assessment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Add Participant Modal
function AddParticipantModal({
  caseId,
  onClose,
  onAdded,
}: {
  caseId: string;
  onClose: () => void;
  onAdded: () => void;
}) {
  const [formData, setFormData] = useState<CreateParticipantData>({
    role: 'PARENT',
    name: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setError('Name is required');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      await api.addParticipant(caseId, formData);
      onAdded();
    } catch (err) {
      console.error('Failed to add participant:', err);
      setError('Failed to add participant. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2>Add Participant</h2>
          <button onClick={onClose} className={styles.closeButton}>&times;</button>
        </div>
        <form onSubmit={handleSubmit} className={styles.modalBody}>
          {error && <div className={styles.error}>{error}</div>}

          <div className={styles.formGroup}>
            <label htmlFor="role">Role *</label>
            <select
              id="role"
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value as ParticipantRole })}
              required
            >
              {Object.entries(PARTICIPANT_ROLE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="name">Name *</label>
            <input
              type="text"
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Full name"
              required
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="title">Title</label>
            <input
              type="text"
              id="title"
              value={formData.title || ''}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g., 5th Grade Teacher"
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              value={formData.email || ''}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="email@example.com"
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="phone">Phone</label>
            <input
              type="tel"
              id="phone"
              value={formData.phone || ''}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="(555) 123-4567"
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={formData.isRequired || false}
                onChange={(e) => setFormData({ ...formData, isRequired: e.target.checked })}
              />
              Required for quorum
            </label>
          </div>

          <div className={styles.modalFooter}>
            <button type="button" onClick={onClose} className={styles.cancelButton}>
              Cancel
            </button>
            <button type="submit" disabled={submitting} className={styles.submitButton}>
              {submitting ? 'Adding...' : 'Add Participant'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Determination Modal
function DeterminationModal({
  evalCase,
  onClose,
  onCreated,
}: {
  evalCase: EvaluationCase;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [formData, setFormData] = useState<CreateDeterminationData>({
    isEligible: true,
    determinationDate: new Date().toISOString().split('T')[0],
    rationale: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.rationale.trim() || formData.rationale.length < 10) {
      setError('Rationale must be at least 10 characters');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      await api.createDetermination(evalCase.id, formData);
      onCreated();
    } catch (err) {
      console.error('Failed to create determination:', err);
      setError('Failed to record determination. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2>Record Eligibility Determination</h2>
          <button onClick={onClose} className={styles.closeButton}>&times;</button>
        </div>
        <form onSubmit={handleSubmit} className={styles.modalBody}>
          {error && <div className={styles.error}>{error}</div>}

          <div className={styles.formGroup}>
            <label>Eligibility Decision *</label>
            <div className={styles.radioGroup}>
              <label className={styles.radioLabel}>
                <input
                  type="radio"
                  name="isEligible"
                  checked={formData.isEligible}
                  onChange={() => setFormData({ ...formData, isEligible: true })}
                />
                Student IS eligible
              </label>
              <label className={styles.radioLabel}>
                <input
                  type="radio"
                  name="isEligible"
                  checked={!formData.isEligible}
                  onChange={() => setFormData({ ...formData, isEligible: false })}
                />
                Student is NOT eligible
              </label>
            </div>
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="determinationDate">Determination Date *</label>
            <input
              type="date"
              id="determinationDate"
              value={formData.determinationDate}
              onChange={(e) => setFormData({ ...formData, determinationDate: e.target.value })}
              required
            />
          </div>

          {formData.isEligible && evalCase.caseType === 'IDEA' && (
            <div className={styles.formGroup}>
              <label htmlFor="primaryDisabilityCategory">Primary Disability Category</label>
              <select
                id="primaryDisabilityCategory"
                value={formData.primaryDisabilityCategory || ''}
                onChange={(e) => setFormData({
                  ...formData,
                  primaryDisabilityCategory: e.target.value as IDEADisabilityCategory || undefined
                })}
              >
                <option value="">Select...</option>
                {Object.entries(DISABILITY_CATEGORY_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
          )}

          <div className={styles.formGroup}>
            <label htmlFor="rationale">Rationale *</label>
            <textarea
              id="rationale"
              value={formData.rationale}
              onChange={(e) => setFormData({ ...formData, rationale: e.target.value })}
              placeholder="Explain the basis for the eligibility decision..."
              rows={5}
              required
              minLength={10}
            />
          </div>

          {!formData.isEligible && (
            <div className={styles.formGroup}>
              <label htmlFor="alternativeRecommendations">Alternative Recommendations</label>
              <textarea
                id="alternativeRecommendations"
                value={formData.alternativeRecommendations || ''}
                onChange={(e) => setFormData({ ...formData, alternativeRecommendations: e.target.value })}
                placeholder="Recommendations for the student if not eligible..."
                rows={3}
              />
            </div>
          )}

          <div className={styles.modalFooter}>
            <button type="button" onClick={onClose} className={styles.cancelButton}>
              Cancel
            </button>
            <button type="submit" disabled={submitting} className={styles.submitButton}>
              {submitting ? 'Recording...' : 'Record Determination'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Schedule Meeting Modal
function ScheduleMeetingModal({
  evalCase,
  onClose,
  onScheduled,
}: {
  evalCase: EvaluationCase;
  onClose: () => void;
  onScheduled: () => void;
}) {
  const [meetingScheduledAt, setMeetingScheduledAt] = useState('');
  const [meetingLocation, setMeetingLocation] = useState('');
  const [meetingLink, setMeetingLink] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!meetingScheduledAt) {
      setError('Meeting date/time is required');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      await api.scheduleMeeting(evalCase.id, {
        meetingScheduledAt,
        meetingLocation: meetingLocation || undefined,
        meetingLink: meetingLink || undefined,
      });
      onScheduled();
    } catch (err) {
      console.error('Failed to schedule meeting:', err);
      setError('Failed to schedule meeting. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2>Schedule Eligibility Meeting</h2>
          <button onClick={onClose} className={styles.closeButton}>&times;</button>
        </div>
        <form onSubmit={handleSubmit} className={styles.modalBody}>
          {error && <div className={styles.error}>{error}</div>}

          <div className={styles.formGroup}>
            <label htmlFor="meetingScheduledAt">Date/Time *</label>
            <input
              type="datetime-local"
              id="meetingScheduledAt"
              value={meetingScheduledAt}
              onChange={(e) => setMeetingScheduledAt(e.target.value)}
              required
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="meetingLocation">Location</label>
            <input
              type="text"
              id="meetingLocation"
              value={meetingLocation}
              onChange={(e) => setMeetingLocation(e.target.value)}
              placeholder="e.g., Conference Room B"
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="meetingLink">Virtual Meeting Link</label>
            <input
              type="url"
              id="meetingLink"
              value={meetingLink}
              onChange={(e) => setMeetingLink(e.target.value)}
              placeholder="https://..."
            />
          </div>

          <div className={styles.modalFooter}>
            <button type="button" onClick={onClose} className={styles.cancelButton}>
              Cancel
            </button>
            <button type="submit" disabled={submitting} className={styles.submitButton}>
              {submitting ? 'Scheduling...' : 'Schedule Meeting'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
