'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { useAuth } from '@/lib/auth-context';
import {
  api,
  DisputeCase,
  DisputeCaseType,
  DisputeCaseStatus,
  DisputeCaseTypeInfo,
} from '@/lib/api';

interface StudentPlan {
  id: string;
  status: string;
  startDate: string;
  endDate: string | null;
  planType: string;
  planTypeCode: string;
  schemaName: string;
  createdAt: string;
}
import { AlertsBell } from '@/components/alerts/AlertsBell';
import styles from './page.module.css';

const CASE_TYPE_LABELS: Record<DisputeCaseType, string> = {
  SECTION504_COMPLAINT: '504 Complaint',
  IEP_DISPUTE: 'IEP Dispute',
  RECORDS_REQUEST: 'Records Request',
  OTHER: 'Other',
};

const CASE_STATUS_LABELS: Record<DisputeCaseStatus, string> = {
  OPEN: 'Open',
  IN_REVIEW: 'In Review',
  RESOLVED: 'Resolved',
  CLOSED: 'Closed',
};

const CASE_STATUS_COLORS: Record<DisputeCaseStatus, string> = {
  OPEN: '#1976d2',
  IN_REVIEW: '#f57c00',
  RESOLVED: '#388e3c',
  CLOSED: '#757575',
};

interface Props {
  params: Promise<{ id: string }>;
}

export default function StudentCasesPage({ params }: Props) {
  const { id: studentId } = use(params);
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [cases, setCases] = useState<DisputeCase[]>([]);
  const [plans, setPlans] = useState<StudentPlan[]>([]);
  const [caseTypes, setCaseTypes] = useState<DisputeCaseTypeInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // New case modal state
  const [showNewCaseModal, setShowNewCaseModal] = useState(false);
  const [newCaseData, setNewCaseData] = useState({
    caseType: 'IEP_DISPUTE' as DisputeCaseType,
    planInstanceId: '',
    summary: '',
    intakeDate: new Date().toISOString().split('T')[0],
  });
  const [creating, setCreating] = useState(false);

  // Check if user can edit (ADMIN or CASE_MANAGER)
  const canEdit = user?.role === 'ADMIN' || user?.role === 'CASE_MANAGER';

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/');
      return;
    }

    if (user) {
      loadData();
    }
  }, [authLoading, user, studentId, router]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [casesRes, typesRes, plansRes] = await Promise.all([
        api.getStudentDisputes(studentId),
        api.getDisputeCaseTypes(),
        api.getStudentPlans(studentId),
      ]);
      setCases(casesRes.disputeCases);
      setCaseTypes(typesRes.caseTypes);
      setPlans(plansRes.plans);
    } catch (err) {
      console.error('Error loading cases:', err);
      setError('Failed to load cases');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCase = async () => {
    if (!newCaseData.summary.trim()) {
      return;
    }

    try {
      setCreating(true);
      const result = await api.createDispute(studentId, {
        caseType: newCaseData.caseType,
        planInstanceId: newCaseData.planInstanceId || undefined,
        summary: newCaseData.summary,
        filedDate: newCaseData.intakeDate,
      });
      setCases(prev => [result.disputeCase, ...prev]);
      setShowNewCaseModal(false);
      setNewCaseData({
        caseType: 'IEP_DISPUTE',
        planInstanceId: '',
        summary: '',
        intakeDate: new Date().toISOString().split('T')[0],
      });
      // Navigate to the new case detail page
      router.push(`/students/${studentId}/cases/${result.disputeCase.id}`);
    } catch (err) {
      console.error('Error creating case:', err);
      setError('Failed to create case');
    } finally {
      setCreating(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>
          <div className="spinner" style={{ width: 32, height: 32 }} />
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <button className={styles.backBtn} onClick={() => router.push(`/students/${studentId}`)}>
            &larr; Back to Student
          </button>
          <div className={styles.headerActions}>
            <AlertsBell />
          </div>
        </div>
      </header>

      <main className={styles.main}>
        <div className={styles.pageHeader}>
          <h1>Cases</h1>
          {canEdit && (
            <button className="btn btn-primary" onClick={() => setShowNewCaseModal(true)}>
              New Case
            </button>
          )}
        </div>

        {error && (
          <div className={styles.error}>
            {error}
            <button onClick={() => setError(null)}>&times;</button>
          </div>
        )}

        <div className={styles.casesTable}>
          {cases.length === 0 ? (
            <div className={styles.emptyState}>
              <p>No cases found for this student.</p>
              {canEdit && (
                <button className="btn btn-primary" onClick={() => setShowNewCaseModal(true)}>
                  Create First Case
                </button>
              )}
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Case #</th>
                  <th>Open Date</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Owner</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {cases.map(c => (
                  <tr key={c.id}>
                    <td className={styles.caseNumber}>{c.caseNumber}</td>
                    <td>{format(new Date(c.filedDate), 'MMM d, yyyy')}</td>
                    <td>{CASE_TYPE_LABELS[c.caseType]}</td>
                    <td>
                      <span
                        className={styles.statusBadge}
                        style={{ backgroundColor: CASE_STATUS_COLORS[c.status] }}
                      >
                        {CASE_STATUS_LABELS[c.status]}
                      </span>
                    </td>
                    <td>{c.assignedTo?.displayName || '—'}</td>
                    <td>
                      <button
                        className="btn btn-outline btn-sm"
                        onClick={() => router.push(`/students/${studentId}/cases/${c.id}`)}
                      >
                        Open
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </main>

      {/* New Case Modal - Only for ADMIN/CASE_MANAGER */}
      {canEdit && showNewCaseModal && (
        <div className={styles.modalOverlay} onClick={() => setShowNewCaseModal(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>New Case</h2>
              <button className={styles.closeBtn} onClick={() => setShowNewCaseModal(false)}>
                &times;
              </button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.formGroup}>
                <label>Type*</label>
                <select
                  value={newCaseData.caseType}
                  onChange={e => setNewCaseData(prev => ({ ...prev, caseType: e.target.value as DisputeCaseType }))}
                >
                  {caseTypes.map(t => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.formGroup}>
                <label>Related Plan (optional)</label>
                <select
                  value={newCaseData.planInstanceId}
                  onChange={e => setNewCaseData(prev => ({ ...prev, planInstanceId: e.target.value }))}
                >
                  <option value="">— None —</option>
                  {plans.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.planType} ({format(new Date(p.startDate), 'MMM yyyy')})
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.formGroup}>
                <label>Intake Date*</label>
                <input
                  type="date"
                  value={newCaseData.intakeDate}
                  onChange={e => setNewCaseData(prev => ({ ...prev, intakeDate: e.target.value }))}
                />
              </div>

              <div className={styles.formGroup}>
                <label>Summary*</label>
                <textarea
                  value={newCaseData.summary}
                  onChange={e => setNewCaseData(prev => ({ ...prev, summary: e.target.value }))}
                  placeholder="Describe the case..."
                  rows={4}
                />
              </div>
            </div>
            <div className={styles.modalFooter}>
              <button className="btn btn-outline" onClick={() => setShowNewCaseModal(false)}>
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={handleCreateCase}
                disabled={creating || !newCaseData.summary.trim()}
              >
                {creating ? 'Creating...' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
