'use client';

import React, { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
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
  case_id: string;
  meeting_type: string;
  meeting_date: string;
  generated_materials: GeneratedMaterialsData;
  created_at: string;
}

export default function MeetingPrepPage() {
  const params = useParams();
  const router = useRouter();
  const caseId = params.id as string;

  const [view, setView] = useState<'intake' | 'materials'>('intake');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [prepResult, setPrepResult] = useState<MeetingPrepResult | null>(null);
  const [materials, setMaterials] = useState<GeneratedMaterialsData | null>(null);

  // TODO: Fetch case data and student alias
  const studentAlias = 'Student'; // Would come from case data

  // TODO: Load previous preparations from database
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [previousPreps, setPreviousPreps] = useState<MeetingPrepResult[]>([]);

  const handleSubmit = async (formData: MeetingPrepFormData) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/meeting-prep/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          caseId,
          studentAlias,
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
    router.back();
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
        // Handle PDF/DOCX export result
        if (result.html) {
          // For now, download as HTML since PDF generation requires additional setup
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

  const handleLoadPrep = (prep: MeetingPrepResult) => {
    setPrepResult(prep);
    setMaterials(prep.generated_materials);
    setView('materials');
  };

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div>
          <h1>Meeting Preparation</h1>
          <p>
            Prepare for your IEP meeting with guided questions and generated materials.
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

      {/* Previous Preparations */}
      {view === 'intake' && previousPreps.length > 0 && (
        <div className={styles.previousPreps}>
          <h3>Previous Preparations</h3>
          <div className={styles.prepsList}>
            {previousPreps.map((prep) => (
              <button
                key={prep.prep_id}
                onClick={() => handleLoadPrep(prep)}
                className={styles.prepCard}
              >
                <span className={styles.prepType}>{prep.meeting_type}</span>
                <span className={styles.prepDate}>
                  {new Date(prep.meeting_date).toLocaleDateString()}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className={styles.content}>
        {view === 'intake' ? (
          <GuideIntake
            caseId={caseId}
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
