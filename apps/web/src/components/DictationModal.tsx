'use client';

import { useState, useEffect, useRef } from 'react';
import { ProgressLevel } from '@/lib/api';
import styles from './DictationModal.module.css';

interface DictationModalProps {
  goalName: string;
  onClose: () => void;
  onSave: (level: ProgressLevel, comment: string) => Promise<void>;
}

const PROGRESS_OPTIONS: { value: ProgressLevel; label: string; color: string; bgColor: string }[] = [
  { value: 'NOT_ADDRESSED', label: 'Not Addressed', color: '#6b7280', bgColor: '#f3f4f6' },
  { value: 'FULL_SUPPORT', label: 'Full Support', color: '#991b1b', bgColor: '#fee2e2' },
  { value: 'SOME_SUPPORT', label: 'Some Support', color: '#92400e', bgColor: '#fef3c7' },
  { value: 'LOW_SUPPORT', label: 'Low Support', color: '#065f46', bgColor: '#d1fae5' },
  { value: 'MET_TARGET', label: 'Met Target', color: '#166534', bgColor: '#dcfce7' },
];

export function DictationModal({ goalName, onClose, onSave }: DictationModalProps) {
  const [selectedLevel, setSelectedLevel] = useState<ProgressLevel>('SOME_SUPPORT');
  const [transcript, setTranscript] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    // Check for browser support
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'en-US';

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      recognitionRef.current.onresult = (event: any) => {
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript + ' ';
          }
        }

        setTranscript(prev => prev + finalTranscript);
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setIsRecording(false);
        if (event.error === 'not-allowed') {
          setError('Microphone access denied. Please enable microphone permissions.');
        }
      };

      recognitionRef.current.onend = () => {
        setIsRecording(false);
      };
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  const toggleRecording = () => {
    if (!recognitionRef.current) {
      setError('Speech recognition is not supported in this browser. Please use Chrome, Edge, or Safari.');
      return;
    }

    if (isRecording) {
      recognitionRef.current.stop();
      setIsRecording(false);
    } else {
      setError(null);
      try {
        recognitionRef.current.start();
        setIsRecording(true);
      } catch (err) {
        console.error('Failed to start recording:', err);
        setError('Failed to start recording. Please check microphone permissions.');
      }
    }
  };

  const handleSave = async () => {
    if (!transcript.trim()) {
      setError('Please record or enter some notes before saving.');
      return;
    }

    setSaving(true);
    try {
      await onSave(selectedLevel, transcript.trim());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save progress');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">Dictate Progress</h3>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>

        <p className={styles.subtitle}>
          Recording progress for <strong>{goalName}</strong>
        </p>

        {/* Progress Level Selection */}
        <div className={styles.levelSection}>
          <label className={styles.label}>Progress Level</label>
          <div className={styles.levelButtons}>
            {PROGRESS_OPTIONS.map(option => (
              <button
                key={option.value}
                type="button"
                className={styles.levelBtn}
                style={{
                  background: selectedLevel === option.value ? option.bgColor : 'white',
                  color: selectedLevel === option.value ? option.color : 'var(--muted)',
                  borderColor: selectedLevel === option.value ? option.color : 'var(--border)',
                }}
                onClick={() => setSelectedLevel(option.value)}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {/* Recording Section */}
        <div className={styles.recordSection}>
          <label className={styles.label}>Notes</label>

          <button
            type="button"
            className={`${styles.recordBtn} ${isRecording ? styles.recording : ''}`}
            onClick={toggleRecording}
          >
            {isRecording ? (
              <>
                <span className={styles.recordingPulse} />
                Stop Recording
              </>
            ) : (
              <>
                <span className={styles.micIcon}>🎤</span>
                Start Recording
              </>
            )}
          </button>

          <textarea
            className={styles.textarea}
            value={transcript}
            onChange={e => setTranscript(e.target.value)}
            placeholder="Tap the microphone to start dictating, or type your notes here..."
            rows={4}
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
            onClick={handleSave}
            disabled={saving || !transcript.trim()}
          >
            {saving ? 'Saving...' : 'Save Progress'}
          </button>
        </div>
      </div>
    </div>
  );
}

// Add type declarations for Web Speech API
declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    SpeechRecognition: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    webkitSpeechRecognition: any;
  }
}
