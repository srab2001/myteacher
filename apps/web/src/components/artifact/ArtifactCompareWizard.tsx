'use client';

import { useState, useRef } from 'react';
import { format } from 'date-fns';
import { api, ArtifactComparison } from '@/lib/api';
import styles from './ArtifactCompareWizard.module.css';

export type PlanTypeCode = 'IEP' | 'FIVE_OH_FOUR' | 'BEHAVIOR_PLAN';

export interface ArtifactCompareWizardProps {
  studentId: string;
  planId: string;
  planTypeCode: PlanTypeCode;
  studentName: string;
  isOpen: boolean;
  onClose: () => void;
}

type WizardStep = 'details' | 'upload' | 'results';

export function ArtifactCompareWizard({
  planId,
  planTypeCode,
  studentName,
  isOpen,
  onClose,
}: ArtifactCompareWizardProps) {
  const [currentStep, setCurrentStep] = useState<WizardStep>('details');
  const [artifactDate, setArtifactDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [description, setDescription] = useState('');
  const [baselineFile, setBaselineFile] = useState<File | null>(null);
  const [compareFile, setCompareFile] = useState<File | null>(null);
  const [comparison, setComparison] = useState<ArtifactComparison | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const baselineInputRef = useRef<HTMLInputElement>(null);
  const compareInputRef = useRef<HTMLInputElement>(null);

  const planTypeLabel = planTypeCode === 'FIVE_OH_FOUR' ? '504' : planTypeCode.replace('_', ' ');

  const resetWizard = () => {
    setCurrentStep('details');
    setArtifactDate(format(new Date(), 'yyyy-MM-dd'));
    setDescription('');
    setBaselineFile(null);
    setCompareFile(null);
    setComparison(null);
    setError(null);
  };

  const handleClose = () => {
    resetWizard();
    onClose();
  };

  const handleNextFromDetails = () => {
    if (!artifactDate) {
      setError('Please select an artifact date');
      return;
    }
    setError(null);
    setCurrentStep('upload');
  };

  const handleUploadAndContinue = async () => {
    if (!baselineFile || !compareFile) {
      setError('Please upload both baseline and compare files');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await api.createArtifactComparison(planId, {
        artifactDate,
        description: description || undefined,
        baselineFile,
        compareFile,
      });
      setComparison(result);
      setCurrentStep('results');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload artifacts');
    } finally {
      setLoading(false);
    }
  };

  const handleRunCompare = async () => {
    if (!comparison) return;

    setLoading(true);
    setError(null);

    try {
      const result = await api.runArtifactComparison(planId, comparison.id);
      setComparison(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to run comparison');
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    setter: (file: File | null) => void
  ) => {
    const file = e.target.files?.[0];
    if (file) {
      setter(file);
    }
  };

  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={handleClose}>
      <div className={styles.wizard} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2>Artifact Compare</h2>
          <button className={styles.closeBtn} onClick={handleClose}>
            &times;
          </button>
        </div>

        {/* Step Indicator */}
        <div className={styles.steps}>
          <div className={`${styles.step} ${currentStep === 'details' ? styles.active : ''} ${currentStep !== 'details' ? styles.completed : ''}`}>
            <span className={styles.stepNum}>1</span>
            <span className={styles.stepLabel}>Details</span>
          </div>
          <div className={styles.stepLine} />
          <div className={`${styles.step} ${currentStep === 'upload' ? styles.active : ''} ${currentStep === 'results' ? styles.completed : ''}`}>
            <span className={styles.stepNum}>2</span>
            <span className={styles.stepLabel}>Upload</span>
          </div>
          <div className={styles.stepLine} />
          <div className={`${styles.step} ${currentStep === 'results' ? styles.active : ''}`}>
            <span className={styles.stepNum}>3</span>
            <span className={styles.stepLabel}>Results</span>
          </div>
        </div>

        <div className={styles.content}>
          {error && <div className={styles.error}>{error}</div>}

          {/* Step 1: Details */}
          {currentStep === 'details' && (
            <div className={styles.stepContent}>
              <div className={styles.field}>
                <label className={styles.label}>Artifact Date *</label>
                <input
                  type="date"
                  className="form-input"
                  value={artifactDate}
                  onChange={(e) => setArtifactDate(e.target.value)}
                />
              </div>

              <div className={styles.field}>
                <label className={styles.label}>Student Name</label>
                <input
                  type="text"
                  className="form-input"
                  value={studentName}
                  readOnly
                  disabled
                />
              </div>

              <div className={styles.field}>
                <label className={styles.label}>Plan Type</label>
                <input
                  type="text"
                  className="form-input"
                  value={planTypeLabel}
                  readOnly
                  disabled
                />
              </div>

              <div className={styles.field}>
                <label className={styles.label}>Description</label>
                <textarea
                  className="form-textarea"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe what this artifact comparison is for..."
                  rows={3}
                />
              </div>

              <div className={styles.actions}>
                <button className="btn btn-outline" onClick={handleClose}>
                  Cancel
                </button>
                <button className="btn btn-primary" onClick={handleNextFromDetails}>
                  Next: Upload Files
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Upload */}
          {currentStep === 'upload' && (
            <div className={styles.stepContent}>
              <p className={styles.uploadInstructions}>
                Upload both the baseline artifact (what the work should look like) and the compare artifact (what the student created).
              </p>

              <div className={styles.uploadGrid}>
                <div className={styles.uploadBox}>
                  <h4>Baseline Artifact</h4>
                  <p className={styles.uploadDesc}>What the work should look like</p>
                  <input
                    ref={baselineInputRef}
                    type="file"
                    accept=".pdf,.doc,.docx,.txt,.md,.rtf"
                    onChange={(e) => handleFileChange(e, setBaselineFile)}
                    style={{ display: 'none' }}
                  />
                  {baselineFile ? (
                    <div className={styles.fileSelected}>
                      <span className={styles.fileName}>{baselineFile.name}</span>
                      <button
                        type="button"
                        className={styles.removeFile}
                        onClick={() => setBaselineFile(null)}
                      >
                        &times;
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      className="btn btn-outline"
                      onClick={() => baselineInputRef.current?.click()}
                    >
                      Choose File
                    </button>
                  )}
                </div>

                <div className={styles.uploadBox}>
                  <h4>Compare Artifact</h4>
                  <p className={styles.uploadDesc}>What the student created</p>
                  <input
                    ref={compareInputRef}
                    type="file"
                    accept=".pdf,.doc,.docx,.txt,.md,.rtf"
                    onChange={(e) => handleFileChange(e, setCompareFile)}
                    style={{ display: 'none' }}
                  />
                  {compareFile ? (
                    <div className={styles.fileSelected}>
                      <span className={styles.fileName}>{compareFile.name}</span>
                      <button
                        type="button"
                        className={styles.removeFile}
                        onClick={() => setCompareFile(null)}
                      >
                        &times;
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      className="btn btn-outline"
                      onClick={() => compareInputRef.current?.click()}
                    >
                      Choose File
                    </button>
                  )}
                </div>
              </div>

              <p className={styles.fileNote}>
                Supported formats: PDF, DOC, DOCX, TXT, MD, RTF
              </p>

              <div className={styles.actions}>
                <button
                  className="btn btn-outline"
                  onClick={() => setCurrentStep('details')}
                  disabled={loading}
                >
                  Back
                </button>
                <button
                  className="btn btn-primary"
                  onClick={handleUploadAndContinue}
                  disabled={loading || !baselineFile || !compareFile}
                >
                  {loading ? 'Uploading...' : 'Upload & Continue'}
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Results */}
          {currentStep === 'results' && comparison && (
            <div className={styles.stepContent}>
              <div className={styles.resultsSummary}>
                <div className={styles.summaryItem}>
                  <span className={styles.summaryLabel}>Date:</span>
                  <span>{format(new Date(comparison.artifactDate), 'MMM d, yyyy')}</span>
                </div>
                {comparison.description && (
                  <div className={styles.summaryItem}>
                    <span className={styles.summaryLabel}>Description:</span>
                    <span>{comparison.description}</span>
                  </div>
                )}
                <div className={styles.summaryItem}>
                  <span className={styles.summaryLabel}>Baseline File:</span>
                  <span>{baselineFile?.name || 'Uploaded'}</span>
                </div>
                <div className={styles.summaryItem}>
                  <span className={styles.summaryLabel}>Compare File:</span>
                  <span>{compareFile?.name || 'Uploaded'}</span>
                </div>
              </div>

              {!comparison.analysisText && (
                <div className={styles.comparePrompt}>
                  <p>Files uploaded successfully. Click the button below to run the AI comparison.</p>
                  <button
                    className="btn btn-primary"
                    onClick={handleRunCompare}
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <span className={styles.spinner} />
                        Analyzing...
                      </>
                    ) : (
                      'Run Compare'
                    )}
                  </button>
                </div>
              )}

              {comparison.analysisText && (
                <div className={styles.analysisSection}>
                  <h4>Comparison Analysis</h4>
                  <textarea
                    className={styles.analysisText}
                    value={comparison.analysisText}
                    readOnly
                    rows={12}
                  />
                </div>
              )}

              <div className={styles.actions}>
                <button className="btn btn-outline" onClick={handleClose}>
                  Close
                </button>
                {comparison.analysisText && (
                  <button
                    className="btn btn-secondary"
                    onClick={handleRunCompare}
                    disabled={loading}
                  >
                    {loading ? 'Re-analyzing...' : 'Re-run Compare'}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
