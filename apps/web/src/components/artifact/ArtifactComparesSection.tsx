'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { api, ArtifactComparison } from '@/lib/api';
import { mapApiErrorToMessage } from '@/lib/errorMapping';
import styles from './ArtifactComparesSection.module.css';

interface ArtifactComparesSectionProps {
  studentId?: string;
  planId?: string;
  showPlanInfo?: boolean;
}

export function ArtifactComparesSection({
  studentId,
  planId,
  showPlanInfo = true,
}: ArtifactComparesSectionProps) {
  const [comparisons, setComparisons] = useState<ArtifactComparison[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedComparison, setSelectedComparison] = useState<ArtifactComparison | null>(null);

  useEffect(() => {
    async function loadComparisons() {
      try {
        setLoading(true);
        setError(null);

        let result: { comparisons: ArtifactComparison[] };
        if (studentId) {
          result = await api.getStudentArtifactCompares(studentId);
        } else if (planId) {
          result = await api.getPlanArtifactCompares(planId);
        } else {
          setComparisons([]);
          return;
        }

        setComparisons(result.comparisons);
      } catch (err) {
        setError(mapApiErrorToMessage(err));
      } finally {
        setLoading(false);
      }
    }

    loadComparisons();
  }, [studentId, planId]);

  if (loading) {
    return (
      <div className={styles.loading}>
        <div className="spinner" />
        <span>Loading artifact comparisons...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.error}>
        <p>{error}</p>
      </div>
    );
  }

  const getPlanTypeLabel = (code: string): string => {
    switch (code) {
      case 'IEP':
        return 'IEP';
      case 'FIVE_OH_FOUR':
        return '504 Plan';
      case 'BEHAVIOR_PLAN':
        return 'Behavior Plan';
      default:
        return code;
    }
  };

  return (
    <div className={styles.container}>
      {comparisons.length === 0 ? (
        <p className={styles.empty}>
          No artifact comparisons yet. Use the &quot;Compare Artifacts&quot; feature on a plan to create one.
        </p>
      ) : (
        <div className={styles.list}>
          {comparisons.map((comparison) => (
            <div key={comparison.id} className={styles.item}>
              <div className={styles.itemHeader}>
                <div className={styles.itemInfo}>
                  <span className={styles.date}>
                    {format(new Date(comparison.artifactDate), 'MMM d, yyyy')}
                  </span>
                  {showPlanInfo && (
                    <span className={styles.planType}>
                      {getPlanTypeLabel(comparison.planTypeCode)}
                      {comparison.planLabel && ` - ${comparison.planLabel}`}
                    </span>
                  )}
                </div>
                <div className={styles.itemStatus}>
                  {comparison.analysisText ? (
                    <span className={styles.statusComplete}>Analysis complete</span>
                  ) : (
                    <span className={styles.statusPending}>Pending analysis</span>
                  )}
                </div>
              </div>

              {comparison.description && (
                <p className={styles.description}>{comparison.description}</p>
              )}

              <div className={styles.itemMeta}>
                <span>Created: {format(new Date(comparison.createdAt), 'MMM d, yyyy h:mm a')}</span>
                {comparison.createdBy && <span> by {comparison.createdBy}</span>}
              </div>

              <div className={styles.itemActions}>
                <button
                  className="btn btn-sm btn-outline"
                  onClick={() => setSelectedComparison(comparison)}
                >
                  View Details
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Detail Modal */}
      {selectedComparison && (
        <div className={styles.modalOverlay} onClick={() => setSelectedComparison(null)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>Artifact Comparison</h3>
              <button
                className={styles.closeBtn}
                onClick={() => setSelectedComparison(null)}
              >
                &times;
              </button>
            </div>

            <div className={styles.modalContent}>
              <div className={styles.detailSection}>
                <h4>Details</h4>
                <div className={styles.detailGrid}>
                  <div className={styles.detailItem}>
                    <span className={styles.detailLabel}>Date:</span>
                    <span>{format(new Date(selectedComparison.artifactDate), 'MMMM d, yyyy')}</span>
                  </div>
                  <div className={styles.detailItem}>
                    <span className={styles.detailLabel}>Plan Type:</span>
                    <span>{getPlanTypeLabel(selectedComparison.planTypeCode)}</span>
                  </div>
                  {selectedComparison.description && (
                    <div className={styles.detailItem}>
                      <span className={styles.detailLabel}>Description:</span>
                      <span>{selectedComparison.description}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className={styles.detailSection}>
                <h4>Files</h4>
                <div className={styles.fileLinks}>
                  <a
                    href={selectedComparison.baselineFileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.fileLink}
                  >
                    Baseline Artifact
                  </a>
                  <a
                    href={selectedComparison.compareFileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.fileLink}
                  >
                    Student Artifact
                  </a>
                </div>
              </div>

              <div className={styles.detailSection}>
                <h4>Analysis</h4>
                {selectedComparison.analysisText ? (
                  <div className={styles.analysisText}>
                    <pre>{selectedComparison.analysisText}</pre>
                  </div>
                ) : (
                  <p className={styles.noAnalysis}>
                    Analysis not yet run. Open the plan to run the comparison.
                  </p>
                )}
              </div>
            </div>

            <div className={styles.modalFooter}>
              <button
                className="btn btn-outline"
                onClick={() => setSelectedComparison(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
