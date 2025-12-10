'use client';

import { useState } from 'react';
import { ProgressLevel } from '@/lib/api';
import { DictationTextArea } from '@/components/forms/DictationTextArea';
import styles from './QuickProgressButtons.module.css';

interface QuickProgressButtonsProps {
  goalId: string;
  onSelect: (level: ProgressLevel, comment?: string) => Promise<void>;
}

const PROGRESS_OPTIONS: { value: ProgressLevel; label: string; color: string; bgColor: string }[] = [
  { value: 'NOT_ADDRESSED', label: 'Not Addressed', color: '#6b7280', bgColor: '#f3f4f6' },
  { value: 'FULL_SUPPORT', label: 'Full Support', color: '#991b1b', bgColor: '#fee2e2' },
  { value: 'SOME_SUPPORT', label: 'Some Support', color: '#92400e', bgColor: '#fef3c7' },
  { value: 'LOW_SUPPORT', label: 'Low Support', color: '#065f46', bgColor: '#d1fae5' },
  { value: 'MET_TARGET', label: 'Met Target', color: '#166534', bgColor: '#dcfce7' },
];

export function QuickProgressButtons({ onSelect }: QuickProgressButtonsProps) {
  const [saving, setSaving] = useState<ProgressLevel | null>(null);
  const [showComment, setShowComment] = useState(false);
  const [selectedLevel, setSelectedLevel] = useState<ProgressLevel | null>(null);
  const [comment, setComment] = useState('');

  const handleQuickSelect = async (level: ProgressLevel) => {
    setSaving(level);
    try {
      await onSelect(level);
    } finally {
      setSaving(null);
    }
  };

  const handleWithComment = (level: ProgressLevel) => {
    setSelectedLevel(level);
    setShowComment(true);
  };

  const handleSubmitWithComment = async () => {
    if (!selectedLevel) return;

    setSaving(selectedLevel);
    try {
      await onSelect(selectedLevel, comment);
      setShowComment(false);
      setComment('');
      setSelectedLevel(null);
    } finally {
      setSaving(null);
    }
  };

  const cancelComment = () => {
    setShowComment(false);
    setComment('');
    setSelectedLevel(null);
  };

  if (showComment && selectedLevel) {
    const option = PROGRESS_OPTIONS.find(o => o.value === selectedLevel);
    return (
      <div className={styles.commentForm}>
        <div className={styles.commentHeader}>
          <span
            className={styles.selectedLevel}
            style={{ background: option?.bgColor, color: option?.color }}
          >
            {option?.label}
          </span>
        </div>
        <DictationTextArea
          value={comment}
          onChange={setComment}
          placeholder="Add a note (optional)..."
          rows={2}
          className={styles.commentInput}
        />
        <div className={styles.commentActions}>
          <button
            type="button"
            className={styles.cancelBtn}
            onClick={cancelComment}
          >
            Cancel
          </button>
          <button
            type="button"
            className={styles.saveBtn}
            onClick={handleSubmitWithComment}
            disabled={saving !== null}
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.buttons}>
        {PROGRESS_OPTIONS.map(option => (
          <button
            key={option.value}
            type="button"
            className={styles.progressBtn}
            style={{
              '--btn-color': option.color,
              '--btn-bg': option.bgColor,
            } as React.CSSProperties}
            onClick={() => handleQuickSelect(option.value)}
            onContextMenu={(e) => {
              e.preventDefault();
              handleWithComment(option.value);
            }}
            disabled={saving !== null}
            title="Click to save, right-click to add note"
          >
            {saving === option.value ? (
              <span className={styles.spinner} />
            ) : (
              option.label
            )}
          </button>
        ))}
      </div>
      <p className={styles.hint}>Tap to record, long-press for notes</p>
    </div>
  );
}
