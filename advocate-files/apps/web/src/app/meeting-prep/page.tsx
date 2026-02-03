'use client';

import React, { useState } from 'react';
import { GuideIntake, GeneratedMaterials } from '@/components/meeting-prep';
import { MeetingPrepFormData } from '@/lib/meeting-prep/types';
import styles from './page.module.css';

interface GeneratedMaterialsData {
  agenda: {
    items: Array<{
      id: string;
      title: string;
      duration: number;
      description: string;
      presenter?: string;
    }>;
    totalDuration: number;
    meetingDate: string;
    meetingType: string;
  };
  questions: string[];
  parentConcernsLetter: string;
  recordsRequestEmail: string;
  followUpEmail: string;
}

interface MeetingPrepResult {
  prep_id: string;
  meeting_type: string;
  meeting_date: string;
  generated_materials: GeneratedMaterialsData;
  created_at: string;
}

export default function MeetingPrepPage() {
  const [view, setView] = useState<'intake' | 'materials'>('intake');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [prepResult, setPrepResult] = useState<MeetingPrepResult | null>(null);
  const [materials, setMaterials] = useState<GeneratedMaterialsData | null>(null);
  const [studentAlias, setStudentAlias] = useState('My Child');

  const handleSubmit = async (formData: MeetingPrepFormData) => {
    setIsLoading(true);
    setError(null);

    // Use student name from form if provided
    if (formData.studentName) {
      setStudentAlias(formData.studentName);
    }

    try {
      const response = await fetch('/api/meeting-prep/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          studentAlias: formData.studentName || studentAlias,
          meetingType: formData.meetingType,
          meetingDate: formData.meetingDate,
          attendees: formData.attendees,
          concerns: formData.concerns.map((c) => ({
            area: c.area,
            description: c.description,
          })),
          desiredOutcomes: formData.desiredOutcomes,
          recentEvaluations: formData.recentEvaluations,
          currentChallenges: formData.whatsNotWorking,
          currentServices: formData.currentServices,
          whatsWorking: formData.whatsWorking,
          whatsNotWorking: formData.whatsNotWorking,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate meeting preparation materials');
      }

      const result: MeetingPrepResult = await response.json();
      setPrepResult(result);
      setMaterials(result.generated_materials);
      setView('materials');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    // Reset the form
    setView('intake');
    setPrepResult(null);
    setMaterials(null);
  };

  const handleMaterialsUpdate = (updatedMaterials: GeneratedMaterialsData) => {
    setMaterials(updatedMaterials);
  };

  const handleExport = async (format: 'pdf' | 'docx' | 'html') => {
    if (!prepResult || !materials) return;

    try {
      const response = await fetch(`/api/meeting-prep/${prepResult.prep_id}/export`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          materials,
          studentAlias,
          format,
        }),
      });

      if (format === 'html') {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `meeting-prep-${prepResult.prep_id}.html`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        const result = await response.json();
        if (result.html) {
          const blob = new Blob([result.html], { type: 'text/html' });
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `meeting-prep-${prepResult.prep_id}.html`;
          document.body.appendChild(a);
          a.click();
          window.URL.revokeObjectURL(url);
          document.body.removeChild(a);
        }
      }
    } catch (err) {
      console.error('Export failed:', err);
      setError('Failed to export materials');
    }
  };

  const handleStartNew = () => {
    setPrepResult(null);
    setMaterials(null);
    setView('intake');
  };

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div>
          <h1>IEP Meeting Preparation</h1>
          <p>
            Prepare for your IEP meeting with guided questions and AI-generated materials.
          </p>
        </div>
        {view === 'materials' && (
          <button onClick={handleStartNew} className={styles.newPrepButton}>
            Start New Preparation
          </button>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div className={styles.error}>
          <p>{error}</p>
          <button onClick={() => setError(null)}>Dismiss</button>
        </div>
      )}

      {/* Main Content */}
      <div className={styles.content}>
        {view === 'intake' ? (
          <GuideIntake
            studentAlias={studentAlias}
            onSubmit={handleSubmit}
            onCancel={handleCancel}
            isLoading={isLoading}
          />
        ) : (
          materials &&
          prepResult && (
            <GeneratedMaterials
              prepId={prepResult.prep_id}
              materials={materials}
              studentAlias={studentAlias}
              onMaterialsUpdate={handleMaterialsUpdate}
              onExport={handleExport}
            />
          )
        )}
      </div>
    </div>
  );
}
