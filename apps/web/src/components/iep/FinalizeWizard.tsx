'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import {
  api,
  Plan,
  DecisionType,
  SignatureRole,
  FinalizePlanData,
} from '@/lib/api';
import styles from './FinalizeWizard.module.css';

interface FinalizeWizardProps {
  plan: Plan;
  onClose: () => void;
  onFinalized: () => void;
}

type Step = 'review' | 'decisions' | 'finalize';

interface DecisionConfirmation {
  type: DecisionType;
  sectionKey: string;
  label: string;
  summary: string;
  rationale: string;
  confirmed: boolean;
  applicable: boolean;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
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

export function FinalizeWizard({ plan, onClose, onFinalized }: FinalizeWizardProps) {
  const [step, setStep] = useState<Step>('review');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Decision confirmations
  const [decisions, setDecisions] = useState<DecisionConfirmation[]>([]);

  // Finalize options
  const [versionNotes, setVersionNotes] = useState('');
  const [createSignaturePacket, setCreateSignaturePacket] = useState(true);
  const [selectedRoles, setSelectedRoles] = useState<SignatureRole[]>([
    'PARENT_GUARDIAN',
    'CASE_MANAGER',
  ]);

  // Extract plan data for review
  const fieldValues = plan.fieldValues || {};
  const services = (fieldValues.services as { type?: string; frequency?: string; duration?: string }[]) || [];
  const accommodations = (fieldValues.accommodations as string[]) || [];
  const lrePlacement = fieldValues.lre_placement as string || fieldValues.placement as string || 'Not specified';
  const esyDecision = fieldValues.esy_eligible as boolean || fieldValues.esy as boolean || false;

  // Initialize decisions based on plan content
  useEffect(() => {
    const initialDecisions: DecisionConfirmation[] = [
      {
        type: 'PLACEMENT_LRE',
        sectionKey: 'LRE',
        label: 'LRE / Placement',
        summary: `LRE Placement: ${lrePlacement}`,
        rationale: 'Team determined appropriate placement based on student needs.',
        confirmed: false,
        applicable: true,
      },
      {
        type: 'SERVICES_CHANGE',
        sectionKey: 'SERVICES',
        label: 'Services',
        summary: services.length > 0
          ? `${services.length} service(s): ${services.map(s => s.type || 'Service').join(', ')}`
          : 'No services specified',
        rationale: 'Services determined based on evaluation and student needs.',
        confirmed: false,
        applicable: services.length > 0,
      },
      {
        type: 'ACCOMMODATIONS_CHANGE',
        sectionKey: 'ACCOMMODATIONS',
        label: 'Accommodations',
        summary: accommodations.length > 0
          ? `${accommodations.length} accommodation(s) specified`
          : 'No accommodations specified',
        rationale: 'Accommodations determined to support student access to curriculum.',
        confirmed: false,
        applicable: accommodations.length > 0,
      },
      {
        type: 'ESY_DECISION',
        sectionKey: 'ESY',
        label: 'Extended School Year (ESY)',
        summary: esyDecision ? 'Student qualifies for ESY services' : 'Student does not qualify for ESY services',
        rationale: esyDecision
          ? 'Student demonstrates risk of significant regression without ESY.'
          : 'Student does not demonstrate need for ESY based on data review.',
        confirmed: false,
        applicable: true,
      },
    ];
    setDecisions(initialDecisions);
  }, [lrePlacement, services, accommodations, esyDecision]);

  const handleToggleDecision = (index: number) => {
    setDecisions(prev => prev.map((d, i) =>
      i === index ? { ...d, confirmed: !d.confirmed } : d
    ));
  };

  const handleUpdateDecisionSummary = (index: number, summary: string) => {
    setDecisions(prev => prev.map((d, i) =>
      i === index ? { ...d, summary } : d
    ));
  };

  const handleUpdateDecisionRationale = (index: number, rationale: string) => {
    setDecisions(prev => prev.map((d, i) =>
      i === index ? { ...d, rationale } : d
    ));
  };

  const handleToggleRole = (role: SignatureRole) => {
    setSelectedRoles(prev =>
      prev.includes(role)
        ? prev.filter(r => r !== role)
        : [...prev, role]
    );
  };

  const handleFinalize = async () => {
    setSubmitting(true);
    setError(null);

    try {
      const confirmedDecisions = decisions
        .filter(d => d.confirmed && d.applicable)
        .map(d => ({
          decisionType: d.type,
          sectionKey: d.sectionKey,
          summary: d.summary,
          rationale: d.rationale,
        }));

      const data: FinalizePlanData = {
        versionNotes: versionNotes || undefined,
        createSignaturePacket,
        requiredSignatureRoles: createSignaturePacket ? selectedRoles : undefined,
        decisions: confirmedDecisions.length > 0 ? confirmedDecisions : undefined,
      };

      await api.finalizePlan(plan.id, data);
      onFinalized();
    } catch (err) {
      console.error('Finalize failed:', err);
      setError('Failed to finalize plan. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const applicableDecisions = decisions.filter(d => d.applicable);
  const confirmedCount = applicableDecisions.filter(d => d.confirmed).length;
  const canProceedToFinalize = confirmedCount > 0;

  return (
    <div className={styles.overlay}>
      <div className={styles.wizard}>
        <div className={styles.header}>
          <h2>Finalize {plan.planType?.name || 'Plan'} — Step {step === 'review' ? '1' : step === 'decisions' ? '2' : '3'} of 3</h2>
          <button className={styles.closeBtn} onClick={onClose}>×</button>
        </div>

        <div className={styles.progress}>
          <div className={`${styles.progressStep} ${step === 'review' ? styles.active : ''} ${step !== 'review' ? styles.completed : ''}`}>
            <span className={styles.stepNum}>1</span>
            <span className={styles.stepLabel}>Review</span>
          </div>
          <div className={styles.progressLine} />
          <div className={`${styles.progressStep} ${step === 'decisions' ? styles.active : ''} ${step === 'finalize' ? styles.completed : ''}`}>
            <span className={styles.stepNum}>2</span>
            <span className={styles.stepLabel}>Decisions</span>
          </div>
          <div className={styles.progressLine} />
          <div className={`${styles.progressStep} ${step === 'finalize' ? styles.active : ''}`}>
            <span className={styles.stepNum}>3</span>
            <span className={styles.stepLabel}>Finalize</span>
          </div>
        </div>

        <div className={styles.content}>
          {/* Step 1: Review Summary */}
          {step === 'review' && (
            <div className={styles.reviewStep}>
              <h3>Review Summary</h3>
              <p className={styles.stepDescription}>
                Review the key information in this plan before confirming decisions.
              </p>

              <div className={styles.summaryCard}>
                <div className={styles.summaryRow}>
                  <span className={styles.summaryLabel}>Student</span>
                  <span className={styles.summaryValue}>
                    {plan.student.firstName} {plan.student.lastName}
                  </span>
                </div>
                <div className={styles.summaryRow}>
                  <span className={styles.summaryLabel}>Plan Period</span>
                  <span className={styles.summaryValue}>
                    {plan.startDate ? format(new Date(plan.startDate), 'MMM d, yyyy') : 'Not set'} to{' '}
                    {plan.endDate ? format(new Date(plan.endDate), 'MMM d, yyyy') : 'Not set'}
                  </span>
                </div>
                <div className={styles.summaryRow}>
                  <span className={styles.summaryLabel}>Placement / LRE</span>
                  <span className={styles.summaryValue}>{lrePlacement}</span>
                </div>
              </div>

              <div className={styles.summarySection}>
                <h4>Services ({services.length})</h4>
                {services.length > 0 ? (
                  <table className={styles.summaryTable}>
                    <thead>
                      <tr>
                        <th>Service</th>
                        <th>Frequency</th>
                        <th>Duration</th>
                      </tr>
                    </thead>
                    <tbody>
                      {services.map((service, i) => (
                        <tr key={i}>
                          <td>{service.type || 'Service'}</td>
                          <td>{service.frequency || '—'}</td>
                          <td>{service.duration || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p className={styles.emptyNote}>No services specified</p>
                )}
              </div>

              <div className={styles.summarySection}>
                <h4>Accommodations ({accommodations.length})</h4>
                {accommodations.length > 0 ? (
                  <ul className={styles.accommodationsList}>
                    {accommodations.slice(0, 5).map((acc, i) => (
                      <li key={i}>{acc}</li>
                    ))}
                    {accommodations.length > 5 && (
                      <li className={styles.moreItems}>+ {accommodations.length - 5} more</li>
                    )}
                  </ul>
                ) : (
                  <p className={styles.emptyNote}>No accommodations specified</p>
                )}
              </div>

              <div className={styles.summarySection}>
                <h4>Extended School Year (ESY)</h4>
                <p className={esyDecision ? styles.esyYes : styles.esyNo}>
                  {esyDecision ? 'Yes — Student qualifies' : 'No — Student does not qualify'}
                </p>
              </div>
            </div>
          )}

          {/* Step 2: Confirm Decisions */}
          {step === 'decisions' && (
            <div className={styles.decisionsStep}>
              <h3>Confirm Decisions</h3>
              <p className={styles.stepDescription}>
                Check each decision to create a permanent record in the Decision Ledger.
                These records document the IEP team&apos;s determinations.
              </p>

              <div className={styles.decisionsList}>
                {applicableDecisions.map((decision) => {
                  const originalIndex = decisions.findIndex(d => d.type === decision.type);
                  return (
                    <div key={decision.type} className={`${styles.decisionItem} ${decision.confirmed ? styles.confirmed : ''}`}>
                      <label className={styles.decisionCheckbox}>
                        <input
                          type="checkbox"
                          checked={decision.confirmed}
                          onChange={() => handleToggleDecision(originalIndex)}
                        />
                        <span className={styles.decisionLabel}>{decision.label} decision confirmed</span>
                      </label>

                      {decision.confirmed && (
                        <div className={styles.decisionDetails}>
                          <div className={styles.decisionField}>
                            <label>Summary</label>
                            <input
                              type="text"
                              value={decision.summary}
                              onChange={e => handleUpdateDecisionSummary(originalIndex, e.target.value)}
                              placeholder="Brief summary of this decision"
                            />
                          </div>
                          <div className={styles.decisionField}>
                            <label>Rationale</label>
                            <textarea
                              value={decision.rationale}
                              onChange={e => handleUpdateDecisionRationale(originalIndex, e.target.value)}
                              placeholder="Explain the reasoning behind this decision"
                              rows={2}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {confirmedCount === 0 && (
                <p className={styles.warningNote}>
                  Please confirm at least one decision to proceed.
                </p>
              )}
            </div>
          )}

          {/* Step 3: Finalize */}
          {step === 'finalize' && (
            <div className={styles.finalizeStep}>
              <h3>Finalize Plan</h3>
              <p className={styles.stepDescription}>
                This will create a new plan version, generate a PDF, and optionally create a signature packet.
              </p>

              {error && <div className={styles.error}>{error}</div>}

              <div className={styles.finalizeActions}>
                <div className={styles.actionItem}>
                  <span className={styles.actionIcon}>📄</span>
                  <div>
                    <strong>Create Plan Version</strong>
                    <p>Snapshot of current plan state (v{(plan as unknown as { versions?: { length: number }[] }).versions?.length ? ((plan as unknown as { versions: { length: number }[] }).versions.length + 1) : 1})</p>
                  </div>
                </div>
                <div className={styles.actionItem}>
                  <span className={styles.actionIcon}>📑</span>
                  <div>
                    <strong>Generate PDF Export</strong>
                    <p>Official document for distribution</p>
                  </div>
                </div>
                <div className={styles.actionItem}>
                  <span className={styles.actionIcon}>📝</span>
                  <div>
                    <strong>Create {confirmedCount} Decision Record(s)</strong>
                    <p>Immutable audit trail entries</p>
                  </div>
                </div>
              </div>

              <div className={styles.formGroup}>
                <label>Version Notes (Optional)</label>
                <textarea
                  value={versionNotes}
                  onChange={e => setVersionNotes(e.target.value)}
                  placeholder="Add notes about this version (e.g., annual review, amendment)"
                  rows={2}
                />
              </div>

              <div className={styles.signatureSection}>
                <label className={styles.signatureToggle}>
                  <input
                    type="checkbox"
                    checked={createSignaturePacket}
                    onChange={e => setCreateSignaturePacket(e.target.checked)}
                  />
                  <span>Create Signature Packet (OPEN)</span>
                </label>

                {createSignaturePacket && (
                  <div className={styles.roleSelection}>
                    <p className={styles.roleHint}>Select required signature roles:</p>
                    <div className={styles.roleGrid}>
                      {(Object.keys(SIGNATURE_ROLE_LABELS) as SignatureRole[]).map(role => (
                        <label key={role} className={styles.roleCheckbox}>
                          <input
                            type="checkbox"
                            checked={selectedRoles.includes(role)}
                            onChange={() => handleToggleRole(role)}
                          />
                          <span>{SIGNATURE_ROLE_LABELS[role]}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className={styles.footer}>
          {step !== 'review' && (
            <button
              className="btn btn-outline"
              onClick={() => setStep(step === 'finalize' ? 'decisions' : 'review')}
              disabled={submitting}
            >
              Back
            </button>
          )}
          {step === 'review' && (
            <button className="btn btn-outline" onClick={onClose}>
              Cancel
            </button>
          )}

          <div className={styles.footerRight}>
            {step === 'review' && (
              <button className="btn btn-primary" onClick={() => setStep('decisions')}>
                Next
              </button>
            )}
            {step === 'decisions' && (
              <button
                className="btn btn-primary"
                onClick={() => setStep('finalize')}
                disabled={!canProceedToFinalize}
              >
                Next
              </button>
            )}
            {step === 'finalize' && (
              <button
                className="btn btn-primary"
                onClick={handleFinalize}
                disabled={submitting}
              >
                {submitting ? 'Finalizing...' : 'Finalize'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
