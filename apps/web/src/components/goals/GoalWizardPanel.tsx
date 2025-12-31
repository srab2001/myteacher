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
  const [generateError, setGenerateError] = useState<string | null>(null);

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
  const [fixingWithAI, setFixingWithAI] = useState(false);

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
    setGenerateError(null);
    try {
      const result = await api.generatePresentLevels(studentId, selectedArea, planId);
      setPresentLevels(result);
    } catch (error) {
      console.error('Failed to generate present levels:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to generate present levels';
      if (errorMessage.includes('OPENAI_API_KEY') || errorMessage.includes('AI features')) {
        setGenerateError('AI features require OPENAI_API_KEY to be configured. Please contact your administrator.');
      } else {
        setGenerateError(errorMessage);
      }
    } finally {
      setGeneratingLevels(false);
    }
  };

  const [sessionError, setSessionError] = useState<string | null>(null);

  const startWizardSession = async (): Promise<string | null> => {
    console.log('[GoalWizard] startWizardSession called, selectedArea:', selectedArea);
    if (!selectedArea) {
      console.log('[GoalWizard] No selectedArea, returning null');
      return null;
    }
    setLoadingChat(true);
    setSessionError(null);
    try {
      console.log('[GoalWizard] Calling api.startWizardSession with planId:', planId);
      const result = await api.startWizardSession(planId, selectedArea, selectedArtifacts, presentLevels || undefined);
      console.log('[GoalWizard] startWizardSession result:', result);
      setSessionId(result.sessionId);

      let initialMessage = result.message;
      if (presentLevels) {
        initialMessage += `\n\nBased on the present levels analysis:\n- Current Performance: ${presentLevels.currentPerformance}\n- Key Challenges: ${presentLevels.challengesNoted.join(', ')}`;
      }
      setChatMessages([{ role: 'assistant', content: initialMessage }]);
      return result.sessionId; // Return the sessionId directly
    } catch (error) {
      console.error('[GoalWizard] Failed to start wizard session:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to start wizard session';
      setSessionError(errorMessage);
      setChatMessages([{ role: 'assistant', content: `Error starting session: ${errorMessage}. Please try again.` }]);
      return null;
    } finally {
      setLoadingChat(false);
    }
  };

  const sendMessage = async () => {
    console.log('[GoalWizard] sendMessage called, chatInput:', chatInput);
    if (!chatInput.trim()) {
      console.log('[GoalWizard] chatInput is empty, returning');
      return;
    }

    // If session not started yet, start it first and get the sessionId directly
    let currentSessionId = sessionId;
    console.log('[GoalWizard] Current sessionId:', currentSessionId);
    if (!currentSessionId) {
      console.log('[GoalWizard] No session, starting wizard session...');
      currentSessionId = await startWizardSession();
      console.log('[GoalWizard] Got sessionId from startWizardSession:', currentSessionId);
      if (!currentSessionId) {
        console.log('[GoalWizard] Failed to get sessionId, returning');
        return;
      }
    }

    const message = chatInput.trim();
    setChatInput('');
    setChatMessages((prev) => [...prev, { role: 'user', content: message }]);
    setLoadingChat(true);

    try {
      console.log('[GoalWizard] Sending message to session:', currentSessionId);
      const result = await api.sendWizardMessage(currentSessionId, message);
      console.log('[GoalWizard] Got response:', result);
      setChatMessages((prev) => [...prev, { role: 'assistant', content: result.response }]);
      if (result.currentDraft) {
        setCurrentDraft(result.currentDraft);
      }
    } catch (error) {
      console.error('[GoalWizard] Failed to send message:', error);
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

  const fixWithAI = async () => {
    if (!currentDraft || !selectedArea) return;
    setFixingWithAI(true);
    try {
      const result = await api.improveGoal({
        annualGoalText: currentDraft.annualGoalText,
        area: selectedArea,
        baselineDescription: currentDraft.baselineDescription,
        studentGrade,
      });

      if (result.improvedGoal && result.improvedGoal !== currentDraft.annualGoalText) {
        setCurrentDraft({
          ...currentDraft,
          annualGoalText: result.improvedGoal,
        });
        setValidation(null);
        setCurrentStep('draft');
        setChatMessages((prev) => [
          ...prev,
          { role: 'assistant', content: `I've improved your goal to address the compliance issues:\n\n**Improved Goal:**\n${result.improvedGoal}\n\n**Changes made:**\n${result.explanation}\n\nYou can edit this further or proceed to review.` },
        ]);
      } else {
        alert('The goal is already well-structured. No changes needed.');
      }
    } catch (error) {
      console.error('Failed to fix with AI:', error);
      alert('Failed to improve goal with AI. Please try editing manually.');
    } finally {
      setFixingWithAI(false);
    }
  };

  const saveGoal = async (asDraft: boolean = false) => {
    if (!currentDraft || !selectedArea) return;
    setSaving(true);
    try {
      const existingGoals = await api.getPlanGoals(planId);
      const nextNumber = (existingGoals.goals?.length || 0) + 1;
      const goalCode = asDraft ? `DRAFT-${nextNumber}` : `G${nextNumber}`;

      const result = await api.createGoal(planId, {
        goalCode,
        area: selectedArea,
        annualGoalText: currentDraft.annualGoalText,
        baselineJson: {
          description: currentDraft.baselineDescription,
          measurementMethod: currentDraft.measurementMethod,
          rationale: currentDraft.rationale,
          comarReference: currentDraft.comarReference,
          isDraft: asDraft,
          validationScore: validation?.score || null,
          validatedAt: asDraft ? null : new Date().toISOString(),
        },
        shortTermObjectives: currentDraft.objectives.map(obj => obj.objectiveText),
        progressSchedule: currentDraft.progressSchedule as 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'quarterly',
        draftStatus: asDraft ? 'DRAFT' : 'FINAL',
      });

      onGoalCreated(result.goal.id);
    } catch (error) {
      console.error('Failed to save goal:', error);
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
        }
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
                  </div>
                )}

                <button
                  className={`btn btn-primary ${styles.generateBtn}`}
                  onClick={generatePresentLevels}
                  disabled={generatingLevels}
                >
                  {generatingLevels ? 'Generating...' : 'Generate Present Levels with AI'}
                </button>

                {generateError && (
                  <div style={{ color: '#dc2626', padding: '0.75rem', backgroundColor: '#fef2f2', borderRadius: '0.375rem', marginTop: '0.5rem' }}>
                    {generateError}
                  </div>
                )}

                {presentLevels && (
                  <div className={styles.generatedContent}>
                    <h4>Current Performance</h4>
                    <p>{presentLevels.currentPerformance}</p>

                    {presentLevels.gradeStandardsComparison && (
                      <div style={{ marginTop: '1rem' }}>
                        <h5 style={{ color: '#1e40af', marginBottom: '0.5rem' }}>Grade Standards Comparison</h5>
                        <p style={{ fontSize: '0.9rem' }}>{presentLevels.gradeStandardsComparison}</p>
                      </div>
                    )}

                    {presentLevels.standardsReferenced && presentLevels.standardsReferenced.length > 0 && (
                      <div style={{ marginTop: '1rem' }}>
                        <h5 style={{ color: '#1e40af', marginBottom: '0.5rem' }}>Standards Referenced</h5>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                          {presentLevels.standardsReferenced.map((std, i) => (
                            <div key={i} style={{ backgroundColor: '#f0f9ff', padding: '0.75rem', borderRadius: '0.375rem', borderLeft: '3px solid #3b82f6' }}>
                              <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{std.code}: {std.standard}</div>
                              <div style={{ fontSize: '0.85rem', marginTop: '0.25rem' }}><strong>Performance:</strong> {std.studentPerformance}</div>
                              <div style={{ fontSize: '0.85rem', color: '#dc2626' }}><strong>Gap:</strong> {std.gapAnalysis}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1rem' }}>
                      <div>
                        <h5 style={{ color: '#16a34a', marginBottom: '0.5rem' }}>Strengths</h5>
                        <ul style={{ margin: 0, paddingLeft: '1.25rem', fontSize: '0.9rem' }}>
                          {presentLevels.strengthsNoted.map((s, i) => <li key={i}>{s}</li>)}
                        </ul>
                      </div>
                      <div>
                        <h5 style={{ color: '#dc2626', marginBottom: '0.5rem' }}>Challenges</h5>
                        <ul style={{ margin: 0, paddingLeft: '1.25rem', fontSize: '0.9rem' }}>
                          {presentLevels.challengesNoted.map((c, i) => <li key={i}>{c}</li>)}
                        </ul>
                      </div>
                    </div>

                    {presentLevels.baselineData && presentLevels.baselineData.length > 0 && (
                      <div style={{ marginTop: '1rem' }}>
                        <h5 style={{ color: '#7c3aed', marginBottom: '0.5rem' }}>Baseline Data for Goal Development</h5>
                        <table style={{ width: '100%', fontSize: '0.85rem', borderCollapse: 'collapse' }}>
                          <thead>
                            <tr style={{ backgroundColor: '#f3f4f6' }}>
                              <th style={{ textAlign: 'left', padding: '0.5rem', borderBottom: '1px solid #e5e7eb' }}>Metric</th>
                              <th style={{ textAlign: 'left', padding: '0.5rem', borderBottom: '1px solid #e5e7eb' }}>Current</th>
                              <th style={{ textAlign: 'left', padding: '0.5rem', borderBottom: '1px solid #e5e7eb' }}>Expected</th>
                              <th style={{ textAlign: 'left', padding: '0.5rem', borderBottom: '1px solid #e5e7eb' }}>Measurement</th>
                            </tr>
                          </thead>
                          <tbody>
                            {presentLevels.baselineData.map((bd, i) => (
                              <tr key={i}>
                                <td style={{ padding: '0.5rem', borderBottom: '1px solid #e5e7eb' }}>{bd.metric}</td>
                                <td style={{ padding: '0.5rem', borderBottom: '1px solid #e5e7eb', color: '#dc2626' }}>{bd.currentLevel}</td>
                                <td style={{ padding: '0.5rem', borderBottom: '1px solid #e5e7eb', color: '#16a34a' }}>{bd.expectedLevel}</td>
                                <td style={{ padding: '0.5rem', borderBottom: '1px solid #e5e7eb' }}>{bd.measurementMethod}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {presentLevels.impactOnGeneralEducation && (
                      <div style={{ marginTop: '1rem' }}>
                        <h5 style={{ color: '#ea580c', marginBottom: '0.5rem' }}>Impact on General Education</h5>
                        <p style={{ fontSize: '0.9rem' }}>{presentLevels.impactOnGeneralEducation}</p>
                      </div>
                    )}

                    {presentLevels.accommodationsNeeded && presentLevels.accommodationsNeeded.length > 0 && (
                      <div style={{ marginTop: '1rem' }}>
                        <h5 style={{ marginBottom: '0.5rem' }}>Recommended Accommodations</h5>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                          {presentLevels.accommodationsNeeded.map((acc, i) => (
                            <span key={i} style={{ backgroundColor: '#dbeafe', color: '#1e40af', padding: '0.25rem 0.75rem', borderRadius: '9999px', fontSize: '0.85rem' }}>{acc}</span>
                          ))}
                        </div>
                      </div>
                    )}

                    {presentLevels.functionalImplications && (
                      <div style={{ marginTop: '1rem' }}>
                        <h5 style={{ marginBottom: '0.5rem' }}>Functional Implications</h5>
                        <p style={{ fontSize: '0.9rem' }}>{presentLevels.functionalImplications}</p>
                      </div>
                    )}

                    <div style={{ marginTop: '1rem', padding: '0.75rem', backgroundColor: '#fefce8', borderRadius: '0.375rem' }}>
                      <h5 style={{ marginBottom: '0.5rem' }}>Recent Progress</h5>
                      <p style={{ fontSize: '0.9rem', margin: 0 }}>{presentLevels.recentProgress}</p>
                    </div>

                    <div style={{ marginTop: '0.75rem', fontSize: '0.8rem', color: '#6b7280' }}>
                      <strong>Data Sources:</strong> {presentLevels.dataSourceSummary}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {currentStep === 'draft' && (
          <div className={styles.chatContainer}>
            {templates.length > 0 && !currentDraft && (
              <div className={styles.templateLibrary}>
                <h4>Goal Templates</h4>
                {templates.slice(0, 3).map((template, i) => (
                  <div key={i} className={styles.templateItem} onClick={() => generateDraft(`Use this template: ${template.template}`)}>
                    <div className={styles.templateText}>{template.template}</div>
                  </div>
                ))}
              </div>
            )}

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

            {currentDraft && (
              <div className={styles.draftPreview}>
                <h4>Generated Goal (Edit as needed)</h4>
                <textarea
                  className={styles.goalTextArea}
                  value={currentDraft.annualGoalText}
                  onChange={(e) => setCurrentDraft({ ...currentDraft, annualGoalText: e.target.value })}
                  rows={4}
                />
              </div>
            )}

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
            {currentDraft && (
              <div className={styles.draftPreview}>
                <h4>Review Goal</h4>
                <div className={styles.draftGoalText}>{currentDraft.annualGoalText}</div>
                {currentDraft.objectives.length > 0 && (
                  <div className={styles.objectivesList}>
                    <strong>Objectives:</strong>
                    {currentDraft.objectives.map((obj) => (
                      <div key={obj.sequence} className={styles.objectiveItem}>
                        <span>{obj.sequence}. {obj.objectiveText}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {!validation && !validating && (
              <div style={{ marginTop: '1rem', textAlign: 'center' }}>
                <button className="btn btn-outline" onClick={validateDraft} disabled={validating}>
                  Run COMAR Validation (Optional)
                </button>
              </div>
            )}

            {validating && <div className={styles.loading}><div className={styles.spinner} /><span>Validating...</span></div>}

            {validation && (
              <div style={{ marginTop: '1rem' }}>
                <div className={styles.validationScore}>
                  <div className={`${styles.scoreCircle} ${validation.score >= 80 ? styles.good : validation.score >= 60 ? styles.warning : styles.error}`}>
                    {validation.score}
                  </div>
                  <div><h4>{validation.isValid ? 'Goal Ready' : 'Needs Improvement'}</h4></div>
                </div>
              </div>
            )}

            <p style={{ marginTop: '1.5rem', textAlign: 'center', color: '#666' }}>
              Ready to save? Use the buttons below.
            </p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className={styles.footer}>
        <div className={styles.footerLeft}>
          {currentStep !== 'area' && (
            <button className="btn btn-outline" onClick={handleBack}>Back</button>
          )}
        </div>
        <div className={styles.footerRight}>
          <button className="btn btn-outline" onClick={onClose}>Cancel</button>
          {currentStep === 'review' ? (
            <>
              <button className="btn btn-outline" onClick={() => saveGoal(true)} disabled={saving}>
                {saving ? 'Saving...' : 'Save as Draft'}
              </button>
              <button className="btn btn-primary" onClick={() => saveGoal(false)} disabled={saving}>
                {saving ? 'Saving...' : 'Save as Final'}
              </button>
            </>
          ) : (
            <button
              className="btn btn-primary"
              onClick={handleNext}
              disabled={(currentStep === 'area' && !selectedArea) || (currentStep === 'draft' && !currentDraft)}
            >
              Next
            </button>
          )}
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
