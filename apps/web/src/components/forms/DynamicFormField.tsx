'use client';

import { FormFieldDefinition, School, User } from '@/lib/api';
import { DictationTextArea } from './DictationTextArea';
import styles from './DynamicFormField.module.css';

interface DynamicFormFieldProps {
  field: FormFieldDefinition;
  value: unknown;
  onChange: (value: unknown) => void;
  user: User | null;
  schools?: School[];
  disabled?: boolean;
  showPermissionHint?: boolean;
}

/**
 * Check if user can edit this field based on their role and field permissions
 */
function canUserEditField(userRole: string | null | undefined, valueEditableBy: string[]): boolean {
  if (!userRole) return false;
  return valueEditableBy.includes(userRole) || (valueEditableBy.includes('ADMIN') && userRole === 'ADMIN');
}

export function DynamicFormField({
  field,
  value,
  onChange,
  user,
  schools = [],
  disabled = false,
  showPermissionHint = false,
}: DynamicFormFieldProps) {
  const userRole = user?.role || null;
  const canEdit = canUserEditField(userRole, field.valueEditableBy);
  const isDisabled = disabled || !canEdit;

  // Get options for dropdown/radio - special handling for school dropdown
  const getOptions = () => {
    if (field.fieldKey === 'student_school_id' && schools.length > 0) {
      return schools.map(s => ({ value: s.id, label: s.name }));
    }
    return field.options.map(o => ({ value: o.value, label: o.label }));
  };

  const options = getOptions();

  return (
    <div className={`${styles.field} ${isDisabled ? styles.disabled : ''}`}>
      <label className={styles.label}>
        {field.fieldLabel}
        {field.isRequired && <span className={styles.required}>*</span>}
      </label>

      {/* TEXT Control */}
      {field.controlType === 'TEXT' && (
        <input
          type="text"
          className={styles.textInput}
          value={(value as string) || ''}
          onChange={e => onChange(e.target.value)}
          placeholder={field.placeholder || undefined}
          disabled={isDisabled}
        />
      )}

      {/* TEXTAREA Control */}
      {field.controlType === 'TEXTAREA' && (
        <DictationTextArea
          value={(value as string) || ''}
          onChange={onChange}
          placeholder={field.placeholder || undefined}
          disabled={isDisabled}
          rows={4}
        />
      )}

      {/* DATE Control */}
      {field.controlType === 'DATE' && (
        <input
          type="date"
          className={styles.dateInput}
          value={(value as string) || ''}
          onChange={e => onChange(e.target.value)}
          disabled={isDisabled}
        />
      )}

      {/* DROPDOWN Control */}
      {field.controlType === 'DROPDOWN' && (
        <select
          className={styles.selectInput}
          value={(value as string) || ''}
          onChange={e => onChange(e.target.value)}
          disabled={isDisabled}
        >
          <option value="">Select...</option>
          {options.map(opt => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      )}

      {/* RADIO Control */}
      {field.controlType === 'RADIO' && (
        <div className={styles.radioGroup}>
          {options.map(opt => (
            <label key={opt.value} className={styles.radioLabel}>
              <input
                type="radio"
                name={field.fieldKey}
                value={opt.value}
                checked={(value as string) === opt.value}
                onChange={e => onChange(e.target.value)}
                disabled={isDisabled}
              />
              <span>{opt.label}</span>
            </label>
          ))}
        </div>
      )}

      {/* CHECKBOX Control */}
      {field.controlType === 'CHECKBOX' && (
        <label className={styles.checkboxLabel}>
          <input
            type="checkbox"
            checked={Boolean(value)}
            onChange={e => onChange(e.target.checked)}
            disabled={isDisabled}
          />
          <span>{field.helpText || 'Yes'}</span>
        </label>
      )}

      {/* SIGNATURE Control */}
      {field.controlType === 'SIGNATURE' && (
        <div className={styles.signatureField}>
          <input
            type="text"
            className={styles.textInput}
            value={(value as string) || ''}
            onChange={e => onChange(e.target.value)}
            placeholder="Type your name to sign"
            disabled={isDisabled}
          />
          <p className={styles.signatureHint}>
            By typing your name, you acknowledge this as your electronic signature.
          </p>
        </div>
      )}

      {/* Help Text */}
      {field.helpText && field.controlType !== 'CHECKBOX' && (
        <p className={styles.helpText}>{field.helpText}</p>
      )}

      {/* Permission Hint */}
      {showPermissionHint && !canEdit && (
        <p className={styles.permissionHint}>
          Only {field.valueEditableBy.join(', ')} can edit this field.
        </p>
      )}
    </div>
  );
}

interface DynamicFormSectionProps {
  sectionName: string;
  fields: FormFieldDefinition[];
  values: Record<string, unknown>;
  onChange: (fieldKey: string, value: unknown) => void;
  user: User | null;
  schools?: School[];
  disabled?: boolean;
}

export function DynamicFormSection({
  sectionName,
  fields,
  values,
  onChange,
  user,
  schools = [],
  disabled = false,
}: DynamicFormSectionProps) {
  return (
    <div className={styles.section}>
      <h3 className={styles.sectionTitle}>{sectionName}</h3>
      <div className={styles.sectionFields}>
        {fields.map(field => (
          <DynamicFormField
            key={field.fieldKey}
            field={field}
            value={values[field.fieldKey]}
            onChange={(value) => onChange(field.fieldKey, value)}
            user={user}
            schools={schools}
            disabled={disabled}
          />
        ))}
      </div>
    </div>
  );
}
