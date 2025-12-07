'use client';

import { useState, useRef } from 'react';
import { PlanTypeCode } from '@/lib/api';
import styles from './PriorPlanUploadModal.module.css';

const PLAN_TYPE_LABELS: Record<PlanTypeCode, string> = {
  IEP: 'IEP',
  FIVE_OH_FOUR: '504 Plan',
  BEHAVIOR_PLAN: 'Behavior Plan',
};

interface PriorPlanUploadModalProps {
  onClose: () => void;
  onUpload: (file: File, planType: PlanTypeCode, planDate?: string, notes?: string) => Promise<void>;
}

export function PriorPlanUploadModal({ onClose, onUpload }: PriorPlanUploadModalProps) {
  const [planType, setPlanType] = useState<PlanTypeCode>('IEP');
  const [planDate, setPlanDate] = useState('');
  const [notes, setNotes] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      // Validate file type
      const allowedTypes = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'image/jpeg',
        'image/png',
        'image/gif',
        'image/webp',
      ];

      if (!allowedTypes.includes(selectedFile.type)) {
        setError('Invalid file type. Please upload a PDF, DOC, DOCX, or image file.');
        return;
      }

      // Validate file size (20MB max)
      if (selectedFile.size > 20 * 1024 * 1024) {
        setError('File is too large. Maximum size is 20MB.');
        return;
      }

      setFile(selectedFile);
      setError(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!file) {
      setError('Please select a file to upload');
      return;
    }

    setUploading(true);
    setError(null);

    try {
      await onUpload(file, planType, planDate || undefined, notes || undefined);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      // Trigger the same validation as file input
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(droppedFile);
      if (fileInputRef.current) {
        fileInputRef.current.files = dataTransfer.files;
        handleFileChange({ target: fileInputRef.current } as React.ChangeEvent<HTMLInputElement>);
      }
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <div className={styles.header}>
          <h2>Upload Prior Plan</h2>
          <button className={styles.closeBtn} onClick={onClose}>
            &times;
          </button>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          {/* Plan Type */}
          <div className={styles.field}>
            <label className={styles.label}>Plan Type *</label>
            <select
              className={styles.select}
              value={planType}
              onChange={e => setPlanType(e.target.value as PlanTypeCode)}
              required
            >
              {Object.entries(PLAN_TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          {/* Plan Date */}
          <div className={styles.field}>
            <label className={styles.label}>Plan Date (optional)</label>
            <input
              type="date"
              className={styles.input}
              value={planDate}
              onChange={e => setPlanDate(e.target.value)}
            />
            <p className={styles.hint}>The date of the prior plan document</p>
          </div>

          {/* Notes */}
          <div className={styles.field}>
            <label className={styles.label}>Notes (optional)</label>
            <textarea
              className={styles.textarea}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Add any notes about this document..."
              rows={2}
            />
          </div>

          {/* File Upload */}
          <div className={styles.field}>
            <label className={styles.label}>File *</label>
            <div
              className={`${styles.dropzone} ${file ? styles.hasFile : ''}`}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onClick={() => fileInputRef.current?.click()}
            >
              {file ? (
                <div className={styles.fileInfo}>
                  <span className={styles.fileName}>{file.name}</span>
                  <span className={styles.fileSize}>
                    ({(file.size / 1024 / 1024).toFixed(2)} MB)
                  </span>
                  <button
                    type="button"
                    className={styles.removeBtn}
                    onClick={e => {
                      e.stopPropagation();
                      setFile(null);
                      if (fileInputRef.current) {
                        fileInputRef.current.value = '';
                      }
                    }}
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <div className={styles.dropzoneContent}>
                  <span className={styles.dropzoneIcon}>📄</span>
                  <p>Drag and drop a file here, or click to select</p>
                  <p className={styles.dropzoneHint}>
                    PDF, DOC, DOCX, JPEG, PNG, GIF, WEBP (max 20MB)
                  </p>
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                className={styles.fileInput}
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif,.webp"
                onChange={handleFileChange}
              />
            </div>
          </div>

          {error && <div className={styles.error}>{error}</div>}

          <div className={styles.actions}>
            <button
              type="button"
              className="btn btn-outline"
              onClick={onClose}
              disabled={uploading}
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={uploading || !file}>
              {uploading ? 'Uploading...' : 'Upload'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
