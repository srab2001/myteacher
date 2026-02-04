'use client';

import { useState, useRef, useCallback } from 'react';
import { DocumentSourceType } from '@/lib/db/types';
import styles from './PdfParser.module.css';

interface ParseResult {
  file_name: string;
  file_size: number;
  blob_url?: string;
  extracted_text: string;
  page_count: number;
  text_length: number;
  extraction_method: string;
  document_type: string;
}

interface IngestResult {
  status: string;
  document_id?: string;
  chunks_created?: number;
  embeddings_stored?: number;
}

const SOURCE_TYPE_OPTIONS: { value: DocumentSourceType; label: string }[] = [
  { value: 'comar', label: 'COMAR Regulation' },
  { value: 'msde', label: 'MSDE Bulletin/Guide' },
  { value: 'idea', label: 'IDEA Federal Law' },
  { value: 'county_policy', label: 'County Policy' },
  { value: 'section_504', label: 'Section 504' },
  { value: 'guidance', label: 'General Guidance' },
];

const DOC_TYPE_LABELS: Record<string, string> = {
  iep: 'IEP Document',
  evaluation: 'Evaluation Report',
  '504_plan': '504 Plan',
  notice: 'Notice / Prior Written Notice',
  unknown: 'Not identified',
};

type Step = 'upload' | 'review' | 'ingest';

export function PdfParser() {
  const [step, setStep] = useState<Step>('upload');

  // Upload state
  const [isDragging, setIsDragging] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [parseProgress, setParseProgress] = useState(0);
  const [parseStatus, setParseStatus] = useState('');
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Parse result state
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [editedText, setEditedText] = useState('');

  // Ingest state
  const [title, setTitle] = useState('');
  const [sourceType, setSourceType] = useState<DocumentSourceType>('comar');
  const [url, setUrl] = useState('');
  const [county, setCounty] = useState('');
  const [isIngesting, setIsIngesting] = useState(false);
  const [ingestResult, setIngestResult] = useState<IngestResult | null>(null);

  // History of parsed documents in this session
  const [history, setHistory] = useState<Array<{
    fileName: string;
    pageCount: number;
    textLength: number;
    documentType: string;
    ingested: boolean;
    timestamp: Date;
  }>>([]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const parseFile = async (file: File) => {
    setIsParsing(true);
    setError(null);
    setParseProgress(10);
    setParseStatus('Uploading file...');

    try {
      const formData = new FormData();
      formData.append('file', file);

      setParseProgress(30);
      setParseStatus('Extracting text from PDF...');

      const response = await fetch('/api/admin/documents/parse', {
        method: 'POST',
        body: formData,
      });

      setParseProgress(80);
      setParseStatus('Processing results...');

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to parse document');
      }

      const result: ParseResult & { status: string } = await response.json();
      setParseProgress(100);

      if (!result.extracted_text) {
        throw new Error('No text could be extracted from this PDF. It may be scanned or image-only.');
      }

      setParseResult(result);
      setEditedText(result.extracted_text);

      // Auto-fill title from filename
      const autoTitle = file.name
        .replace(/\.[^.]+$/, '')
        .replace(/[_-]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      setTitle(autoTitle);

      setStep('review');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Parse failed');
    } finally {
      setIsParsing(false);
      setParseProgress(0);
      setParseStatus('');
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      parseFile(files[0]);
    }
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      parseFile(files[0]);
    }
  };

  const handleIngest = async () => {
    if (!title.trim() || !editedText.trim()) {
      setError('Title and content are required');
      return;
    }

    setIsIngesting(true);
    setError(null);

    try {
      const response = await fetch('/api/admin/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          source_type: sourceType,
          content: editedText.trim(),
          url: url.trim() || parseResult?.blob_url || undefined,
          county: county.trim() || undefined,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to ingest document');
      }

      const result: IngestResult = await response.json();
      setIngestResult(result);

      // Add to history
      setHistory(prev => [{
        fileName: parseResult?.file_name || title,
        pageCount: parseResult?.page_count || 0,
        textLength: editedText.length,
        documentType: parseResult?.document_type || 'unknown',
        ingested: true,
        timestamp: new Date(),
      }, ...prev]);

      setStep('ingest');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ingestion failed');
    } finally {
      setIsIngesting(false);
    }
  };

  const handleStartOver = () => {
    setStep('upload');
    setParseResult(null);
    setEditedText('');
    setTitle('');
    setUrl('');
    setCounty('');
    setSourceType('comar');
    setError(null);
    setIngestResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className={styles.parserContainer}>
      {/* Step Indicator */}
      <div className={styles.steps}>
        <div className={`${styles.step} ${step === 'upload' ? styles.stepActive : ''} ${step !== 'upload' ? styles.stepDone : ''}`}>
          <span className={styles.stepNumber}>1</span>
          <span className={styles.stepLabel}>Upload PDF</span>
        </div>
        <div className={styles.stepConnector} />
        <div className={`${styles.step} ${step === 'review' ? styles.stepActive : ''} ${step === 'ingest' ? styles.stepDone : ''}`}>
          <span className={styles.stepNumber}>2</span>
          <span className={styles.stepLabel}>Review Text</span>
        </div>
        <div className={styles.stepConnector} />
        <div className={`${styles.step} ${step === 'ingest' ? styles.stepActive : ''}`}>
          <span className={styles.stepNumber}>3</span>
          <span className={styles.stepLabel}>Ingest</span>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className={styles.errorMessage}>
          {error}
          <button onClick={() => setError(null)} className={styles.dismissBtn}>×</button>
        </div>
      )}

      {/* Step 1: Upload */}
      {step === 'upload' && (
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>Upload PDF Document</h3>
          <p className={styles.sectionHint}>
            Upload a PDF to extract its text content. You can review and edit the extracted text before adding it to the knowledge base.
          </p>

          {isParsing ? (
            <div className={styles.parsingState}>
              <div className={styles.progressBar}>
                <div className={styles.progressFill} style={{ width: `${parseProgress}%` }} />
              </div>
              <p className={styles.progressText}>{parseStatus}</p>
            </div>
          ) : (
            <div
              className={`${styles.dropZone} ${isDragging ? styles.dropZoneDragging : ''}`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.txt,.md"
                onChange={handleFileSelect}
                className={styles.fileInput}
              />
              <div className={styles.dropZoneContent}>
                <span className={styles.uploadIcon}>+</span>
                <span className={styles.dropZoneText}>
                  Drag & drop a PDF here, or click to browse
                </span>
                <span className={styles.dropZoneHint}>
                  PDF, TXT, or MD files up to 25MB
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Step 2: Review */}
      {step === 'review' && parseResult && (
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>Review Extracted Text</h3>

          {/* Extraction Stats */}
          <div className={styles.statsRow}>
            <div className={styles.statChip}>
              <span className={styles.statChipLabel}>File</span>
              <span className={styles.statChipValue}>{parseResult.file_name}</span>
            </div>
            <div className={styles.statChip}>
              <span className={styles.statChipLabel}>Size</span>
              <span className={styles.statChipValue}>{formatFileSize(parseResult.file_size)}</span>
            </div>
            <div className={styles.statChip}>
              <span className={styles.statChipLabel}>Pages</span>
              <span className={styles.statChipValue}>{parseResult.page_count}</span>
            </div>
            <div className={styles.statChip}>
              <span className={styles.statChipLabel}>Characters</span>
              <span className={styles.statChipValue}>{editedText.length.toLocaleString()}</span>
            </div>
            <div className={styles.statChip}>
              <span className={styles.statChipLabel}>Method</span>
              <span className={styles.statChipValue}>{parseResult.extraction_method}</span>
            </div>
            <div className={styles.statChip}>
              <span className={styles.statChipLabel}>Detected Type</span>
              <span className={styles.statChipValue}>
                {DOC_TYPE_LABELS[parseResult.document_type] || parseResult.document_type}
              </span>
            </div>
          </div>

          {/* Editable Text */}
          <div className={styles.textPreview}>
            <div className={styles.textPreviewHeader}>
              <span className={styles.textPreviewLabel}>Extracted Text (editable)</span>
              <span className={styles.textPreviewCount}>
                {editedText.length.toLocaleString()} characters
              </span>
            </div>
            <textarea
              className={styles.textArea}
              value={editedText}
              onChange={(e) => setEditedText(e.target.value)}
            />
          </div>

          {/* Metadata Form */}
          <div className={styles.metadataSection}>
            <h4 className={styles.metadataTitle}>Document Metadata</h4>
            <div className={styles.formGrid}>
              <div className={styles.formGroup}>
                <label className={styles.label} htmlFor="parse-title">Title *</label>
                <input
                  id="parse-title"
                  type="text"
                  className={styles.input}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. COMAR 13A.05.01.03 - Referral"
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label} htmlFor="parse-source">Source Type *</label>
                <select
                  id="parse-source"
                  className={styles.select}
                  value={sourceType}
                  onChange={(e) => setSourceType(e.target.value as DocumentSourceType)}
                >
                  {SOURCE_TYPE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label} htmlFor="parse-url">Source URL (optional)</label>
                <input
                  id="parse-url"
                  type="text"
                  className={styles.input}
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://..."
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label} htmlFor="parse-county">County (optional)</label>
                <input
                  id="parse-county"
                  type="text"
                  className={styles.input}
                  value={county}
                  onChange={(e) => setCounty(e.target.value)}
                  placeholder="e.g. Montgomery"
                />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className={styles.reviewActions}>
            <button onClick={handleStartOver} className={styles.secondaryButton}>
              Start Over
            </button>
            <button
              onClick={handleIngest}
              disabled={isIngesting || !title.trim() || !editedText.trim()}
              className={styles.primaryButton}
            >
              {isIngesting ? 'Ingesting...' : 'Ingest into Knowledge Base'}
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Ingest Complete */}
      {step === 'ingest' && ingestResult && (
        <div className={styles.section}>
          <div className={styles.successCard}>
            <div className={styles.successHeader}>Document Ingested</div>
            <div className={styles.successDetails}>
              <div className={styles.successRow}>
                <span className={styles.successLabel}>Document ID</span>
                <span className={styles.successValue}>
                  {ingestResult.document_id || 'N/A'}
                </span>
              </div>
              <div className={styles.successRow}>
                <span className={styles.successLabel}>Chunks Created</span>
                <span className={styles.successValue}>{ingestResult.chunks_created}</span>
              </div>
              <div className={styles.successRow}>
                <span className={styles.successLabel}>Embeddings Stored</span>
                <span className={styles.successValue}>{ingestResult.embeddings_stored}</span>
              </div>
              <div className={styles.successRow}>
                <span className={styles.successLabel}>Title</span>
                <span className={styles.successValue}>{title}</span>
              </div>
              <div className={styles.successRow}>
                <span className={styles.successLabel}>Source Type</span>
                <span className={styles.successValue}>{sourceType}</span>
              </div>
            </div>
            <button onClick={handleStartOver} className={styles.primaryButton}>
              Parse Another Document
            </button>
          </div>
        </div>
      )}

      {/* Session History */}
      {history.length > 0 && (
        <div className={styles.historySection}>
          <h4 className={styles.historyTitle}>Session History</h4>
          <div className={styles.historyList}>
            {history.map((item, idx) => (
              <div key={idx} className={styles.historyItem}>
                <span className={styles.historyName}>{item.fileName}</span>
                <span className={styles.historyMeta}>
                  {item.pageCount} pages | {item.textLength.toLocaleString()} chars | {DOC_TYPE_LABELS[item.documentType] || item.documentType}
                </span>
                <span className={styles.historyBadge}>Ingested</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
