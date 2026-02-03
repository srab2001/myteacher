'use client';

import { useState } from 'react';
import { CreateEventRequest, EventType } from '@/lib/db/types';
import { getEventTypeName } from '@/lib/timeline/calculator';
import styles from './Timeline.module.css';

interface EventFormProps {
  caseId: string;
  onSubmit: (data: CreateEventRequest) => Promise<void>;
  onCancel?: () => void;
  isLoading?: boolean;
}

const EVENT_TYPES: EventType[] = [
  'referral_date',
  'consent_date',
  'evaluation_date',
  'iep_meeting_date',
  'annual_review_date',
  'triennial_date',
  'amendment_date',
  'transition_meeting_date',
];

export function EventForm({ caseId, onSubmit, onCancel, isLoading }: EventFormProps) {
  const [formData, setFormData] = useState<CreateEventRequest>({
    event_type: 'consent_date',
    event_date: new Date().toISOString().split('T')[0],
    notes: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.event_type) {
      newErrors.event_type = 'Event type is required';
    }

    if (!formData.event_date) {
      newErrors.event_date = 'Event date is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    await onSubmit(formData);
  };

  // Show which deadlines will be calculated
  const getDeadlineHint = (eventType: EventType): string => {
    switch (eventType) {
      case 'consent_date':
        return 'Adding this event will create an Evaluation deadline (60 days)';
      case 'evaluation_date':
        return 'Adding this event will create IEP Meeting (30 days) and Triennial (3 years) deadlines';
      case 'iep_meeting_date':
        return 'Adding this event will create an Annual Review deadline (365 days)';
      case 'annual_review_date':
        return 'Adding this event will create the next Annual Review deadline (365 days)';
      case 'triennial_date':
        return 'Adding this event will create next Triennial (3 years) and IEP Meeting (30 days) deadlines';
      default:
        return '';
    }
  };

  const hint = getDeadlineHint(formData.event_type as EventType);

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      <h3 className={styles.formSubtitle}>Add Event</h3>

      <div className={styles.formGroup}>
        <label htmlFor="event_type" className={styles.label}>
          Event Type *
        </label>
        <select
          id="event_type"
          name="event_type"
          value={formData.event_type}
          onChange={handleChange}
          className={`${styles.select} ${errors.event_type ? styles.inputError : ''}`}
        >
          {EVENT_TYPES.map((type) => (
            <option key={type} value={type}>
              {getEventTypeName(type)}
            </option>
          ))}
        </select>
        {errors.event_type && (
          <span className={styles.error}>{errors.event_type}</span>
        )}
      </div>

      {hint && <p className={styles.hint}>{hint}</p>}

      <div className={styles.formGroup}>
        <label htmlFor="event_date" className={styles.label}>
          Event Date *
        </label>
        <input
          type="date"
          id="event_date"
          name="event_date"
          value={formData.event_date}
          onChange={handleChange}
          className={`${styles.input} ${errors.event_date ? styles.inputError : ''}`}
        />
        {errors.event_date && (
          <span className={styles.error}>{errors.event_date}</span>
        )}
      </div>

      <div className={styles.formGroup}>
        <label htmlFor="notes" className={styles.label}>
          Notes
        </label>
        <textarea
          id="notes"
          name="notes"
          value={formData.notes}
          onChange={handleChange}
          className={styles.textarea}
          rows={3}
          placeholder="Add any notes about this event"
        />
      </div>

      <div className={styles.formActions}>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className={styles.buttonSecondary}
            disabled={isLoading}
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          className={styles.buttonPrimary}
          disabled={isLoading}
        >
          {isLoading ? 'Adding...' : 'Add Event'}
        </button>
      </div>
    </form>
  );
}
