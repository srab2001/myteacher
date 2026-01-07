'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { format } from 'date-fns';
import { useAuth } from '@/lib/auth-context';
import { api, Goal, ProgressLevel, GoalArea, WorkSampleRating, ArtifactComparison } from '@/lib/api';
import { QuickProgressButtons } from '@/components/QuickProgressButtons';
import { DictationModal } from '@/components/DictationModal';
import { WorkSampleUpload } from '@/components/WorkSampleUpload';
import { GoalWizardPanel } from '@/components/goals/GoalWizardPanel';
import styles from './page.module.css';

const GOAL_AREA_LABELS: Record<GoalArea, string> = {
  READING: 'Reading',
  WRITING: 'Writing',
  MATH: 'Math',
  COMMUNICATION: 'Communication',
  SOCIAL_EMOTIONAL: 'Social-Emotional',
  BEHAVIOR: 'Behavior',
  MOTOR_SKILLS: 'Motor Skills',
  DAILY_LIVING: 'Daily Living',
  VOCATIONAL: 'Vocational',
  OTHER: 'Other',
};

const PROGRESS_LABELS: Record<ProgressLevel, string> = {
  NOT_ADDRESSED: 'Not Addressed',
  FULL_SUPPORT: 'Full Support',
  SOME_SUPPORT: 'Some Support',
  LOW_SUPPORT: 'Low Support',
  MET_TARGET: 'Met Target',
};

export default function GoalsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const planId = params.planId as string;
  const studentId = params.id as string;

  const [goals, setGoals] = useState<Goal[]>([]);
  const [loadingGoals, setLoadingGoals] = useState(true);
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);
  const [showDictation, setShowDictation] = useState(false);
  const [showWorkSample, setShowWorkSample] = useState(false);
  const [expandedGoals, setExpandedGoals] = useState<Set<string>>(new Set());
  const [goalWizardOpen, setGoalWizardOpen] = useState(false);
  const [availableArtifacts, setAvailableArtifacts] = useState<ArtifactComparison[]>([]);
  const [studentGrade, setStudentGrade] = useState<string | undefined>();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/');
    }
  }, [user, loading, router]);

  const loadGoals = useCallback(async () => {
    try {
      const { goals } = await api.getPlanGoals(planId);
      setGoals(goals);
    } catch (err) {
      console.error('Failed to load goals:', err);
    } finally {
      setLoadingGoals(false);
    }
  }, [planId]);

  useEffect(() => {
    if (user?.isOnboarded && planId) {
      loadGoals();
    }
  }, [user, planId, loadGoals]);

  // Load available artifacts for goal wizard
  useEffect(() => {
    const loadArtifacts = async () => {
      try {
        const result = await api.getStudentArtifactCompares(studentId);
        setAvailableArtifacts(result.comparisons || []);
      } catch {
        console.error('Failed to load artifacts');
      }
    };

    if (studentId) {
      loadArtifacts();
    }
  }, [studentId]);

  // Load student info for grade
  useEffect(() => {
    const loadStudentInfo = async () => {
      try {
        const { plan } = await api.getPlan(planId);
        setStudentGrade(plan.student?.grade);
      } catch {
        console.error('Failed to load student info');
      }
    };

    if (planId) {
      loadStudentInfo();
    }
  }, [planId]);

  const handleQuickProgress = async (goalId: string, quickSelect: ProgressLevel, comment?: string) => {
    try {
      await api.createQuickProgress(goalId, { quickSelect, comment });
      await loadGoals();
    } catch (err) {
      console.error('Failed to record progress:', err);
    }
  };

  const handleDictationSave = async (goalId: string, quickSelect: ProgressLevel, comment: string) => {
    try {
      await api.createDictationProgress(goalId, { quickSelect, comment });
      await loadGoals();
      setShowDictation(false);
      setSelectedGoal(null);
    } catch (err) {
      console.error('Failed to save dictation:', err);
    }
  };

  const handleWorkSampleUpload = async (goalId: string, file: File, rating: WorkSampleRating, comment?: string) => {
    try {
      await api.uploadWorkSample(goalId, file, rating, comment);
      await loadGoals();
      setShowWorkSample(false);
      setSelectedGoal(null);
    } catch (err) {
      console.error('Failed to upload work sample:', err);
    }
  };

  const toggleExpanded = (goalId: string) => {
    setExpandedGoals(prev => {
      const next = new Set(prev);
      if (next.has(goalId)) {
        next.delete(goalId);
      } else {
        next.add(goalId);
      }
      return next;
    });
  };

  if (loading || loadingGoals) {
    return (
      <div className={styles.container}>
        <div className="loading-container">
          <div className="spinner" />
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <button className={styles.backBtn} onClick={() => router.push(`/students/${studentId}/plans/${planId}/iep`)}>
          ← Back to IEP
        </button>
        <h1>Goals & Progress</h1>
        <button
          className="btn btn-primary"
          onClick={() => setGoalWizardOpen(true)}
          style={{ marginLeft: 'auto' }}
        >
          + New Goal
        </button>
      </header>

      <main className={styles.main}>
        {goals.length === 0 ? (
          <div className={styles.empty}>
            <p>No goals have been created yet.</p>
            <button className="btn btn-primary" onClick={() => setGoalWizardOpen(true)}>
              Create First Goal
            </button>
          </div>
        ) : (
          <div className={styles.goalsList}>
            {goals.map(goal => (
              <div key={goal.id} className={styles.goalCard}>
                <div className={styles.goalHeader} onClick={() => toggleExpanded(goal.id)}>
                  <div className={styles.goalInfo}>
                    <span className={styles.goalCode}>{goal.goalCode}</span>
                    <span className={styles.goalArea}>{GOAL_AREA_LABELS[goal.area]}</span>
                  </div>
                  <span className={styles.expandIcon}>
                    {expandedGoals.has(goal.id) ? '▼' : '▶'}
                  </span>
                </div>

                <p className={styles.goalText}>{goal.annualGoalText}</p>

                {/* Quick-Tap Progress Buttons */}
                <div className={styles.quickProgress}>
                  <QuickProgressButtons
                    goalId={goal.id}
                    onSelect={(level, comment) => handleQuickProgress(goal.id, level, comment)}
                  />
                </div>

                {/* Action Buttons */}
                <div className={styles.goalActions}>
                  <button
                    className="btn btn-outline"
                    onClick={() => {
                      setSelectedGoal(goal);
                      setShowDictation(true);
                    }}
                  >
                    🎤 Dictate Progress
                  </button>
                  <button
                    className="btn btn-outline"
                    onClick={() => {
                      setSelectedGoal(goal);
                      setShowWorkSample(true);
                    }}
                  >
                    📷 Add Work Sample
                  </button>
                </div>

                {/* Expanded Content */}
                {expandedGoals.has(goal.id) && (
                  <div className={styles.goalExpanded}>
                    {/* Recent Progress */}
                    <div className={styles.progressSection}>
                      <h4>Recent Progress</h4>
                      {goal.progressRecords.length === 0 ? (
                        <p className={styles.noData}>No progress recorded yet.</p>
                      ) : (
                        <div className={styles.progressList}>
                          {goal.progressRecords.slice(0, 5).map(pr => (
                            <div key={pr.id} className={styles.progressItem}>
                              <div className={styles.progressMain}>
                                <span className={`${styles.progressLevel} ${styles[pr.quickSelect.toLowerCase().replace('_', '-')]}`}>
                                  {PROGRESS_LABELS[pr.quickSelect]}
                                </span>
                                {pr.isDictated && <span className={styles.dictatedBadge}>🎤</span>}
                                {pr.comment && <span className={styles.progressComment}>{pr.comment}</span>}
                              </div>
                              <span className={styles.progressDate}>
                                {format(new Date(pr.date), 'MMM d, yyyy')}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Work Samples Gallery */}
                    <div className={styles.samplesSection}>
                      <h4>Work Samples</h4>
                      {goal.workSamples.length === 0 ? (
                        <p className={styles.noData}>No work samples yet.</p>
                      ) : (
                        <div className={styles.samplesGrid}>
                          {goal.workSamples.slice(0, 4).map(ws => (
                            <div key={ws.id} className={styles.sampleCard}>
                              {ws.fileType.startsWith('image/') ? (
                                <img src={ws.fileUrl} alt={ws.fileName} className={styles.sampleImage} />
                              ) : (
                                <div className={styles.sampleFile}>📄</div>
                              )}
                              <span className={styles.sampleRating}>{ws.rating.replace('_', ' ')}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Dictation Modal */}
      {showDictation && selectedGoal && (
        <DictationModal
          goalName={selectedGoal.goalCode}
          onClose={() => {
            setShowDictation(false);
            setSelectedGoal(null);
          }}
          onSave={(level, comment) => handleDictationSave(selectedGoal.id, level, comment)}
        />
      )}

      {/* Work Sample Modal */}
      {showWorkSample && selectedGoal && (
        <WorkSampleUpload
          goalName={selectedGoal.goalCode}
          onClose={() => {
            setShowWorkSample(false);
            setSelectedGoal(null);
          }}
          onUpload={(file, rating, comment) => handleWorkSampleUpload(selectedGoal.id, file, rating, comment)}
        />
      )}

      {/* Goal Wizard Panel */}
      {goalWizardOpen && (
        <div className={styles.goalWizardOverlay} onClick={(e) => {
          if (e.target === e.currentTarget) {
            setGoalWizardOpen(false);
          }
        }}>
          <GoalWizardPanel
            planId={planId}
            studentId={studentId}
            studentGrade={studentGrade}
            availableArtifacts={availableArtifacts}
            onClose={() => setGoalWizardOpen(false)}
            onGoalCreated={() => {
              setGoalWizardOpen(false);
              loadGoals();
            }}
          />
        </div>
      )}
    </div>
  );
}
