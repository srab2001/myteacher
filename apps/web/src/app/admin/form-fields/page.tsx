'use client';

import { useState, useEffect } from 'react';
import { api, FormFieldDefinition, FormType, ControlType, OptionsEditableBy } from '@/lib/api';
import styles from './page.module.css';

type UserRole = 'ADMIN' | 'TEACHER' | 'CASE_MANAGER' | 'RELATED_SERVICE_PROVIDER' | 'READ_ONLY';
const ALL_ROLES: UserRole[] = ['ADMIN', 'TEACHER', 'CASE_MANAGER', 'RELATED_SERVICE_PROVIDER', 'READ_ONLY'];
const CONTROL_TYPES: ControlType[] = ['TEXT', 'TEXTAREA', 'DROPDOWN', 'RADIO', 'SIGNATURE', 'CHECKBOX', 'DATE'];
const OPTIONS_EDITABLE_BY: OptionsEditableBy[] = ['ADMIN_ONLY', 'TEACHER_ALLOWED', 'NONE'];

export default function FormFieldsPage() {
  const [formType, setFormType] = useState<FormType>('IEP');
  const [fields, setFields] = useState<FormFieldDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedField, setSelectedField] = useState<FormFieldDefinition | null>(null);
  const [showAddField, setShowAddField] = useState(false);
  const [showAddOption, setShowAddOption] = useState(false);

  // New field form state
  const [newField, setNewField] = useState({
    section: '',
    sectionOrder: 0,
    fieldKey: '',
    fieldLabel: '',
    controlType: 'TEXT' as ControlType,
    isRequired: false,
    valueEditableBy: ['ADMIN', 'CASE_MANAGER'] as string[],
    optionsEditableBy: 'NONE' as OptionsEditableBy,
    helpText: '',
    placeholder: '',
  });

  // New option form state
  const [newOption, setNewOption] = useState({
    value: '',
    label: '',
    sortOrder: 0,
  });

  useEffect(() => {
    loadFields();
  }, [formType]);

  const loadFields = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await api.getFormFieldDefinitions(formType);
      setFields(result.fields);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load fields');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateField = async () => {
    try {
      await api.createFormField({
        formType,
        section: newField.section,
        sectionOrder: newField.sectionOrder,
        fieldKey: newField.fieldKey,
        fieldLabel: newField.fieldLabel,
        controlType: newField.controlType,
        isRequired: newField.isRequired,
        valueEditableBy: newField.valueEditableBy,
        optionsEditableBy: newField.optionsEditableBy,
        helpText: newField.helpText || undefined,
        placeholder: newField.placeholder || undefined,
      });
      setShowAddField(false);
      setNewField({
        section: '',
        sectionOrder: 0,
        fieldKey: '',
        fieldLabel: '',
        controlType: 'TEXT',
        isRequired: false,
        valueEditableBy: ['ADMIN', 'CASE_MANAGER'],
        optionsEditableBy: 'NONE',
        helpText: '',
        placeholder: '',
      });
      loadFields();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create field');
    }
  };

  const handleUpdateField = async (fieldId: string, data: Partial<FormFieldDefinition>) => {
    try {
      await api.updateFormField(fieldId, data);
      loadFields();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update field');
    }
  };

  const handleDeleteField = async (fieldId: string) => {
    if (!confirm('Are you sure you want to deactivate this field?')) return;
    try {
      await api.deleteFormField(fieldId);
      setSelectedField(null);
      loadFields();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete field');
    }
  };

  const handleAddOption = async () => {
    if (!selectedField) return;
    try {
      await api.createFieldOption(selectedField.id, {
        value: newOption.value,
        label: newOption.label,
        sortOrder: newOption.sortOrder,
      });
      setShowAddOption(false);
      setNewOption({ value: '', label: '', sortOrder: 0 });
      loadFields();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add option');
    }
  };

  const handleDeleteOption = async (optionId: string) => {
    if (!confirm('Are you sure you want to deactivate this option?')) return;
    try {
      await api.deleteFieldOption(optionId);
      loadFields();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete option');
    }
  };

  const toggleRole = (role: string) => {
    setNewField(prev => ({
      ...prev,
      valueEditableBy: prev.valueEditableBy.includes(role)
        ? prev.valueEditableBy.filter(r => r !== role)
        : [...prev.valueEditableBy, role],
    }));
  };

  // Group fields by section
  const sections = fields.reduce((acc, field) => {
    if (!acc[field.section]) {
      acc[field.section] = [];
    }
    acc[field.section].push(field);
    return acc;
  }, {} as Record<string, FormFieldDefinition[]>);

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1>Form Field Definitions</h1>
        <div className={styles.headerActions}>
          <select
            className={styles.formTypeSelect}
            value={formType}
            onChange={e => setFormType(e.target.value as FormType)}
          >
            <option value="IEP">IEP</option>
            <option value="IEP_REPORT">IEP Report</option>
            <option value="FIVE_OH_FOUR">504 Plan</option>
          </select>
          <button className="btn btn-primary" onClick={() => setShowAddField(true)}>
            + Add Field
          </button>
        </div>
      </header>

      {error && <div className={styles.error}>{error}</div>}

      {loading ? (
        <div className="loading-container">
          <div className="spinner" />
        </div>
      ) : (
        <div className={styles.layout}>
          {/* Field List */}
          <div className={styles.fieldList}>
            {Object.entries(sections).map(([sectionName, sectionFields]) => (
              <div key={sectionName} className={styles.section}>
                <h3 className={styles.sectionTitle}>{sectionName}</h3>
                {sectionFields.map(field => (
                  <div
                    key={field.id}
                    className={`${styles.fieldItem} ${selectedField?.id === field.id ? styles.selected : ''}`}
                    onClick={() => setSelectedField(field)}
                  >
                    <div className={styles.fieldItemHeader}>
                      <span className={styles.fieldLabel}>{field.fieldLabel}</span>
                      <span className={styles.fieldType}>{field.controlType}</span>
                    </div>
                    <div className={styles.fieldKey}>{field.fieldKey}</div>
                    {field.isRequired && <span className={styles.requiredBadge}>Required</span>}
                  </div>
                ))}
              </div>
            ))}
            {Object.keys(sections).length === 0 && (
              <p className={styles.emptyState}>No fields defined for this form type.</p>
            )}
          </div>

          {/* Field Detail Panel */}
          {selectedField && (
            <div className={styles.detailPanel}>
              <h2>Field Details</h2>
              <div className={styles.detailSection}>
                <label>Field Key</label>
                <code className={styles.fieldKeyCode}>{selectedField.fieldKey}</code>
              </div>
              <div className={styles.detailSection}>
                <label>Label</label>
                <input
                  type="text"
                  value={selectedField.fieldLabel}
                  onChange={e => handleUpdateField(selectedField.id, { fieldLabel: e.target.value })}
                  className={styles.input}
                />
              </div>
              <div className={styles.detailSection}>
                <label>Section</label>
                <input
                  type="text"
                  value={selectedField.section}
                  onChange={e => handleUpdateField(selectedField.id, { section: e.target.value })}
                  className={styles.input}
                />
              </div>
              <div className={styles.detailSection}>
                <label>Control Type</label>
                <select
                  value={selectedField.controlType}
                  onChange={e => handleUpdateField(selectedField.id, { controlType: e.target.value as ControlType })}
                  className={styles.select}
                >
                  {CONTROL_TYPES.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>
              <div className={styles.detailSection}>
                <label>Required</label>
                <input
                  type="checkbox"
                  checked={selectedField.isRequired}
                  onChange={e => handleUpdateField(selectedField.id, { isRequired: e.target.checked })}
                />
              </div>
              <div className={styles.detailSection}>
                <label>Options Editable By</label>
                <select
                  value={selectedField.optionsEditableBy}
                  onChange={e => handleUpdateField(selectedField.id, { optionsEditableBy: e.target.value as OptionsEditableBy })}
                  className={styles.select}
                >
                  {OPTIONS_EDITABLE_BY.map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>
              <div className={styles.detailSection}>
                <label>Value Editable By</label>
                <div className={styles.roleList}>
                  {(selectedField.valueEditableBy as string[]).map(role => (
                    <span key={role} className={styles.roleBadge}>{role}</span>
                  ))}
                </div>
              </div>

              {/* Options for DROPDOWN/RADIO */}
              {(selectedField.controlType === 'DROPDOWN' || selectedField.controlType === 'RADIO') && (
                <div className={styles.optionsSection}>
                  <div className={styles.optionsHeader}>
                    <h3>Options</h3>
                    <button
                      className="btn btn-sm btn-outline"
                      onClick={() => setShowAddOption(true)}
                    >
                      + Add Option
                    </button>
                  </div>
                  {selectedField.options.length > 0 ? (
                    <ul className={styles.optionsList}>
                      {selectedField.options.map(opt => (
                        <li key={opt.id} className={styles.optionItem}>
                          <span>{opt.label}</span>
                          <code>{opt.value}</code>
                          <button
                            className={styles.deleteBtn}
                            onClick={() => handleDeleteOption(opt.id)}
                          >
                            &times;
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className={styles.noOptions}>No options defined</p>
                  )}
                </div>
              )}

              <div className={styles.detailActions}>
                <button
                  className="btn btn-outline btn-danger"
                  onClick={() => handleDeleteField(selectedField.id)}
                >
                  Deactivate Field
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Add Field Modal */}
      {showAddField && (
        <div className={styles.modal}>
          <div className={styles.modalContent}>
            <h2>Add New Field</h2>
            <div className={styles.formGroup}>
              <label>Section</label>
              <input
                type="text"
                value={newField.section}
                onChange={e => setNewField(prev => ({ ...prev, section: e.target.value }))}
                placeholder="e.g., Student Information"
                className={styles.input}
              />
            </div>
            <div className={styles.formGroup}>
              <label>Field Key (snake_case)</label>
              <input
                type="text"
                value={newField.fieldKey}
                onChange={e => setNewField(prev => ({ ...prev, fieldKey: e.target.value }))}
                placeholder="e.g., student_first_name"
                className={styles.input}
              />
            </div>
            <div className={styles.formGroup}>
              <label>Field Label</label>
              <input
                type="text"
                value={newField.fieldLabel}
                onChange={e => setNewField(prev => ({ ...prev, fieldLabel: e.target.value }))}
                placeholder="e.g., First Name"
                className={styles.input}
              />
            </div>
            <div className={styles.formGroup}>
              <label>Control Type</label>
              <select
                value={newField.controlType}
                onChange={e => setNewField(prev => ({ ...prev, controlType: e.target.value as ControlType }))}
                className={styles.select}
              >
                {CONTROL_TYPES.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>
            <div className={styles.formGroup}>
              <label>
                <input
                  type="checkbox"
                  checked={newField.isRequired}
                  onChange={e => setNewField(prev => ({ ...prev, isRequired: e.target.checked }))}
                />
                Required Field
              </label>
            </div>
            <div className={styles.formGroup}>
              <label>Value Editable By</label>
              <div className={styles.roleCheckboxes}>
                {ALL_ROLES.map(role => (
                  <label key={role} className={styles.roleCheckbox}>
                    <input
                      type="checkbox"
                      checked={newField.valueEditableBy.includes(role)}
                      onChange={() => toggleRole(role)}
                    />
                    {role}
                  </label>
                ))}
              </div>
            </div>
            <div className={styles.formGroup}>
              <label>Options Editable By</label>
              <select
                value={newField.optionsEditableBy}
                onChange={e => setNewField(prev => ({ ...prev, optionsEditableBy: e.target.value as OptionsEditableBy }))}
                className={styles.select}
              >
                {OPTIONS_EDITABLE_BY.map(opt => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </div>
            <div className={styles.modalActions}>
              <button className="btn btn-outline" onClick={() => setShowAddField(false)}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={handleCreateField}>
                Create Field
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Option Modal */}
      {showAddOption && (
        <div className={styles.modal}>
          <div className={styles.modalContent}>
            <h2>Add Option</h2>
            <div className={styles.formGroup}>
              <label>Value</label>
              <input
                type="text"
                value={newOption.value}
                onChange={e => setNewOption(prev => ({ ...prev, value: e.target.value }))}
                placeholder="Option value (stored)"
                className={styles.input}
              />
            </div>
            <div className={styles.formGroup}>
              <label>Label</label>
              <input
                type="text"
                value={newOption.label}
                onChange={e => setNewOption(prev => ({ ...prev, label: e.target.value }))}
                placeholder="Option label (displayed)"
                className={styles.input}
              />
            </div>
            <div className={styles.formGroup}>
              <label>Sort Order</label>
              <input
                type="number"
                value={newOption.sortOrder}
                onChange={e => setNewOption(prev => ({ ...prev, sortOrder: parseInt(e.target.value) || 0 }))}
                className={styles.input}
              />
            </div>
            <div className={styles.modalActions}>
              <button className="btn btn-outline" onClick={() => setShowAddOption(false)}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={handleAddOption}>
                Add Option
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
