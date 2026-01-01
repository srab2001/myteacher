'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { format } from 'date-fns';
import { useAuth } from '@/lib/auth-context';
import {
  api,
  RulePack,
  RuleDefinition,
  RuleEvidenceType,
  RuleScopeType,
  RulePlanType,
  BulkRuleUpdate,
} from '@/lib/api';
import styles from './page.module.css';

const SCOPE_TYPE_LABELS: Record<RuleScopeType, string> = {
  STATE: 'State',
  DISTRICT: 'District',
  SCHOOL: 'School',
};

const PLAN_TYPE_LABELS: Record<RulePlanType, string> = {
  IEP: 'IEP',
  PLAN504: '504 Plan',
  BIP: 'Behavior Plan',
  ALL: 'All Plans',
};

type TabId = 'overview' | 'rules' | 'evidence' | 'preview';

export default function AdminRulesPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  // Data state
  const [rulePacks, setRulePacks] = useState<RulePack[]>([]);
  const [ruleDefinitions, setRuleDefinitions] = useState<RuleDefinition[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [evidenceTypes, setEvidenceTypes] = useState<RuleEvidenceType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Filter state
  const [scopeTypeFilter, setScopeTypeFilter] = useState<RuleScopeType | ''>('');
  const [scopeIdFilter, setScopeIdFilter] = useState('');
  const [planTypeFilter, setPlanTypeFilter] = useState<RulePlanType | ''>('');
  const [activeOnlyFilter, setActiveOnlyFilter] = useState(false);

  // Selection and editing state
  const [selectedPackId, setSelectedPackId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Edit form state
  const [editName, setEditName] = useState('');
  const [editIsActive, setEditIsActive] = useState(false);
  const [editEffectiveFrom, setEditEffectiveFrom] = useState('');
  const [editEffectiveTo, setEditEffectiveTo] = useState('');
  const [editRules, setEditRules] = useState<Map<string, { enabled: boolean; config: Record<string, unknown> | null }>>(new Map());

  // Create form state
  const [createName, setCreateName] = useState('');
  const [createScopeType, setCreateScopeType] = useState<RuleScopeType>('STATE');
  const [createScopeId, setCreateScopeId] = useState('');
  const [createPlanType, setCreatePlanType] = useState<RulePlanType>('ALL');
  const [createEffectiveFrom, setCreateEffectiveFrom] = useState('');

  const canManageRules = user?.role === 'ADMIN';
  const selectedPack = rulePacks.find(p => p.id === selectedPackId);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/');
    }
  }, [user, authLoading, router]);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [packsRes, defsRes, evidenceRes] = await Promise.all([
        api.getAdminRulePacks({
          scopeType: scopeTypeFilter || undefined,
          scopeId: scopeIdFilter || undefined,
          planType: planTypeFilter || undefined,
          isActive: activeOnlyFilter || undefined,
        }),
        api.getAdminRuleDefinitions(),
        api.getAdminEvidenceTypes(),
      ]);
      setRulePacks(packsRes.rulePacks);
      setRuleDefinitions(defsRes.definitions);
      setEvidenceTypes(evidenceRes.evidenceTypes);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load rule packs');
    } finally {
      setLoading(false);
    }
  }, [scopeTypeFilter, scopeIdFilter, planTypeFilter, activeOnlyFilter]);

  useEffect(() => {
    if (user?.isOnboarded && canManageRules) {
      loadData();
    }
  }, [user, canManageRules, loadData]);

  // Initialize edit form when selection changes
  useEffect(() => {
    if (selectedPack) {
      setEditName(selectedPack.name);
      setEditIsActive(selectedPack.isActive);
      setEditEffectiveFrom(selectedPack.effectiveFrom.split('T')[0]);
      setEditEffectiveTo(selectedPack.effectiveTo?.split('T')[0] || '');

      // Build rules map
      const rulesMap = new Map<string, { enabled: boolean; config: Record<string, unknown> | null }>();
      for (const rule of selectedPack.rules) {
        rulesMap.set(rule.ruleDefinitionId, {
          enabled: rule.isEnabled,
          config: rule.config,
        });
      }
      setEditRules(rulesMap);
    }
  }, [selectedPack]);

  const handleSelectPack = (packId: string) => {
    setSelectedPackId(packId);
    setActiveTab('overview');
  };

  const handleSave = async () => {
    if (!selectedPack) return;
    setSaving(true);
    setError(null);

    try {
      // Update pack metadata
      await api.updateAdminRulePack(selectedPack.id, {
        name: editName,
        isActive: editIsActive,
        effectiveFrom: editEffectiveFrom,
        effectiveTo: editEffectiveTo || null,
      });

      // Build bulk rules update
      const rules: BulkRuleUpdate[] = [];
      let sortOrder = 0;
      for (const [defId, state] of editRules) {
        rules.push({
          ruleDefinitionId: defId,
          isEnabled: state.enabled,
          config: state.config,
          sortOrder: sortOrder++,
        });
      }

      if (rules.length > 0) {
        await api.updateAdminRulePackRules(selectedPack.id, rules);
      }

      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedPack) return;
    if (!confirm(`Are you sure you want to delete "${selectedPack.name}"? This action cannot be undone.`)) {
      return;
    }

    setSaving(true);
    setError(null);

    try {
      await api.deleteAdminRulePack(selectedPack.id);
      setSelectedPackId(null);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete rule pack');
    } finally {
      setSaving(false);
    }
  };

  const handleCreate = async () => {
    if (!createName || !createScopeId || !createEffectiveFrom) {
      setError('Please fill in all required fields');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const res = await api.createAdminRulePack({
        name: createName,
        scopeType: createScopeType,
        scopeId: createScopeId,
        planType: createPlanType,
        effectiveFrom: createEffectiveFrom,
      });

      setShowCreateModal(false);
      setCreateName('');
      setCreateScopeId('');
      setCreateEffectiveFrom('');
      await loadData();
      setSelectedPackId(res.rulePack.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create rule pack');
    } finally {
      setSaving(false);
    }
  };

  const handleRuleToggle = (defId: string, enabled: boolean) => {
    setEditRules(prev => {
      const next = new Map(prev);
      const existing = next.get(defId);
      if (existing) {
        next.set(defId, { ...existing, enabled });
      } else {
        next.set(defId, { enabled, config: null });
      }
      return next;
    });
  };

  if (authLoading) {
    return (
      <div className="loading-container">
        <div className="spinner" />
      </div>
    );
  }

  if (!canManageRules) {
    return (
      <div className={styles.container}>
        <div className={styles.accessDenied}>
          <h2>Access Denied</h2>
          <p>You do not have permission to view this page.</p>
          <button className="btn btn-primary" onClick={() => router.push('/dashboard')}>
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.pageHeader}>
        <div className={styles.headerRow}>
          <div>
            <h2>Compliance Rules</h2>
            <p className={styles.description}>
              Manage rule packs for meeting compliance across states, districts, and schools.
            </p>
          </div>
          <Link href="/admin/rules/wizard" className={styles.wizardBtn}>
            Setup Wizard
          </Link>
        </div>
      </div>

      {error && <div className={styles.errorMessage}>{error}</div>}

      <div className={styles.layout}>
        {/* Left Panel */}
        <div className={styles.leftPanel}>
          {/* Filters */}
          <div className={styles.filterPanel}>
            <div className={styles.filterGroup}>
              <label>Scope Type</label>
              <select
                value={scopeTypeFilter}
                onChange={(e) => setScopeTypeFilter(e.target.value as RuleScopeType | '')}
              >
                <option value="">All Scopes</option>
                <option value="STATE">State</option>
                <option value="DISTRICT">District</option>
                <option value="SCHOOL">School</option>
              </select>
            </div>
            <div className={styles.filterGroup}>
              <label>Scope ID</label>
              <select
                value={scopeIdFilter}
                onChange={(e) => setScopeIdFilter(e.target.value)}
              >
                <option value="">All</option>
                {/* Get unique scope IDs from loaded packs */}
                {[...new Set(rulePacks.map(p => p.scopeId))].sort().map(id => (
                  <option key={id} value={id}>{id}</option>
                ))}
              </select>
            </div>
            <div className={styles.filterGroup}>
              <label>Plan Type</label>
              <select
                value={planTypeFilter}
                onChange={(e) => setPlanTypeFilter(e.target.value as RulePlanType | '')}
              >
                <option value="">All Plan Types</option>
                <option value="IEP">IEP</option>
                <option value="PLAN504">504 Plan</option>
                <option value="BIP">Behavior Plan</option>
                <option value="ALL">All Plans</option>
              </select>
            </div>
            <div className={styles.filterGroup}>
              <label className={styles.checkbox}>
                <input
                  type="checkbox"
                  checked={activeOnlyFilter}
                  onChange={(e) => setActiveOnlyFilter(e.target.checked)}
                />
                Active Only
              </label>
            </div>
          </div>

          {/* Rule Pack List */}
          <div className={styles.rulePackList}>
            <div className={styles.listHeader}>
              <span>Rule Packs ({rulePacks.length})</span>
              <button
                className={styles.createBtn}
                onClick={() => setShowCreateModal(true)}
                disabled={saving}
              >
                + New
              </button>
            </div>

            {loading ? (
              <div className={styles.emptyList}>Loading...</div>
            ) : rulePacks.length === 0 ? (
              <div className={styles.emptyList}>No rule packs found.</div>
            ) : (
              rulePacks.map(pack => (
                <div
                  key={pack.id}
                  className={`${styles.rulePackItem} ${selectedPackId === pack.id ? styles.selected : ''}`}
                  onClick={() => handleSelectPack(pack.id)}
                >
                  <div className={styles.rulePackName}>{pack.name}</div>
                  <div className={styles.rulePackMeta}>
                    <span className={styles.scopeBadge}>
                      {SCOPE_TYPE_LABELS[pack.scopeType]}: {pack.scopeId}
                    </span>
                    <span className={styles.planTypeBadge}>
                      {PLAN_TYPE_LABELS[pack.planType]}
                    </span>
                    <span className={`${styles.statusBadge} ${pack.isActive ? styles.active : styles.inactive}`}>
                      {pack.isActive ? 'Active' : 'Inactive'}
                    </span>
                    <span className={styles.versionBadge}>v{pack.version}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Main Content */}
        <div className={styles.mainContent}>
          {!selectedPack ? (
            <div className={styles.emptyState}>
              <h3>Select a Rule Pack</h3>
              <p>Choose a rule pack from the list to view and edit its configuration.</p>
            </div>
          ) : (
            <div className={styles.editorPanel}>
              <div className={styles.editorHeader}>
                <span className={styles.editorTitle}>{selectedPack.name}</span>
                <div className={styles.editorActions}>
                  <button
                    className={styles.deleteBtn}
                    onClick={handleDelete}
                    disabled={saving}
                  >
                    Delete
                  </button>
                  <button
                    className={styles.saveBtn}
                    onClick={handleSave}
                    disabled={saving}
                  >
                    {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </div>

              {/* Tabs */}
              <div className={styles.tabs}>
                <button
                  className={`${styles.tab} ${activeTab === 'overview' ? styles.active : ''}`}
                  onClick={() => setActiveTab('overview')}
                >
                  Overview
                </button>
                <button
                  className={`${styles.tab} ${activeTab === 'rules' ? styles.active : ''}`}
                  onClick={() => setActiveTab('rules')}
                >
                  Rules ({selectedPack.rules.filter(r => r.isEnabled).length}/{ruleDefinitions.length})
                </button>
                <button
                  className={`${styles.tab} ${activeTab === 'evidence' ? styles.active : ''}`}
                  onClick={() => setActiveTab('evidence')}
                >
                  Evidence
                </button>
                <button
                  className={`${styles.tab} ${activeTab === 'preview' ? styles.active : ''}`}
                  onClick={() => setActiveTab('preview')}
                >
                  Preview
                </button>
              </div>

              {/* Tab Content */}
              <div className={styles.tabContent}>
                {activeTab === 'overview' && (
                  <div className={styles.formGrid}>
                    <div className={styles.formGroup}>
                      <label>Name</label>
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                      />
                    </div>
                    <div className={styles.formGroup}>
                      <label>Version</label>
                      <input
                        type="text"
                        value={`v${selectedPack.version}`}
                        disabled
                      />
                    </div>
                    <div className={styles.formGroup}>
                      <label>Scope Type</label>
                      <input
                        type="text"
                        value={SCOPE_TYPE_LABELS[selectedPack.scopeType]}
                        disabled
                      />
                    </div>
                    <div className={styles.formGroup}>
                      <label>Scope ID</label>
                      <input
                        type="text"
                        value={selectedPack.scopeId}
                        disabled
                      />
                    </div>
                    <div className={styles.formGroup}>
                      <label>Plan Type</label>
                      <input
                        type="text"
                        value={PLAN_TYPE_LABELS[selectedPack.planType]}
                        disabled
                      />
                    </div>
                    <div className={styles.formGroup}>
                      <label>Effective From</label>
                      <input
                        type="date"
                        value={editEffectiveFrom}
                        onChange={(e) => setEditEffectiveFrom(e.target.value)}
                      />
                    </div>
                    <div className={styles.formGroup}>
                      <label>Effective To (Optional)</label>
                      <input
                        type="date"
                        value={editEffectiveTo}
                        onChange={(e) => setEditEffectiveTo(e.target.value)}
                      />
                    </div>
                    <div className={styles.formGroup}>
                      <label>Created</label>
                      <input
                        type="text"
                        value={format(new Date(selectedPack.createdAt), 'MMM d, yyyy')}
                        disabled
                      />
                    </div>
                    <div className={`${styles.formGroup} ${styles.fullWidth}`}>
                      <label className={styles.activeToggle}>
                        <input
                          type="checkbox"
                          checked={editIsActive}
                          onChange={(e) => setEditIsActive(e.target.checked)}
                        />
                        <span>Active (only one pack can be active per scope+planType)</span>
                      </label>
                    </div>
                  </div>
                )}

                {activeTab === 'rules' && (
                  <table className={styles.rulesTable}>
                    <thead>
                      <tr>
                        <th>Enabled</th>
                        <th>Rule</th>
                        <th>Description</th>
                        <th>Config</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ruleDefinitions.map(def => {
                        const ruleState = editRules.get(def.id);
                        const isEnabled = ruleState?.enabled ?? false;
                        const config = ruleState?.config || def.defaultConfig;

                        return (
                          <tr key={def.id}>
                            <td>
                              <div className={styles.ruleToggle}>
                                <input
                                  type="checkbox"
                                  checked={isEnabled}
                                  onChange={(e) => handleRuleToggle(def.id, e.target.checked)}
                                />
                              </div>
                            </td>
                            <td>
                              <strong>{def.name}</strong>
                              <div style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>{def.key}</div>
                            </td>
                            <td>{def.description || '-'}</td>
                            <td>
                              {config ? (
                                <code style={{ fontSize: '0.75rem' }}>
                                  {JSON.stringify(config)}
                                </code>
                              ) : (
                                <span style={{ color: 'var(--muted)' }}>Default</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}

                {activeTab === 'evidence' && (
                  <div>
                    {selectedPack.rules.filter(r => r.isEnabled).length === 0 ? (
                      <p style={{ color: 'var(--muted)' }}>
                        Enable rules in the Rules tab to configure evidence requirements.
                      </p>
                    ) : (
                      selectedPack.rules
                        .filter(r => r.isEnabled)
                        .map(rule => (
                          <div key={rule.id} className={styles.evidenceSection}>
                            <h4>{rule.ruleDefinition.name}</h4>
                            <div className={styles.evidenceList}>
                              {rule.evidenceRequirements.length === 0 ? (
                                <p style={{ color: 'var(--muted)', fontSize: '0.875rem' }}>
                                  No evidence requirements configured.
                                </p>
                              ) : (
                                rule.evidenceRequirements.map(ev => (
                                  <div key={ev.id} className={styles.evidenceItem}>
                                    <input
                                      type="checkbox"
                                      checked={ev.isRequired}
                                      readOnly
                                    />
                                    <span>{ev.evidenceType.name}</span>
                                    <span className={styles.required}>
                                      {ev.isRequired ? 'Required' : 'Optional'}
                                    </span>
                                  </div>
                                ))
                              )}
                            </div>
                          </div>
                        ))
                    )}
                  </div>
                )}

                {activeTab === 'preview' && (
                  <div className={styles.previewPanel}>
                    <pre>{JSON.stringify(selectedPack, null, 2)}</pre>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className={styles.modal} onClick={() => setShowCreateModal(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <h3>Create Rule Pack</h3>

            <div className={styles.formGroup}>
              <label>Name *</label>
              <input
                type="text"
                value={createName}
                onChange={(e) => setCreateName(e.target.value)}
                placeholder="e.g., Maryland State Compliance Rules"
              />
            </div>

            <div className={styles.formGroup}>
              <label>Scope Type *</label>
              <select
                value={createScopeType}
                onChange={(e) => setCreateScopeType(e.target.value as RuleScopeType)}
              >
                <option value="STATE">State</option>
                <option value="DISTRICT">District</option>
                <option value="SCHOOL">School</option>
              </select>
            </div>

            <div className={styles.formGroup}>
              <label>Scope ID *</label>
              <input
                type="text"
                value={createScopeId}
                onChange={(e) => setCreateScopeId(e.target.value)}
                placeholder="e.g., MD or HCPSS"
              />
            </div>

            <div className={styles.formGroup}>
              <label>Plan Type *</label>
              <select
                value={createPlanType}
                onChange={(e) => setCreatePlanType(e.target.value as RulePlanType)}
              >
                <option value="ALL">All Plans</option>
                <option value="IEP">IEP</option>
                <option value="PLAN504">504 Plan</option>
                <option value="BIP">Behavior Plan</option>
              </select>
            </div>

            <div className={styles.formGroup}>
              <label>Effective From *</label>
              <input
                type="date"
                value={createEffectiveFrom}
                onChange={(e) => setCreateEffectiveFrom(e.target.value)}
              />
            </div>

            <div className={styles.modalActions}>
              <button
                className={styles.cancelBtn}
                onClick={() => setShowCreateModal(false)}
                disabled={saving}
              >
                Cancel
              </button>
              <button
                className={styles.saveBtn}
                onClick={handleCreate}
                disabled={saving}
              >
                {saving ? 'Creating...' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
