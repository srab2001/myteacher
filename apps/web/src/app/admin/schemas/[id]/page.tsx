'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { format } from 'date-fns';
import { useAuth } from '@/lib/auth-context';
import { api, AdminSchema, SchemaPlanInstance, PlanTypeCode } from '@/lib/api';
import styles from './page.module.css';

const PLAN_TYPE_LABELS: Record<PlanTypeCode, string> = {
  IEP: 'IEP',
  FIVE_OH_FOUR: '504 Plan',
  BEHAVIOR_PLAN: 'Behavior Plan',
};

export default function SchemaDetailPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const schemaId = params.id as string;

  const [schema, setSchema] = useState<AdminSchema | null>(null);
  const [plans, setPlans] = useState<SchemaPlanInstance[]>([]);
  const [plansTotal, setPlansTotal] = useState(0);
  const [plansPage, setPlansPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingPlans, setLoadingPlans] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showRawJson, setShowRawJson] = useState(false);

  const canManageDocs = user?.role === 'ADMIN';
  const plansPerPage = 10;

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/');
    }
  }, [user, authLoading, router]);

  const loadSchema = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { schema } = await api.getAdminSchema(schemaId);
      setSchema(schema);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load schema');
    } finally {
      setLoading(false);
    }
  }, [schemaId]);

  const loadPlans = useCallback(async (page: number) => {
    setLoadingPlans(true);
    try {
      const result = await api.getSchemaPlans(schemaId, page, plansPerPage);
      setPlans(result.plans);
      setPlansTotal(result.total);
      setPlansPage(page);
    } catch (err) {
      console.error('Failed to load plans:', err);
    } finally {
      setLoadingPlans(false);
    }
  }, [schemaId]);

  useEffect(() => {
    if (user?.isOnboarded && canManageDocs && schemaId) {
      loadSchema();
      loadPlans(1);
    }
  }, [user, canManageDocs, schemaId, loadSchema, loadPlans]);

  const totalPages = Math.ceil(plansTotal / plansPerPage);

  if (authLoading || loading) {
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

  if (error || !schema) {
    return (
      <div className={styles.container}>
        <div className={styles.accessDenied}>
          <h2>{error || 'Schema not found'}</h2>
          <button className="btn btn-primary" onClick={() => router.push('/admin/schemas')}>
            Back to Schemas
          </button>
        </div>
      </div>
    );
  }

  // Count sections and fields
  const sectionCount = schema.fields?.sections?.length || 0;
  const fieldCount = schema.fields?.sections?.reduce(
    (total, section) => total + (section.fields?.length || 0), 0
  ) || 0;

  return (
    <div className={styles.container}>
      <div className={styles.pageHeader}>
        <button className={styles.backBtn} onClick={() => router.push('/admin/schemas')}>
          &larr; Back to Schemas
        </button>
        <div className={styles.headerMain}>
          <div>
            <h1>{schema.name}</h1>
            {schema.description && <p className={styles.description}>{schema.description}</p>}
          </div>
          <span className={`${styles.statusBadge} ${schema.isActive ? styles.active : styles.inactive}`}>
            {schema.isActive ? 'Active' : 'Inactive'}
          </span>
        </div>
      </div>

      {/* Schema Info Cards */}
      <div className={styles.infoCards}>
        <div className={styles.infoCard}>
          <span className={styles.infoLabel}>Plan Type</span>
          <span className={styles.infoValue}>{PLAN_TYPE_LABELS[schema.planType]}</span>
        </div>
        <div className={styles.infoCard}>
          <span className={styles.infoLabel}>Version</span>
          <span className={styles.infoValue}>v{schema.version}</span>
        </div>
        <div className={styles.infoCard}>
          <span className={styles.infoLabel}>Jurisdiction</span>
          <span className={styles.infoValue}>{schema.jurisdictionName || 'Default'}</span>
        </div>
        <div className={styles.infoCard}>
          <span className={styles.infoLabel}>Sections</span>
          <span className={styles.infoValue}>{sectionCount}</span>
        </div>
        <div className={styles.infoCard}>
          <span className={styles.infoLabel}>Fields</span>
          <span className={styles.infoValue}>{fieldCount}</span>
        </div>
        <div className={styles.infoCard}>
          <span className={styles.infoLabel}>Plans Using</span>
          <span className={styles.infoValue}>{schema.planCount}</span>
        </div>
      </div>

      <div className={styles.metaInfo}>
        <span>Created: {format(new Date(schema.createdAt), 'MMM d, yyyy HH:mm')}</span>
        <span>Updated: {format(new Date(schema.updatedAt), 'MMM d, yyyy HH:mm')}</span>
      </div>

      {/* Schema Structure */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2>Schema Structure</h2>
          <button
            className="btn btn-outline btn-sm"
            onClick={() => setShowRawJson(!showRawJson)}
          >
            {showRawJson ? 'Hide Raw JSON' : 'Show Raw JSON'}
          </button>
        </div>

        {showRawJson ? (
          <div className={styles.jsonViewer}>
            <pre>{JSON.stringify(schema.fields, null, 2)}</pre>
          </div>
        ) : (
          <div className={styles.sectionsList}>
            {schema.fields?.sections?.map((section, index) => (
              <div key={section.key} className={styles.schemaSection}>
                <div className={styles.schemaSectionHeader}>
                  <span className={styles.sectionNumber}>{index + 1}</span>
                  <div>
                    <h4>{section.title}</h4>
                    <span className={styles.sectionKey}>{section.key}</span>
                  </div>
                  <span className={styles.fieldCountBadge}>
                    {section.fields?.length || 0} fields
                  </span>
                </div>
                {section.fields && section.fields.length > 0 && (
                  <div className={styles.fieldsList}>
                    {section.fields.map(field => (
                      <div key={field.key} className={styles.fieldItem}>
                        <span className={styles.fieldKey}>{field.key}</span>
                        <span className={styles.fieldLabel}>{field.label}</span>
                        <span className={styles.fieldType}>{field.type}</span>
                        {field.required && (
                          <span className={styles.requiredBadge}>Required</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Plans Using This Schema */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2>Plans Using This Schema</h2>
          <span className={styles.count}>{plansTotal} total</span>
        </div>

        {loadingPlans ? (
          <div className="loading-container">
            <div className="spinner" />
          </div>
        ) : plans.length === 0 ? (
          <p className={styles.emptyMessage}>No plans are using this schema yet.</p>
        ) : (
          <>
            <div className={styles.plansTable}>
              <table>
                <thead>
                  <tr>
                    <th>Student</th>
                    <th>Grade</th>
                    <th>Status</th>
                    <th>Start Date</th>
                    <th>End Date</th>
                    <th>Created</th>
                  </tr>
                </thead>
                <tbody>
                  {plans.map(plan => (
                    <tr key={plan.id}>
                      <td className={styles.studentName}>{plan.studentName}</td>
                      <td>{plan.studentGrade}</td>
                      <td>
                        <span className={`${styles.planStatusBadge} ${styles[plan.status.toLowerCase()]}`}>
                          {plan.status}
                        </span>
                      </td>
                      <td>{format(new Date(plan.startDate), 'MMM d, yyyy')}</td>
                      <td>{plan.endDate ? format(new Date(plan.endDate), 'MMM d, yyyy') : '-'}</td>
                      <td>{format(new Date(plan.createdAt), 'MMM d, yyyy')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className={styles.pagination}>
                <button
                  className="btn btn-outline btn-sm"
                  onClick={() => loadPlans(plansPage - 1)}
                  disabled={plansPage <= 1}
                >
                  Previous
                </button>
                <span className={styles.pageInfo}>
                  Page {plansPage} of {totalPages}
                </span>
                <button
                  className="btn btn-outline btn-sm"
                  onClick={() => loadPlans(plansPage + 1)}
                  disabled={plansPage >= totalPages}
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}
