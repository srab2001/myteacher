'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { format } from 'date-fns';
import { useAuth } from '@/lib/auth-context';
import { api, AdminSchema, SchemaPlanInstance, PlanTypeCode, SchemaSectionConfig, FieldConfigUpdate } from '@/lib/api';
import styles from './page.module.css';

const PLAN_TYPE_LABELS: Record<PlanTypeCode, string> = {
  IEP: 'IEP',
  FIVE_OH_FOUR: '504 Plan',
  BEHAVIOR_PLAN: 'Behavior Plan',
};

const FIELD_TYPES = [
  { value: 'text', label: 'Text Input' },
  { value: 'textarea', label: 'Text Area (Multi-line)' },
  { value: 'date', label: 'Date Picker' },
  { value: 'select', label: 'Dropdown List' },
  { value: 'checkbox', label: 'Checkbox' },
  { value: 'number', label: 'Number' },
];

interface NewFieldForm {
  sectionKey: string;
  label: string;
  type: string;
  required: boolean;
  options: string; // comma-separated for select type
}

export default function SchemaDetailPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const schemaId = params.id as string;

  const [schema, setSchema] = useState<AdminSchema | null>(null);
  const [plans, setPlans] = useState<SchemaPlanInstance[]>([]);
  const [plansTotal, setPlansTotal] = useState(0);
  const [plansPage, setPlansPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingPlans, setLoadingPlans] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showRawJson, setShowRawJson] = useState(false);

  // Field Configuration State
  const [fieldSections, setFieldSections] = useState<SchemaSectionConfig[]>([]);
  const [loadingFields, setLoadingFields] = useState(false);
  const [pendingChanges, setPendingChanges] = useState<FieldConfigUpdate[]>([]);
  const [savingFields, setSavingFields] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [showFieldEditor, _setShowFieldEditor] = useState(true); // Show by default

  // Add Field Modal State
  const [showAddFieldModal, setShowAddFieldModal] = useState(false);
  const [newField, setNewField] = useState<NewFieldForm>({
    sectionKey: '',
    label: '',
    type: 'text',
    required: false,
    options: '',
  });
  const [addingField, setAddingField] = useState(false);

  const canManageDocs = user?.role === 'ADMIN';
  const plansPerPage = 10;

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/');
    }
  }, [user, authLoading, router]);

  const loadSchema = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { schema } = await api.getAdminSchema(schemaId);
      setSchema(schema);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load schema');
    } finally {
      setLoading(false);
    }
  }, [schemaId]);

  const loadPlans = useCallback(async (page: number) => {
    setLoadingPlans(true);
    try {
      const result = await api.getSchemaPlans(schemaId, page, plansPerPage);
      setPlans(result.plans);
      setPlansTotal(result.total);
      setPlansPage(page);
    } catch (err) {
      console.error('Failed to load plans:', err);
    } finally {
      setLoadingPlans(false);
    }
  }, [schemaId]);

  const loadFieldConfigs = useCallback(async () => {
    setLoadingFields(true);
    try {
      const result = await api.getSchemaFields(schemaId);
      setFieldSections(result.sections);
      setPendingChanges([]);
    } catch (err) {
      console.error('Failed to load field configs:', err);
    } finally {
      setLoadingFields(false);
    }
  }, [schemaId]);

  const handleFieldRequiredChange = (sectionKey: string, fieldKey: string, isRequired: boolean) => {
    // Update pending changes
    setPendingChanges(prev => {
      const existing = prev.findIndex(c => c.sectionKey === sectionKey && c.fieldKey === fieldKey);
      if (existing >= 0) {
        const updated = [...prev];
        updated[existing] = { sectionKey, fieldKey, isRequired };
        return updated;
      }
      return [...prev, { sectionKey, fieldKey, isRequired }];
    });

    // Update local state
    setFieldSections(prev => prev.map(section => {
      if (section.key !== sectionKey) return section;
      return {
        ...section,
        fields: section.fields.map(field => {
          if (field.key !== fieldKey) return field;
          return { ...field, effectiveRequired: isRequired, hasOverride: true };
        }),
      };
    }));
  };

  const saveFieldConfigs = async () => {
    if (pendingChanges.length === 0) return;
    setSavingFields(true);
    try {
      await api.updateSchemaFields(schemaId, pendingChanges);
      setPendingChanges([]);
      await loadFieldConfigs(); // Refresh
    } catch (err) {
      console.error('Failed to save field configs:', err);
      setError('Failed to save field configurations');
    } finally {
      setSavingFields(false);
    }
  };

  const openAddFieldModal = (sectionKey: string) => {
    setNewField({
      sectionKey,
      label: '',
      type: 'text',
      required: false,
      options: '',
    });
    setShowAddFieldModal(true);
  };

  const handleAddField = async () => {
    if (!newField.label.trim()) {
      setError('Field label is required');
      return;
    }

    // Generate key from label
    const fieldKey = newField.label
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');

    setAddingField(true);
    try {
      await api.addSchemaField(schemaId, {
        sectionKey: newField.sectionKey,
        fieldKey,
        label: newField.label.trim(),
        type: newField.type,
        required: newField.required,
        options: newField.type === 'select'
          ? newField.options.split(',').map(o => o.trim()).filter(o => o)
          : undefined,
      });

      setShowAddFieldModal(false);
      await loadSchema(); // Refresh schema
      await loadFieldConfigs(); // Refresh field configs
    } catch (err) {
      console.error('Failed to add field:', err);
      setError(err instanceof Error ? err.message : 'Failed to add field');
    } finally {
      setAddingField(false);
    }
  };

  useEffect(() => {
    if (user?.isOnboarded && canManageDocs && schemaId) {
      loadSchema();
      loadPlans(1);
      loadFieldConfigs(); // Load field configs immediately
    }
  }, [user, canManageDocs, schemaId, loadSchema, loadPlans, loadFieldConfigs]);

  // Remove the separate useEffect for field editor since we now load by default

  const totalPages = Math.ceil(plansTotal / plansPerPage);

  if (authLoading || loading) {
    return (
      <div className="loading-container">
        <div className="spinner" />
      </div>
    );
  }

  if (!canManageDocs) {
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

  if (error || !schema) {
    return (
      <div className={styles.container}>
        <div className={styles.accessDenied}>
          <h2>{error || 'Schema not found'}</h2>
          <button className="btn btn-primary" onClick={() => router.push('/admin/schemas')}>
            Back to Schemas
          </button>
        </div>
      </div>
    );
  }

  // Count sections and fields
  const sectionCount = schema.fields?.sections?.length || 0;
  const fieldCount = schema.fields?.sections?.reduce(
    (total, section) => total + (section.fields?.length || 0), 0
  ) || 0;

  return (
    <div className={styles.container}>
      <div className={styles.pageHeader}>
        <button className={styles.backBtn} onClick={() => router.push('/admin/schemas')}>
          &larr; Back to Schemas
        </button>
        <div className={styles.headerMain}>
          <div>
            <h1>{schema.name}</h1>
            {schema.description && <p className={styles.description}>{schema.description}</p>}
          </div>
          <span className={`${styles.statusBadge} ${schema.isActive ? styles.active : styles.inactive}`}>
            {schema.isActive ? 'Active' : 'Inactive'}
          </span>
        </div>
      </div>

      {/* Schema Info Cards */}
      <div className={styles.infoCards}>
        <div className={styles.infoCard}>
          <span className={styles.infoLabel}>Plan Type</span>
          <span className={styles.infoValue}>{PLAN_TYPE_LABELS[schema.planType]}</span>
        </div>
        <div className={styles.infoCard}>
          <span className={styles.infoLabel}>Version</span>
          <span className={styles.infoValue}>v{schema.version}</span>
        </div>
        <div className={styles.infoCard}>
          <span className={styles.infoLabel}>Jurisdiction</span>
          <span className={styles.infoValue}>{schema.jurisdictionName || 'Default'}</span>
        </div>
        <div className={styles.infoCard}>
          <span className={styles.infoLabel}>Sections</span>
          <span className={styles.infoValue}>{sectionCount}</span>
        </div>
        <div className={styles.infoCard}>
          <span className={styles.infoLabel}>Fields</span>
          <span className={styles.infoValue}>{fieldCount}</span>
        </div>
        <div className={styles.infoCard}>
          <span className={styles.infoLabel}>Plans Using</span>
          <span className={styles.infoValue}>{schema.planCount}</span>
        </div>
      </div>

      <div className={styles.metaInfo}>
        <span>Created: {format(new Date(schema.createdAt), 'MMM d, yyyy HH:mm')}</span>
        <span>Updated: {format(new Date(schema.updatedAt), 'MMM d, yyyy HH:mm')}</span>
      </div>

      {/* Schema Structure */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2>Schema Structure</h2>
          <button
            className="btn btn-outline btn-sm"
            onClick={() => setShowRawJson(!showRawJson)}
          >
            {showRawJson ? 'Hide Raw JSON' : 'Show Raw JSON'}
          </button>
        </div>

        {showRawJson ? (
          <div className={styles.jsonViewer}>
            <pre>{JSON.stringify(schema.fields, null, 2)}</pre>
          </div>
        ) : (
          <div className={styles.sectionsList}>
            {schema.fields?.sections?.map((section, index) => (
              <div key={section.key} className={styles.schemaSection}>
                <div className={styles.schemaSectionHeader}>
                  <span className={styles.sectionNumber}>{index + 1}</span>
                  <div>
                    <h4>{section.title}</h4>
                    <span className={styles.sectionKey}>{section.key}</span>
                  </div>
                  <span className={styles.fieldCountBadge}>
                    {section.fields?.length || 0} fields
                  </span>
                </div>
                {section.fields && section.fields.length > 0 && (
                  <div className={styles.fieldsList}>
                    {section.fields.map(field => (
                      <div key={field.key} className={styles.fieldItem}>
                        <span className={styles.fieldKey}>{field.key}</span>
                        <span className={styles.fieldLabel}>{field.label}</span>
                        <span className={styles.fieldType}>{field.type}</span>
                        {field.required && (
                          <span className={styles.requiredBadge}>Required</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Field Configuration Editor */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2>Edit Fields &amp; Requirements</h2>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {pendingChanges.length > 0 && (
              <button
                className="btn btn-primary btn-sm"
                onClick={saveFieldConfigs}
                disabled={savingFields}
              >
                {savingFields ? 'Saving...' : `Save ${pendingChanges.length} Changes`}
              </button>
            )}
          </div>
        </div>

        {loadingFields ? (
          <div className="loading-container">
            <div className="spinner" />
          </div>
        ) : (
          <div className={styles.fieldEditorContainer}>
            <p className={styles.editorHint}>
              Check the boxes to mark fields as required. Click &quot;+ Add Field&quot; to add new fields to a section.
            </p>
            {fieldSections.map((section, sectionIndex) => (
              <div key={section.key} className={styles.editorSection}>
                <div className={styles.editorSectionHeader}>
                  <span className={styles.sectionNumber}>{sectionIndex + 1}</span>
                  <h4>{section.title}</h4>
                  <button
                    className="btn btn-outline btn-sm"
                    onClick={() => openAddFieldModal(section.key)}
                    style={{ marginLeft: 'auto' }}
                  >
                    + Add Field
                  </button>
                </div>
                <div className={styles.editorFieldsList}>
                  {section.fields.length === 0 ? (
                    <div className={styles.editorField} style={{ justifyContent: 'center', color: 'var(--muted)' }}>
                      No fields in this section. Click &quot;+ Add Field&quot; to add one.
                    </div>
                  ) : (
                    section.fields.map(field => (
                      <label
                        key={field.key}
                        className={`${styles.editorField} ${field.hasOverride ? styles.hasOverride : ''}`}
                      >
                        <input
                          type="checkbox"
                          checked={field.effectiveRequired}
                          onChange={(e) => handleFieldRequiredChange(section.key, field.key, e.target.checked)}
                        />
                        <span className={styles.editorFieldLabel}>{field.label}</span>
                        <span className={styles.editorFieldKey}>{field.key}</span>
                        <span className={styles.editorFieldType}>{field.type}</span>
                        {field.hasOverride && (
                          <span className={styles.overrideBadge}>Modified</span>
                        )}
                      </label>
                    ))
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Plans Using This Schema */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2>Plans Using This Schema</h2>
          <span className={styles.count}>{plansTotal} total</span>
        </div>

        {loadingPlans ? (
          <div className="loading-container">
            <div className="spinner" />
          </div>
        ) : plans.length === 0 ? (
          <p className={styles.emptyMessage}>No plans are using this schema yet.</p>
        ) : (
          <>
            <div className={styles.plansTable}>
              <table>
                <thead>
                  <tr>
                    <th>Student</th>
                    <th>Grade</th>
                    <th>Status</th>
                    <th>Start Date</th>
                    <th>End Date</th>
                    <th>Created</th>
                  </tr>
                </thead>
                <tbody>
                  {plans.map(plan => (
                    <tr key={plan.id}>
                      <td className={styles.studentName}>{plan.studentName}</td>
                      <td>{plan.studentGrade}</td>
                      <td>
                        <span className={`${styles.planStatusBadge} ${styles[plan.status.toLowerCase()]}`}>
                          {plan.status}
                        </span>
                      </td>
                      <td>{format(new Date(plan.startDate), 'MMM d, yyyy')}</td>
                      <td>{plan.endDate ? format(new Date(plan.endDate), 'MMM d, yyyy') : '-'}</td>
                      <td>{format(new Date(plan.createdAt), 'MMM d, yyyy')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className={styles.pagination}>
                <button
                  className="btn btn-outline btn-sm"
                  onClick={() => loadPlans(plansPage - 1)}
                  disabled={plansPage <= 1}
                >
                  Previous
                </button>
                <span className={styles.pageInfo}>
                  Page {plansPage} of {totalPages}
                </span>
                <button
                  className="btn btn-outline btn-sm"
                  onClick={() => loadPlans(plansPage + 1)}
                  disabled={plansPage >= totalPages}
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </section>

      {/* Add Field Modal */}
      {showAddFieldModal && (
        <div className={styles.modalOverlay} onClick={() => setShowAddFieldModal(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>Add New Field</h3>
              <button
                className={styles.modalClose}
                onClick={() => setShowAddFieldModal(false)}
              >
                &times;
              </button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.formGroup}>
                <label>Field Label *</label>
                <input
                  type="text"
                  className="form-input"
                  value={newField.label}
                  onChange={e => setNewField({ ...newField, label: e.target.value })}
                  placeholder="e.g., Student Phone Number"
                />
                <p className={styles.formHint}>
                  This is the label that will be displayed to users.
                </p>
              </div>

              <div className={styles.formGroup}>
                <label>Field Type *</label>
                <select
                  className="form-select"
                  value={newField.type}
                  onChange={e => setNewField({ ...newField, type: e.target.value })}
                >
                  {FIELD_TYPES.map(type => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>

              {newField.type === 'select' && (
                <div className={styles.formGroup}>
                  <label>Dropdown Options *</label>
                  <input
                    type="text"
                    className="form-input"
                    value={newField.options}
                    onChange={e => setNewField({ ...newField, options: e.target.value })}
                    placeholder="Option 1, Option 2, Option 3"
                  />
                  <p className={styles.formHint}>
                    Enter options separated by commas.
                  </p>
                </div>
              )}

              <div className={styles.formGroup}>
                <label className={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={newField.required}
                    onChange={e => setNewField({ ...newField, required: e.target.checked })}
                  />
                  Required field
                </label>
                <p className={styles.formHint}>
                  If checked, users must fill in this field before saving.
                </p>
              </div>
            </div>
            <div className={styles.modalFooter}>
              <button
                className="btn btn-outline"
                onClick={() => setShowAddFieldModal(false)}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={handleAddField}
                disabled={addingField || !newField.label.trim()}
              >
                {addingField ? 'Adding...' : 'Add Field'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
