'use client';

import { useState, useEffect, useCallback } from 'react';
import { DocumentSourceType } from '@/lib/db/types';
import styles from './Admin.module.css';

interface DocumentWithStats {
  id: string;
  source_type: DocumentSourceType;
  title: string;
  county?: string;
  url?: string;
  content_hash?: string;
  created_at: string;
  updated_at: string;
  chunk_count: number;
  embedding_count: number;
}

interface ChunkDetail {
  id: string;
  chunk_index: number;
  content: string;
  has_embedding: boolean;
  metadata?: Record<string, unknown>;
  created_at: string;
}

interface DocumentListProps {
  refreshTrigger: number;
}

const SOURCE_LABELS: Record<DocumentSourceType, string> = {
  comar: 'COMAR',
  msde: 'MSDE',
  idea: 'IDEA',
  county_policy: 'County',
  section_504: '504',
  guidance: 'Guidance',
};

const SOURCE_STYLE: Record<DocumentSourceType, string> = {
  comar: styles.sourceTagComar,
  msde: styles.sourceTagMsde,
  idea: styles.sourceTagIdea,
  county_policy: styles.sourceTagCounty,
  section_504: styles.sourceTagDefault,
  guidance: styles.sourceTagGuidance,
};

const ICON_MAP: Record<DocumentSourceType, string> = {
  comar: 'C',
  msde: 'M',
  idea: 'I',
  county_policy: 'P',
  section_504: '5',
  guidance: 'G',
};

type FilterType = 'all' | DocumentSourceType;

export function DocumentList({ refreshTrigger }: DocumentListProps) {
  const [documents, setDocuments] = useState<DocumentWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>('all');
  const [selectedDoc, setSelectedDoc] = useState<string | null>(null);
  const [chunks, setChunks] = useState<ChunkDetail[]>([]);
  const [loadingChunks, setLoadingChunks] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchDocuments = useCallback(async () => {
    try {
      const params = filter !== 'all' ? `?source_type=${filter}` : '';
      const response = await fetch(`/api/admin/documents${params}`);
      if (response.ok) {
        const data = await response.json();
        setDocuments(data.documents);
      }
    } catch (error) {
      console.error('Error fetching documents:', error);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments, refreshTrigger]);

  const handleViewChunks = async (docId: string) => {
    if (selectedDoc === docId) {
      setSelectedDoc(null);
      setChunks([]);
      return;
    }

    setSelectedDoc(docId);
    setLoadingChunks(true);

    try {
      const response = await fetch(`/api/admin/documents/${docId}`);
      if (response.ok) {
        const data = await response.json();
        setChunks(data.chunks);
      }
    } catch (error) {
      console.error('Error fetching chunks:', error);
    } finally {
      setLoadingChunks(false);
    }
  };

  const handleDelete = async (docId: string) => {
    if (!confirm('Delete this document and all its chunks? This cannot be undone.')) {
      return;
    }

    setDeletingId(docId);

    try {
      const response = await fetch(`/api/admin/documents/${docId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setDocuments((prev) => prev.filter((d) => d.id !== docId));
        if (selectedDoc === docId) {
          setSelectedDoc(null);
          setChunks([]);
        }
      }
    } catch (error) {
      console.error('Error deleting document:', error);
    } finally {
      setDeletingId(null);
    }
  };

  const totalChunks = documents.reduce((sum, d) => sum + Number(d.chunk_count), 0);
  const totalEmbeddings = documents.reduce((sum, d) => sum + Number(d.embedding_count), 0);

  const filterOptions: { value: FilterType; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'comar', label: 'COMAR' },
    { value: 'msde', label: 'MSDE' },
    { value: 'idea', label: 'IDEA' },
    { value: 'county_policy', label: 'County' },
    { value: 'section_504', label: '504' },
    { value: 'guidance', label: 'Guidance' },
  ];

  if (loading) {
    return <div className={styles.loading}>Loading documents...</div>;
  }

  return (
    <div className={styles.listSection}>
      <div className={styles.listHeader}>
        <h3 className={styles.listTitle}>Knowledge Base Documents</h3>
        <div className={styles.filterBar}>
          {filterOptions.map((opt) => (
            <button
              key={opt.value}
              className={`${styles.filterButton} ${filter === opt.value ? styles.filterButtonActive : ''}`}
              onClick={() => setFilter(opt.value)}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div className={styles.statsBar}>
        <div className={styles.statItem}>
          <span className={styles.statNumber}>{documents.length}</span>
          <span className={styles.statLabel}>Documents</span>
        </div>
        <div className={styles.statItem}>
          <span className={styles.statNumber}>{totalChunks}</span>
          <span className={styles.statLabel}>Chunks</span>
        </div>
        <div className={styles.statItem}>
          <span className={styles.statNumber}>{totalEmbeddings}</span>
          <span className={styles.statLabel}>Embeddings</span>
        </div>
      </div>

      {/* Document List */}
      {documents.length === 0 ? (
        <div className={styles.emptyState}>
          <span className={styles.emptyIcon}>+</span>
          <p className={styles.emptyTitle}>No documents in the knowledge base</p>
          <p className={styles.emptyHint}>
            Upload documents or paste text above to build the knowledge base
          </p>
        </div>
      ) : (
        <div className={styles.documentList}>
          {documents.map((doc) => (
            <div key={doc.id}>
              <div className={styles.documentItem}>
                <div className={styles.documentIcon}>
                  {ICON_MAP[doc.source_type] || 'D'}
                </div>
                <div className={styles.documentInfo}>
                  <div className={styles.documentHeader}>
                    <span className={styles.documentTitle}>{doc.title}</span>
                    <span className={`${styles.sourceTag} ${SOURCE_STYLE[doc.source_type] || styles.sourceTagDefault}`}>
                      {SOURCE_LABELS[doc.source_type] || doc.source_type}
                    </span>
                  </div>
                  <div className={styles.documentMeta}>
                    <span>{new Date(doc.created_at).toLocaleDateString()}</span>
                    <span className={styles.metaSeparator}>|</span>
                    <span className={styles.chunkBadge}>
                      {doc.chunk_count} chunks / {doc.embedding_count} embeddings
                    </span>
                    {doc.county && (
                      <>
                        <span className={styles.metaSeparator}>|</span>
                        <span>{doc.county}</span>
                      </>
                    )}
                  </div>
                </div>
                <div className={styles.documentActions}>
                  <button
                    className={styles.actionButton}
                    onClick={() => handleViewChunks(doc.id)}
                    title="View chunks"
                  >
                    {selectedDoc === doc.id ? 'Hide' : 'View'}
                  </button>
                  <button
                    className={styles.deleteButton}
                    onClick={() => handleDelete(doc.id)}
                    disabled={deletingId === doc.id}
                    title="Delete document"
                  >
                    {deletingId === doc.id ? '...' : 'Delete'}
                  </button>
                </div>
              </div>

              {/* Chunks Detail */}
              {selectedDoc === doc.id && (
                <div className={styles.chunkList}>
                  {loadingChunks ? (
                    <div className={styles.loading}>Loading chunks...</div>
                  ) : (
                    chunks.map((chunk) => (
                      <div key={chunk.id} className={styles.chunkItem}>
                        <div className={styles.chunkHeader}>
                          <span className={styles.chunkIndex}>
                            Chunk #{chunk.chunk_index}
                          </span>
                          <span className={`${styles.chunkEmbedding} ${chunk.has_embedding ? styles.hasEmbedding : styles.noEmbedding}`}>
                            {chunk.has_embedding ? 'Embedded' : 'No embedding'}
                          </span>
                        </div>
                        <div className={styles.chunkContent}>
                          {chunk.content}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
