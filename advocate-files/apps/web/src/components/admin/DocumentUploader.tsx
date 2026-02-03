'use client';

import { useState, useRef, useCallback } from 'react';
import { DocumentSourceType } from '@/lib/db/types';
import styles from './Admin.module.css';

interface DocumentUploaderProps {
  onUploadComplete: () => void;
}

const SOURCE_TYPE_OPTIONS: { value: DocumentSourceType; label: string }[] = [
  { value: 'comar', label: 'COMAR Regulation' },
  { value: 'msde', label: 'MSDE Bulletin/Guide' },
  { value: 'idea', label: 'IDEA Federal Law' },
  { value: 'county_policy', label: 'County Policy' },
  { value: 'section_504', label: 'Section 504' },
  { value: 'guidance', label: 'General Guidance' },
];

type UploadTab = 'file' | 'text';

interface UploadResult {
  status: string;
  document_id?: string;
  chunks_created?: number;
  embeddings_stored?: number;
  reason?: string;
  file_name?: string;
}

export function DocumentUploader({ onUploadComplete }: DocumentUploaderProps) {
  const [activeTab, setActiveTab] = useState<UploadTab>('text');
  const [title, setTitle] = useState('');
  const [sourceType, setSourceType] = useState<DocumentSourceType>('comar');
  const [url, setUrl] = useState('');
  const [county, setCounty] = useState('');
  const [content, setContent] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressText, setProgressText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<UploadResult | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetForm = () => {
    setTitle('');
    setContent('');
    setUrl('');
    setCounty('');
    setSelectedFile(null);
    setError(null);
    setProgress(0);
    setProgressText('');
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      setSelectedFile(files[0]);
      if (!title) {
        setTitle(files[0].name.replace(/\.[^.]+$/, '').replace(/[_-]/g, ' '));
      }
    }
  }, [title]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      setSelectedFile(files[0]);
      if (!title) {
        setTitle(files[0].name.replace(/\.[^.]+$/, '').replace(/[_-]/g, ' '));
      }
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleSubmitText = async () => {
    if (!title.trim() || !content.trim()) {
      setError('Title and content are required');
      return;
    }

    setIsUploading(true);
    setError(null);
    setSuccess(null);
    setProgress(20);
    setProgressText('Sending to knowledge base...');

    try {
      setProgress(40);
      setProgressText('Chunking and generating embeddings...');

      const response = await fetch('/api/admin/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          source_type: sourceType,
          content: content.trim(),
          url: url.trim() || undefined,
          county: county.trim() || undefined,
        }),
      });

      setProgress(80);

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to ingest document');
      }

      const result: UploadResult = await response.json();
      setProgress(100);
      setSuccess(result);
      resetForm();
      onUploadComplete();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmitFile = async () => {
    if (!selectedFile || !title.trim()) {
      setError('Please select a file and enter a title');
      return;
    }

    setIsUploading(true);
    setError(null);
    setSuccess(null);
    setProgress(10);
    setProgressText('Uploading file...');

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('title', title.trim());
      formData.append('source_type', sourceType);
      if (url.trim()) formData.append('url', url.trim());
      if (county.trim()) formData.append('county', county.trim());

      setProgress(30);
      setProgressText('Extracting text from document...');

      const response = await fetch('/api/admin/documents/upload', {
        method: 'POST',
        body: formData,
      });

      setProgress(70);
      setProgressText('Generating embeddings...');

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to upload document');
      }

      const result: UploadResult = await response.json();
      setProgress(100);
      setSuccess(result);
      resetForm();
      onUploadComplete();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = () => {
    if (activeTab === 'text') {
      handleSubmitText();
    } else {
      handleSubmitFile();
    }
  };

  return (
    <div className={styles.uploaderSection}>
      <h3 className={styles.uploaderTitle}>Add Document to Knowledge Base</h3>

      {/* Tab Bar */}
      <div className={styles.tabBar}>
        <button
          className={`${styles.tab} ${activeTab === 'text' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('text')}
          disabled={isUploading}
        >
          Paste Text
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'file' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('file')}
          disabled={isUploading}
        >
          Upload File
        </button>
      </div>

      {/* Success Message */}
      {success && (
        <div className={styles.successMessage}>
          <div className={styles.successContent}>
            <p className={styles.successTitle}>Document ingested</p>
            <p className={styles.successDetail}>
              {success.chunks_created} chunks created, {success.embeddings_stored} embeddings stored
              {success.document_id && ` (ID: ${success.document_id.slice(0, 8)}...)`}
            </p>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className={styles.errorMessage}>
          {error}
          <button onClick={() => setError(null)} className={styles.dismissError}>
            ×
          </button>
        </div>
      )}

      {/* Progress Bar */}
      {isUploading && (
        <div className={styles.progressContainer}>
          <div className={styles.progressBar}>
            <div className={styles.progressFill} style={{ width: `${progress}%` }} />
          </div>
          <p className={styles.progressText}>{progressText}</p>
        </div>
      )}

      {/* Metadata Fields */}
      <div className={styles.formGrid}>
        <div className={styles.formGroup}>
          <label className={styles.label} htmlFor="doc-title">Title *</label>
          <input
            id="doc-title"
            type="text"
            className={styles.input}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. COMAR 13A.05.01.03 - Referral"
            disabled={isUploading}
          />
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label} htmlFor="doc-source-type">Source Type *</label>
          <select
            id="doc-source-type"
            className={styles.select}
            value={sourceType}
            onChange={(e) => setSourceType(e.target.value as DocumentSourceType)}
            disabled={isUploading}
          >
            {SOURCE_TYPE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label} htmlFor="doc-url">Source URL (optional)</label>
          <input
            id="doc-url"
            type="text"
            className={styles.input}
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://..."
            disabled={isUploading}
          />
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label} htmlFor="doc-county">County (optional)</label>
          <input
            id="doc-county"
            type="text"
            className={styles.input}
            value={county}
            onChange={(e) => setCounty(e.target.value)}
            placeholder="e.g. Montgomery, Prince George's"
            disabled={isUploading}
          />
        </div>
      </div>

      {/* Text Input Tab */}
      {activeTab === 'text' && (
        <div className={styles.formGroupFull}>
          <label className={styles.label} htmlFor="doc-content">Document Content *</label>
          <textarea
            id="doc-content"
            className={styles.textarea}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Paste the full text of the regulation, policy, or guidance document here..."
            disabled={isUploading}
          />
          <span className={styles.charCount}>
            {content.length.toLocaleString()} characters
          </span>
        </div>
      )}

      {/* File Upload Tab */}
      {activeTab === 'file' && (
        <>
          {selectedFile ? (
            <div className={styles.selectedFile}>
              <div>
                <span className={styles.selectedFileName}>{selectedFile.name}</span>
                <span className={styles.selectedFileSize}>
                  ({formatFileSize(selectedFile.size)})
                </span>
              </div>
              <button
                onClick={() => setSelectedFile(null)}
                className={styles.removeFile}
                disabled={isUploading}
              >
                ×
              </button>
            </div>
          ) : (
            <div
              className={`${styles.dropZone} ${isDragging ? styles.dropZoneDragging : ''} ${isUploading ? styles.dropZoneDisabled : ''}`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => !isUploading && fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.txt,.md,.docx"
                onChange={handleFileSelect}
                className={styles.fileInput}
                disabled={isUploading}
              />
              <div className={styles.dropZoneContent}>
                <span className={styles.uploadIcon}>+</span>
                <span className={styles.dropZoneText}>
                  Drag & drop a file here, or click to browse
                </span>
                <span className={styles.dropZoneHint}>
                  PDF, TXT, MD, or DOCX up to 25MB
                </span>
              </div>
            </div>
          )}
        </>
      )}

      {/* Submit Button */}
      <button
        onClick={handleSubmit}
        disabled={isUploading || !title.trim() || (activeTab === 'text' ? !content.trim() : !selectedFile)}
        className={styles.submitButton}
      >
        {isUploading ? 'Processing...' : (activeTab === 'text' ? 'Ingest Document' : 'Upload & Ingest')}
      </button>
    </div>
  );
}
