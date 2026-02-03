'use client';

import { Artifact } from '@/lib/db/types';
import styles from './Artifacts.module.css';

interface ArtifactListProps {
  artifacts: Artifact[];
  onDelete?: (id: string) => void;
  onSelect?: (artifact: Artifact) => void;
  isLoading?: boolean;
}

const TYPE_LABELS: Record<string, string> = {
  iep: 'IEP',
  evaluation: 'Evaluation',
  '504_plan': '504 Plan',
  notice: 'Notice/PWN',
  progress_report: 'Progress Report',
  correspondence: 'Correspondence',
  other: 'Other',
};

const STATUS_LABELS: Record<string, { text: string; className: string }> = {
  pending: { text: 'Pending', className: 'statusPending' },
  processing: { text: 'Processing', className: 'statusProcessing' },
  completed: { text: 'Ready', className: 'statusCompleted' },
  failed: { text: 'Failed', className: 'statusFailed' },
};

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileIcon(mimeType: string): string {
  if (mimeType === 'application/pdf') return '📄';
  if (mimeType.startsWith('image/')) return '🖼️';
  return '📎';
}

export function ArtifactList({
  artifacts,
  onDelete,
  onSelect,
  isLoading,
}: ArtifactListProps) {
  if (isLoading) {
    return (
      <div className={styles.loading}>
        Loading documents...
      </div>
    );
  }

  if (artifacts.length === 0) {
    return (
      <div className={styles.emptyState}>
        <span className={styles.emptyIcon}>📁</span>
        <p>No documents uploaded yet</p>
        <p className={styles.emptyHint}>
          Upload IEPs, evaluations, and other documents to your case
        </p>
      </div>
    );
  }

  return (
    <div className={styles.artifactList}>
      {artifacts.map((artifact) => {
        const status = STATUS_LABELS[artifact.extraction_status] || STATUS_LABELS.pending;

        return (
          <div
            key={artifact.id}
            className={`${styles.artifactItem} ${onSelect ? styles.artifactClickable : ''}`}
            onClick={() => onSelect?.(artifact)}
          >
            <div className={styles.artifactIcon}>
              {getFileIcon(artifact.mime_type)}
            </div>

            <div className={styles.artifactInfo}>
              <div className={styles.artifactHeader}>
                <span className={styles.artifactName}>{artifact.file_name}</span>
                <span className={styles.artifactType}>
                  {TYPE_LABELS[artifact.artifact_type] || artifact.artifact_type}
                </span>
              </div>

              <div className={styles.artifactMeta}>
                <span>{formatFileSize(artifact.file_size_bytes)}</span>
                <span>•</span>
                <span>{new Date(artifact.uploaded_at).toLocaleDateString()}</span>
                <span>•</span>
                <span className={styles[status.className]}>{status.text}</span>
              </div>

              {artifact.extraction_status === 'failed' && artifact.extraction_error && (
                <div className={styles.artifactError}>
                  {artifact.extraction_error}
                </div>
              )}
            </div>

            <div className={styles.artifactActions}>
              <a
                href={artifact.blob_url}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.actionButton}
                onClick={(e) => e.stopPropagation()}
                title="Download"
              >
                ⬇️
              </a>

              {onDelete && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm('Delete this document?')) {
                      onDelete(artifact.id);
                    }
                  }}
                  className={`${styles.actionButton} ${styles.deleteButton}`}
                  title="Delete"
                >
                  🗑️
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

interface ArtifactSummaryProps {
  summary: {
    total: number;
    by_type: Record<string, number>;
    pending_extraction: number;
    processing: number;
    completed: number;
    failed: number;
  };
}

export function ArtifactSummary({ summary }: ArtifactSummaryProps) {
  return (
    <div className={styles.summary}>
      <div className={styles.summaryItem}>
        <span className={styles.summaryNumber}>{summary.total}</span>
        <span className={styles.summaryLabel}>Total Documents</span>
      </div>
      <div className={styles.summaryItem}>
        <span className={styles.summaryNumber}>{summary.completed}</span>
        <span className={styles.summaryLabel}>Ready for Review</span>
      </div>
      {summary.processing > 0 && (
        <div className={styles.summaryItem}>
          <span className={styles.summaryNumber}>{summary.processing}</span>
          <span className={styles.summaryLabel}>Processing</span>
        </div>
      )}
      {summary.failed > 0 && (
        <div className={`${styles.summaryItem} ${styles.summaryFailed}`}>
          <span className={styles.summaryNumber}>{summary.failed}</span>
          <span className={styles.summaryLabel}>Failed</span>
        </div>
      )}
    </div>
  );
}
