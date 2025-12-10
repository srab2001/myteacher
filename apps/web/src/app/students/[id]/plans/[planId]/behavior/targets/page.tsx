'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { api, Plan, BehaviorTarget, BehaviorMeasurementType } from '@/lib/api';
import { DictationTextArea } from '@/components/forms/DictationTextArea';
import styles from './page.module.css';

type NewTarget = {
  code: string;
  name: string;
  definition: string;
  examples: string;
  nonExamples: string;
  measurementType: BehaviorMeasurementType;
};

const MEASUREMENT_LABELS: Record<BehaviorMeasurementType, string> = {
  FREQUENCY: 'Frequency (Count)',
  DURATION: 'Duration (Time)',
  INTERVAL: 'Interval Recording',
  RATING: 'Rating Scale',
};

const MEASUREMENT_DESCRIPTIONS: Record<BehaviorMeasurementType, string> = {
  FREQUENCY: 'Count the number of times the behavior occurs',
  DURATION: 'Measure how long the behavior lasts',
  INTERVAL: 'Record whether the behavior occurred during time intervals',
  RATING: 'Rate the behavior on a scale (1-5)',
};

export default function BehaviorTargetsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const planId = params.planId as string;
  const studentId = params.id as string;

  const [plan, setPlan] = useState<Plan | null>(null);
  const [targets, setTargets] = useState<BehaviorTarget[]>([]);
  const [loadingPlan, setLoadingPlan] = useState(true);
  const [loadingTargets, setLoadingTargets] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingTarget, setEditingTarget] = useState<BehaviorTarget | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [newTarget, setNewTarget] = useState<NewTarget>({
    code: '',
    name: '',
    definition: '',
    examples: '',
    nonExamples: '',
    measurementType: 'FREQUENCY',
  });

  useEffect(() => {
    if (!loading && !user) {
      router.push('/');
    }
  }, [user, loading, router]);

  const loadPlan = useCallback(async () => {
    try {
      const { plan: loadedPlan } = await api.getPlan(planId);
      setPlan(loadedPlan);
    } catch (err) {
      console.error('Failed to load plan:', err);
      setError('Failed to load plan');
    } finally {
      setLoadingPlan(false);
    }
  }, [planId]);

  const loadTargets = useCallback(async () => {
    setLoadingTargets(true);
    try {
      const { targets: loadedTargets } = await api.getBehaviorTargets(planId);
      setTargets(loadedTargets);
    } catch (err) {
      console.error('Failed to load targets:', err);
    } finally {
      setLoadingTargets(false);
    }
  }, [planId]);

  useEffect(() => {
    if (user?.isOnboarded && planId) {
      loadPlan();
      loadTargets();
    }
  }, [user, planId, loadPlan, loadTargets]);

  const handleCreateTarget = async () => {
    if (!newTarget.code || !newTarget.name || !newTarget.definition) {
      setError('Code, name, and definition are required');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      await api.createBehaviorTarget(planId, {
        code: newTarget.code.toUpperCase().replace(/\s+/g, '_'),
        name: newTarget.name,
        definition: newTarget.definition,
        examples: newTarget.examples || undefined,
        nonExamples: newTarget.nonExamples || undefined,
        measurementType: newTarget.measurementType,
      });
      setShowModal(false);
      setNewTarget({
        code: '',
        name: '',
        definition: '',
        examples: '',
        nonExamples: '',
        measurementType: 'FREQUENCY',
      });
      await loadTargets();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create target');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateTarget = async () => {
    if (!editingTarget) return;

    setSaving(true);
    setError(null);

    try {
      await api.updateBehaviorTarget(editingTarget.id, {
        name: editingTarget.name,
        definition: editingTarget.definition,
        examples: editingTarget.examples || undefined,
        nonExamples: editingTarget.nonExamples || undefined,
        isActive: editingTarget.isActive,
      });
      setEditingTarget(null);
      await loadTargets();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update target');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (target: BehaviorTarget) => {
    try {
      await api.updateBehaviorTarget(target.id, { isActive: !target.isActive });
      await loadTargets();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update target');
    }
  };

  const handleDeleteTarget = async (target: BehaviorTarget) => {
    if (!confirm(`Are you sure you want to delete the target "${target.name}"? This will also delete all associated behavior events.`)) {
      return;
    }

    try {
      await api.deleteBehaviorTarget(target.id);
      await loadTargets();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete target');
    }
  };

  if (loading || loadingPlan) {
    return (
      <div className={styles.container}>
        <div className="loading-container">
          <div className="spinner" />
        </div>
      </div>
    );
  }

  if (!plan) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>Plan not found</div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <button className={styles.backBtn} onClick={() => router.push(`/students/${studentId}/plans/${planId}/behavior`)}>
          ← Back to Behavior Plan
        </button>
        <div className={styles.headerInfo}>
          <h1>Behavior Targets: {plan.student.firstName} {plan.student.lastName}</h1>
        </div>
      </header>

      <main className={styles.main}>
        <div className={styles.pageHeader}>
          <div>
            <h2>Behavior Targets</h2>
            <p>Define the specific behaviors to track and measure for this student.</p>
          </div>
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>
            + Add Target
          </button>
        </div>

        {error && <div className={styles.errorMsg}>{error}</div>}

        {loadingTargets ? (
          <div className="loading-container"><div className="spinner" /></div>
        ) : targets.length === 0 ? (
          <div className={styles.emptyState}>
            <h3>No Behavior Targets Defined</h3>
            <p>Create your first behavior target to start tracking behaviors for this student.</p>
            <button className="btn btn-primary" onClick={() => setShowModal(true)}>
              Add First Target
            </button>
          </div>
        ) : (
          <div className={styles.targetsList}>
            {targets.map(target => (
              <div key={target.id} className={`${styles.targetCard} ${!target.isActive ? styles.inactive : ''}`}>
                <div className={styles.targetHeader}>
                  <div className={styles.targetMeta}>
                    <span className={styles.targetCode}>{target.code}</span>
                    <span className={styles.measurementBadge}>{MEASUREMENT_LABELS[target.measurementType]}</span>
                    {!target.isActive && <span className={styles.inactiveBadge}>Inactive</span>}
                  </div>
                  <div className={styles.targetActions}>
                    <button
                      className="btn btn-outline btn-sm"
                      onClick={() => setEditingTarget(target)}
                    >
                      Edit
                    </button>
                    <button
                      className={`btn btn-sm ${target.isActive ? 'btn-outline' : 'btn-secondary'}`}
                      onClick={() => handleToggleActive(target)}
                    >
                      {target.isActive ? 'Deactivate' : 'Activate'}
                    </button>
                    <button
                      className={styles.deleteBtn}
                      onClick={() => handleDeleteTarget(target)}
                    >
                      Delete
                    </button>
                  </div>
                </div>

                <h3 className={styles.targetName}>{target.name}</h3>

                <div className={styles.targetDetails}>
                  <div className={styles.detailSection}>
                    <h4>Operational Definition</h4>
                    <p>{target.definition}</p>
                  </div>

                  {target.examples && (
                    <div className={styles.detailSection}>
                      <h4>Examples</h4>
                      <p>{target.examples}</p>
                    </div>
                  )}

                  {target.nonExamples && (
                    <div className={styles.detailSection}>
                      <h4>Non-Examples</h4>
                      <p>{target.nonExamples}</p>
                    </div>
                  )}
                </div>

                <div className={styles.targetFooter}>
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={() => router.push(`/students/${studentId}/plans/${planId}/behavior/data`)}
                    disabled={!target.isActive}
                  >
                    Record Data
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Add Target Modal */}
      {showModal && (
        <div className={styles.modal}>
          <div className={styles.modalContent}>
            <h2>Add Behavior Target</h2>
            <p className={styles.modalDesc}>
              Define a specific, observable behavior with clear criteria for measurement.
            </p>

            <div className={styles.form}>
              <div className={styles.formRow}>
                <label>Target Code *</label>
                <input
                  type="text"
                  className="form-input"
                  value={newTarget.code}
                  onChange={e => setNewTarget(prev => ({ ...prev, code: e.target.value }))}
                  placeholder="e.g., OFF_TASK, AGGRESSION"
                />
                <span className={styles.hint}>A short identifier for the behavior (will be uppercased)</span>
              </div>

              <div className={styles.formRow}>
                <label>Target Name *</label>
                <input
                  type="text"
                  className="form-input"
                  value={newTarget.name}
                  onChange={e => setNewTarget(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Off-Task Behavior"
                />
              </div>

              <div className={styles.formRow}>
                <label>Measurement Type *</label>
                <select
                  className="form-select"
                  value={newTarget.measurementType}
                  onChange={e => setNewTarget(prev => ({ ...prev, measurementType: e.target.value as BehaviorMeasurementType }))}
                >
                  {Object.entries(MEASUREMENT_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
                <span className={styles.hint}>{MEASUREMENT_DESCRIPTIONS[newTarget.measurementType]}</span>
              </div>

              <div className={styles.formRow}>
                <DictationTextArea
                  label="Operational Definition *"
                  value={newTarget.definition}
                  onChange={(value) => setNewTarget(prev => ({ ...prev, definition: value }))}
                  placeholder="A clear, observable, measurable description of the behavior..."
                  rows={4}
                />
                <span className={styles.hint}>Describe exactly what the behavior looks like so anyone can identify it</span>
              </div>

              <div className={styles.formRow}>
                <DictationTextArea
                  label="Examples"
                  value={newTarget.examples}
                  onChange={(value) => setNewTarget(prev => ({ ...prev, examples: value }))}
                  placeholder="Specific instances that count as this behavior..."
                  rows={3}
                />
              </div>

              <div className={styles.formRow}>
                <DictationTextArea
                  label="Non-Examples"
                  value={newTarget.nonExamples}
                  onChange={(value) => setNewTarget(prev => ({ ...prev, nonExamples: value }))}
                  placeholder="Similar behaviors that do NOT count as this behavior..."
                  rows={3}
                />
              </div>
            </div>

            <div className={styles.modalActions}>
              <button className="btn btn-outline" onClick={() => setShowModal(false)} disabled={saving}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={handleCreateTarget} disabled={saving}>
                {saving ? 'Creating...' : 'Create Target'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Target Modal */}
      {editingTarget && (
        <div className={styles.modal}>
          <div className={styles.modalContent}>
            <h2>Edit Behavior Target</h2>

            <div className={styles.form}>
              <div className={styles.formRow}>
                <label>Target Code</label>
                <input
                  type="text"
                  className="form-input"
                  value={editingTarget.code}
                  disabled
                />
                <span className={styles.hint}>Code cannot be changed after creation</span>
              </div>

              <div className={styles.formRow}>
                <label>Target Name *</label>
                <input
                  type="text"
                  className="form-input"
                  value={editingTarget.name}
                  onChange={e => setEditingTarget(prev => prev ? { ...prev, name: e.target.value } : null)}
                />
              </div>

              <div className={styles.formRow}>
                <label>Measurement Type</label>
                <input
                  type="text"
                  className="form-input"
                  value={MEASUREMENT_LABELS[editingTarget.measurementType]}
                  disabled
                />
                <span className={styles.hint}>Measurement type cannot be changed after creation</span>
              </div>

              <div className={styles.formRow}>
                <DictationTextArea
                  label="Operational Definition *"
                  value={editingTarget.definition}
                  onChange={(value) => setEditingTarget(prev => prev ? { ...prev, definition: value } : null)}
                  rows={4}
                />
              </div>

              <div className={styles.formRow}>
                <DictationTextArea
                  label="Examples"
                  value={editingTarget.examples || ''}
                  onChange={(value) => setEditingTarget(prev => prev ? { ...prev, examples: value } : null)}
                  rows={3}
                />
              </div>

              <div className={styles.formRow}>
                <DictationTextArea
                  label="Non-Examples"
                  value={editingTarget.nonExamples || ''}
                  onChange={(value) => setEditingTarget(prev => prev ? { ...prev, nonExamples: value } : null)}
                  rows={3}
                />
              </div>
            </div>

            <div className={styles.modalActions}>
              <button className="btn btn-outline" onClick={() => setEditingTarget(null)} disabled={saving}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={handleUpdateTarget} disabled={saving}>
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
