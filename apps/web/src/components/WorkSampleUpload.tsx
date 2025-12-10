'use client';

import { useState, useRef } from 'react';
import { WorkSampleRating } from '@/lib/api';
import { DictationTextArea } from '@/components/forms/DictationTextArea';
import styles from './WorkSampleUpload.module.css';

interface WorkSampleUploadProps {
  goalName: string;
  onClose: () => void;
  onUpload: (file: File, rating: WorkSampleRating, comment?: string) => Promise<void>;
}

const RATING_OPTIONS: { value: WorkSampleRating; label: string; description: string }[] = [
  { value: 'ABOVE_TARGET', label: 'Above Target', description: 'Work exceeds expectations' },
  { value: 'MEETS_TARGET', label: 'Meets Target', description: 'Work meets expectations' },
  { value: 'NEAR_TARGET', label: 'Near Target', description: 'Making progress toward goal' },
  { value: 'BELOW_TARGET', label: 'Below Target', description: 'Needs additional support' },
];

export function WorkSampleUpload({ goalName, onClose, onUpload }: WorkSampleUploadProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [rating, setRating] = useState<WorkSampleRating>('NEAR_TARGET');
  const [comment, setComment] = useState('');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      setError('File size must be less than 10MB');
      return;
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      setError('Please upload an image (JPEG, PNG, GIF, WebP) or PDF file');
      return;
    }

    setSelectedFile(file);
    setError(null);

    // Create preview for images
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setPreview(null);
    }
  };

  const handleCameraCapture = () => {
    if (fileInputRef.current) {
      fileInputRef.current.setAttribute('capture', 'environment');
      fileInputRef.current.click();
    }
  };

  const handleFileUpload = () => {
    if (fileInputRef.current) {
      fileInputRef.current.removeAttribute('capture');
      fileInputRef.current.click();
    }
  };

  const handleSubmit = async () => {
    if (!selectedFile) {
      setError('Please select a file to upload');
      return;
    }

    setUploading(true);
    setError(null);

    try {
      await onUpload(selectedFile, rating, comment || undefined);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload work sample');
    } finally {
      setUploading(false);
    }
  };

  const removeFile = () => {
    setSelectedFile(null);
    setPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">Add Work Sample</h3>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>

        <p className={styles.subtitle}>
          Adding work sample for <strong>{goalName}</strong>
        </p>

        {/* File Upload Section */}
        <div className={styles.uploadSection}>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,application/pdf"
            onChange={handleFileSelect}
            className={styles.hiddenInput}
          />

          {!selectedFile ? (
            <div className={styles.uploadOptions}>
              <button
                type="button"
                className={styles.uploadBtn}
                onClick={handleCameraCapture}
              >
                <span className={styles.uploadIcon}>📷</span>
                Take Photo
              </button>
              <button
                type="button"
                className={styles.uploadBtn}
                onClick={handleFileUpload}
              >
                <span className={styles.uploadIcon}>📁</span>
                Choose File
              </button>
            </div>
          ) : (
            <div className={styles.previewSection}>
              {preview ? (
                <img src={preview} alt="Preview" className={styles.previewImage} />
              ) : (
                <div className={styles.filePreview}>
                  <span className={styles.fileIcon}>📄</span>
                  <span className={styles.fileName}>{selectedFile.name}</span>
                </div>
              )}
              <button
                type="button"
                className={styles.removeBtn}
                onClick={removeFile}
              >
                Remove
              </button>
            </div>
          )}
        </div>

        {/* Rating Selection */}
        <div className={styles.ratingSection}>
          <label className={styles.label}>Rating</label>
          <div className={styles.ratingOptions}>
            {RATING_OPTIONS.map(option => (
              <label
                key={option.value}
                className={`${styles.ratingOption} ${rating === option.value ? styles.selected : ''}`}
              >
                <input
                  type="radio"
                  name="rating"
                  value={option.value}
                  checked={rating === option.value}
                  onChange={() => setRating(option.value)}
                  className={styles.radioInput}
                />
                <span className={styles.ratingLabel}>{option.label}</span>
                <span className={styles.ratingDesc}>{option.description}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Comment Section */}
        <div className={styles.commentSection}>
          <DictationTextArea
            label="Notes (optional)"
            value={comment}
            onChange={setComment}
            placeholder="Add any notes about this work sample..."
            rows={2}
          />
        </div>

        {error && (
          <div className={styles.error}>
            {error}
          </div>
        )}

        <div className={styles.actions}>
          <button type="button" className="btn btn-outline" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleSubmit}
            disabled={uploading || !selectedFile}
          >
            {uploading ? 'Uploading...' : 'Upload Sample'}
          </button>
        </div>
      </div>
    </div>
  );
}
