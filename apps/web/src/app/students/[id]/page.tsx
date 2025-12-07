'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { format } from 'date-fns';
import { useAuth } from '@/lib/auth-context';
import { api, Student, StudentStatus } from '@/lib/api';
import { StatusBadge } from '@/components/StatusBadge';
import { StatusModal } from '@/components/StatusModal';
import styles from './page.module.css';

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
  const [loadingStudent, setLoadingStudent] = useState(true);
  const [showStatusModal, setShowStatusModal] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/');
    }
  }, [user, loading, router]);

  const loadStudent = useCallback(async () => {
    try {
      const [studentRes, statusRes] = await Promise.all([
        api.getStudent(studentId),
        api.getStudentStatus(studentId),
      ]);
      setStudent(studentRes.student);
      setStatusData(statusRes);
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
              ID: {student.studentIdNum}
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
            <button
              className="btn btn-primary"
              onClick={() => setShowStatusModal(true)}
            >
              Update Status
            </button>
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

          {student.plans && student.plans.length > 0 && (
            <section className={styles.section}>
              <h3>Plans</h3>
              <div className={styles.plansList}>
                {student.plans.map(plan => (
                  <div key={plan.id} className={styles.planItem}>
                    <span className={styles.planType}>{plan.type}</span>
                    <span className={styles.planStatus}>{plan.status}</span>
                    <span className={styles.planDates}>
                      {format(new Date(plan.startDate), 'MMM d, yyyy')}
                      {plan.endDate && <> - {format(new Date(plan.endDate), 'MMM d, yyyy')}</>}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      </main>

      {showStatusModal && (
        <StatusModal
          studentName={`${student.firstName} ${student.lastName}`}
          onClose={() => setShowStatusModal(false)}
          onSubmit={handleStatusSubmit}
        />
      )}
    </div>
  );
}

function formatScope(scope: string): string {
  return scope.charAt(0) + scope.slice(1).toLowerCase();
}
