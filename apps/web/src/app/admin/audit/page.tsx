'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { useAuth } from '@/lib/auth-context';
import {
  api,
  AuditLog,
  AuditLogFilters,
  AuditActionType,
  AuditEntityType,
  AuditActionTypeInfo,
  AuditEntityTypeInfo,
  AuditUser,
} from '@/lib/api';
import styles from './page.module.css';

const ACTION_TYPE_LABELS: Record<AuditActionType, string> = {
  PLAN_VIEWED: 'Plan Viewed',
  PLAN_UPDATED: 'Plan Updated',
  PLAN_FINALIZED: 'Plan Finalized',
  PDF_EXPORTED: 'PDF Exported',
  PDF_DOWNLOADED: 'PDF Downloaded',
  SIGNATURE_ADDED: 'Signature Added',
  REVIEW_SCHEDULE_CREATED: 'Review Schedule Created',
  CASE_VIEWED: 'Case Viewed',
  CASE_EXPORTED: 'Case Exported',
  PERMISSION_DENIED: 'Permission Denied',
};

const ENTITY_TYPE_LABELS: Record<AuditEntityType, string> = {
  PLAN: 'Plan',
  PLAN_VERSION: 'Plan Version',
  PLAN_EXPORT: 'Plan Export',
  STUDENT: 'Student',
  GOAL: 'Goal',
  SERVICE: 'Service',
  REVIEW_SCHEDULE: 'Review Schedule',
  COMPLIANCE_TASK: 'Compliance Task',
  DISPUTE_CASE: 'Dispute Case',
  SIGNATURE_PACKET: 'Signature Packet',
  MEETING: 'Meeting',
};

export default function AdminAuditPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 50, total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter data
  const [actionTypes, setActionTypes] = useState<AuditActionTypeInfo[]>([]);
  const [entityTypes, setEntityTypes] = useState<AuditEntityTypeInfo[]>([]);
  const [users, setUsers] = useState<AuditUser[]>([]);

  // Filter state
  const [filters, setFilters] = useState<AuditLogFilters>({
    dateFrom: '',
    dateTo: '',
    userId: '',
    studentId: '',
    actionType: undefined,
    entityType: undefined,
  });

  // Detail drawer state
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/');
      return;
    }

    if (!authLoading && user && user.role !== 'ADMIN') {
      router.push('/dashboard');
      return;
    }

    if (user) {
      loadFilterData();
      loadLogs();
    }
  }, [authLoading, user, router]);

  const loadFilterData = async () => {
    try {
      const [actionRes, entityRes, usersRes] = await Promise.all([
        api.getAuditActionTypes(),
        api.getAuditEntityTypes(),
        api.getAuditUsers(),
      ]);
      setActionTypes(actionRes.actionTypes);
      setEntityTypes(entityRes.entityTypes);
      setUsers(usersRes.users);
    } catch (err) {
      console.error('Error loading filter data:', err);
    }
  };

  const loadLogs = async (page = 1) => {
    try {
      setLoading(true);
      const result = await api.getAuditLogs(
        {
          dateFrom: filters.dateFrom || undefined,
          dateTo: filters.dateTo || undefined,
          userId: filters.userId || undefined,
          studentId: filters.studentId || undefined,
          actionType: filters.actionType,
          entityType: filters.entityType,
        },
        page,
        50
      );
      setLogs(result.auditLogs);
      setPagination(result.pagination);
    } catch (err) {
      console.error('Error loading audit logs:', err);
      setError('Failed to load audit logs');
    } finally {
      setLoading(false);
    }
  };

  const handleRunFilter = () => {
    loadLogs(1);
  };

  const handleExportCsv = async () => {
    try {
      const blob = await api.exportAuditLogs({
        dateFrom: filters.dateFrom || undefined,
        dateTo: filters.dateTo || undefined,
        userId: filters.userId || undefined,
        studentId: filters.studentId || undefined,
        actionType: filters.actionType,
        entityType: filters.entityType,
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit-log-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error exporting audit logs:', err);
      setError('Failed to export audit logs');
    }
  };

  const handleRowClick = async (log: AuditLog) => {
    try {
      setLoadingDetail(true);
      const result = await api.getAuditLog(log.id);
      setSelectedLog(result.auditLog);
    } catch (err) {
      console.error('Error loading audit detail:', err);
    } finally {
      setLoadingDetail(false);
    }
  };

  const handlePageChange = (newPage: number) => {
    loadLogs(newPage);
  };

  if (authLoading || (!user && loading)) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>
          <div className="spinner" style={{ width: 32, height: 32 }} />
        </div>
      </div>
    );
  }

  if (!user || user.role !== 'ADMIN') {
    return null;
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <button className={styles.backBtn} onClick={() => router.push('/admin')}>
            &larr; Back to Admin
          </button>
          <h1>Audit Log</h1>
        </div>
      </header>

      <main className={styles.main}>
        {error && (
          <div className={styles.error}>
            {error}
            <button onClick={() => setError(null)}>&times;</button>
          </div>
        )}

        {/* Filters */}
        <div className={styles.filters}>
          <div className={styles.filterRow}>
            <div className={styles.filterGroup}>
              <label>Date From</label>
              <input
                type="date"
                value={filters.dateFrom}
                onChange={e => setFilters(prev => ({ ...prev, dateFrom: e.target.value }))}
              />
            </div>
            <div className={styles.filterGroup}>
              <label>Date To</label>
              <input
                type="date"
                value={filters.dateTo}
                onChange={e => setFilters(prev => ({ ...prev, dateTo: e.target.value }))}
              />
            </div>
            <div className={styles.filterGroup}>
              <label>User</label>
              <select
                value={filters.userId}
                onChange={e => setFilters(prev => ({ ...prev, userId: e.target.value }))}
              >
                <option value="">All Users</option>
                {users.map(u => (
                  <option key={u.id} value={u.id}>{u.displayName}</option>
                ))}
              </select>
            </div>
          </div>
          <div className={styles.filterRow}>
            <div className={styles.filterGroup}>
              <label>Student ID</label>
              <input
                type="text"
                placeholder="Enter Student ID..."
                value={filters.studentId}
                onChange={e => setFilters(prev => ({ ...prev, studentId: e.target.value }))}
              />
            </div>
            <div className={styles.filterGroup}>
              <label>Action</label>
              <select
                value={filters.actionType || ''}
                onChange={e => setFilters(prev => ({
                  ...prev,
                  actionType: e.target.value ? e.target.value as AuditActionType : undefined
                }))}
              >
                <option value="">All Actions</option>
                {actionTypes.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            <div className={styles.filterGroup}>
              <label>Entity</label>
              <select
                value={filters.entityType || ''}
                onChange={e => setFilters(prev => ({
                  ...prev,
                  entityType: e.target.value ? e.target.value as AuditEntityType : undefined
                }))}
              >
                <option value="">All Entities</option>
                {entityTypes.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
          </div>
          <div className={styles.filterActions}>
            <button className="btn btn-primary" onClick={handleRunFilter}>
              Run
            </button>
            <button className="btn btn-outline" onClick={handleExportCsv}>
              Export CSV
            </button>
          </div>
        </div>

        {/* Results Table */}
        <div className={styles.resultsTable}>
          {loading ? (
            <div className={styles.tableLoading}>
              <div className="spinner" style={{ width: 24, height: 24 }} />
            </div>
          ) : logs.length === 0 ? (
            <div className={styles.emptyState}>
              <p>No audit records found.</p>
            </div>
          ) : (
            <>
              <table>
                <thead>
                  <tr>
                    <th>Time</th>
                    <th>User</th>
                    <th>Action</th>
                    <th>Entity</th>
                    <th>Entity ID</th>
                    <th>Student</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map(log => (
                    <tr
                      key={log.id}
                      onClick={() => handleRowClick(log)}
                      className={log.actionType === 'PERMISSION_DENIED' ? styles.deniedRow : ''}
                    >
                      <td className={styles.timeCell}>
                        {format(new Date(log.timestamp), 'MMM d, yyyy HH:mm:ss')}
                      </td>
                      <td>{log.actor.displayName}</td>
                      <td>
                        <span className={`${styles.actionBadge} ${styles[`action${log.actionType}`]}`}>
                          {ACTION_TYPE_LABELS[log.actionType] || log.actionType}
                        </span>
                      </td>
                      <td>{ENTITY_TYPE_LABELS[log.entityType] || log.entityType}</td>
                      <td className={styles.entityId}>{log.entityId.slice(0, 8)}...</td>
                      <td>{log.studentId ? log.studentId.slice(0, 8) + '...' : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Pagination */}
              <div className={styles.pagination}>
                <span className={styles.paginationInfo}>
                  Page {pagination.page} of {pagination.totalPages} ({pagination.total} records)
                </span>
                <div className={styles.paginationButtons}>
                  <button
                    className="btn btn-outline btn-sm"
                    disabled={pagination.page <= 1}
                    onClick={() => handlePageChange(pagination.page - 1)}
                  >
                    Previous
                  </button>
                  <button
                    className="btn btn-outline btn-sm"
                    disabled={pagination.page >= pagination.totalPages}
                    onClick={() => handlePageChange(pagination.page + 1)}
                  >
                    Next
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </main>

      {/* Detail Drawer */}
      {selectedLog && (
        <div className={styles.drawerOverlay} onClick={() => setSelectedLog(null)}>
          <div className={styles.drawer} onClick={e => e.stopPropagation()}>
            <div className={styles.drawerHeader}>
              <h2>Audit Record</h2>
              <button className={styles.closeBtn} onClick={() => setSelectedLog(null)}>
                &times;
              </button>
            </div>
            <div className={styles.drawerBody}>
              {loadingDetail ? (
                <div className={styles.drawerLoading}>
                  <div className="spinner" style={{ width: 24, height: 24 }} />
                </div>
              ) : (
                <>
                  <div className={styles.detailItem}>
                    <label>Time</label>
                    <span>{format(new Date(selectedLog.timestamp), 'MMMM d, yyyy HH:mm:ss')}</span>
                  </div>
                  <div className={styles.detailItem}>
                    <label>User</label>
                    <span>{selectedLog.actor.displayName} ({selectedLog.actor.email})</span>
                  </div>
                  <div className={styles.detailItem}>
                    <label>Role</label>
                    <span>{selectedLog.actor.role || '—'}</span>
                  </div>
                  <div className={styles.detailItem}>
                    <label>Action</label>
                    <span className={`${styles.actionBadge} ${styles[`action${selectedLog.actionType}`]}`}>
                      {ACTION_TYPE_LABELS[selectedLog.actionType] || selectedLog.actionType}
                    </span>
                  </div>
                  <div className={styles.detailItem}>
                    <label>Entity</label>
                    <span>{ENTITY_TYPE_LABELS[selectedLog.entityType] || selectedLog.entityType}</span>
                  </div>
                  <div className={styles.detailItem}>
                    <label>Entity ID</label>
                    <span className={styles.monospace}>{selectedLog.entityId}</span>
                  </div>
                  {selectedLog.student && (
                    <div className={styles.detailItem}>
                      <label>Student</label>
                      <span>{selectedLog.student.name} ({selectedLog.student.recordId})</span>
                    </div>
                  )}
                  {selectedLog.plan && (
                    <div className={styles.detailItem}>
                      <label>Plan</label>
                      <span>{selectedLog.plan.planTypeName} ({selectedLog.plan.status})</span>
                    </div>
                  )}
                  {selectedLog.planVersionId && (
                    <div className={styles.detailItem}>
                      <label>Version ID</label>
                      <span className={styles.monospace}>{selectedLog.planVersionId}</span>
                    </div>
                  )}
                  <div className={styles.detailItem}>
                    <label>IP Address</label>
                    <span>{selectedLog.ipAddress || '—'}</span>
                  </div>
                  <div className={styles.detailItem}>
                    <label>User Agent</label>
                    <span className={styles.userAgent}>{selectedLog.userAgent || '—'}</span>
                  </div>
                  {selectedLog.metadata && Object.keys(selectedLog.metadata).length > 0 && (
                    <div className={styles.detailItem}>
                      <label>Metadata</label>
                      <pre className={styles.metadata}>
                        {JSON.stringify(selectedLog.metadata, null, 2)}
                      </pre>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
