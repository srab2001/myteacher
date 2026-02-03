'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Case, CaseEvent, DeadlineWithUrgency, CreateEventRequest } from '@/lib/db/types';
import {
  EventForm,
  DeadlineList,
  DeadlineSummary,
  TimelineVisualization,
} from '@/components/timeline';
import styles from './CaseDetail.module.css';

interface CaseWithDetails extends Case {
  events: CaseEvent[];
}

interface DeadlinesResponse {
  deadlines: DeadlineWithUrgency[];
  summary: {
    overdue: number;
    urgent: number;
    warning: number;
    normal: number;
    total: number;
  };
}

export default function CaseDetailPage() {
  const params = useParams();
  const caseId = params.id as string;

  const [caseData, setCaseData] = useState<CaseWithDetails | null>(null);
  const [deadlinesData, setDeadlinesData] = useState<DeadlinesResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showEventForm, setShowEventForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'deadlines' | 'timeline'>('deadlines');

  const fetchCaseData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [caseResponse, deadlinesResponse] = await Promise.all([
        fetch(`/api/cases/${caseId}`),
        fetch(`/api/cases/${caseId}/deadlines`),
      ]);

      if (!caseResponse.ok) throw new Error('Failed to fetch case');
      if (!deadlinesResponse.ok) throw new Error('Failed to fetch deadlines');

      const caseResult = await caseResponse.json();
      const deadlinesResult = await deadlinesResponse.json();

      setCaseData(caseResult);
      setDeadlinesData(deadlinesResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load case');
    } finally {
      setIsLoading(false);
    }
  }, [caseId]);

  useEffect(() => {
    if (caseId) {
      fetchCaseData();
    }
  }, [caseId, fetchCaseData]);

  const handleAddEvent = async (data: CreateEventRequest) => {
    try {
      const response = await fetch(`/api/cases/${caseId}/events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) throw new Error('Failed to add event');

      // Refresh all data
      await fetchCaseData();
      setShowEventForm(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add event');
    }
  };

  const handleMarkComplete = async (deadlineId: string) => {
    // TODO: Implement deadline completion
    console.log('Mark complete:', deadlineId);
  };

  if (isLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Loading case...</div>
      </div>
    );
  }

  if (!caseData) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>
          Case not found
          <Link href="/cases" className={styles.backLink}>
            Back to Cases
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <nav className={styles.breadcrumb}>
        <Link href="/cases" className={styles.breadcrumbLink}>
          Cases
        </Link>
        <span className={styles.breadcrumbSeparator}>/</span>
        <span className={styles.breadcrumbCurrent}>{caseData.student_name}</span>
      </nav>

      {error && (
        <div className={styles.errorBanner}>
          {error}
          <button onClick={() => setError(null)} className={styles.dismissError}>
            Dismiss
          </button>
        </div>
      )}

      <header className={styles.header}>
        <div className={styles.headerInfo}>
          <h1 className={styles.title}>{caseData.student_name}</h1>
          <div className={styles.meta}>
            {caseData.student_grade && <span>{caseData.student_grade}</span>}
            {caseData.school_name && <span>{caseData.school_name}</span>}
            <span className={styles.planBadge}>{caseData.plan_type.toUpperCase()}</span>
          </div>
        </div>
        <button
          onClick={() => setShowEventForm(!showEventForm)}
          className={styles.addEventButton}
        >
          {showEventForm ? 'Cancel' : '+ Add Event'}
        </button>
      </header>

      {showEventForm && (
        <div className={styles.eventFormContainer}>
          <EventForm
            caseId={caseId}
            onSubmit={handleAddEvent}
            onCancel={() => setShowEventForm(false)}
          />
        </div>
      )}

      {deadlinesData && (
        <DeadlineSummary summary={deadlinesData.summary} />
      )}

      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${activeTab === 'deadlines' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('deadlines')}
        >
          Deadlines ({deadlinesData?.deadlines.length || 0})
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'timeline' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('timeline')}
        >
          Timeline ({caseData.events?.length || 0} events)
        </button>
      </div>

      <div className={styles.content}>
        {activeTab === 'deadlines' && deadlinesData && (
          <DeadlineList
            deadlines={deadlinesData.deadlines}
            onMarkComplete={handleMarkComplete}
          />
        )}

        {activeTab === 'timeline' && deadlinesData && (
          <TimelineVisualization
            events={caseData.events || []}
            deadlines={deadlinesData.deadlines}
          />
        )}
      </div>

      {caseData.notes && (
        <div className={styles.notes}>
          <h3>Notes</h3>
          <p>{caseData.notes}</p>
        </div>
      )}
    </div>
  );
}
