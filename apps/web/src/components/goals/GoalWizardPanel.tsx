'use client';

import { useState, useEffect, useRef } from 'react';
import { format } from 'date-fns';
import {
  api,
  GoalArea,
  GoalDraft,
  GoalTemplate,
  PresentLevelData,
  PresentLevelsHelpers,
  ValidationResult,
  ArtifactComparison,
} from '@/lib/api';
import styles from './GoalWizardPanel.module.css';

interface GoalWizardPanelProps {
  planId: string;
  studentId: string;
  studentGrade?: string;
  availableArtifacts?: ArtifactComparison[];
  onClose: () => void;
  onGoalCreated: (goalId: string) => void;
}

type WizardStep = 'area' | 'context' | 'draft' | 'review';

const GOAL_AREAS: Array<{ value: GoalArea; label: string; icon: string }> = [
  { value: 'READING', label: 'Reading', icon: '📖' },
  { value: 'WRITING', label: 'Writing', icon: '✏️' },
  { value: 'MATH', label: 'Math', icon: '🔢' },
  { value: 'COMMUNICATION', label: 'Communication', icon: '💬' },
  { value: 'SOCIAL_EMOTIONAL', label: 'Social-Emotional', icon: '❤️' },
  { value: 'BEHAVIOR', label: 'Behavior', icon: '🎯' },
  { value: 'MOTOR_SKILLS', label: 'Motor Skills', icon: '🏃' },
  { value: 'DAILY_LIVING', label: 'Daily Living', icon: '🏠' },
  { value: 'VOCATIONAL', label: 'Vocational', icon: '💼' },
];

const STEPS: Array<{ key: WizardStep; label: string }> = [
  { key: 'area', label: 'Select Area' },
  { key: 'context', label: 'Present Levels' },
  { key: 'draft', label: 'Create Goal' },
  { key: 'review', label: 'Review' },
];

export function GoalWizardPanel({
  planId,
  studentId,
  studentGrade,
  availableArtifacts = [],
  onClose,
  onGoalCreated,
}: GoalWizardPanelProps) {
  const [currentStep, setCurrentStep] = useState<WizardStep>('area');
  const [selectedArea, setSelectedArea] = useState<GoalArea | null>(null);
  const [selectedArtifacts, setSelectedArtifacts] = useState<string[]>([]);

  // Present Levels State
  const [helpers, setHelpers] = useState<PresentLevelsHelpers | null>(null);
  const [presentLevels, setPresentLevels] = useState<PresentLevelData | null>(null);
  const [loadingHelpers, setLoadingHelpers] = useState(false);
  const [generatingLevels, setGeneratingLevels] = useState(false);

  // Draft State
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([]);
  const [chatInput, setChatInput] = useState('');
  const [currentDraft, setCurrentDraft] = useState<GoalDraft | null>(null);
  const [loadingChat, setLoadingChat] = useState(false);
  const [templates, setTemplates] = useState<GoalTemplate[]>([]);

  // Validation State
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [validating, setValidating] = useState(false);
  const [saving, setSaving] = useState(false);

  const chatEndRef = useRef<HTMLDivElement>(null);

  // Load helpers when area is selected
  useEffect(() => {
    if (selectedArea) {
      loadHelpers();
    }
  }, [selectedArea]);

  // Scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const loadHelpers = async () => {
    if (!selectedArea) return;
    setLoadingHelpers(true);
    try {
      const [helpersResult, templatesResult] = await Promise.all([
        api.getPresentLevelsHelpers(studentId, selectedArea),
        api.getGoalTemplates(selectedArea, studentGrade ? getGradeBand(studentGrade) : undefined),
      ]);
      setHelpers(helpersResult);
      setTemplates(
        Array.isArray(templatesResult.templates)
          ? templatesResult.templates
          : (templatesResult.templates[selectedArea] as GoalTemplate[]) || []
      );
    } catch (error) {
      console.error('Failed to load helpers:', error);
    } finally {
      setLoadingHelpers(false);
    }
  };

  const generatePresentLevels = async () => {
    if (!selectedArea) return;
    setGeneratingLevels(true);
    try {
      const result = await api.generatePresentLevels(studentId, selectedArea, planId);
      setPresentLevels(result);
    } catch (error) {
      console.error('Failed to generate present levels:', error);
    } finally {
      setGeneratingLevels(false);
    }
  };

  const startWizardSession = async () => {
    if (!selectedArea) return;
    setLoadingChat(true);
    try {
      const result = await api.startWizardSession(planId, selectedArea, selectedArtifacts);
      setSessionId(result.sessionId);
      setChatMessages([{ role: 'assistant', content: result.message }]);
    } catch (error) {
      console.error('Failed to start wizard session:', error);
    } finally {
      setLoadingChat(false);
    }
  };

  const sendMessage = async () => {
    if (!sessionId || !chatInput.trim()) return;
    const message = chatInput.trim();
    setChatInput('');
    setChatMessages((prev) => [...prev, { role: 'user', content: message }]);
    setLoadingChat(true);

    try {
      const result = await api.sendWizardMessage(sessionId, message);
      setChatMessages((prev) => [...prev, { role: 'assistant', content: result.response }]);
      if (result.currentDraft) {
        setCurrentDraft(result.currentDraft);
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      setChatMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'Sorry, something went wrong. Please try again.' },
      ]);
    } finally {
      setLoadingChat(false);
    }
  };

  const generateDraft = async (userPrompt?: string) => {
    if (!selectedArea) return;
    setLoadingChat(true);
    try {
      const result = await api.generateGoalDraft({
        planId,
        goalArea: selectedArea,
        userPrompt,
        linkedArtifactIds: selectedArtifacts,
        presentLevels: presentLevels
          ? {
              currentPerformance: presentLevels.currentPerformance,
              strengthsNoted: presentLevels.strengthsNoted,
              challengesNoted: presentLevels.challengesNoted,
              recentProgress: presentLevels.recentProgress,
              dataSourceSummary: presentLevels.dataSourceSummary,
            }
          : undefined,
      });
      setCurrentDraft(result.draft);
    } catch (error) {
      console.error('Failed to generate draft:', error);
    } finally {
      setLoadingChat(false);
    }
  };

  const validateDraft = async () => {
    if (!currentDraft || !selectedArea) return;
    setValidating(true);
    try {
      const result = await api.validateGoalWithAI({
        annualGoalText: currentDraft.annualGoalText,
        area: selectedArea,
        objectives: currentDraft.objectives.map((o) => ({
          objectiveText: o.objectiveText,
          measurementCriteria: o.measurementCriteria,
        })),
        baselineDescription: currentDraft.baselineDescription,
        studentGrade,
      });
      setValidation(result);
    } catch (error) {
      console.error('Failed to validate:', error);
    } finally {
      setValidating(false);
    }
  };

  const saveGoal = async () => {
    if (!currentDraft || !selectedArea) return;
    setSaving(true);
    try {
      // Generate a goal code (e.g., G1, G2, etc.)
      const existingGoals = await api.getPlanGoals(planId);
      const nextNumber = (existingGoals.goals?.length || 0) + 1;
      const goalCode = `G${nextNumber}`;

      // Create goal directly using the goals API
      const result = await api.createGoal(planId, {
        goalCode,
        area: selectedArea,
        annualGoalText: currentDraft.annualGoalText,
        baselineJson: {
          description: currentDraft.baselineDescription,
          measurementMethod: currentDraft.measurementMethod,
          rationale: currentDraft.rationale,
          comarReference: currentDraft.comarReference,
        },
        shortTermObjectives: currentDraft.objectives.map(obj => obj.objectiveText),
        progressSchedule: currentDraft.progressSchedule as 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'quarterly',
      });

      onGoalCreated(result.goal.id);
    } catch (error) {
      console.error('Failed to save goal:', error);
      // Show error to user
      alert('Failed to save goal. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const getStepIndex = (step: WizardStep): number => STEPS.findIndex((s) => s.key === step);

  const goToStep = (step: WizardStep) => {
    if (step === 'context' && !selectedArea) return;
    if (step === 'draft' && !selectedArea) return;
    if (step === 'review' && !currentDraft) return;
    setCurrentStep(step);
  };

  const handleNext = async () => {
    switch (currentStep) {
      case 'area':
        if (selectedArea) {
          setCurrentStep('context');
        }
        break;
      case 'context':
        setCurrentStep('draft');
        if (!sessionId) {
          await startWizardSession();
        }
        break;
      case 'draft':
        if (currentDraft) {
          setCurrentStep('review');
          await validateDraft();
        }
        break;
      case 'review':
        await saveGoal();
        break;
    }
  };

  const handleBack = () => {
    switch (currentStep) {
      case 'context':
        setCurrentStep('area');
        break;
      case 'draft':
        setCurrentStep('context');
        break;
      case 'review':
        setCurrentStep('draft');
        break;
    }
  };

  const toggleArtifact = (id: string) => {
    setSelectedArtifacts((prev) =>
      prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]
    );
  };

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <h2>Goal Wizard</h2>
        <button className={styles.closeBtn} onClick={onClose}>
          &times;
        </button>
      </div>

      {/* Step Navigation */}
      <div className={styles.steps}>
        {STEPS.map((step, index) => (
          <div
            key={step.key}
            className={`${styles.step} ${currentStep === step.key ? styles.active : ''} ${
              getStepIndex(currentStep) > index ? styles.completed : ''
            }`}
            onClick={() => goToStep(step.key)}
          >
            <div className={styles.stepNumber}>
              {getStepIndex(currentStep) > index ? '✓' : index + 1}
            </div>
            <span className={styles.stepLabel}>{step.label}</span>
          </div>
        ))}
      </div>

      {/* Content */}
      <div className={styles.content}>
        {currentStep === 'area' && (
          <div>
            <p style={{ marginBottom: '1rem', color: '#666' }}>
              Select the goal area you want to create a goal for:
            </p>
            <div className={styles.areaGrid}>
              {GOAL_AREAS.map((area) => (
                <button
                  key={area.value}
                  className={`${styles.areaButton} ${selectedArea === area.value ? styles.selected : ''}`}
                  onClick={() => setSelectedArea(area.value)}
                >
                  <span className={styles.areaIcon}>{area.icon}</span>
                  <span className={styles.areaLabel}>{area.label}</span>
                </button>
              ))}
            </div>

            {/* Artifact Selection */}
            {availableArtifacts.length > 0 && (
              <div className={styles.artifactSelection}>
                <h4>Link Artifact Comparisons (Optional)</h4>
                <div className={styles.artifactCheckboxes}>
                  {availableArtifacts.map((artifact) => (
                    <label key={artifact.id} className={styles.artifactCheckbox}>
                      <input
                        type="checkbox"
                        checked={selectedArtifacts.includes(artifact.id)}
                        onChange={() => toggleArtifact(artifact.id)}
                      />
                      <div className={styles.artifactInfo}>
                        <span className={styles.artifactDate}>
                          {format(new Date(artifact.artifactDate), 'MMM d, yyyy')}
                        </span>
                        {artifact.description && (
                          <span className={styles.artifactDesc}>{artifact.description}</span>
                        )}
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {currentStep === 'context' && (
          <div className={styles.presentLevelsSection}>
            {loadingHelpers ? (
              <div className={styles.loading}>
                <div className={styles.spinner} />
                <span>Loading student context...</span>
              </div>
            ) : (
              <>
                {/* Status Summary */}
                {helpers && Object.keys(helpers.statusSummary).length > 0 && (
                  <div className={styles.helperCard}>
                    <h4>Recent Status Updates</h4>
                    <div className={styles.statusSummary}>
                      {Object.entries(helpers.statusSummary).map(([scope, data]) => (
                        <span key={scope} className={`${styles.statusBadge} ${styles[data.latestCode]}`}>
                          {scope}: {data.latestCode.replace('_', ' ')}
                        </span>
                      ))}
                    </div>
                    {helpers.progressTrend && (
                      <p style={{ marginTop: '0.5rem' }}>{helpers.progressTrend}</p>
                    )}
                  </div>
                )}

                {/* Artifact Highlights */}
                {helpers && helpers.artifactHighlights.length > 0 && (
                  <div className={styles.helperCard}>
                    <h4>Recent Artifact Analyses</h4>
                    {helpers.artifactHighlights.map((highlight, i) => (
                      <p key={i}>
                        <strong>{highlight.date}:</strong> {highlight.summary}
                      </p>
                    ))}
                  </div>
                )}

                {/* Generate Present Levels */}
                <button
                  className={`btn btn-primary ${styles.generateBtn}`}
                  onClick={generatePresentLevels}
                  disabled={generatingLevels}
                >
                  {generatingLevels ? (
                    <>
                      <div className={styles.spinner} style={{ width: 16, height: 16 }} />
                      Generating...
                    </>
                  ) : (
                    'Generate Present Levels with AI'
                  )}
                </button>

                {/* Generated Present Levels */}
                {presentLevels && (
                  <div className={styles.generatedContent}>
                    <h4>Current Performance</h4>
                    <p>{presentLevels.currentPerformance}</p>

                    {presentLevels.strengthsNoted.length > 0 && (
                      <>
                        <h4 style={{ marginTop: '1rem' }}>Strengths</h4>
                        <ul className={styles.listItems}>
                          {presentLevels.strengthsNoted.map((s, i) => (
                            <li key={i}>{s}</li>
                          ))}
                        </ul>
                      </>
                    )}

                    {presentLevels.challengesNoted.length > 0 && (
                      <>
                        <h4 style={{ marginTop: '1rem' }}>Challenges</h4>
                        <ul className={styles.listItems}>
                          {presentLevels.challengesNoted.map((c, i) => (
                            <li key={i}>{c}</li>
                          ))}
                        </ul>
                      </>
                    )}

                    {presentLevels.recentProgress && (
                      <>
                        <h4 style={{ marginTop: '1rem' }}>Recent Progress</h4>
                        <p>{presentLevels.recentProgress}</p>
                      </>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {currentStep === 'draft' && (
          <div className={styles.chatContainer}>
            {/* Template Library */}
            {templates.length > 0 && !currentDraft && (
              <div className={styles.templateLibrary}>
                <h4>Goal Templates (COMAR-aligned)</h4>
                {templates.slice(0, 3).map((template, i) => (
                  <div
                    key={i}
                    className={styles.templateItem}
                    onClick={() => generateDraft(`Use this template: ${template.template}`)}
                  >
                    <div className={styles.templateText}>{template.template}</div>
                    <div className={styles.templateRef}>{template.comarRef}</div>
                  </div>
                ))}
              </div>
            )}

            {/* Chat Messages */}
            <div className={styles.chatMessages}>
              {chatMessages.map((msg, i) => (
                <div key={i} className={`${styles.chatMessage} ${styles[msg.role]}`}>
                  {msg.content}
                </div>
              ))}
              {loadingChat && (
                <div className={`${styles.chatMessage} ${styles.assistant}`}>
                  <div className={styles.spinner} style={{ width: 16, height: 16 }} />
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Editable Draft Preview */}
            {currentDraft && (
              <div className={styles.draftPreview}>
                <h4>Generated Goal (Edit as needed)</h4>
                <div className={styles.editableField}>
                  <label>Annual Goal:</label>
                  <textarea
                    className={styles.goalTextArea}
                    value={currentDraft.annualGoalText}
                    onChange={(e) => setCurrentDraft({
                      ...currentDraft,
                      annualGoalText: e.target.value
                    })}
                    rows={4}
                  />
                </div>
                {currentDraft.objectives.length > 0 && (
                  <div className={styles.objectivesList}>
                    <label>Short-Term Objectives:</label>
                    {currentDraft.objectives.map((obj, index) => (
                      <div key={obj.sequence} className={styles.editableObjective}>
                        <span className={styles.objectiveNumber}>{obj.sequence}.</span>
                        <textarea
                          className={styles.objectiveTextArea}
                          value={obj.objectiveText}
                          onChange={(e) => {
                            const newObjectives = [...currentDraft.objectives];
                            newObjectives[index] = {
                              ...newObjectives[index],
                              objectiveText: e.target.value
                            };
                            setCurrentDraft({
                              ...currentDraft,
                              objectives: newObjectives
                            });
                          }}
                          rows={2}
                        />
                      </div>
                    ))}
                    <button
                      className={`btn btn-sm ${styles.addObjectiveBtn}`}
                      type="button"
                      onClick={() => {
                        const newObjective = {
                          sequence: currentDraft.objectives.length + 1,
                          objectiveText: '',
                          measurementCriteria: '',
                          suggestedTargetWeeks: 12
                        };
                        setCurrentDraft({
                          ...currentDraft,
                          objectives: [...currentDraft.objectives, newObjective]
                        });
                      }}
                    >
                      + Add Objective
                    </button>
                  </div>
                )}
                <div className={styles.editableField} style={{ marginTop: '1rem' }}>
                  <label>Baseline Description:</label>
                  <textarea
                    className={styles.baselineTextArea}
                    value={currentDraft.baselineDescription}
                    onChange={(e) => setCurrentDraft({
                      ...currentDraft,
                      baselineDescription: e.target.value
                    })}
                    rows={2}
                    placeholder="Describe the student's current performance level..."
                  />
                </div>
                <div className={styles.draftActions}>
                  <p className={styles.draftHint}>
                    ✓ Goal generated! Edit above if needed, then click Next to validate.
                  </p>
                </div>
              </div>
            )}

            {/* Chat Input */}
            <div className={styles.chatInputArea}>
              <textarea
                className={styles.chatInput}
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                  }
                }}
                placeholder="Type your message or describe what you want..."
                rows={2}
              />
              <button className="btn btn-primary" onClick={sendMessage} disabled={loadingChat || !chatInput.trim()}>
                Send
              </button>
            </div>
          </div>
        )}

        {currentStep === 'review' && (
          <div className={styles.validationSection}>
            {validating ? (
              <div className={styles.loading}>
                <div className={styles.spinner} />
                <span>Validating goal against COMAR requirements...</span>
              </div>
            ) : validation ? (
              <>
                {/* Score */}
                <div className={styles.validationScore}>
                  <div
                    className={`${styles.scoreCircle} ${
                      validation.score >= 80 ? styles.good : validation.score >= 60 ? styles.warning : styles.error
                    }`}
                  >
                    {validation.score}
                  </div>
                  <div className={styles.scoreDetails}>
                    <h4>{validation.isValid ? 'Goal Ready' : 'Needs Improvement'}</h4>
                    <p>
                      {validation.isValid
                        ? 'This goal meets COMAR requirements'
                        : 'Please address the issues below'}
                    </p>
                  </div>
                </div>

                {/* COMAR Compliance */}
                <div className={styles.comarCompliance}>
                  <div className={`${styles.complianceItem} ${validation.comarCompliance.measurable ? styles.passed : styles.failed}`}>
                    {validation.comarCompliance.measurable ? '✓' : '✗'} Measurable
                  </div>
                  <div className={`${styles.complianceItem} ${validation.comarCompliance.gradeAligned ? styles.passed : styles.failed}`}>
                    {validation.comarCompliance.gradeAligned ? '✓' : '✗'} Grade-Aligned
                  </div>
                  <div className={`${styles.complianceItem} ${validation.comarCompliance.needsBased ? styles.passed : styles.failed}`}>
                    {validation.comarCompliance.needsBased ? '✓' : '✗'} Needs-Based
                  </div>
                  <div className={`${styles.complianceItem} ${validation.comarCompliance.geAccessEnabled ? styles.passed : styles.failed}`}>
                    {validation.comarCompliance.geAccessEnabled ? '✓' : '✗'} GE Curriculum Access
                  </div>
                </div>

                {/* Issues */}
                {validation.issues.length > 0 && (
                  <div className={styles.issuesList}>
                    {validation.issues.map((issue, i) => (
                      <div key={i} className={`${styles.issue} ${styles[issue.type]}`}>
                        <span className={styles.issueIcon}>
                          {issue.type === 'error' ? '❌' : issue.type === 'warning' ? '⚠️' : '💡'}
                        </span>
                        <div>
                          <div>{issue.message}</div>
                          {issue.suggestion && (
                            <div style={{ fontSize: '0.8125rem', marginTop: '0.25rem' }}>
                              Suggestion: {issue.suggestion}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Final Draft Preview */}
                {currentDraft && (
                  <div className={styles.draftPreview}>
                    <h4>Final Goal</h4>
                    <div className={styles.draftGoalText}>{currentDraft.annualGoalText}</div>
                    {currentDraft.objectives.length > 0 && (
                      <div className={styles.objectivesList}>
                        <strong>Objectives:</strong>
                        {currentDraft.objectives.map((obj) => (
                          <div key={obj.sequence} className={styles.objectiveItem}>
                            <span className={styles.objectiveNumber}>{obj.sequence}.</span>
                            <span>{obj.objectiveText}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </>
            ) : (
              <div className={styles.loading}>
                <span>Preparing validation...</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className={styles.footer}>
        <div className={styles.footerLeft}>
          {currentStep !== 'area' && (
            <button className="btn btn-outline" onClick={handleBack}>
              Back
            </button>
          )}
        </div>
        <div className={styles.footerRight}>
          <button className="btn btn-outline" onClick={onClose}>
            Cancel
          </button>
          <button
            className="btn btn-primary"
            onClick={handleNext}
            disabled={
              (currentStep === 'area' && !selectedArea) ||
              (currentStep === 'draft' && !currentDraft) ||
              (currentStep === 'review' && saving)
            }
          >
            {saving ? 'Saving...' : currentStep === 'review' ? 'Save Goal' : 'Next'}
          </button>
        </div>
      </div>
    </div>
  );
}

function getGradeBand(grade: string): string {
  const gradeNum = grade.toLowerCase().replace(/[^0-9k]/g, '');
  if (gradeNum === 'k' || gradeNum === '0' || gradeNum === '1' || gradeNum === '2') return 'K-2';
  if (['3', '4', '5'].includes(gradeNum)) return '3-5';
  if (['6', '7', '8'].includes(gradeNum)) return '6-8';
  return '9-12';
}
