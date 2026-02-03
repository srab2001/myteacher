'use client';

import { useState } from 'react';
import { CreateCaseRequest, PlanType } from '@/lib/db/types';
import styles from './Timeline.module.css';

interface CaseFormProps {
  onSubmit: (data: CreateCaseRequest) => Promise<void>;
  onCancel?: () => void;
  isLoading?: boolean;
}

const DISABILITY_CATEGORIES = [
  'Autism',
  'Deaf-Blindness',
  'Developmental Delay',
  'Emotional Disability',
  'Hearing Impairment',
  'Intellectual Disability',
  'Multiple Disabilities',
  'Orthopedic Impairment',
  'Other Health Impairment',
  'Specific Learning Disability',
  'Speech or Language Impairment',
  'Traumatic Brain Injury',
  'Visual Impairment',
];

const GRADE_OPTIONS = [
  'Pre-K',
  'Kindergarten',
  '1st Grade',
  '2nd Grade',
  '3rd Grade',
  '4th Grade',
  '5th Grade',
  '6th Grade',
  '7th Grade',
  '8th Grade',
  '9th Grade',
  '10th Grade',
  '11th Grade',
  '12th Grade',
];

export function CaseForm({ onSubmit, onCancel, isLoading }: CaseFormProps) {
  const [formData, setFormData] = useState<CreateCaseRequest>({
    student_name: '',
    student_dob: '',
    student_grade: '',
    school_name: '',
    school_district: '',
    disability_category: '',
    plan_type: 'iep',
    notes: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Clear error when user starts typing
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

    if (!formData.student_name.trim()) {
      newErrors.student_name = 'Student name is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    await onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      <h2 className={styles.formTitle}>Create New Case</h2>

      <div className={styles.formGrid}>
        <div className={styles.formGroup}>
          <label htmlFor="student_name" className={styles.label}>
            Student Name *
          </label>
          <input
            type="text"
            id="student_name"
            name="student_name"
            value={formData.student_name}
            onChange={handleChange}
            className={`${styles.input} ${errors.student_name ? styles.inputError : ''}`}
            placeholder="Enter student's name or alias"
          />
          {errors.student_name && (
            <span className={styles.error}>{errors.student_name}</span>
          )}
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="student_dob" className={styles.label}>
            Date of Birth
          </label>
          <input
            type="date"
            id="student_dob"
            name="student_dob"
            value={formData.student_dob}
            onChange={handleChange}
            className={styles.input}
          />
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="student_grade" className={styles.label}>
            Grade
          </label>
          <select
            id="student_grade"
            name="student_grade"
            value={formData.student_grade}
            onChange={handleChange}
            className={styles.select}
          >
            <option value="">Select grade</option>
            {GRADE_OPTIONS.map((grade) => (
              <option key={grade} value={grade}>
                {grade}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="plan_type" className={styles.label}>
            Plan Type
          </label>
          <select
            id="plan_type"
            name="plan_type"
            value={formData.plan_type}
            onChange={handleChange}
            className={styles.select}
          >
            <option value="iep">IEP</option>
            <option value="504">504 Plan</option>
            <option value="unknown">Unknown</option>
          </select>
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="school_name" className={styles.label}>
            School Name
          </label>
          <input
            type="text"
            id="school_name"
            name="school_name"
            value={formData.school_name}
            onChange={handleChange}
            className={styles.input}
            placeholder="Enter school name"
          />
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="school_district" className={styles.label}>
            School District
          </label>
          <input
            type="text"
            id="school_district"
            name="school_district"
            value={formData.school_district}
            onChange={handleChange}
            className={styles.input}
            placeholder="Enter school district"
          />
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="disability_category" className={styles.label}>
            Disability Category
          </label>
          <select
            id="disability_category"
            name="disability_category"
            value={formData.disability_category}
            onChange={handleChange}
            className={styles.select}
          >
            <option value="">Select category</option>
            {DISABILITY_CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </div>
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
          rows={4}
          placeholder="Add any additional notes about this case"
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
          {isLoading ? 'Creating...' : 'Create Case'}
        </button>
      </div>
    </form>
  );
}
