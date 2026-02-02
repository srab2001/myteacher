'use client';

import React, { useState } from 'react';
import {
  MeetingPrepFormData,
  MeetingType,
  Concern,
} from '@/lib/meeting-prep/types';
import {
  MEETING_TYPE_LABELS,
  COMMON_DESIRED_OUTCOMES,
  COMMON_CONCERN_AREAS,
} from '@/lib/meeting-prep/templates';
import styles from './GuideIntake.module.css';

interface GuideIntakeProps {
  caseId: string;
  studentAlias: string;
  onSubmit: (data: MeetingPrepFormData) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

const STEPS = [
  { id: 1, title: 'Meeting Details', description: 'Basic meeting information' },
  { id: 2, title: 'Concerns', description: 'Areas of concern to address' },
  { id: 3, title: 'Desired Outcomes', description: 'What you want to achieve' },
  { id: 4, title: 'Current Status', description: 'Current services and progress' },
];

const initialFormData: MeetingPrepFormData = {
  meetingType: 'annual',
  meetingDate: '',
  meetingTime: '',
  location: '',
  attendees: [],
  concerns: [],
  desiredOutcomes: [],
  customOutcomes: [],
  recentEvaluations: [],
  currentServices: '',
  whatsWorking: '',
  whatsNotWorking: '',
};

export function GuideIntake({
  caseId,
  studentAlias,
  onSubmit,
  onCancel,
  isLoading = false,
}: GuideIntakeProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<MeetingPrepFormData>(initialFormData);
  const [newAttendee, setNewAttendee] = useState('');
  const [newConcern, setNewConcern] = useState<Partial<Concern>>({ area: '', description: '' });
  const [newEvaluation, setNewEvaluation] = useState('');
  const [customOutcome, setCustomOutcome] = useState('');

  const handleNext = () => {
    if (currentStep < STEPS.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    await onSubmit(formData);
  };

  const addAttendee = () => {
    if (newAttendee.trim()) {
      setFormData({
        ...formData,
        attendees: [...formData.attendees, newAttendee.trim()],
      });
      setNewAttendee('');
    }
  };

  const removeAttendee = (index: number) => {
    setFormData({
      ...formData,
      attendees: formData.attendees.filter((_, i) => i !== index),
    });
  };

  const addConcern = () => {
    if (newConcern.area && newConcern.description) {
      const concern: Concern = {
        id: `concern-${Date.now()}`,
        area: newConcern.area,
        description: newConcern.description,
      };
      setFormData({
        ...formData,
        concerns: [...formData.concerns, concern],
      });
      setNewConcern({ area: '', description: '' });
    }
  };

  const removeConcern = (id: string) => {
    setFormData({
      ...formData,
      concerns: formData.concerns.filter((c) => c.id !== id),
    });
  };

  const toggleOutcome = (outcome: string) => {
    const isSelected = formData.desiredOutcomes.includes(outcome);
    setFormData({
      ...formData,
      desiredOutcomes: isSelected
        ? formData.desiredOutcomes.filter((o) => o !== outcome)
        : [...formData.desiredOutcomes, outcome],
    });
  };

  const addCustomOutcome = () => {
    if (customOutcome.trim()) {
      setFormData({
        ...formData,
        customOutcomes: [...formData.customOutcomes, customOutcome.trim()],
        desiredOutcomes: [...formData.desiredOutcomes, customOutcome.trim()],
      });
      setCustomOutcome('');
    }
  };

  const addEvaluation = () => {
    if (newEvaluation.trim()) {
      setFormData({
        ...formData,
        recentEvaluations: [...formData.recentEvaluations, newEvaluation.trim()],
      });
      setNewEvaluation('');
    }
  };

  const removeEvaluation = (index: number) => {
    setFormData({
      ...formData,
      recentEvaluations: formData.recentEvaluations.filter((_, i) => i !== index),
    });
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className={styles.stepContent}>
            <h3>Meeting Details</h3>
            <p className={styles.stepDescription}>
              Enter the basic information about the upcoming IEP meeting.
            </p>

            <div className={styles.formGroup}>
              <label htmlFor="meetingType">Meeting Type *</label>
              <select
                id="meetingType"
                value={formData.meetingType}
                onChange={(e) =>
                  setFormData({ ...formData, meetingType: e.target.value as MeetingType })
                }
                className={styles.select}
              >
                {Object.entries(MEETING_TYPE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label htmlFor="meetingDate">Meeting Date *</label>
                <input
                  type="date"
                  id="meetingDate"
                  value={formData.meetingDate}
                  onChange={(e) =>
                    setFormData({ ...formData, meetingDate: e.target.value })
                  }
                  className={styles.input}
                />
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="meetingTime">Meeting Time</label>
                <input
                  type="time"
                  id="meetingTime"
                  value={formData.meetingTime}
                  onChange={(e) =>
                    setFormData({ ...formData, meetingTime: e.target.value })
                  }
                  className={styles.input}
                />
              </div>
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="location">Location</label>
              <input
                type="text"
                id="location"
                value={formData.location}
                onChange={(e) =>
                  setFormData({ ...formData, location: e.target.value })
                }
                placeholder="School name or virtual meeting link"
                className={styles.input}
              />
            </div>

            <div className={styles.formGroup}>
              <label>Expected Attendees</label>
              <div className={styles.addItemRow}>
                <input
                  type="text"
                  value={newAttendee}
                  onChange={(e) => setNewAttendee(e.target.value)}
                  placeholder="Add attendee name and role"
                  className={styles.input}
                  onKeyPress={(e) => e.key === 'Enter' && addAttendee()}
                />
                <button type="button" onClick={addAttendee} className={styles.addButton}>
                  Add
                </button>
              </div>
              <div className={styles.tagList}>
                {formData.attendees.map((attendee, index) => (
                  <span key={index} className={styles.tag}>
                    {attendee}
                    <button
                      type="button"
                      onClick={() => removeAttendee(index)}
                      className={styles.tagRemove}
                    >
                      &times;
                    </button>
                  </span>
                ))}
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className={styles.stepContent}>
            <h3>Concerns</h3>
            <p className={styles.stepDescription}>
              What concerns do you want to address at this meeting?
            </p>

            <div className={styles.formGroup}>
              <label htmlFor="concernArea">Concern Area</label>
              <select
                id="concernArea"
                value={newConcern.area}
                onChange={(e) =>
                  setNewConcern({ ...newConcern, area: e.target.value })
                }
                className={styles.select}
              >
                <option value="">Select an area...</option>
                {COMMON_CONCERN_AREAS.map((area) => (
                  <option key={area} value={area}>
                    {area}
                  </option>
                ))}
                <option value="Other">Other</option>
              </select>
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="concernDescription">Description</label>
              <textarea
                id="concernDescription"
                value={newConcern.description}
                onChange={(e) =>
                  setNewConcern({ ...newConcern, description: e.target.value })
                }
                placeholder="Describe your concern in detail..."
                className={styles.textarea}
                rows={3}
              />
            </div>

            <button
              type="button"
              onClick={addConcern}
              disabled={!newConcern.area || !newConcern.description}
              className={styles.addButton}
            >
              Add Concern
            </button>

            {formData.concerns.length > 0 && (
              <div className={styles.concernsList}>
                <h4>Your Concerns ({formData.concerns.length})</h4>
                {formData.concerns.map((concern) => (
                  <div key={concern.id} className={styles.concernCard}>
                    <div className={styles.concernHeader}>
                      <strong>{concern.area}</strong>
                      <button
                        type="button"
                        onClick={() => removeConcern(concern.id)}
                        className={styles.removeButton}
                      >
                        Remove
                      </button>
                    </div>
                    <p>{concern.description}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        );

      case 3:
        return (
          <div className={styles.stepContent}>
            <h3>Desired Outcomes</h3>
            <p className={styles.stepDescription}>
              What do you hope to achieve from this meeting?
            </p>

            <div className={styles.outcomesGrid}>
              {COMMON_DESIRED_OUTCOMES.map((outcome) => (
                <label key={outcome} className={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={formData.desiredOutcomes.includes(outcome)}
                    onChange={() => toggleOutcome(outcome)}
                    className={styles.checkbox}
                  />
                  <span>{outcome}</span>
                </label>
              ))}
            </div>

            <div className={styles.formGroup}>
              <label>Custom Outcome</label>
              <div className={styles.addItemRow}>
                <input
                  type="text"
                  value={customOutcome}
                  onChange={(e) => setCustomOutcome(e.target.value)}
                  placeholder="Add your own desired outcome..."
                  className={styles.input}
                  onKeyPress={(e) => e.key === 'Enter' && addCustomOutcome()}
                />
                <button type="button" onClick={addCustomOutcome} className={styles.addButton}>
                  Add
                </button>
              </div>
              {formData.customOutcomes.length > 0 && (
                <div className={styles.tagList}>
                  {formData.customOutcomes.map((outcome, index) => (
                    <span key={index} className={styles.tag}>
                      {outcome}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className={styles.selectedCount}>
              <strong>{formData.desiredOutcomes.length}</strong> outcomes selected
            </div>
          </div>
        );

      case 4:
        return (
          <div className={styles.stepContent}>
            <h3>Current Status</h3>
            <p className={styles.stepDescription}>
              Provide information about your child&apos;s current situation.
            </p>

            <div className={styles.formGroup}>
              <label>Recent Evaluations</label>
              <div className={styles.addItemRow}>
                <input
                  type="text"
                  value={newEvaluation}
                  onChange={(e) => setNewEvaluation(e.target.value)}
                  placeholder="e.g., Psychological Evaluation (March 2024)"
                  className={styles.input}
                  onKeyPress={(e) => e.key === 'Enter' && addEvaluation()}
                />
                <button type="button" onClick={addEvaluation} className={styles.addButton}>
                  Add
                </button>
              </div>
              {formData.recentEvaluations.length > 0 && (
                <div className={styles.tagList}>
                  {formData.recentEvaluations.map((eval_, index) => (
                    <span key={index} className={styles.tag}>
                      {eval_}
                      <button
                        type="button"
                        onClick={() => removeEvaluation(index)}
                        className={styles.tagRemove}
                      >
                        &times;
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="currentServices">Current Services</label>
              <textarea
                id="currentServices"
                value={formData.currentServices}
                onChange={(e) =>
                  setFormData({ ...formData, currentServices: e.target.value })
                }
                placeholder="List current services (e.g., Speech therapy 2x/week, Resource room for math)"
                className={styles.textarea}
                rows={3}
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="whatsWorking">What&apos;s Working</label>
              <textarea
                id="whatsWorking"
                value={formData.whatsWorking}
                onChange={(e) =>
                  setFormData({ ...formData, whatsWorking: e.target.value })
                }
                placeholder="What strategies or supports are helping your child?"
                className={styles.textarea}
                rows={3}
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="whatsNotWorking">What&apos;s Not Working</label>
              <textarea
                id="whatsNotWorking"
                value={formData.whatsNotWorking}
                onChange={(e) =>
                  setFormData({ ...formData, whatsNotWorking: e.target.value })
                }
                placeholder="What challenges or gaps have you observed?"
                className={styles.textarea}
                rows={3}
              />
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className={styles.container}>
      {/* Progress Steps */}
      <div className={styles.progressBar}>
        {STEPS.map((step) => (
          <div
            key={step.id}
            className={`${styles.progressStep} ${
              step.id === currentStep
                ? styles.active
                : step.id < currentStep
                ? styles.completed
                : ''
            }`}
          >
            <div className={styles.stepNumber}>{step.id}</div>
            <div className={styles.stepInfo}>
              <span className={styles.stepTitle}>{step.title}</span>
              <span className={styles.stepDesc}>{step.description}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Form Content */}
      <div className={styles.formContainer}>{renderStep()}</div>

      {/* Navigation Buttons */}
      <div className={styles.navigation}>
        <button
          type="button"
          onClick={onCancel}
          className={styles.cancelButton}
          disabled={isLoading}
        >
          Cancel
        </button>

        <div className={styles.navButtons}>
          {currentStep > 1 && (
            <button
              type="button"
              onClick={handleBack}
              className={styles.backButton}
              disabled={isLoading}
            >
              Back
            </button>
          )}

          {currentStep < STEPS.length ? (
            <button
              type="button"
              onClick={handleNext}
              className={styles.nextButton}
              disabled={currentStep === 1 && !formData.meetingDate}
            >
              Next
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              className={styles.submitButton}
              disabled={isLoading || formData.concerns.length === 0}
            >
              {isLoading ? 'Generating...' : 'Generate Materials'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default GuideIntake;
