'use client';

import styles from './QA.module.css';

interface Citation {
  id: number;
  title: string;
  source_type: string;
  url?: string;
  excerpt: string;
}

interface CitationCardProps {
  citation: Citation;
  isExpanded: boolean;
  onToggle: () => void;
}

const SOURCE_TYPE_LABELS: Record<string, string> = {
  comar: 'COMAR',
  msde: 'MSDE',
  county_policy: 'County Policy',
  idea: 'IDEA',
  section_504: 'Section 504',
  guidance: 'Guidance',
};

const SOURCE_TYPE_COLORS: Record<string, string> = {
  comar: '#dc2626',
  msde: '#2563eb',
  county_policy: '#059669',
  idea: '#7c3aed',
  section_504: '#d97706',
  guidance: '#6b7280',
};

export function CitationCard({ citation, isExpanded, onToggle }: CitationCardProps) {
  const sourceLabel = SOURCE_TYPE_LABELS[citation.source_type] || citation.source_type;
  const sourceColor = SOURCE_TYPE_COLORS[citation.source_type] || '#6b7280';

  return (
    <div
      className={`${styles.citationCard} ${isExpanded ? styles.citationExpanded : ''}`}
      onClick={onToggle}
    >
      <div className={styles.citationHeader}>
        <span className={styles.citationNumber}>[{citation.id}]</span>
        <span className={styles.citationTitle}>{citation.title}</span>
        <span
          className={styles.sourceTypeBadge}
          style={{ backgroundColor: sourceColor }}
        >
          {sourceLabel}
        </span>
      </div>

      {isExpanded && (
        <div className={styles.citationBody}>
          <p className={styles.citationExcerpt}>"{citation.excerpt}"</p>
          {citation.url && (
            <a
              href={citation.url}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.citationLink}
              onClick={(e) => e.stopPropagation()}
            >
              View Full Source
            </a>
          )}
        </div>
      )}
    </div>
  );
}
