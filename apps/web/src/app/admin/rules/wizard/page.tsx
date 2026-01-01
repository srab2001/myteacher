'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import {
  api,
  RuleDefinition,
  RuleEvidenceType,
  RuleScopeType,
  RulePlanType,
} from '@/lib/api';
import styles from './page.module.css';

type WizardStep = 'choose' | 'create-rule' | 'create-evidence' | 'create-pack' | 'configure-rules' | 'review' | 'complete';

interface ConfigField {
  key: string;
  label: string;
  type: 'number' | 'boolean' | 'string' | 'select';
  options?: string[];
  defaultValue: unknown;
}

const COMMON_CONFIG_TEMPLATES: Record<string, ConfigField[]> = {
  'timeline': [
    { key: 'days', label: 'Number of Days', type: 'number', defaultValue: 5 },
  ],
  'boolean_flag': [
    { key: 'enabled', label: 'Enabled', type: 'boolean', defaultValue: true },
  ],
  'required_check': [
    { key: 'required', label: 'Required', type: 'boolean', defaultValue: true },
  ],
  'delivery_method': [
    { key: 'method', label: 'Default Method', type: 'select', options: ['SEND_HOME', 'US_MAIL', 'PICK_UP'], defaultValue: 'SEND_HOME' },
  ],
  'recording': [
    { key: 'staffMustRecordIfParentRecords', label: 'Staff Must Record If Parent Records', type: 'boolean', defaultValue: true },
    { key: 'markAsNotOfficialRecord', label: 'Mark as Not Official Record', type: 'boolean', defaultValue: true },
  ],
  'custom': [],
};

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

export default function RulesWizardPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  // State
  const [step, setStep] = useState<WizardStep>('choose');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Reference data
  const [ruleDefinitions, setRuleDefinitions] = useState<RuleDefinition[]>([]);
  const [evidenceTypes, setEvidenceTypes] = useState<RuleEvidenceType[]>([]);
  const [loading, setLoading] = useState(true);

  // Create Rule Definition form
  const [ruleKey, setRuleKey] = useState('');
  const [ruleName, setRuleName] = useState('');
  const [ruleDescription, setRuleDescription] = useState('');
  const [ruleConfigTemplate, setRuleConfigTemplate] = useState('custom');
  const [ruleConfigFields, setRuleConfigFields] = useState<{ key: string; value: unknown }[]>([]);

  // Create Evidence Type form
  const [evidenceKey, setEvidenceKey] = useState('');
  const [evidenceName, setEvidenceName] = useState('');
  const [evidencePlanType, setEvidencePlanType] = useState<RulePlanType>('ALL');

  // Create Rule Pack form
  const [packName, setPackName] = useState('');
  const [packScopeType, setPackScopeType] = useState<RuleScopeType>('STATE');
  const [packScopeId, setPackScopeId] = useState('');
  const [packPlanType, setPackPlanType] = useState<RulePlanType>('ALL');
  const [packEffectiveFrom, setPackEffectiveFrom] = useState('');
  const [packIsActive, setPackIsActive] = useState(false);

  // Configure Rules for Pack
  const [selectedRules, setSelectedRules] = useState<Map<string, { enabled: boolean; config: Record<string, unknown> }>>(new Map());
  const [createdPackId, setCreatedPackId] = useState<string | null>(null);

  // Track what was created
  const [createdRule, setCreatedRule] = useState<RuleDefinition | null>(null);
  const [createdEvidence, setCreatedEvidence] = useState<RuleEvidenceType | null>(null);

  const canManageRules = user?.role === 'ADMIN';

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/');
    }
  }, [user, authLoading, router]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [defsRes, evidenceRes] = await Promise.all([
        api.getAdminRuleDefinitions(),
        api.getAdminEvidenceTypes(),
      ]);
      setRuleDefinitions(defsRes.definitions);
      setEvidenceTypes(evidenceRes.evidenceTypes);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user?.isOnboarded && canManageRules) {
      loadData();
    }
  }, [user, canManageRules, loadData]);

  // Auto-generate key from name
  const generateKeyFromName = (name: string): string => {
    return name
      .toUpperCase()
      .replace(/[^A-Z0-9\s]/g, '')
      .replace(/\s+/g, '_')
      .replace(/^_+|_+$/g, '');
  };

  // Handle config template change
  const handleConfigTemplateChange = (template: string) => {
    setRuleConfigTemplate(template);
    const fields = COMMON_CONFIG_TEMPLATES[template] || [];
    setRuleConfigFields(fields.map(f => ({ key: f.key, value: f.defaultValue })));
  };

  // Create Rule Definition
  const handleCreateRule = async () => {
    if (!ruleKey || !ruleName) {
      setError('Please fill in all required fields');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const defaultConfig: Record<string, unknown> = {};
      for (const field of ruleConfigFields) {
        defaultConfig[field.key] = field.value;
      }

      const result = await api.createAdminRuleDefinition({
        key: ruleKey,
        name: ruleName,
        description: ruleDescription || null,
        defaultConfig: Object.keys(defaultConfig).length > 0 ? defaultConfig : null,
      });

      setCreatedRule(result.definition);
      setRuleDefinitions(prev => [...prev, result.definition]);
      setStep('complete');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create rule definition');
    } finally {
      setSaving(false);
    }
  };

  // Create Evidence Type
  const handleCreateEvidence = async () => {
    if (!evidenceKey || !evidenceName) {
      setError('Please fill in all required fields');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const result = await api.createAdminEvidenceType({
        key: evidenceKey,
        name: evidenceName,
        planType: evidencePlanType,
      });

      setCreatedEvidence(result.evidenceType);
      setEvidenceTypes(prev => [...prev, result.evidenceType]);
      setStep('complete');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create evidence type');
    } finally {
      setSaving(false);
    }
  };

  // Create Rule Pack
  const handleCreatePack = async () => {
    if (!packName || !packScopeId || !packEffectiveFrom) {
      setError('Please fill in all required fields');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const result = await api.createAdminRulePack({
        name: packName,
        scopeType: packScopeType,
        scopeId: packScopeId,
        planType: packPlanType,
        effectiveFrom: packEffectiveFrom,
        isActive: packIsActive,
      });

      setCreatedPackId(result.rulePack.id);

      // Initialize selected rules with all definitions disabled by default
      const rulesMap = new Map<string, { enabled: boolean; config: Record<string, unknown> }>();
      for (const def of ruleDefinitions) {
        rulesMap.set(def.id, {
          enabled: false,
          config: (def.defaultConfig as Record<string, unknown>) || {},
        });
      }
      setSelectedRules(rulesMap);

      setStep('configure-rules');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create rule pack');
    } finally {
      setSaving(false);
    }
  };

  // Save Rules to Pack
  const handleSaveRules = async () => {
    if (!createdPackId) return;

    setSaving(true);
    setError(null);

    try {
      const rules = Array.from(selectedRules.entries())
        .filter(([, state]) => state.enabled)
        .map(([defId, state], index) => ({
          ruleDefinitionId: defId,
          isEnabled: true,
          config: state.config,
          sortOrder: index,
        }));

      if (rules.length > 0) {
        await api.updateAdminRulePackRules(createdPackId, rules);
      }

      setStep('complete');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save rules');
    } finally {
      setSaving(false);
    }
  };

  // Toggle rule in pack
  const handleRuleToggle = (defId: string, enabled: boolean) => {
    setSelectedRules(prev => {
      const next = new Map(prev);
      const existing = next.get(defId);
      if (existing) {
        next.set(defId, { ...existing, enabled });
      }
      return next;
    });
  };

  // Update rule config
  const handleRuleConfigChange = (defId: string, key: string, value: unknown) => {
    setSelectedRules(prev => {
      const next = new Map(prev);
      const existing = next.get(defId);
      if (existing) {
        next.set(defId, {
          ...existing,
          config: { ...existing.config, [key]: value },
        });
      }
      return next;
    });
  };

  // Reset wizard
  const resetWizard = () => {
    setStep('choose');
    setError(null);
    setRuleKey('');
    setRuleName('');
    setRuleDescription('');
    setRuleConfigTemplate('custom');
    setRuleConfigFields([]);
    setEvidenceKey('');
    setEvidenceName('');
    setEvidencePlanType('ALL');
    setPackName('');
    setPackScopeType('STATE');
    setPackScopeId('');
    setPackPlanType('ALL');
    setPackEffectiveFrom('');
    setPackIsActive(false);
    setCreatedPackId(null);
    setCreatedRule(null);
    setCreatedEvidence(null);
    setSelectedRules(new Map());
  };

  if (authLoading || loading) {
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
      <div className={styles.header}>
        <Link href="/admin/rules" className={styles.backLink}>
          ← Back to Rules
        </Link>
        <h1>Rules Setup Wizard</h1>
        <p className={styles.subtitle}>
          Create new rule definitions, evidence types, or rule packs step by step.
        </p>
      </div>

      {error && <div className={styles.error}>{error}</div>}

      {/* Step: Choose what to create */}
      {step === 'choose' && (
        <div className={styles.chooseStep}>
          <h2>What would you like to create?</h2>
          <div className={styles.choiceGrid}>
            <button
              className={styles.choiceCard}
              onClick={() => setStep('create-rule')}
            >
              <div className={styles.choiceIcon}>📋</div>
              <h3>New Rule Definition</h3>
              <p>Create a new compliance rule type that can be added to rule packs.</p>
              <span className={styles.choiceExample}>
                Example: &quot;Meeting Recording Policy&quot;, &quot;Parent Notification Timeline&quot;
              </span>
            </button>

            <button
              className={styles.choiceCard}
              onClick={() => setStep('create-evidence')}
            >
              <div className={styles.choiceIcon}>📄</div>
              <h3>New Evidence Type</h3>
              <p>Create a new type of evidence that can be required for rule compliance.</p>
              <span className={styles.choiceExample}>
                Example: &quot;Parent Signature&quot;, &quot;Meeting Minutes&quot;
              </span>
            </button>

            <button
              className={styles.choiceCard}
              onClick={() => setStep('create-pack')}
            >
              <div className={styles.choiceIcon}>📦</div>
              <h3>New Rule Pack</h3>
              <p>Create a new rule pack for a state, district, or school with selected rules.</p>
              <span className={styles.choiceExample}>
                Example: &quot;Maryland State IEP Rules&quot;, &quot;HCPSS District Rules&quot;
              </span>
            </button>
          </div>

          <div className={styles.existingCounts}>
            <span>Currently: {ruleDefinitions.length} rule definitions, {evidenceTypes.length} evidence types</span>
          </div>
        </div>
      )}

      {/* Step: Create Rule Definition */}
      {step === 'create-rule' && (
        <div className={styles.formStep}>
          <div className={styles.stepHeader}>
            <h2>Create New Rule Definition</h2>
            <p>Define a new compliance rule that can be added to rule packs.</p>
          </div>

          <div className={styles.form}>
            <div className={styles.formGroup}>
              <label>Rule Name *</label>
              <input
                type="text"
                value={ruleName}
                onChange={(e) => {
                  setRuleName(e.target.value);
                  if (!ruleKey || ruleKey === generateKeyFromName(ruleName)) {
                    setRuleKey(generateKeyFromName(e.target.value));
                  }
                }}
                placeholder="e.g., Progress Report Timeline"
              />
              <span className={styles.hint}>A descriptive name for this rule</span>
            </div>

            <div className={styles.formGroup}>
              <label>Rule Key *</label>
              <input
                type="text"
                value={ruleKey}
                onChange={(e) => setRuleKey(e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, ''))}
                placeholder="e.g., PROGRESS_REPORT_TIMELINE"
              />
              <span className={styles.hint}>Unique identifier (uppercase with underscores)</span>
            </div>

            <div className={styles.formGroup}>
              <label>Description</label>
              <textarea
                value={ruleDescription}
                onChange={(e) => setRuleDescription(e.target.value)}
                placeholder="Describe what this rule does and when it applies..."
                rows={3}
              />
            </div>

            <div className={styles.formGroup}>
              <label>Configuration Template</label>
              <select
                value={ruleConfigTemplate}
                onChange={(e) => handleConfigTemplateChange(e.target.value)}
              >
                <option value="custom">Custom Configuration</option>
                <option value="timeline">Timeline (days-based)</option>
                <option value="boolean_flag">Boolean Flag (enabled/disabled)</option>
                <option value="required_check">Required Check</option>
                <option value="delivery_method">Delivery Method</option>
                <option value="recording">Recording Policy</option>
              </select>
              <span className={styles.hint}>Choose a template or create custom configuration</span>
            </div>

            {ruleConfigTemplate !== 'custom' && (
              <div className={styles.configPreview}>
                <h4>Default Configuration</h4>
                {COMMON_CONFIG_TEMPLATES[ruleConfigTemplate]?.map((field, idx) => (
                  <div key={field.key} className={styles.configField}>
                    <label>{field.label}</label>
                    {field.type === 'number' && (
                      <input
                        type="number"
                        value={ruleConfigFields[idx]?.value as number || 0}
                        onChange={(e) => {
                          const newFields = [...ruleConfigFields];
                          newFields[idx] = { key: field.key, value: parseInt(e.target.value) || 0 };
                          setRuleConfigFields(newFields);
                        }}
                      />
                    )}
                    {field.type === 'boolean' && (
                      <input
                        type="checkbox"
                        checked={ruleConfigFields[idx]?.value as boolean || false}
                        onChange={(e) => {
                          const newFields = [...ruleConfigFields];
                          newFields[idx] = { key: field.key, value: e.target.checked };
                          setRuleConfigFields(newFields);
                        }}
                      />
                    )}
                    {field.type === 'select' && (
                      <select
                        value={ruleConfigFields[idx]?.value as string || ''}
                        onChange={(e) => {
                          const newFields = [...ruleConfigFields];
                          newFields[idx] = { key: field.key, value: e.target.value };
                          setRuleConfigFields(newFields);
                        }}
                      >
                        {field.options?.map(opt => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    )}
                  </div>
                ))}
              </div>
            )}

            <div className={styles.formActions}>
              <button
                className={styles.secondaryBtn}
                onClick={() => setStep('choose')}
                disabled={saving}
              >
                Cancel
              </button>
              <button
                className={styles.primaryBtn}
                onClick={handleCreateRule}
                disabled={saving || !ruleKey || !ruleName}
              >
                {saving ? 'Creating...' : 'Create Rule Definition'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Step: Create Evidence Type */}
      {step === 'create-evidence' && (
        <div className={styles.formStep}>
          <div className={styles.stepHeader}>
            <h2>Create New Evidence Type</h2>
            <p>Define a new type of evidence that can be required for compliance.</p>
          </div>

          <div className={styles.form}>
            <div className={styles.formGroup}>
              <label>Evidence Name *</label>
              <input
                type="text"
                value={evidenceName}
                onChange={(e) => {
                  setEvidenceName(e.target.value);
                  if (!evidenceKey || evidenceKey === generateKeyFromName(evidenceName)) {
                    setEvidenceKey(generateKeyFromName(e.target.value));
                  }
                }}
                placeholder="e.g., Parent Signature Form"
              />
              <span className={styles.hint}>A descriptive name for this evidence type</span>
            </div>

            <div className={styles.formGroup}>
              <label>Evidence Key *</label>
              <input
                type="text"
                value={evidenceKey}
                onChange={(e) => setEvidenceKey(e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, ''))}
                placeholder="e.g., PARENT_SIGNATURE_FORM"
              />
              <span className={styles.hint}>Unique identifier (uppercase with underscores)</span>
            </div>

            <div className={styles.formGroup}>
              <label>Applies To *</label>
              <select
                value={evidencePlanType}
                onChange={(e) => setEvidencePlanType(e.target.value as RulePlanType)}
              >
                <option value="ALL">All Plan Types</option>
                <option value="IEP">IEP Only</option>
                <option value="PLAN504">504 Plan Only</option>
                <option value="BIP">Behavior Plan Only</option>
              </select>
              <span className={styles.hint}>Which plan types this evidence applies to</span>
            </div>

            <div className={styles.formActions}>
              <button
                className={styles.secondaryBtn}
                onClick={() => setStep('choose')}
                disabled={saving}
              >
                Cancel
              </button>
              <button
                className={styles.primaryBtn}
                onClick={handleCreateEvidence}
                disabled={saving || !evidenceKey || !evidenceName}
              >
                {saving ? 'Creating...' : 'Create Evidence Type'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Step: Create Rule Pack */}
      {step === 'create-pack' && (
        <div className={styles.formStep}>
          <div className={styles.stepHeader}>
            <h2>Create New Rule Pack</h2>
            <p>Step 1 of 2: Define the rule pack scope and basic information.</p>
          </div>

          <div className={styles.form}>
            <div className={styles.formGroup}>
              <label>Pack Name *</label>
              <input
                type="text"
                value={packName}
                onChange={(e) => setPackName(e.target.value)}
                placeholder="e.g., Maryland State IEP Compliance Rules"
              />
            </div>

            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label>Scope Type *</label>
                <select
                  value={packScopeType}
                  onChange={(e) => setPackScopeType(e.target.value as RuleScopeType)}
                >
                  <option value="STATE">State</option>
                  <option value="DISTRICT">District</option>
                  <option value="SCHOOL">School</option>
                </select>
                <span className={styles.hint}>State rules are inherited by districts and schools</span>
              </div>

              <div className={styles.formGroup}>
                <label>Scope ID *</label>
                <input
                  type="text"
                  value={packScopeId}
                  onChange={(e) => setPackScopeId(e.target.value)}
                  placeholder={packScopeType === 'STATE' ? 'e.g., MD' : packScopeType === 'DISTRICT' ? 'e.g., HCPSS' : 'e.g., school-id'}
                />
                <span className={styles.hint}>
                  {packScopeType === 'STATE' && 'Two-letter state code'}
                  {packScopeType === 'DISTRICT' && 'District identifier'}
                  {packScopeType === 'SCHOOL' && 'School identifier'}
                </span>
              </div>
            </div>

            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label>Plan Type *</label>
                <select
                  value={packPlanType}
                  onChange={(e) => setPackPlanType(e.target.value as RulePlanType)}
                >
                  <option value="ALL">All Plan Types</option>
                  <option value="IEP">IEP Only</option>
                  <option value="PLAN504">504 Plan Only</option>
                  <option value="BIP">Behavior Plan Only</option>
                </select>
              </div>

              <div className={styles.formGroup}>
                <label>Effective From *</label>
                <input
                  type="date"
                  value={packEffectiveFrom}
                  onChange={(e) => setPackEffectiveFrom(e.target.value)}
                />
              </div>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={packIsActive}
                  onChange={(e) => setPackIsActive(e.target.checked)}
                />
                <span>Set as active (only one pack can be active per scope + plan type)</span>
              </label>
            </div>

            <div className={styles.scopeInfo}>
              <h4>Scope Precedence</h4>
              <p>When evaluating rules, the system checks in this order:</p>
              <ol>
                <li><strong>School</strong> - Most specific, highest priority</li>
                <li><strong>District</strong> - Applies to all schools in district</li>
                <li><strong>State</strong> - Base rules for entire state</li>
              </ol>
              <p>More specific scopes override broader ones.</p>
            </div>

            <div className={styles.formActions}>
              <button
                className={styles.secondaryBtn}
                onClick={() => setStep('choose')}
                disabled={saving}
              >
                Cancel
              </button>
              <button
                className={styles.primaryBtn}
                onClick={handleCreatePack}
                disabled={saving || !packName || !packScopeId || !packEffectiveFrom}
              >
                {saving ? 'Creating...' : 'Create & Configure Rules →'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Step: Configure Rules for Pack */}
      {step === 'configure-rules' && (
        <div className={styles.formStep}>
          <div className={styles.stepHeader}>
            <h2>Configure Rules</h2>
            <p>Step 2 of 2: Select and configure rules for &quot;{packName}&quot;</p>
          </div>

          <div className={styles.rulesConfig}>
            {ruleDefinitions.length === 0 ? (
              <p className={styles.emptyMessage}>
                No rule definitions available. Create some rule definitions first.
              </p>
            ) : (
              <div className={styles.rulesList}>
                {ruleDefinitions.map(def => {
                  const state = selectedRules.get(def.id);
                  const isEnabled = state?.enabled || false;
                  const config = state?.config || {};

                  return (
                    <div
                      key={def.id}
                      className={`${styles.ruleConfigCard} ${isEnabled ? styles.enabled : ''}`}
                    >
                      <div className={styles.ruleHeader}>
                        <label className={styles.ruleToggle}>
                          <input
                            type="checkbox"
                            checked={isEnabled}
                            onChange={(e) => handleRuleToggle(def.id, e.target.checked)}
                          />
                          <span className={styles.ruleName}>{def.name}</span>
                        </label>
                        <span className={styles.ruleKey}>{def.key}</span>
                      </div>

                      {def.description && (
                        <p className={styles.ruleDescription}>{def.description}</p>
                      )}

                      {isEnabled && def.defaultConfig && (
                        <div className={styles.ruleConfigSection}>
                          <h5>Configuration</h5>
                          {Object.entries(def.defaultConfig as Record<string, unknown>).map(([key, defaultVal]) => (
                            <div key={key} className={styles.configInput}>
                              <label>{key}</label>
                              {typeof defaultVal === 'boolean' ? (
                                <input
                                  type="checkbox"
                                  checked={config[key] as boolean ?? defaultVal}
                                  onChange={(e) => handleRuleConfigChange(def.id, key, e.target.checked)}
                                />
                              ) : typeof defaultVal === 'number' ? (
                                <input
                                  type="number"
                                  value={config[key] as number ?? defaultVal}
                                  onChange={(e) => handleRuleConfigChange(def.id, key, parseInt(e.target.value) || 0)}
                                />
                              ) : (
                                <input
                                  type="text"
                                  value={config[key] as string ?? defaultVal}
                                  onChange={(e) => handleRuleConfigChange(def.id, key, e.target.value)}
                                />
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            <div className={styles.selectedSummary}>
              <strong>
                {Array.from(selectedRules.values()).filter(r => r.enabled).length} of {ruleDefinitions.length} rules selected
              </strong>
            </div>

            <div className={styles.formActions}>
              <button
                className={styles.secondaryBtn}
                onClick={() => setStep('create-pack')}
                disabled={saving}
              >
                ← Back
              </button>
              <button
                className={styles.primaryBtn}
                onClick={handleSaveRules}
                disabled={saving}
              >
                {saving ? 'Saving...' : 'Save Rules & Finish'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Step: Complete */}
      {step === 'complete' && (
        <div className={styles.completeStep}>
          <div className={styles.successIcon}>✓</div>
          <h2>Successfully Created!</h2>

          {createdRule && (
            <div className={styles.createdItem}>
              <h3>New Rule Definition</h3>
              <p><strong>Name:</strong> {createdRule.name}</p>
              <p><strong>Key:</strong> {createdRule.key}</p>
              {createdRule.description && <p><strong>Description:</strong> {createdRule.description}</p>}
            </div>
          )}

          {createdEvidence && (
            <div className={styles.createdItem}>
              <h3>New Evidence Type</h3>
              <p><strong>Name:</strong> {createdEvidence.name}</p>
              <p><strong>Key:</strong> {createdEvidence.key}</p>
              <p><strong>Plan Type:</strong> {createdEvidence.planType ? PLAN_TYPE_LABELS[createdEvidence.planType] : 'All'}</p>
            </div>
          )}

          {createdPackId && (
            <div className={styles.createdItem}>
              <h3>New Rule Pack</h3>
              <p><strong>Name:</strong> {packName}</p>
              <p><strong>Scope:</strong> {SCOPE_TYPE_LABELS[packScopeType]}: {packScopeId}</p>
              <p><strong>Plan Type:</strong> {PLAN_TYPE_LABELS[packPlanType]}</p>
              <p><strong>Rules Enabled:</strong> {Array.from(selectedRules.values()).filter(r => r.enabled).length}</p>
            </div>
          )}

          <div className={styles.completeActions}>
            <button className={styles.secondaryBtn} onClick={resetWizard}>
              Create Another
            </button>
            <Link href="/admin/rules" className={styles.primaryBtn}>
              Back to Rules Management
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
