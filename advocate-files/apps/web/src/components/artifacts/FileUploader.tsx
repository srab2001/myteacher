'use client';

import { useState, useRef, useCallback } from 'react';
import { ArtifactType } from '@/lib/db/types';
import styles from './Artifacts.module.css';

interface FileUploaderProps {
  caseId: string;
  onUploadComplete: () => void;
  allowedTypes?: string[];
}

const ARTIFACT_TYPE_OPTIONS: { value: ArtifactType; label: string }[] = [
  { value: 'iep', label: 'IEP Document' },
  { value: 'evaluation', label: 'Evaluation Report' },
  { value: '504_plan', label: '504 Plan' },
  { value: 'notice', label: 'Notice/PWN' },
  { value: 'progress_report', label: 'Progress Report' },
  { value: 'correspondence', label: 'Correspondence' },
  { value: 'other', label: 'Other' },
];

export function FileUploader({
  caseId,
  onUploadComplete,
  allowedTypes = ['.pdf', '.png', '.jpg', '.jpeg'],
}: FileUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedType, setSelectedType] = useState<ArtifactType>('other');
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const validateFile = (file: File): string | null => {
    // Check file type
    const ext = `.${file.name.split('.').pop()?.toLowerCase()}`;
    if (!allowedTypes.includes(ext)) {
      return `Invalid file type. Allowed: ${allowedTypes.join(', ')}`;
    }

    // Check file size (10MB max)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      return 'File size must be less than 10MB';
    }

    return null;
  };

  const uploadFile = async (file: File) => {
    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsUploading(true);
    setError(null);
    setUploadProgress(0);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('case_id', caseId);
      formData.append('artifact_type', selectedType);

      // Simulate progress for UX
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => Math.min(prev + 10, 90));
      }, 200);

      const response = await fetch('/api/artifacts/upload', {
        method: 'POST',
        body: formData,
      });

      clearInterval(progressInterval);

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Upload failed');
      }

      setUploadProgress(100);
      setTimeout(() => {
        setIsUploading(false);
        setUploadProgress(0);
        onUploadComplete();
      }, 500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);

      const files = Array.from(e.dataTransfer.files);
      if (files.length > 0) {
        uploadFile(files[0]);
      }
    },
    [caseId, selectedType]
  );

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      uploadFile(files[0]);
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className={styles.uploaderContainer}>
      <div className={styles.typeSelector}>
        <label htmlFor="artifact_type" className={styles.typeLabel}>
          Document Type:
        </label>
        <select
          id="artifact_type"
          value={selectedType}
          onChange={(e) => setSelectedType(e.target.value as ArtifactType)}
          className={styles.typeSelect}
          disabled={isUploading}
        >
          {ARTIFACT_TYPE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div
        className={`${styles.dropZone} ${isDragging ? styles.dropZoneDragging : ''} ${isUploading ? styles.dropZoneUploading : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={!isUploading ? handleClick : undefined}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={allowedTypes.join(',')}
          onChange={handleFileSelect}
          className={styles.fileInput}
          disabled={isUploading}
        />

        {isUploading ? (
          <div className={styles.uploadingState}>
            <div className={styles.progressBar}>
              <div
                className={styles.progressFill}
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
            <span className={styles.progressText}>
              Uploading... {uploadProgress}%
            </span>
          </div>
        ) : (
          <div className={styles.dropZoneContent}>
            <span className={styles.uploadIcon}>📄</span>
            <span className={styles.dropZoneText}>
              Drag & drop a file here, or click to browse
            </span>
            <span className={styles.dropZoneHint}>
              PDF, PNG, JPG up to 10MB
            </span>
          </div>
        )}
      </div>

      {error && (
        <div className={styles.uploadError}>
          {error}
          <button onClick={() => setError(null)} className={styles.dismissError}>
            ×
          </button>
        </div>
      )}
    </div>
  );
}
