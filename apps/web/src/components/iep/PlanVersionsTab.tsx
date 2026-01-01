'use client';

import { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import {
  api,
  PlanVersion,
  SignatureRecord,
  SignatureRole,
  FinalizePlanData,
  DecisionType,
} from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import styles from './PlanVersionsTab.module.css';

interface PlanVersionsTabProps {
  planId: string;
  planStatus: string;
  onPlanUpdated?: () => void;
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

const SIGNATURE_ROLE_LABELS: Record<SignatureRole, string> = {
  PARENT_GUARDIAN: 'Parent/Guardian',
  CASE_MANAGER: 'Case Manager',
  SPECIAL_ED_TEACHER: 'Special Ed Teacher',
  GENERAL_ED_TEACHER: 'General Ed Teacher',
  RELATED_SERVICE_PROVIDER: 'Related Service Provider',
  ADMINISTRATOR: 'Administrator',
  STUDENT: 'Student',
  OTHER: 'Other',
};

export function PlanVersionsTab({ planId, planStatus, onPlanUpdated }: PlanVersionsTabProps) {
  const { user } = useAuth();
  const [versions, setVersions] = useState<PlanVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showFinalizeModal, setShowFinalizeModal] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  const [expandedVersionId, setExpandedVersionId] = useState<string | null>(null);

  const canManage = user?.role === 'ADMIN' || user?.role === 'CASE_MANAGER';

  const loadVersions = useCallback(async () => {
    try {
      setLoading(true);
      const { versions: loadedVersions } = await api.getPlanVersions(planId);
      setVersions(loadedVersions);
      setError(null);
    } catch (err) {
      console.error('Failed to load versions:', err);
      setError('Failed to load plan versions');
    } finally {
      setLoading(false);
    }
  }, [planId]);

  useEffect(() => {
    loadVersions();
  }, [loadVersions]);

  const handleFinalize = async (data: FinalizePlanData) => {
    try {
      setFinalizing(true);
      await api.finalizePlan(planId, data);
      await loadVersions();
      setShowFinalizeModal(false);
      onPlanUpdated?.();
    } catch (err) {
      console.error('Failed to finalize plan:', err);
      setError('Failed to finalize plan');
    } finally {
      setFinalizing(false);
    }
  };

  const handleDistribute = async (versionId: string) => {
    if (!confirm('Are you sure you want to mark this version as distributed?')) return;
    try {
      await api.distributePlanVersion(versionId);
      await loadVersions();
    } catch (err) {
      console.error('Failed to distribute version:', err);
      setError('Failed to distribute version');
    }
  };

  const handleDownloadExport = async (exportId: string, fileName: string) => {
    try {
      const blob = await api.downloadExport(exportId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('Failed to download export:', err);
      setError('Failed to download export');
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'FINAL':
        return styles.statusFinal;
      case 'DISTRIBUTED':
        return styles.statusDistributed;
      case 'SUPERSEDED':
        return styles.statusSuperseded;
      default:
        return '';
    }
  };

  const getSignatureStatusIcon = (status: string) => {
    switch (status) {
      case 'SIGNED':
        return '✓';
      case 'DECLINED':
        return '✗';
      default:
        return '○';
    }
  };

  if (loading) {
    return (
      <div className={styles.loading}>
        <div className="spinner" />
        <p>Loading versions...</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2>Plan Versions</h2>
        {canManage && (planStatus === 'DRAFT' || planStatus === 'ACTIVE') && (
          <button
            className="btn btn-primary"
            onClick={() => setShowFinalizeModal(true)}
          >
            Finalize Plan
          </button>
        )}
      </div>

      {error && <div className={styles.error}>{error}</div>}

      {versions.length === 0 ? (
        <div className={styles.emptyState}>
          <p>No versions have been finalized yet.</p>
          {canManage && planStatus === 'DRAFT' && (
            <p>Click &quot;Finalize Plan&quot; to create the first version.</p>
          )}
        </div>
      ) : (
        <div className={styles.versionsList}>
          {versions.map(version => (
            <div key={version.id} className={styles.versionCard}>
              <div
                className={styles.versionHeader}
                onClick={() => setExpandedVersionId(
                  expandedVersionId === version.id ? null : version.id
                )}
              >
                <div className={styles.versionInfo}>
                  <span className={styles.versionNumber}>
                    Version {version.versionNumber}
                  </span>
                  <span className={`${styles.statusBadge} ${getStatusBadgeClass(version.status)}`}>
                    {version.status}
                  </span>
                </div>
                <div className={styles.versionMeta}>
                  <span>
                    Finalized: {format(new Date(version.finalizedAt), 'MMM d, yyyy h:mm a')}
                  </span>
                  {version.finalizedBy && (
                    <span> by {version.finalizedBy.displayName}</span>
                  )}
                </div>
                <span className={styles.expandIcon}>
                  {expandedVersionId === version.id ? '▼' : '▶'}
                </span>
              </div>

              {expandedVersionId === version.id && (
                <div className={styles.versionDetails}>
                  {version.versionNotes && (
                    <div className={styles.versionNotes}>
                      <strong>Notes:</strong> {version.versionNotes}
                    </div>
                  )}

                  {version.distributedAt && (
                    <div className={styles.distributionInfo}>
                      <strong>Distributed:</strong>{' '}
                      {format(new Date(version.distributedAt), 'MMM d, yyyy h:mm a')}
                      {version.distributedBy && ` by ${version.distributedBy.displayName}`}
                    </div>
                  )}

                  {/* Signature Packet */}
                  {version.signaturePacket && (
                    <div className={styles.signatureSection}>
                      <h4>Signatures</h4>
                      <div className={styles.signatureStatus}>
                        <span className={`${styles.packetStatus} ${styles[`packet${version.signaturePacket.status}`]}`}>
                          {version.signaturePacket.status}
                        </span>
                      </div>
                      <div className={styles.signatureList}>
                        {version.signaturePacket.signatures?.map((sig: SignatureRecord) => (
                          <div key={sig.id} className={styles.signatureRow}>
                            <span className={styles.signatureIcon}>
                              {getSignatureStatusIcon(sig.status)}
                            </span>
                            <span className={styles.signatureRole}>
                              {SIGNATURE_ROLE_LABELS[sig.role] || sig.role}
                            </span>
                            <span className={styles.signerName}>
                              {sig.signerName || '—'}
                            </span>
                            <span className={`${styles.signatureStatus} ${styles[`sig${sig.status}`]}`}>
                              {sig.status}
                            </span>
                            {sig.signedAt && (
                              <span className={styles.signedAt}>
                                {format(new Date(sig.signedAt), 'MMM d, yyyy')}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Exports */}
                  {version.exports && version.exports.length > 0 && (
                    <div className={styles.exportsSection}>
                      <h4>Downloads</h4>
                      <div className={styles.exportsList}>
                        {version.exports.map(exp => (
                          <button
                            key={exp.id}
                            className={styles.exportButton}
                            onClick={() => handleDownloadExport(exp.id, exp.fileName)}
                          >
                            {exp.format.toUpperCase()} - {exp.fileName}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  {canManage && version.status === 'FINAL' && (
                    <div className={styles.versionActions}>
                      <button
                        className="btn btn-outline btn-sm"
                        onClick={() => handleDistribute(version.id)}
                      >
                        Mark as Distributed
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Finalize Modal */}
      {showFinalizeModal && (
        <FinalizeModal
          onClose={() => setShowFinalizeModal(false)}
          onFinalize={handleFinalize}
          finalizing={finalizing}
        />
      )}
    </div>
  );
}

interface FinalizeModalProps {
  onClose: () => void;
  onFinalize: (data: FinalizePlanData) => void;
  finalizing: boolean;
}

function FinalizeModal({ onClose, onFinalize, finalizing }: FinalizeModalProps) {
  const [versionNotes, setVersionNotes] = useState('');
  const [createSignaturePacket, setCreateSignaturePacket] = useState(true);
  const [selectedRoles, setSelectedRoles] = useState<SignatureRole[]>(['CASE_MANAGER', 'PARENT_GUARDIAN']);
  const [decisions, setDecisions] = useState<Array<{
    decisionType: DecisionType;
    summary: string;
    rationale: string;
  }>>([]);

  const handleAddDecision = () => {
    setDecisions([
      ...decisions,
      { decisionType: 'OTHER', summary: '', rationale: '' },
    ]);
  };

  const handleRemoveDecision = (index: number) => {
    setDecisions(decisions.filter((_, i) => i !== index));
  };

  const handleDecisionChange = (
    index: number,
    field: 'decisionType' | 'summary' | 'rationale',
    value: string
  ) => {
    const updated = [...decisions];
    if (field === 'decisionType') {
      updated[index][field] = value as DecisionType;
    } else {
      updated[index][field] = value;
    }
    setDecisions(updated);
  };

  const handleRoleToggle = (role: SignatureRole) => {
    setSelectedRoles(prev =>
      prev.includes(role)
        ? prev.filter(r => r !== role)
        : [...prev, role]
    );
  };

  const handleSubmit = () => {
    onFinalize({
      versionNotes: versionNotes || undefined,
      createSignaturePacket,
      requiredSignatureRoles: createSignaturePacket ? selectedRoles : undefined,
      decisions: decisions.length > 0 ? decisions : undefined,
    });
  };

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modal}>
        <div className={styles.modalHeader}>
          <h3>Finalize Plan</h3>
          <button className={styles.closeBtn} onClick={onClose}>×</button>
        </div>

        <div className={styles.modalBody}>
          <div className={styles.formGroup}>
            <label>Version Notes (optional)</label>
            <textarea
              value={versionNotes}
              onChange={e => setVersionNotes(e.target.value)}
              placeholder="Add notes about this version..."
              rows={3}
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={createSignaturePacket}
                onChange={e => setCreateSignaturePacket(e.target.checked)}
              />
              Create signature packet for this version
            </label>
          </div>

          {createSignaturePacket && (
            <div className={styles.formGroup}>
              <label>Required Signatures</label>
              <div className={styles.rolesGrid}>
                {(Object.keys(SIGNATURE_ROLE_LABELS) as SignatureRole[]).map(role => (
                  <label key={role} className={styles.roleCheckbox}>
                    <input
                      type="checkbox"
                      checked={selectedRoles.includes(role)}
                      onChange={() => handleRoleToggle(role)}
                    />
                    {SIGNATURE_ROLE_LABELS[role]}
                  </label>
                ))}
              </div>
            </div>
          )}

          <div className={styles.decisionsSection}>
            <div className={styles.decisionsSectionHeader}>
              <label>Decisions (optional)</label>
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={handleAddDecision}
              >
                + Add Decision
              </button>
            </div>

            {decisions.map((decision, index) => (
              <div key={index} className={styles.decisionCard}>
                <div className={styles.decisionHeader}>
                  <select
                    value={decision.decisionType}
                    onChange={e => handleDecisionChange(index, 'decisionType', e.target.value)}
                  >
                    {(Object.keys(DECISION_TYPE_LABELS) as DecisionType[]).map(type => (
                      <option key={type} value={type}>
                        {DECISION_TYPE_LABELS[type]}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    className={styles.removeDecisionBtn}
                    onClick={() => handleRemoveDecision(index)}
                  >
                    ×
                  </button>
                </div>
                <input
                  type="text"
                  placeholder="Summary"
                  value={decision.summary}
                  onChange={e => handleDecisionChange(index, 'summary', e.target.value)}
                />
                <textarea
                  placeholder="Rationale"
                  value={decision.rationale}
                  onChange={e => handleDecisionChange(index, 'rationale', e.target.value)}
                  rows={2}
                />
              </div>
            ))}
          </div>
        </div>

        <div className={styles.modalFooter}>
          <button className="btn btn-outline" onClick={onClose} disabled={finalizing}>
            Cancel
          </button>
          <button className="btn btn-primary" onClick={handleSubmit} disabled={finalizing}>
            {finalizing ? 'Finalizing...' : 'Finalize Plan'}
          </button>
        </div>
      </div>
    </div>
  );
}
