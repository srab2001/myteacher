'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import { api, VersionStatsResponse, VersionStatsVersionItem, VoidedDecisionItem, DecisionType } from '@/lib/api';
import styles from './page.module.css';

const DECISION_TYPE_LABELS: Record<DecisionType, string> = {
  ELIGIBILITY_CATEGORY: 'Eligibility Category',
  PLACEMENT_LRE: 'Placement / LRE',
  SERVICES_CHANGE: 'Services Change',
  GOALS_CHANGE: 'Goals Change',
  ACCOMMODATIONS_CHANGE: 'Accommodations Change',
  ESY_DECISION: 'ESY Decision',
  ASSESSMENT_PARTICIPATION: 'Assessment Participation',
  BEHAVIOR_SUPPORTS: 'Behavior Supports',
  TRANSITION_SERVICES: 'Transition Services',
  OTHER: 'Other',
};

export default function AdminVersionsPage() {
  const [stats, setStats] = useState<VersionStatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeCard, setActiveCard] = useState<'missing-sig' | 'not-distributed' | 'voided-decisions'>('missing-sig');

  useEffect(() => {
    const loadStats = async () => {
      try {
        const data = await api.getAdminVersionStats();
        setStats(data);
      } catch (err) {
        console.error('Failed to load version stats:', err);
        setError('Failed to load version statistics');
      } finally {
        setLoading(false);
      }
    };
    loadStats();
  }, []);

  if (loading) {
    return (
      <div className={styles.container}>
        <div className="loading-container">
          <div className="spinner" />
          <p>Loading version statistics...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>{error}</div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>No data available</div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <h1>Version & Signature Dashboard</h1>

      {/* Summary Cards */}
      <div className={styles.summaryGrid}>
        <div className={styles.summaryCard}>
          <div className={styles.summaryValue}>{stats.summary.totalVersions}</div>
          <div className={styles.summaryLabel}>Total Versions</div>
        </div>
        <div className={styles.summaryCard}>
          <div className={styles.summaryValue}>{stats.summary.finalVersions}</div>
          <div className={styles.summaryLabel}>Finalized</div>
        </div>
        <div className={styles.summaryCard}>
          <div className={styles.summaryValue}>{stats.summary.distributedVersions}</div>
          <div className={styles.summaryLabel}>Distributed</div>
        </div>
        <div className={styles.summaryCard}>
          <div className={styles.summaryValue}>{stats.summary.pendingSignatures}</div>
          <div className={styles.summaryLabel}>Pending Signatures</div>
        </div>
        <div className={styles.summaryCard}>
          <div className={styles.summaryValue}>{stats.summary.totalDecisions}</div>
          <div className={styles.summaryLabel}>Total Decisions</div>
        </div>
        <div className={styles.summaryCard}>
          <div className={`${styles.summaryValue} ${stats.summary.voidedDecisions > 0 ? styles.warning : ''}`}>
            {stats.summary.voidedDecisions}
          </div>
          <div className={styles.summaryLabel}>Voided Decisions</div>
        </div>
      </div>

      {/* Action Cards */}
      <div className={styles.actionCards}>
        <button
          className={`${styles.actionCard} ${activeCard === 'missing-sig' ? styles.active : ''}`}
          onClick={() => setActiveCard('missing-sig')}
        >
          <div className={styles.actionCardCount}>{stats.versionsMissingCmSignature.length}</div>
          <div className={styles.actionCardLabel}>Versions Missing CM Signature</div>
        </button>
        <button
          className={`${styles.actionCard} ${activeCard === 'not-distributed' ? styles.active : ''}`}
          onClick={() => setActiveCard('not-distributed')}
        >
          <div className={styles.actionCardCount}>{stats.versionsNotDistributed.length}</div>
          <div className={styles.actionCardLabel}>Versions Not Distributed</div>
        </button>
        <button
          className={`${styles.actionCard} ${activeCard === 'voided-decisions' ? styles.active : ''}`}
          onClick={() => setActiveCard('voided-decisions')}
        >
          <div className={styles.actionCardCount}>{stats.decisionsVoidedRecently.length}</div>
          <div className={styles.actionCardLabel}>Decisions Voided (30 days)</div>
        </button>
      </div>

      {/* Detail List */}
      <div className={styles.detailSection}>
        {activeCard === 'missing-sig' && (
          <>
            <h2>Versions Missing Case Manager Signature</h2>
            {stats.versionsMissingCmSignature.length === 0 ? (
              <div className={styles.emptyState}>No versions missing case manager signature</div>
            ) : (
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Student</th>
                    <th>Plan Type</th>
                    <th>Version</th>
                    <th>Finalized</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.versionsMissingCmSignature.map((v: VersionStatsVersionItem) => (
                    <tr key={v.id}>
                      <td>
                        <Link href={`/students/${v.planInstance.student.id}`}>
                          {v.planInstance.student.firstName} {v.planInstance.student.lastName}
                        </Link>
                      </td>
                      <td>{v.planInstance.planType.name}</td>
                      <td>v{v.versionNumber}</td>
                      <td>{format(new Date(v.finalizedAt), 'MMM d, yyyy')}</td>
                      <td>
                        <Link
                          href={`/students/${v.planInstance.student.id}/plans/${v.planInstance.id}/iep`}
                          className={styles.viewLink}
                        >
                          View Plan
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </>
        )}

        {activeCard === 'not-distributed' && (
          <>
            <h2>Versions Not Distributed</h2>
            {stats.versionsNotDistributed.length === 0 ? (
              <div className={styles.emptyState}>All versions have been distributed</div>
            ) : (
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Student</th>
                    <th>Plan Type</th>
                    <th>Version</th>
                    <th>Finalized</th>
                    <th>Signature Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.versionsNotDistributed.map((v: VersionStatsVersionItem) => {
                    const hasCmSig = v.signaturePacket?.signatures?.some(
                      s => s.role === 'CASE_MANAGER' && s.status === 'SIGNED'
                    );
                    return (
                      <tr key={v.id}>
                        <td>
                          <Link href={`/students/${v.planInstance.student.id}`}>
                            {v.planInstance.student.firstName} {v.planInstance.student.lastName}
                          </Link>
                        </td>
                        <td>{v.planInstance.planType.name}</td>
                        <td>v{v.versionNumber}</td>
                        <td>{format(new Date(v.finalizedAt), 'MMM d, yyyy')}</td>
                        <td>
                          <span className={`${styles.badge} ${hasCmSig ? styles.badgeSuccess : styles.badgeWarning}`}>
                            {hasCmSig ? 'CM Signed' : 'Awaiting CM'}
                          </span>
                        </td>
                        <td>
                          <Link
                            href={`/students/${v.planInstance.student.id}/plans/${v.planInstance.id}/iep`}
                            className={styles.viewLink}
                          >
                            View Plan
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </>
        )}

        {activeCard === 'voided-decisions' && (
          <>
            <h2>Decisions Voided in Last 30 Days</h2>
            {stats.decisionsVoidedRecently.length === 0 ? (
              <div className={styles.emptyState}>No decisions have been voided recently</div>
            ) : (
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Student</th>
                    <th>Decision Type</th>
                    <th>Summary</th>
                    <th>Voided</th>
                    <th>Voided By</th>
                    <th>Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.decisionsVoidedRecently.map((d: VoidedDecisionItem) => (
                    <tr key={d.id}>
                      <td>
                        <Link href={`/students/${d.planInstance.student.id}`}>
                          {d.planInstance.student.firstName} {d.planInstance.student.lastName}
                        </Link>
                      </td>
                      <td>
                        <span className={styles.typeLabel}>
                          {DECISION_TYPE_LABELS[d.decisionType] || d.decisionType}
                        </span>
                      </td>
                      <td className={styles.summaryCell}>{d.summary}</td>
                      <td>{format(new Date(d.voidedAt), 'MMM d, yyyy')}</td>
                      <td>{d.voidedBy.displayName}</td>
                      <td className={styles.reasonCell}>{d.voidReason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </>
        )}
      </div>
    </div>
  );
}
