'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Case, CreateCaseRequest } from '@/lib/db/types';
import { CaseForm } from '@/components/timeline';
import styles from './Cases.module.css';

export default function CasesPage() {
  const [cases, setCases] = useState<Case[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchCases();
  }, []);

  const fetchCases = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/cases');
      if (!response.ok) throw new Error('Failed to fetch cases');
      const data = await response.json();
      setCases(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load cases');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateCase = async (data: CreateCaseRequest) => {
    try {
      const response = await fetch('/api/cases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) throw new Error('Failed to create case');

      const newCase = await response.json();
      setCases((prev) => [newCase, ...prev]);
      setShowForm(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create case');
    }
  };

  const getStatusBadge = (status: string) => {
    const statusStyles: Record<string, string> = {
      active: styles.statusActive,
      closed: styles.statusClosed,
      archived: styles.statusArchived,
    };
    return statusStyles[status] || styles.statusActive;
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <h1 className={styles.title}>Cases</h1>
          <p className={styles.subtitle}>
            Manage student cases and track special education timelines
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className={styles.newCaseButton}
        >
          {showForm ? 'Cancel' : '+ New Case'}
        </button>
      </header>

      {error && (
        <div className={styles.error}>
          {error}
          <button onClick={() => setError(null)} className={styles.dismissError}>
            Dismiss
          </button>
        </div>
      )}

      {showForm && (
        <div className={styles.formContainer}>
          <CaseForm
            onSubmit={handleCreateCase}
            onCancel={() => setShowForm(false)}
          />
        </div>
      )}

      {isLoading ? (
        <div className={styles.loading}>Loading cases...</div>
      ) : cases.length === 0 ? (
        <div className={styles.emptyState}>
          <h3>No cases yet</h3>
          <p>Create your first case to start tracking deadlines and events.</p>
          <button
            onClick={() => setShowForm(true)}
            className={styles.newCaseButton}
          >
            Create First Case
          </button>
        </div>
      ) : (
        <div className={styles.casesList}>
          {cases.map((caseItem) => (
            <Link
              key={caseItem.id}
              href={`/cases/${caseItem.id}`}
              className={styles.caseCard}
            >
              <div className={styles.caseHeader}>
                <h3 className={styles.caseName}>{caseItem.student_name}</h3>
                <span className={`${styles.statusBadge} ${getStatusBadge(caseItem.status)}`}>
                  {caseItem.status}
                </span>
              </div>
              <div className={styles.caseDetails}>
                {caseItem.student_grade && (
                  <span className={styles.detail}>
                    <strong>Grade:</strong> {caseItem.student_grade}
                  </span>
                )}
                {caseItem.school_name && (
                  <span className={styles.detail}>
                    <strong>School:</strong> {caseItem.school_name}
                  </span>
                )}
                {caseItem.disability_category && (
                  <span className={styles.detail}>
                    <strong>Category:</strong> {caseItem.disability_category}
                  </span>
                )}
                <span className={styles.detail}>
                  <strong>Plan:</strong> {caseItem.plan_type.toUpperCase()}
                </span>
              </div>
              <div className={styles.caseFooter}>
                <span className={styles.caseDate}>
                  Created: {new Date(caseItem.created_at).toLocaleDateString()}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
