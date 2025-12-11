'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { format } from 'date-fns';
import { useAuth } from '@/lib/auth-context';
import { api, Plan, PriorPlanDocument } from '@/lib/api';
import { DictationTextArea } from '@/components/forms/DictationTextArea';
import { ArtifactCompareWizard } from '@/components/artifact/ArtifactCompareWizard';
import { ArtifactComparesSection } from '@/components/artifact/ArtifactComparesSection';
import styles from '../iep/page.module.css';

export default function FiveOhFourInterviewPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const planId = params.planId as string;
  const studentId = params.id as string;

  const [plan, setPlan] = useState<Plan | null>(null);
  const [priorPlans, setPriorPlans] = useState<PriorPlanDocument[]>([]);
  const [showStartStep, setShowStartStep] = useState(true);
  const [currentSection, setCurrentSection] = useState(0);
  const [formData, setFormData] = useState<Record<string, unknown>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingPlan, setLoadingPlan] = useState(true);
  const [generationAvailable, setGenerationAvailable] = useState(false);
  const [, setGeneratingSections] = useState<string[]>([]);
  const [generatingFields, setGeneratingFields] = useState<Set<string>>(new Set());
  const [artifactWizardOpen, setArtifactWizardOpen] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/');
    }
  }, [user, loading, router]);

  const loadPlan = useCallback(async () => {
    try {
      const [planRes, priorPlansRes] = await Promise.all([
        api.getPlan(planId),
        api.getStudentPriorPlans(studentId),
      ]);
      setPlan(planRes.plan);
      setFormData(planRes.plan.fieldValues || {});

      // Filter prior plans to show only 504 plans
      const prior504Plans = priorPlansRes.priorPlans.filter(
        (p: PriorPlanDocument) => p.planType === 'FIVE_OH_FOUR'
      );
      setPriorPlans(prior504Plans);

      // If plan already has data or no prior plans exist, skip start step
      if (Object.keys(planRes.plan.fieldValues || {}).length > 0 || prior504Plans.length === 0) {
        setShowStartStep(false);
      }
    } catch (err) {
      console.error('Failed to load plan:', err);
      setError('Failed to load plan');
    } finally {
      setLoadingPlan(false);
    }
  }, [planId, studentId]);

  useEffect(() => {
    if (user?.isOnboarded && planId) {
      loadPlan();
    }
  }, [user, planId, loadPlan]);

  // Check generation availability
  useEffect(() => {
    const checkGeneration = async () => {
      try {
        const result = await api.getGenerationAvailability(planId);
        setGenerationAvailable(result.available);
        setGeneratingSections(result.sections);
      } catch (err) {
        setGenerationAvailable(false);
      }
    };

    if (planId) {
      checkGeneration();
    }
  }, [planId]);

  const handleGenerateDraft = async (sectionKey: string, fieldKey: string) => {
    setGeneratingFields(prev => new Set(prev).add(fieldKey));

    try {
      const result = await api.generateDraft(planId, sectionKey, fieldKey);
      if (result.text) {
        setFormData(prev => ({ ...prev, [fieldKey]: result.text }));
      }
    } catch (err) {
      console.error('Generation failed:', err);
    } finally {
      setGeneratingFields(prev => {
        const next = new Set(prev);
        next.delete(fieldKey);
        return next;
      });
    }
  };

  const handleStartBlank = () => {
    setShowStartStep(false);
  };

  const sections = plan?.schema?.fields?.sections || [];
  const currentSectionData = sections[currentSection];

  const handleFieldChange = (fieldKey: string, value: unknown) => {
    setFormData(prev => ({ ...prev, [fieldKey]: value }));
  };

  const handleSave = async () => {
    if (!plan) return;
    setSaving(true);
    setError(null);

    try {
      await api.updatePlanFields(plan.id, formData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleNext = async () => {
    await handleSave();
    if (currentSection < sections.length - 1) {
      setCurrentSection(currentSection + 1);
    }
  };

  const handleBack = () => {
    if (currentSection > 0) {
      setCurrentSection(currentSection - 1);
    }
  };

  const handleFinalize = async () => {
    if (!plan) return;
    setSaving(true);
    setError(null);

    try {
      await handleSave();
      await api.finalizePlan(plan.id);
      router.push(`/students/${studentId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to finalize');
    } finally {
      setSaving(false);
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

  // Start Step - Show prior plans option
  if (showStartStep && priorPlans.length > 0) {
    return (
      <div className={styles.container}>
        <header className={styles.header}>
          <button className={styles.backBtn} onClick={() => router.push(`/students/${studentId}`)}>
            ← Back to Student
          </button>
          <div className={styles.headerInfo}>
            <h1>504 Plan: {plan.student.firstName} {plan.student.lastName}</h1>
            <span className={styles.status}>{plan.status}</span>
            <button
              className="btn btn-outline btn-sm"
              onClick={() => setArtifactWizardOpen(true)}
              style={{ marginLeft: 'auto' }}
            >
              Artifact Compare
            </button>
          </div>
        </header>

        <div className={styles.startStep}>
          <h2>Getting Started</h2>
          <p>This student has prior 504 plan documents on file. You can review them before starting your new plan.</p>

          <div className={styles.startOptions}>
            <div className={styles.startOption}>
              <h3>Start Blank</h3>
              <p>Begin with an empty 504 plan form.</p>
              <button className="btn btn-primary" onClick={handleStartBlank}>
                Start Blank 504 Plan
              </button>
            </div>

            <div className={styles.startOption}>
              <h3>Review Prior 504 Plans</h3>
              <p>Download and review previous 504 plans before starting.</p>
              <div className={styles.priorPlansList}>
                {priorPlans.map(priorPlan => (
                  <div key={priorPlan.id} className={styles.priorPlanItem}>
                    <div className={styles.priorPlanInfo}>
                      <span className={styles.priorPlanFile}>{priorPlan.fileName}</span>
                      {priorPlan.planDate && (
                        <span className={styles.priorPlanDate}>
                          Plan Date: {format(new Date(priorPlan.planDate), 'MMM d, yyyy')}
                        </span>
                      )}
                      {priorPlan.notes && (
                        <span className={styles.priorPlanNotes}>{priorPlan.notes}</span>
                      )}
                    </div>
                    <a
                      href={api.getPriorPlanDownloadUrl(priorPlan.id)}
                      className="btn btn-outline btn-sm"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Download
                    </a>
                  </div>
                ))}
              </div>
              <button className="btn btn-secondary" onClick={handleStartBlank} style={{ marginTop: '1rem' }}>
                Continue to 504 Plan Form
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <button className={styles.backBtn} onClick={() => router.push(`/students/${studentId}`)}>
          ← Back to Student
        </button>
        <div className={styles.headerInfo}>
          <h1>504 Plan: {plan.student.firstName} {plan.student.lastName}</h1>
          <span className={styles.status}>{plan.status}</span>
          <button
            className="btn btn-outline btn-sm"
            onClick={() => setArtifactWizardOpen(true)}
            style={{ marginLeft: 'auto' }}
          >
            Artifact Compare
          </button>
        </div>
      </header>

      <div className={styles.layout}>
        {/* Section Navigation */}
        <nav className={styles.sidebar}>
          <h3>Sections</h3>
          <ul className={styles.sectionList}>
            {sections.map((section, index) => (
              <li key={section.key}>
                <button
                  className={`${styles.sectionBtn} ${index === currentSection ? styles.active : ''}`}
                  onClick={() => setCurrentSection(index)}
                >
                  <span className={styles.sectionNum}>{index + 1}</span>
                  {section.title}
                </button>
              </li>
            ))}
          </ul>
        </nav>

        {/* Main Content */}
        <main className={styles.main}>
          {currentSectionData && (
            <div className={styles.section}>
              <h2>{currentSectionData.title}</h2>

              <div className={styles.fields}>
                {currentSectionData.fields.map(field => (
                  <div key={field.key} className={styles.field}>
                    <label className={styles.label}>
                      {field.label}
                      {field.required && <span className={styles.required}>*</span>}
                    </label>

                    {field.type === 'text' && (
                      <input
                        type="text"
                        className="form-input"
                        value={(formData[field.key] as string) || ''}
                        onChange={e => handleFieldChange(field.key, e.target.value)}
                        placeholder={field.placeholder}
                      />
                    )}

                    {field.type === 'date' && (
                      <input
                        type="date"
                        className="form-input"
                        value={(formData[field.key] as string) || ''}
                        onChange={e => handleFieldChange(field.key, e.target.value)}
                      />
                    )}

                    {field.type === 'select' && (
                      <select
                        className="form-select"
                        value={(formData[field.key] as string) || ''}
                        onChange={e => handleFieldChange(field.key, e.target.value)}
                      >
                        <option value="">Select...</option>
                        {field.options?.map(opt => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    )}

                    {field.type === 'textarea' && (
                      <div className={styles.textareaWrapper}>
                        {generationAvailable && (
                          <div className={styles.textareaHeader}>
                            <button
                              type="button"
                              className={styles.generateBtn}
                              onClick={() => handleGenerateDraft(currentSectionData.key, field.key)}
                              disabled={generatingFields.has(field.key)}
                            >
                              {generatingFields.has(field.key) ? (
                                <>
                                  <span className={styles.generateSpinner} />
                                  Generating...
                                </>
                              ) : (
                                <>
                                  <span className={styles.sparkle}>&#10024;</span>
                                  Generate Draft
                                </>
                              )}
                            </button>
                          </div>
                        )}
                        <DictationTextArea
                          value={(formData[field.key] as string) || ''}
                          onChange={(value) => handleFieldChange(field.key, value)}
                          placeholder={field.placeholder}
                          rows={5}
                        />
                      </div>
                    )}

                    {field.type === 'boolean' && (
                      <div className={styles.checkboxField}>
                        <input
                          type="checkbox"
                          id={field.key}
                          checked={(formData[field.key] as boolean) || false}
                          onChange={e => handleFieldChange(field.key, e.target.checked)}
                        />
                        <label htmlFor={field.key}>{field.label}</label>
                      </div>
                    )}

                    {field.description && (
                      <p className={styles.fieldDesc}>{field.description}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {error && <div className={styles.errorMsg}>{error}</div>}

          <div className={styles.actions}>
            <button
              className="btn btn-outline"
              onClick={handleBack}
              disabled={currentSection === 0}
            >
              ← Back
            </button>

            <div className={styles.actionRight}>
              <button
                className="btn btn-secondary"
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? 'Saving...' : 'Save'}
              </button>

              {currentSection < sections.length - 1 ? (
                <button
                  className="btn btn-primary"
                  onClick={handleNext}
                  disabled={saving}
                >
                  Next →
                </button>
              ) : (
                <button
                  className="btn btn-primary"
                  onClick={handleFinalize}
                  disabled={saving || plan.status !== 'DRAFT'}
                >
                  {saving ? 'Finalizing...' : 'Finalize 504 Plan'}
                </button>
              )}
            </div>
          </div>
        </main>
      </div>

      {/* Print View Link and PDF Download */}
      <div className={styles.printLink}>
        <a
          href={api.get504PdfUrl(studentId, planId)}
          className="btn btn-primary"
          style={{ marginRight: '0.5rem' }}
        >
          Download 504 PDF
        </a>
        <button
          className="btn btn-outline"
          onClick={() => router.push(`/students/${studentId}/plans/${planId}/print`)}
        >
          View Printable 504 Plan
        </button>
      </div>

      {/* Artifact Comparisons Section */}
      <div className={styles.artifactComparesContainer}>
        <div className={styles.artifactComparesSection}>
          <h2>Artifact Compares</h2>

          <div className={styles.artifactSubsection}>
            <h3>This Plan</h3>
            <ArtifactComparesSection planId={planId} />
          </div>

          <div className={styles.artifactSubsection}>
            <h3>All Student Comparisons</h3>
            <ArtifactComparesSection studentId={studentId} showPlanInfo={true} />
          </div>
        </div>
      </div>

      {/* Artifact Compare Wizard */}
      <ArtifactCompareWizard
        studentId={studentId}
        planId={planId}
        planTypeCode="FIVE_OH_FOUR"
        studentName={`${plan.student.firstName} ${plan.student.lastName}`}
        isOpen={artifactWizardOpen}
        onClose={() => setArtifactWizardOpen(false)}
      />
    </div>
  );
}
