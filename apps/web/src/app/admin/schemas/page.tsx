'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { useAuth } from '@/lib/auth-context';
import { api, AdminSchema, PlanTypeCode, Jurisdiction } from '@/lib/api';
import styles from './page.module.css';

const PLAN_TYPE_LABELS: Record<PlanTypeCode, string> = {
  IEP: 'IEP',
  FIVE_OH_FOUR: '504 Plan',
  BEHAVIOR_PLAN: 'Behavior Plan',
};

export default function AdminSchemasPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [schemas, setSchemas] = useState<AdminSchema[]>([]);
  const [jurisdictions, setJurisdictions] = useState<Jurisdiction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [planTypeFilter, setPlanTypeFilter] = useState<PlanTypeCode | ''>('');
  const [jurisdictionFilter, setJurisdictionFilter] = useState('');
  const [activeOnlyFilter, setActiveOnlyFilter] = useState(false);

  const canManageDocs = user?.role === 'ADMIN';

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/');
    }
  }, [user, authLoading, router]);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [schemasRes, jurRes] = await Promise.all([
        api.getAdminSchemas({
          planType: planTypeFilter || undefined,
          jurisdictionId: jurisdictionFilter || undefined,
          activeOnly: activeOnlyFilter || undefined,
        }),
        api.getAdminJurisdictions(),
      ]);
      setSchemas(schemasRes.schemas);
      setJurisdictions(jurRes.jurisdictions);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load schemas');
    } finally {
      setLoading(false);
    }
  }, [planTypeFilter, jurisdictionFilter, activeOnlyFilter]);

  useEffect(() => {
    if (user?.isOnboarded && canManageDocs) {
      loadData();
    }
  }, [user, canManageDocs, loadData]);

  if (authLoading) {
    return (
      <div className="loading-container">
        <div className="spinner" />
      </div>
    );
  }

  if (!canManageDocs) {
    return (
      <div className={styles.container}>
        <div className={styles.accessDenied}>
          <h2>Access Denied</h2>
          <p>You do not have permission to view this page.</p>
          <button className="btn btn-primary" onClick={() => router.push('/dashboard')}>
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.pageHeader}>
        <div>
          <button className={styles.backBtn} onClick={() => router.push('/dashboard')}>
            &larr; Back to Dashboard
          </button>
          <h2>Plan Schemas</h2>
          <p className={styles.description}>
            View and manage plan schemas used across the system.
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className={styles.filterPanel}>
        <div className={styles.filterGroup}>
          <label>Plan Type</label>
          <select
            value={planTypeFilter}
            onChange={(e) => setPlanTypeFilter(e.target.value as PlanTypeCode | '')}
          >
            <option value="">All Plan Types</option>
            <option value="IEP">IEP</option>
            <option value="FIVE_OH_FOUR">504 Plan</option>
            <option value="BEHAVIOR_PLAN">Behavior Plan</option>
          </select>
        </div>
        <div className={styles.filterGroup}>
          <label>Jurisdiction</label>
          <select
            value={jurisdictionFilter}
            onChange={(e) => setJurisdictionFilter(e.target.value)}
          >
            <option value="">All Jurisdictions</option>
            {jurisdictions.map(j => (
              <option key={j.id} value={j.id}>
                {j.districtName} ({j.stateCode})
              </option>
            ))}
          </select>
        </div>
        <div className={styles.filterGroup}>
          <label className={styles.checkbox}>
            <input
              type="checkbox"
              checked={activeOnlyFilter}
              onChange={(e) => setActiveOnlyFilter(e.target.checked)}
            />
            Active Only
          </label>
        </div>
      </div>

      {error && (
        <div className={styles.errorMessage}>{error}</div>
      )}

      {loading ? (
        <div className="loading-container">
          <div className="spinner" />
        </div>
      ) : schemas.length === 0 ? (
        <div className={styles.emptyState}>
          <p>No schemas found matching the current filters.</p>
        </div>
      ) : (
        <div className={styles.tableContainer}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Name</th>
                <th>Plan Type</th>
                <th>Version</th>
                <th>Jurisdiction</th>
                <th>Status</th>
                <th>Plans</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {schemas.map(schema => (
                <tr key={schema.id}>
                  <td>
                    <div className={styles.nameCell}>
                      <span className={styles.schemaName}>{schema.name}</span>
                      {schema.description && (
                        <span className={styles.schemaDescription}>{schema.description}</span>
                      )}
                    </div>
                  </td>
                  <td>
                    <span className={styles.planTypeBadge}>
                      {PLAN_TYPE_LABELS[schema.planType]}
                    </span>
                  </td>
                  <td>v{schema.version}</td>
                  <td>{schema.jurisdictionName || 'Default'}</td>
                  <td>
                    <span className={`${styles.statusBadge} ${schema.isActive ? styles.active : styles.inactive}`}>
                      {schema.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td>
                    <span className={styles.planCount}>{schema.planCount} plans</span>
                  </td>
                  <td>{format(new Date(schema.createdAt), 'MMM d, yyyy')}</td>
                  <td>
                    <button
                      className={styles.viewBtn}
                      onClick={() => router.push(`/admin/schemas/${schema.id}`)}
                    >
                      View Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
