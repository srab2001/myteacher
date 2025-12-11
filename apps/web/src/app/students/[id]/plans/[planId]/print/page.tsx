'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { format } from 'date-fns';
import { useAuth } from '@/lib/auth-context';
import { api, Plan, GoalArea, ProgressLevel, ServiceType, ServiceSetting, ArtifactComparison } from '@/lib/api';
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

const SERVICE_TYPE_LABELS: Record<ServiceType, string> = {
  SPECIAL_EDUCATION: 'Special Education',
  SPEECH_LANGUAGE: 'Speech/Language',
  OCCUPATIONAL_THERAPY: 'Occupational Therapy',
  PHYSICAL_THERAPY: 'Physical Therapy',
  COUNSELING: 'Counseling',
  BEHAVIORAL_SUPPORT: 'Behavioral Support',
  READING_SPECIALIST: 'Reading Specialist',
  PARAPROFESSIONAL: 'Paraprofessional',
  OTHER: 'Other',
};

const SERVICE_SETTING_LABELS: Record<ServiceSetting, string> = {
  GENERAL_EDUCATION: 'General Education',
  SPECIAL_EDUCATION: 'Special Education',
  RESOURCE_ROOM: 'Resource Room',
  THERAPY_ROOM: 'Therapy Room',
  COMMUNITY: 'Community',
  HOME: 'Home',
  OTHER: 'Other',
};

export default function PrintIEPPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const planId = params.planId as string;

  const [plan, setPlan] = useState<Plan | null>(null);
  const [artifactComparisons, setArtifactComparisons] = useState<ArtifactComparison[]>([]);
  const [loadingPlan, setLoadingPlan] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/');
    }
  }, [user, loading, router]);

  const loadPlan = useCallback(async () => {
    try {
      const [planResult, comparisonsResult] = await Promise.all([
        api.getPlan(planId),
        api.getPlanArtifactCompares(planId).catch(() => ({ comparisons: [] })),
      ]);
      setPlan(planResult.plan);
      setArtifactComparisons(comparisonsResult.comparisons || []);
    } catch (err) {
      console.error('Failed to load plan:', err);
    } finally {
      setLoadingPlan(false);
    }
  }, [planId]);

  useEffect(() => {
    if (user?.isOnboarded && planId) {
      loadPlan();
    }
  }, [user, planId, loadPlan]);

  const handlePrint = () => {
    window.print();
  };

  const calculateAge = (dob: string): string => {
    const birth = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return `${age} years old`;
  };

  if (loading || loadingPlan) {
    return (
      <div className={styles.loadingContainer}>
        <div className="spinner" />
      </div>
    );
  }

  if (!plan) {
    return (
      <div className={styles.errorContainer}>
        <p>Plan not found</p>
        <button className="btn btn-primary" onClick={() => router.back()}>
          Go Back
        </button>
      </div>
    );
  }

  const schema = plan.schema;
  const fieldValues = plan.fieldValues || {};
  const student = plan.student;

  return (
    <div className={styles.container}>
      {/* Print Controls (hidden in print) */}
      <div className={styles.controls}>
        <button className="btn btn-outline" onClick={() => router.back()}>
          ← Back
        </button>
        <button className="btn btn-primary" onClick={handlePrint}>
          Print IEP
        </button>
      </div>

      {/* Printable Document */}
      <div className={styles.document}>
        {/* Header */}
        <header className={styles.docHeader}>
          <h1>Individualized Education Program (IEP)</h1>
          <div className={styles.docMeta}>
            <span>Plan Date: {format(new Date(plan.startDate), 'MMMM d, yyyy')}</span>
            {plan.endDate && <span>End Date: {format(new Date(plan.endDate), 'MMMM d, yyyy')}</span>}
          </div>
        </header>

        {/* Student Information */}
        <section className={styles.section}>
          <h2>Student Information</h2>
          <div className={styles.infoGrid}>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>Name</span>
              <span className={styles.infoValue}>
                {student.firstName} {student.lastName}
              </span>
            </div>
            {student.dateOfBirth && (
              <>
                <div className={styles.infoItem}>
                  <span className={styles.infoLabel}>Date of Birth</span>
                  <span className={styles.infoValue}>
                    {format(new Date(student.dateOfBirth), 'MMMM d, yyyy')}
                  </span>
                </div>
                <div className={styles.infoItem}>
                  <span className={styles.infoLabel}>Age</span>
                  <span className={styles.infoValue}>{calculateAge(student.dateOfBirth)}</span>
                </div>
              </>
            )}
            {student.grade && (
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Grade</span>
                <span className={styles.infoValue}>{student.grade}</span>
              </div>
            )}
          </div>
        </section>

        {/* Schema Sections */}
        {schema.fields.sections
          .filter(section => !section.isGoalsSection)
          .map(section => (
            <section key={section.key} className={styles.section}>
              <h2>{section.title}</h2>
              <div className={styles.fieldsList}>
                {section.fields.map(field => {
                  const value = fieldValues[field.key];
                  if (!value && !field.required) return null;

                  return (
                    <div key={field.key} className={styles.fieldItem}>
                      <span className={styles.fieldLabel}>{field.label}</span>
                      <span className={styles.fieldValue}>
                        {value ? String(value) : 'Not provided'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </section>
          ))}

        {/* Goals Section */}
        <section className={styles.section}>
          <h2>Annual Goals</h2>
          {plan.goals.length === 0 ? (
            <p className={styles.noData}>No goals have been created.</p>
          ) : (
            <div className={styles.goalsList}>
              {plan.goals.map((goal, index) => (
                <div key={goal.id} className={styles.goalItem}>
                  <div className={styles.goalHeader}>
                    <span className={styles.goalNumber}>Goal {index + 1}</span>
                    <span className={styles.goalCode}>{goal.goalCode}</span>
                    <span className={styles.goalArea}>{GOAL_AREA_LABELS[goal.area]}</span>
                  </div>
                  <p className={styles.goalText}>{goal.annualGoalText}</p>

                  {/* Short Term Objectives */}
                  {goal.shortTermObjectives && goal.shortTermObjectives.length > 0 && (
                    <div className={styles.objectives}>
                      <h4>Short-Term Objectives:</h4>
                      <ol>
                        {goal.shortTermObjectives.map((obj, i) => (
                          <li key={i}>{obj}</li>
                        ))}
                      </ol>
                    </div>
                  )}

                  {/* Progress Summary */}
                  {goal.progressRecords.length > 0 && (
                    <div className={styles.progressSummary}>
                      <h4>Recent Progress:</h4>
                      <table className={styles.progressTable}>
                        <thead>
                          <tr>
                            <th>Date</th>
                            <th>Level</th>
                            <th>Notes</th>
                          </tr>
                        </thead>
                        <tbody>
                          {goal.progressRecords.slice(0, 5).map(pr => (
                            <tr key={pr.id}>
                              <td>{format(new Date(pr.date), 'MMM d, yyyy')}</td>
                              <td>{PROGRESS_LABELS[pr.quickSelect]}</td>
                              <td>{pr.comment || '-'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Services Section */}
        <section className={styles.section}>
          <h2>Services Summary</h2>
          {plan.serviceLogs.length === 0 ? (
            <p className={styles.noData}>No services have been logged.</p>
          ) : (
            <>
              {/* Services Summary Table */}
              <table className={styles.servicesTable}>
                <thead>
                  <tr>
                    <th>Service Type</th>
                    <th>Total Time</th>
                    <th>Sessions</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(
                    plan.serviceLogs.reduce((acc, log) => {
                      if (!acc[log.serviceType]) {
                        acc[log.serviceType] = { minutes: 0, count: 0 };
                      }
                      acc[log.serviceType].minutes += log.minutes;
                      acc[log.serviceType].count += 1;
                      return acc;
                    }, {} as Record<string, { minutes: number; count: number }>)
                  ).map(([type, data]) => (
                    <tr key={type}>
                      <td>{SERVICE_TYPE_LABELS[type as ServiceType]}</td>
                      <td>{Math.floor(data.minutes / 60)}h {data.minutes % 60}m</td>
                      <td>{data.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Recent Service Logs */}
              <h3 className={styles.subheading}>Recent Service Logs</h3>
              <table className={styles.logsTable}>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Service</th>
                    <th>Setting</th>
                    <th>Duration</th>
                    <th>Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {plan.serviceLogs.slice(0, 10).map(log => (
                    <tr key={log.id}>
                      <td>{format(new Date(log.date), 'MMM d')}</td>
                      <td>{SERVICE_TYPE_LABELS[log.serviceType]}</td>
                      <td>{SERVICE_SETTING_LABELS[log.setting]}</td>
                      <td>{log.minutes}m</td>
                      <td>{log.notes || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </section>

        {/* Artifact Comparisons */}
        {artifactComparisons.length > 0 && (
          <section className={styles.section}>
            <h2>Artifact Comparisons</h2>
            <div className={styles.artifactsList}>
              {artifactComparisons.map((comparison) => (
                <div key={comparison.id} className={styles.artifactItem}>
                  <div className={styles.artifactHeader}>
                    <span className={styles.artifactDate}>
                      {format(new Date(comparison.artifactDate), 'MMMM d, yyyy')}
                    </span>
                    {comparison.description && (
                      <span className={styles.artifactDesc}>{comparison.description}</span>
                    )}
                  </div>
                  {comparison.analysisText && (
                    <div className={styles.artifactAnalysis}>
                      <h4>Analysis</h4>
                      <pre className={styles.analysisText}>{comparison.analysisText}</pre>
                    </div>
                  )}
                  <div className={styles.artifactMeta}>
                    <span>Created: {format(new Date(comparison.createdAt), 'MMM d, yyyy')}</span>
                    {comparison.createdBy && typeof comparison.createdBy === 'string' && (
                      <span> by {comparison.createdBy}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Signatures */}
        <section className={styles.section}>
          <h2>Signatures</h2>
          <div className={styles.signatureGrid}>
            <div className={styles.signatureLine}>
              <span className={styles.signatureRole}>Parent/Guardian</span>
              <span className={styles.signaturePlaceholder}></span>
              <span className={styles.signatureDate}>Date: __________</span>
            </div>
            <div className={styles.signatureLine}>
              <span className={styles.signatureRole}>Teacher</span>
              <span className={styles.signaturePlaceholder}></span>
              <span className={styles.signatureDate}>Date: __________</span>
            </div>
            <div className={styles.signatureLine}>
              <span className={styles.signatureRole}>Administrator</span>
              <span className={styles.signaturePlaceholder}></span>
              <span className={styles.signatureDate}>Date: __________</span>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className={styles.docFooter}>
          <p>Generated on {format(new Date(), 'MMMM d, yyyy \'at\' h:mm a')}</p>
          <p>MyTeacher Special Education Portal</p>
        </footer>
      </div>
    </div>
  );
}
