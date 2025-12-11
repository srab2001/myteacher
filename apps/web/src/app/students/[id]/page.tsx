'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { format } from 'date-fns';
import { useAuth } from '@/lib/auth-context';
import { api, Student, StudentStatus, PriorPlanDocument, PlanTypeCode } from '@/lib/api';
import { StatusBadge } from '@/components/StatusBadge';
import { StatusModal } from '@/components/StatusModal';
import { PriorPlanUploadModal } from '@/components/PriorPlanUploadModal';
import { ArtifactComparesSection } from '@/components/artifact/ArtifactComparesSection';
import styles from './page.module.css';

const PLAN_TYPE_LABELS: Record<PlanTypeCode, string> = {
  IEP: 'IEP',
  FIVE_OH_FOUR: '504 Plan',
  BEHAVIOR_PLAN: 'Behavior Plan',
};

export default function StudentDetailPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const studentId = params.id as string;

  const [student, setStudent] = useState<Student | null>(null);
  const [statusData, setStatusData] = useState<{
    current: StudentStatus[];
    history: StudentStatus[];
  } | null>(null);
  const [priorPlans, setPriorPlans] = useState<PriorPlanDocument[]>([]);
  const [studentPlans, setStudentPlans] = useState<Array<{
    id: string;
    status: string;
    startDate: string;
    endDate: string | null;
    planType: string;
    planTypeCode: string;
    schemaName: string;
    createdAt: string;
  }>>([]);
  const [loadingStudent, setLoadingStudent] = useState(true);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [creatingPlan, setCreatingPlan] = useState<PlanTypeCode | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/');
    }
  }, [user, loading, router]);

  const loadStudent = useCallback(async () => {
    try {
      // Fetch student first - this is required
      const studentRes = await api.getStudent(studentId);
      setStudent(studentRes.student);

      // Fetch other data in parallel, but handle failures gracefully
      const [statusRes, priorPlansRes, plansRes] = await Promise.allSettled([
        api.getStudentStatus(studentId),
        api.getStudentPriorPlans(studentId),
        api.getStudentPlans(studentId),
      ]);

      if (statusRes.status === 'fulfilled') {
        setStatusData(statusRes.value);
      } else {
        console.error('Failed to load status:', statusRes.reason);
        setStatusData({ current: [], history: [] });
      }

      if (priorPlansRes.status === 'fulfilled') {
        setPriorPlans(priorPlansRes.value.priorPlans);
      } else {
        console.error('Failed to load prior plans:', priorPlansRes.reason);
        setPriorPlans([]);
      }

      if (plansRes.status === 'fulfilled') {
        setStudentPlans(plansRes.value.plans);
      } else {
        console.error('Failed to load plans:', plansRes.reason);
        setStudentPlans([]);
      }
    } catch (err) {
      console.error('Failed to load student:', err);
    } finally {
      setLoadingStudent(false);
    }
  }, [studentId]);

  useEffect(() => {
    if (user?.isOnboarded && studentId) {
      loadStudent();
    }
  }, [user, studentId, loadStudent]);

  const handleStatusSubmit = async (data: {
    scope: string;
    code: string;
    summary: string;
    effectiveDate: string;
  }) => {
    await api.createStudentStatus(studentId, data);
    await loadStudent();
  };

  const handlePriorPlanUpload = async (
    file: File,
    planType: PlanTypeCode,
    planDate?: string,
    notes?: string
  ) => {
    await api.uploadPriorPlan(studentId, file, planType, planDate, notes);
    await loadStudent();
  };

  const handlePriorPlanDelete = async (priorPlanId: string) => {
    if (!confirm('Are you sure you want to delete this prior plan document?')) return;
    await api.deletePriorPlan(priorPlanId);
    await loadStudent();
  };

  const handleStartPlan = async (planTypeCode: PlanTypeCode) => {
    setCreatingPlan(planTypeCode);
    try {
      const { plan } = await api.createPlan(studentId, planTypeCode);
      // Navigate to the appropriate plan editor
      if (planTypeCode === 'IEP') {
        router.push(`/students/${studentId}/plans/${plan.id}/iep`);
      } else if (planTypeCode === 'FIVE_OH_FOUR') {
        router.push(`/students/${studentId}/plans/${plan.id}/504`);
      } else if (planTypeCode === 'BEHAVIOR_PLAN') {
        router.push(`/students/${studentId}/plans/${plan.id}/behavior`);
      }
    } catch (err) {
      console.error('Failed to create plan:', err);
      alert('Failed to create plan. Please try again.');
    } finally {
      setCreatingPlan(null);
    }
  };

  const getPlanByType = (typeCode: string) => {
    return studentPlans.find(p => p.planTypeCode === typeCode && (p.status === 'DRAFT' || p.status === 'ACTIVE'));
  };

  const getPlanEditorUrl = (plan: { id: string; planTypeCode: string }) => {
    if (plan.planTypeCode === 'IEP') {
      return `/students/${studentId}/plans/${plan.id}/iep`;
    } else if (plan.planTypeCode === 'FIVE_OH_FOUR') {
      return `/students/${studentId}/plans/${plan.id}/504`;
    } else if (plan.planTypeCode === 'BEHAVIOR_PLAN') {
      return `/students/${studentId}/plans/${plan.id}/behavior`;
    }
    return `/students/${studentId}/plans/${plan.id}`;
  };

  if (loading || loadingStudent) {
    return (
      <div className={styles.container}>
        <div className="loading-container">
          <div className="spinner" />
        </div>
      </div>
    );
  }

  if (!student) {
    return (
      <div className={styles.container}>
        <div className={styles.notFound}>
          <h2>Student not found</h2>
          <button className="btn btn-primary" onClick={() => router.push('/dashboard')}>
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const overallStatus = statusData?.current.find(s => s.scope === 'OVERALL');

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <button className={styles.backBtn} onClick={() => router.push('/dashboard')}>
            ← Back to Dashboard
          </button>
        </div>
      </header>

      <main className={styles.main}>
        <div className={styles.studentHeader}>
          <div className={styles.studentInfo}>
            <h1>{student.lastName}, {student.firstName}</h1>
            <p>Grade {student.grade} • {student.schoolName}</p>
            <p className={styles.studentMeta}>
              {student.recordId}
              {student.dateOfBirth && (
                <> • DOB: {format(new Date(student.dateOfBirth), 'MMM d, yyyy')}</>
              )}
            </p>
          </div>
          <div className={styles.statusHeader}>
            {overallStatus ? (
              <StatusBadge code={overallStatus.code} />
            ) : (
              <span className={styles.noStatus}>No status set</span>
            )}
            <div className={styles.headerActions}>
              <button
                className="btn btn-outline"
                onClick={() => router.push(`/students/${studentId}/reports`)}
              >
                Reports
              </button>
              <button
                className="btn btn-primary"
                onClick={() => setShowStatusModal(true)}
              >
                Update Status
              </button>
            </div>
          </div>
        </div>

        <div className={styles.grid}>
          <section className={styles.section}>
            <h3>Current Status</h3>
            {statusData?.current && statusData.current.length > 0 ? (
              <div className={styles.statusGrid}>
                {statusData.current.map(status => (
                  <div key={status.id} className={styles.statusCard}>
                    <div className={styles.statusCardHeader}>
                      <span className={styles.scopeLabel}>{formatScope(status.scope)}</span>
                      <StatusBadge code={status.code} size="sm" />
                    </div>
                    {status.summary && (
                      <p className={styles.statusSummary}>{status.summary}</p>
                    )}
                    <p className={styles.statusDate}>
                      {format(new Date(status.effectiveDate), 'MMM d, yyyy')}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className={styles.emptyMessage}>No status records yet.</p>
            )}
          </section>

          <section className={styles.section}>
            <h3>Status History</h3>
            {statusData?.history && statusData.history.length > 0 ? (
              <div className={styles.historyList}>
                {statusData.history.map(status => (
                  <div key={status.id} className={styles.historyItem}>
                    <div className={styles.historyMain}>
                      <span className={styles.historyScope}>{formatScope(status.scope)}</span>
                      <StatusBadge code={status.code} size="sm" />
                      {status.summary && (
                        <span className={styles.historySummary}>{status.summary}</span>
                      )}
                    </div>
                    <div className={styles.historyMeta}>
                      {format(new Date(status.effectiveDate), 'MMM d, yyyy')}
                      {status.updatedBy && <> • {status.updatedBy.displayName}</>}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className={styles.emptyMessage}>No history yet.</p>
            )}
          </section>

          {/* Plan Tiles Section */}
          <section className={styles.section}>
            <h3>Plans</h3>
            <div className={styles.planTilesGrid}>
              {/* IEP Tile */}
              {(() => {
                const iepPlan = getPlanByType('IEP');
                return (
                  <div className={styles.planTile}>
                    <div className={styles.planTileHeader}>
                      <h4>IEP</h4>
                      {iepPlan && (
                        <span className={`${styles.planTileStatus} ${styles[iepPlan.status.toLowerCase()]}`}>
                          {iepPlan.status}
                        </span>
                      )}
                    </div>
                    {iepPlan ? (
                      <>
                        <p className={styles.planTileDate}>
                          Started: {format(new Date(iepPlan.startDate), 'MMM d, yyyy')}
                        </p>
                        <div className={styles.planTileActions}>
                          <button
                            className="btn btn-primary btn-sm"
                            onClick={() => router.push(getPlanEditorUrl(iepPlan))}
                          >
                            Open IEP
                          </button>
                          <button
                            className="btn btn-outline btn-sm"
                            onClick={() => router.push(`/students/${studentId}/plans/${iepPlan.id}/goals`)}
                          >
                            Goals & Progress
                          </button>
                        </div>
                      </>
                    ) : (
                      <>
                        <p className={styles.planTileEmpty}>No active IEP</p>
                        <button
                          className="btn btn-primary btn-sm"
                          onClick={() => handleStartPlan('IEP')}
                          disabled={creatingPlan === 'IEP'}
                        >
                          {creatingPlan === 'IEP' ? 'Starting...' : 'Start IEP'}
                        </button>
                      </>
                    )}
                  </div>
                );
              })()}

              {/* 504 Plan Tile */}
              {(() => {
                const plan504 = getPlanByType('FIVE_OH_FOUR');
                return (
                  <div className={styles.planTile}>
                    <div className={styles.planTileHeader}>
                      <h4>504 Plan</h4>
                      {plan504 && (
                        <span className={`${styles.planTileStatus} ${styles[plan504.status.toLowerCase()]}`}>
                          {plan504.status}
                        </span>
                      )}
                    </div>
                    {plan504 ? (
                      <>
                        <p className={styles.planTileDate}>
                          Started: {format(new Date(plan504.startDate), 'MMM d, yyyy')}
                        </p>
                        <div className={styles.planTileActions}>
                          <button
                            className="btn btn-primary btn-sm"
                            onClick={() => router.push(getPlanEditorUrl(plan504))}
                          >
                            Open 504 Plan
                          </button>
                        </div>
                      </>
                    ) : (
                      <>
                        <p className={styles.planTileEmpty}>No active 504 Plan</p>
                        <button
                          className="btn btn-primary btn-sm"
                          onClick={() => handleStartPlan('FIVE_OH_FOUR')}
                          disabled={creatingPlan === 'FIVE_OH_FOUR'}
                        >
                          {creatingPlan === 'FIVE_OH_FOUR' ? 'Starting...' : 'Start 504 Plan'}
                        </button>
                      </>
                    )}
                  </div>
                );
              })()}

              {/* Behavior Plan Tile */}
              {(() => {
                const behaviorPlan = getPlanByType('BEHAVIOR_PLAN');
                return (
                  <div className={styles.planTile}>
                    <div className={styles.planTileHeader}>
                      <h4>Behavior Plan</h4>
                      {behaviorPlan && (
                        <span className={`${styles.planTileStatus} ${styles[behaviorPlan.status.toLowerCase()]}`}>
                          {behaviorPlan.status}
                        </span>
                      )}
                    </div>
                    {behaviorPlan ? (
                      <>
                        <p className={styles.planTileDate}>
                          Started: {format(new Date(behaviorPlan.startDate), 'MMM d, yyyy')}
                        </p>
                        <div className={styles.planTileActions}>
                          <button
                            className="btn btn-primary btn-sm"
                            onClick={() => router.push(getPlanEditorUrl(behaviorPlan))}
                          >
                            Open Behavior Plan
                          </button>
                          <button
                            className="btn btn-outline btn-sm"
                            onClick={() => router.push(`/students/${studentId}/plans/${behaviorPlan.id}/behavior/data`)}
                          >
                            Record Data
                          </button>
                        </div>
                      </>
                    ) : (
                      <>
                        <p className={styles.planTileEmpty}>No active Behavior Plan</p>
                        <button
                          className="btn btn-primary btn-sm"
                          onClick={() => handleStartPlan('BEHAVIOR_PLAN')}
                          disabled={creatingPlan === 'BEHAVIOR_PLAN'}
                        >
                          {creatingPlan === 'BEHAVIOR_PLAN' ? 'Starting...' : 'Start Behavior Plan'}
                        </button>
                      </>
                    )}
                  </div>
                );
              })()}
            </div>
          </section>

          {/* Prior Plans Section */}
          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <h3>Prior Plans & Documents</h3>
              <button
                className="btn btn-outline btn-sm"
                onClick={() => setShowUploadModal(true)}
              >
                + Upload Prior Plan
              </button>
            </div>
            {priorPlans.length > 0 ? (
              <div className={styles.priorPlansList}>
                {priorPlans.map(plan => (
                  <div key={plan.id} className={styles.priorPlanItem}>
                    <div className={styles.priorPlanMain}>
                      <span className={styles.priorPlanType}>
                        {PLAN_TYPE_LABELS[plan.planType]}
                      </span>
                      <span className={styles.priorPlanFile}>{plan.fileName}</span>
                    </div>
                    <div className={styles.priorPlanMeta}>
                      {plan.planDate && (
                        <span className={styles.priorPlanDate}>
                          Plan Date: {format(new Date(plan.planDate), 'MMM d, yyyy')}
                        </span>
                      )}
                      <span className={styles.priorPlanUploaded}>
                        Uploaded: {format(new Date(plan.createdAt), 'MMM d, yyyy')}
                        {' by '}{plan.uploadedBy}
                      </span>
                    </div>
                    {plan.notes && (
                      <p className={styles.priorPlanNotes}>{plan.notes}</p>
                    )}
                    <div className={styles.priorPlanActions}>
                      <a
                        href={api.getPriorPlanDownloadUrl(plan.id)}
                        className={styles.downloadLink}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Download
                      </a>
                      <button
                        className={styles.deleteBtn}
                        onClick={() => handlePriorPlanDelete(plan.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className={styles.emptyMessage}>
                No prior plans uploaded yet. Upload previous IEP, 504, or behavior plans to use them when creating new plans.
              </p>
            )}
          </section>

          {/* Artifact Comparisons Section */}
          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <h3>Artifact Comparisons</h3>
            </div>
            <ArtifactComparesSection
              studentId={studentId}
              showPlanInfo={true}
              availablePlans={(studentPlans || [])
                .filter(p => p.status === 'DRAFT' || p.status === 'ACTIVE')
                .map(p => ({
                  id: p.id,
                  label: `${p.planType} - ${format(new Date(p.startDate), 'MMM yyyy')}`,
                  planTypeCode: p.planTypeCode,
                }))}
              onAlignToPlan={async (comparisonId, planId) => {
                await api.alignArtifactCompare(studentId, comparisonId, planId);
              }}
            />
          </section>
        </div>
      </main>

      {showStatusModal && (
        <StatusModal
          studentName={`${student.firstName} ${student.lastName}`}
          onClose={() => setShowStatusModal(false)}
          onSubmit={handleStatusSubmit}
        />
      )}

      {showUploadModal && (
        <PriorPlanUploadModal
          onClose={() => setShowUploadModal(false)}
          onUpload={handlePriorPlanUpload}
        />
      )}
    </div>
  );
}

function formatScope(scope: string): string {
  return scope.charAt(0) + scope.slice(1).toLowerCase();
}
