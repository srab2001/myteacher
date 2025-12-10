'use client';

import { useCallback } from 'react';
import { useSpeechDictation } from '@/hooks/useSpeechDictation';

interface DictationTextAreaProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  name?: string;
  rows?: number;
  required?: boolean;
  disabled?: boolean;
  maxLength?: number;
  className?: string;
}

export function DictationTextArea({
  value,
  onChange,
  label,
  placeholder,
  name,
  rows = 5,
  required = false,
  disabled = false,
  maxLength,
  className = '',
}: DictationTextAreaProps) {
  const handleDictationResult = useCallback(
    (transcript: string) => {
      const newValue = value ? `${value} ${transcript}` : transcript;
      onChange(maxLength ? newValue.slice(0, maxLength) : newValue);
    },
    [value, onChange, maxLength]
  );

  const { isRecording, isSupported, error, toggle } = useSpeechDictation({
    onResult: handleDictationResult,
  });

  return (
    <div className="dictation-textarea-wrapper">
      {label ? (
        <div className="dictation-label-row">
          <label className="form-label">
            {label}
            {required && <span className="required-mark">*</span>}
          </label>
          {isSupported && (
            <button
              type="button"
              onClick={toggle}
              disabled={disabled}
              className={`dictation-btn ${isRecording ? 'recording' : ''}`}
              title={isRecording ? 'Stop dictation' : 'Start dictation'}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                <line x1="12" y1="19" x2="12" y2="23" />
                <line x1="8" y1="23" x2="16" y2="23" />
              </svg>
              {isRecording ? 'Stop' : 'Dictate'}
            </button>
          )}
        </div>
      ) : (
        isSupported && (
          <div className="dictation-btn-row">
            <button
              type="button"
              onClick={toggle}
              disabled={disabled}
              className={`dictation-btn ${isRecording ? 'recording' : ''}`}
              title={isRecording ? 'Stop dictation' : 'Start dictation'}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                <line x1="12" y1="19" x2="12" y2="23" />
                <line x1="8" y1="23" x2="16" y2="23" />
              </svg>
              {isRecording ? 'Stop' : 'Dictate'}
            </button>
          </div>
        )
      )}

      <div className="dictation-textarea-container">
        <textarea
          name={name}
          className={`form-textarea ${className} ${isRecording ? 'recording' : ''}`}
          rows={rows}
          placeholder={isRecording ? 'Listening... speak now' : placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          maxLength={maxLength}
        />
        {isRecording && (
          <div className="recording-indicator">
            <span className="recording-dot" />
            Recording
          </div>
        )}
      </div>

      {error && <p className="dictation-error">{error}</p>}

      {maxLength && (
        <div className="dictation-char-count">
          {value.length}/{maxLength} characters
        </div>
      )}

      <style jsx>{`
        .dictation-textarea-wrapper {
          width: 100%;
        }

        .dictation-label-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.375rem;
        }

        .dictation-label-row .form-label {
          margin: 0;
        }

        .dictation-btn-row {
          display: flex;
          justify-content: flex-end;
          margin-bottom: 0.375rem;
        }

        .required-mark {
          color: #ef4444;
          margin-left: 0.25rem;
        }

        .dictation-btn {
          display: flex;
          align-items: center;
          gap: 0.375rem;
          padding: 0.375rem 0.75rem;
          border: 1px solid var(--border, #e5e7eb);
          border-radius: 0.375rem;
          background: white;
          color: var(--foreground, #111827);
          font-size: 0.75rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.15s;
        }

        .dictation-btn:hover:not(:disabled) {
          background: var(--background, #f9fafb);
        }

        .dictation-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .dictation-btn.recording {
          border: 2px solid #ef4444;
          background: #fef2f2;
          color: #ef4444;
        }

        .dictation-textarea-container {
          position: relative;
        }

        .dictation-textarea-container textarea.recording {
          border-color: #ef4444;
          box-shadow: 0 0 0 2px rgba(239, 68, 68, 0.2);
        }

        .recording-indicator {
          position: absolute;
          top: 0.5rem;
          right: 0.5rem;
          display: flex;
          align-items: center;
          gap: 0.25rem;
          color: #ef4444;
          font-size: 0.75rem;
          font-weight: 500;
        }

        .recording-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #ef4444;
          animation: pulse 1.5s infinite;
        }

        .dictation-error {
          color: #ef4444;
          font-size: 0.75rem;
          margin-top: 0.25rem;
          margin-bottom: 0;
        }

        .dictation-char-count {
          font-size: 0.75rem;
          color: var(--muted, #6b7280);
          margin-top: 0.25rem;
          text-align: right;
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}
