'use client';

import { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import {
  api,
  DecisionLedgerEntry,
  DecisionType,
  DecisionStatus,
  CreateDecisionData,
  PlanMeeting,
} from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import styles from './DecisionsTab.module.css';

interface DecisionsTabProps {
  planId: string;
  studentId: string;
}

const DECISION_TYPE_LABELS: Record<DecisionType, string> = {
  ELIGIBILITY_CATEGORY: 'Eligibility Category',
  PLACEMENT_LRE: 'Placement / LRE',
  SERVICES_CHANGE: 'Services Change',
  GOALS_CHANGE: 'Goals Change',
  ACCOMMODATIONS_CHANGE: 'Accommodations Change',
  ESY_DECISION: 'ESY Decision',
  ASSESSMENT_PARTICIPATION: 'Assessment Participation',
  BEHAVIOR_SUPPORTS: 'Behavior Supports',
  TRANSITION_SERVICES: 'Transition Services',
  OTHER: 'Other',
};

const DECISION_TYPE_DESCRIPTIONS: Record<DecisionType, string> = {
  ELIGIBILITY_CATEGORY: 'Determination of disability category',
  PLACEMENT_LRE: 'Least Restrictive Environment decision',
  SERVICES_CHANGE: 'Changes to special education or related services',
  GOALS_CHANGE: 'Modifications to annual goals or objectives',
  ACCOMMODATIONS_CHANGE: 'Changes to accommodations or modifications',
  ESY_DECISION: 'Extended School Year eligibility determination',
  ASSESSMENT_PARTICIPATION: 'State and district assessment participation decisions',
  BEHAVIOR_SUPPORTS: 'Behavioral intervention or support decisions',
  TRANSITION_SERVICES: 'Post-secondary transition planning decisions',
  OTHER: 'Other plan-related decisions',
};

const SECTION_OPTIONS: { value: string; label: string }[] = [
  { value: 'LRE', label: 'LRE / Placement' },
  { value: 'SERVICES', label: 'Services' },
  { value: 'GOALS', label: 'Goals' },
  { value: 'ACCOMMODATIONS', label: 'Accommodations' },
  { value: 'ESY', label: 'Extended School Year' },
  { value: 'ASSESSMENT', label: 'Assessment' },
  { value: 'BEHAVIOR', label: 'Behavior' },
  { value: 'TRANSITION', label: 'Transition' },
  { value: 'OTHER', label: 'Other' },
];

export function DecisionsTab({ planId, studentId }: DecisionsTabProps) {
  const { user } = useAuth();
  const [decisions, setDecisions] = useState<DecisionLedgerEntry[]>([]);
  const [meetings, setMeetings] = useState<PlanMeeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<DecisionType | ''>('');
  const [filterStatus, setFilterStatus] = useState<DecisionStatus | ''>('');
  const [filterSection, setFilterSection] = useState<string>('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState<DecisionLedgerEntry | null>(null);
  const [showVoidModal, setShowVoidModal] = useState<DecisionLedgerEntry | null>(null);

  const canManage = user?.role === 'ADMIN' || user?.role === 'CASE_MANAGER';

  // Load meetings for linking dropdown
  useEffect(() => {
    const loadMeetings = async () => {
      try {
        const { meetings: loadedMeetings } = await api.getMeetings(studentId);
        setMeetings(loadedMeetings);
      } catch (err) {
        console.error('Failed to load meetings:', err);
      }
    };
    if (studentId) {
      loadMeetings();
    }
  }, [studentId]);

  const loadDecisions = useCallback(async () => {
    try {
      setLoading(true);
      const params: { type?: DecisionType; status?: DecisionStatus; section?: string } = {};
      if (filterType) params.type = filterType;
      if (filterStatus) params.status = filterStatus;
      if (filterSection) params.section = filterSection;

      const { decisions: loadedDecisions } = await api.getDecisions(planId, params);
      setDecisions(loadedDecisions);
      setError(null);
    } catch (err) {
      console.error('Failed to load decisions:', err);
      setError('Failed to load decisions');
    } finally {
      setLoading(false);
    }
  }, [planId, filterType, filterStatus, filterSection]);

  useEffect(() => {
    loadDecisions();
  }, [loadDecisions]);

  const handleCreate = async (data: CreateDecisionData) => {
    try {
      await api.createDecision(planId, data);
      await loadDecisions();
      setShowAddModal(false);
    } catch (err) {
      console.error('Failed to create decision:', err);
      throw err;
    }
  };

  const handleVoid = async (decisionId: string, voidReason: string) => {
    try {
      await api.voidDecision(decisionId, { voidReason });
      await loadDecisions();
      setShowVoidModal(null);
    } catch (err) {
      console.error('Failed to void decision:', err);
      throw err;
    }
  };

  const getStatusBadgeClass = (status: DecisionStatus) => {
    return status === 'ACTIVE' ? styles.statusActive : styles.statusVoid;
  };

  const getSectionLabel = (sectionKey: string | null | undefined) => {
    if (!sectionKey) return '—';
    const section = SECTION_OPTIONS.find(s => s.value === sectionKey);
    return section?.label || sectionKey;
  };

  if (loading && decisions.length === 0) {
    return (
      <div className={styles.loading}>
        <div className="spinner" />
        <p>Loading decisions...</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2>Decision Ledger</h2>
        {canManage && (
          <button
            className="btn btn-primary"
            onClick={() => setShowAddModal(true)}
          >
            Add Decision
          </button>
        )}
      </div>

      {error && <div className={styles.error}>{error}</div>}

      <div className={styles.filters}>
        <div className={styles.filterGroup}>
          <label>Type</label>
          <select
            value={filterType}
            onChange={e => setFilterType(e.target.value as DecisionType | '')}
          >
            <option value="">All Types</option>
            {(Object.keys(DECISION_TYPE_LABELS) as DecisionType[]).map(type => (
              <option key={type} value={type}>
                {DECISION_TYPE_LABELS[type]}
              </option>
            ))}
          </select>
        </div>
        <div className={styles.filterGroup}>
          <label>Status</label>
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value as DecisionStatus | '')}
          >
            <option value="">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="VOID">Void</option>
          </select>
        </div>
        <div className={styles.filterGroup}>
          <label>Section</label>
          <select
            value={filterSection}
            onChange={e => setFilterSection(e.target.value)}
          >
            <option value="">All Sections</option>
            {SECTION_OPTIONS.map(section => (
              <option key={section.value} value={section.value}>
                {section.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {decisions.length === 0 ? (
        <div className={styles.emptyState}>
          <p>No decisions recorded yet.</p>
          {canManage && (
            <p>Click &quot;Add Decision&quot; to record a plan decision.</p>
          )}
        </div>
      ) : (
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Date</th>
                <th>Type</th>
                <th>Section</th>
                <th>Summary</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {decisions.map(decision => (
                <tr key={decision.id} className={decision.status === 'VOID' ? styles.voidRow : ''}>
                  <td>{format(new Date(decision.decidedAt), 'MMM d, yyyy')}</td>
                  <td>
                    <span className={styles.typeLabel}>
                      {DECISION_TYPE_LABELS[decision.decisionType]}
                    </span>
                  </td>
                  <td>
                    <span className={styles.sectionLabel}>
                      {getSectionLabel(decision.sectionKey)}
                    </span>
                  </td>
                  <td className={styles.summaryCell}>
                    <span className={styles.summaryText}>{decision.summary}</span>
                  </td>
                  <td>
                    <span className={`${styles.statusBadge} ${getStatusBadgeClass(decision.status)}`}>
                      {decision.status}
                    </span>
                  </td>
                  <td>
                    <div className={styles.actions}>
                      <button
                        className={styles.viewBtn}
                        onClick={() => setShowDetailModal(decision)}
                      >
                        View
                      </button>
                      {canManage && decision.status === 'ACTIVE' && (
                        <button
                          className={styles.voidBtn}
                          onClick={() => setShowVoidModal(decision)}
                        >
                          Void
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

      {/* Add Decision Modal */}
      {showAddModal && (
        <AddDecisionModal
          onClose={() => setShowAddModal(false)}
          onCreate={handleCreate}
          meetings={meetings}
        />
      )}

      {/* Decision Detail Modal */}
      {showDetailModal && (
        <DecisionDetailModal
          decision={showDetailModal}
          onClose={() => setShowDetailModal(null)}
          onVoid={canManage && showDetailModal.status === 'ACTIVE' ? () => {
            setShowDetailModal(null);
            setShowVoidModal(showDetailModal);
          } : undefined}
        />
      )}

      {/* Void Confirmation Modal */}
      {showVoidModal && (
        <VoidDecisionModal
          decision={showVoidModal}
          onClose={() => setShowVoidModal(null)}
          onVoid={(reason) => handleVoid(showVoidModal.id, reason)}
        />
      )}
    </div>
  );
}

interface AddDecisionModalProps {
  onClose: () => void;
  onCreate: (data: CreateDecisionData) => Promise<void>;
  meetings: PlanMeeting[];
}

function AddDecisionModal({ onClose, onCreate, meetings }: AddDecisionModalProps) {
  const [formData, setFormData] = useState<CreateDecisionData>({
    decisionType: 'OTHER',
    sectionKey: '',
    summary: '',
    rationale: '',
    optionsConsidered: '',
    participants: '',
    meetingId: '',
    decidedAt: new Date().toISOString().slice(0, 16),
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.summary.trim() || !formData.rationale.trim()) {
      setError('Summary and rationale are required');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      await onCreate({
        ...formData,
        sectionKey: formData.sectionKey || undefined,
        meetingId: formData.meetingId || undefined,
        decidedAt: formData.decidedAt ? new Date(formData.decidedAt).toISOString() : undefined,
      });
    } catch {
      setError('Failed to create decision');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modal}>
        <div className={styles.modalHeader}>
          <h3>Add Decision</h3>
          <button className={styles.closeBtn} onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className={styles.modalBody}>
            {error && <div className={styles.modalError}>{error}</div>}

            <div className={styles.formGroup}>
              <label>Decision Type *</label>
              <select
                value={formData.decisionType}
                onChange={e => setFormData({ ...formData, decisionType: e.target.value as DecisionType })}
              >
                {(Object.keys(DECISION_TYPE_LABELS) as DecisionType[]).map(type => (
                  <option key={type} value={type}>
                    {DECISION_TYPE_LABELS[type]}
                  </option>
                ))}
              </select>
              <p className={styles.fieldHint}>
                {DECISION_TYPE_DESCRIPTIONS[formData.decisionType]}
              </p>
            </div>

            <div className={styles.formGroup}>
              <label>Section</label>
              <select
                value={formData.sectionKey || ''}
                onChange={e => setFormData({ ...formData, sectionKey: e.target.value })}
              >
                <option value="">-- Select Section --</option>
                {SECTION_OPTIONS.map(section => (
                  <option key={section.value} value={section.value}>
                    {section.label}
                  </option>
                ))}
              </select>
              <p className={styles.fieldHint}>
                Which IEP section does this decision relate to?
              </p>
            </div>

            <div className={styles.formGroup}>
              <label>Link Meeting</label>
              <select
                value={formData.meetingId || ''}
                onChange={e => setFormData({ ...formData, meetingId: e.target.value })}
              >
                <option value="">-- No Meeting --</option>
                {meetings.map(meeting => (
                  <option key={meeting.id} value={meeting.id}>
                    {meeting.meetingType?.name || 'Meeting'} - {format(new Date(meeting.scheduledAt), 'MMM d, yyyy')}
                  </option>
                ))}
              </select>
              <p className={styles.fieldHint}>
                Link this decision to a specific meeting
              </p>
            </div>

            <div className={styles.formGroup}>
              <label>Summary *</label>
              <input
                type="text"
                value={formData.summary}
                onChange={e => setFormData({ ...formData, summary: e.target.value })}
                placeholder="Brief summary of the decision"
              />
            </div>

            <div className={styles.formGroup}>
              <label>Rationale *</label>
              <textarea
                value={formData.rationale}
                onChange={e => setFormData({ ...formData, rationale: e.target.value })}
                placeholder="Explain the reasoning behind this decision"
                rows={3}
              />
            </div>

            <div className={styles.formGroup}>
              <label>Options Considered</label>
              <textarea
                value={formData.optionsConsidered || ''}
                onChange={e => setFormData({ ...formData, optionsConsidered: e.target.value })}
                placeholder="What other options were discussed?"
                rows={2}
              />
            </div>

            <div className={styles.formGroup}>
              <label>Participants</label>
              <input
                type="text"
                value={formData.participants || ''}
                onChange={e => setFormData({ ...formData, participants: e.target.value })}
                placeholder="Who was involved in making this decision?"
              />
            </div>

            <div className={styles.formGroup}>
              <label>Decision Date</label>
              <input
                type="datetime-local"
                value={formData.decidedAt || ''}
                onChange={e => setFormData({ ...formData, decidedAt: e.target.value })}
              />
            </div>
          </div>

          <div className={styles.modalFooter}>
            <button type="button" className="btn btn-outline" onClick={onClose} disabled={submitting}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Saving...' : 'Save Decision'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

interface DecisionDetailModalProps {
  decision: DecisionLedgerEntry;
  onClose: () => void;
  onVoid?: () => void;
}

function DecisionDetailModal({ decision, onClose, onVoid }: DecisionDetailModalProps) {
  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modal}>
        <div className={styles.modalHeader}>
          <h3>Decision Detail</h3>
          <button className={styles.closeBtn} onClick={onClose}>×</button>
        </div>

        <div className={styles.modalBody}>
          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>Date</span>
            <span>{format(new Date(decision.decidedAt), 'MMM d, yyyy h:mm a')}</span>
          </div>

          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>Type</span>
            <span>{DECISION_TYPE_LABELS[decision.decisionType]}</span>
          </div>

          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>Status</span>
            <span className={`${styles.statusBadge} ${decision.status === 'ACTIVE' ? styles.statusActive : styles.statusVoid}`}>
              {decision.status}
            </span>
          </div>

          {decision.sectionKey && (
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>Section</span>
              <span>
                {SECTION_OPTIONS.find(s => s.value === decision.sectionKey)?.label || decision.sectionKey}
              </span>
            </div>
          )}

          <div className={styles.detailSection}>
            <h4>Summary</h4>
            <p>{decision.summary}</p>
          </div>

          <div className={styles.detailSection}>
            <h4>Rationale</h4>
            <p>{decision.rationale}</p>
          </div>

          {decision.optionsConsidered && (
            <div className={styles.detailSection}>
              <h4>Options Considered</h4>
              <p>{decision.optionsConsidered}</p>
            </div>
          )}

          {decision.participants && (
            <div className={styles.detailSection}>
              <h4>Participants</h4>
              <p>{decision.participants}</p>
            </div>
          )}

          {decision.decidedBy && (
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>Decided By</span>
              <span>{decision.decidedBy.displayName}</span>
            </div>
          )}

          {decision.planVersion && (
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>Linked Version</span>
              <span>Version {decision.planVersion.versionNumber}</span>
            </div>
          )}

          {decision.meeting && (
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>Linked Meeting</span>
              <span>
                {decision.meeting.meetingType?.name || 'Meeting'} -{' '}
                {format(new Date(decision.meeting.scheduledAt), 'MMM d, yyyy')}
              </span>
            </div>
          )}

          {decision.status === 'VOID' && (
            <div className={styles.voidInfo}>
              <h4>Voided</h4>
              {decision.voidedAt && (
                <p>Date: {format(new Date(decision.voidedAt), 'MMM d, yyyy h:mm a')}</p>
              )}
              {decision.voidedBy && (
                <p>By: {decision.voidedBy.displayName}</p>
              )}
              {decision.voidReason && (
                <p>Reason: {decision.voidReason}</p>
              )}
            </div>
          )}
        </div>

        <div className={styles.modalFooter}>
          {onVoid && decision.status === 'ACTIVE' && (
            <button className="btn btn-outline" style={{ color: '#d32f2f' }} onClick={onVoid}>
              Void Decision
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

interface VoidDecisionModalProps {
  decision: DecisionLedgerEntry;
  onClose: () => void;
  onVoid: (reason: string) => Promise<void>;
}

function VoidDecisionModal({ decision, onClose, onVoid }: VoidDecisionModalProps) {
  const [voidReason, setVoidReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!voidReason.trim()) {
      setError('Void reason is required');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      await onVoid(voidReason);
    } catch {
      setError('Failed to void decision');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modal}>
        <div className={styles.modalHeader}>
          <h3>Void Decision</h3>
          <button className={styles.closeBtn} onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className={styles.modalBody}>
            {error && <div className={styles.modalError}>{error}</div>}

            <div className={styles.voidWarning}>
              <p>
                You are about to void the following decision:
              </p>
              <p className={styles.voidDecisionSummary}>
                <strong>{DECISION_TYPE_LABELS[decision.decisionType]}</strong>: {decision.summary}
              </p>
              <p>
                The decision record will remain visible but marked as voided. This action cannot be undone.
              </p>
            </div>

            <div className={styles.formGroup}>
              <label>Void Reason *</label>
              <textarea
                value={voidReason}
                onChange={e => setVoidReason(e.target.value)}
                placeholder="Explain why this decision is being voided"
                rows={3}
              />
            </div>
          </div>

          <div className={styles.modalFooter}>
            <button type="button" className="btn btn-outline" onClick={onClose} disabled={submitting}>
              Cancel
            </button>
            <button
              type="submit"
              className="btn"
              style={{ backgroundColor: '#d32f2f', color: '#fff' }}
              disabled={submitting}
            >
              {submitting ? 'Voiding...' : 'Void Decision'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
