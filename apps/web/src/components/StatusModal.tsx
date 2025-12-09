'use client';

import { useState, useRef, useEffect } from 'react';
import { format } from 'date-fns';

// Type declarations for Web Speech API
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message?: string;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
}

declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognition;
    webkitSpeechRecognition?: new () => SpeechRecognition;
  }
}

interface StatusModalProps {
  studentName: string;
  onClose: () => void;
  onSubmit: (data: {
    scope: string;
    code: string;
    summary: string;
    effectiveDate: string;
  }) => Promise<void>;
}

const SCOPES = [
  { value: 'OVERALL', label: 'Overall' },
  { value: 'ACADEMIC', label: 'Academic' },
  { value: 'BEHAVIOR', label: 'Behavior' },
  { value: 'SERVICES', label: 'Services' },
];

const CODES = [
  { value: 'ON_TRACK', label: 'On Track', color: '#22c55e' },
  { value: 'WATCH', label: 'Watch', color: '#f59e0b' },
  { value: 'CONCERN', label: 'Concern', color: '#f97316' },
  { value: 'URGENT', label: 'Urgent', color: '#ef4444' },
];

export function StatusModal({ studentName, onClose, onSubmit }: StatusModalProps) {
  const [scope, setScope] = useState('OVERALL');
  const [code, setCode] = useState('ON_TRACK');
  const [summary, setSummary] = useState('');
  const [effectiveDate, setEffectiveDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Dictation state
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  // Check for speech recognition support
  useEffect(() => {
    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
    setSpeechSupported(!!SpeechRecognitionAPI);
  }, []);

  const startDictation = () => {
    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognitionAPI) {
      setError('Speech recognition is not supported in this browser');
      return;
    }

    const recognition = new SpeechRecognitionAPI();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setIsListening(true);
      setError(null);
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let finalTranscript = '';
      let interimTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }

      if (finalTranscript) {
        setSummary(prev => {
          const newText = prev ? `${prev} ${finalTranscript}` : finalTranscript;
          return newText.slice(0, 500); // Respect max length
        });
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error('Speech recognition error:', event.error);
      if (event.error === 'not-allowed') {
        setError('Microphone access denied. Please allow microphone access.');
      } else if (event.error !== 'aborted') {
        setError(`Speech recognition error: ${event.error}`);
      }
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
  };

  const stopDictation = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setIsListening(false);
  };

  const toggleDictation = () => {
    if (isListening) {
      stopDictation();
    } else {
      startDictation();
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    stopDictation(); // Stop dictation if active
    setSubmitting(true);
    setError(null);

    try {
      await onSubmit({ scope, code, summary, effectiveDate });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update status');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">Update Status</h3>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>

        <p style={{ color: 'var(--muted)', marginBottom: '1rem', fontSize: '0.875rem' }}>
          Updating status for <strong>{studentName}</strong>
        </p>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Scope</label>
            <select
              className="form-select"
              value={scope}
              onChange={e => setScope(e.target.value)}
            >
              {SCOPES.map(s => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Status</label>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {CODES.map(c => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setCode(c.value)}
                  style={{
                    padding: '0.5rem 1rem',
                    border: code === c.value ? `2px solid ${c.color}` : '1px solid var(--border)',
                    borderRadius: '0.375rem',
                    background: code === c.value ? `${c.color}10` : 'white',
                    color: code === c.value ? c.color : 'var(--foreground)',
                    fontWeight: code === c.value ? 500 : 400,
                    cursor: 'pointer',
                  }}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Effective Date</label>
            <input
              type="date"
              className="form-input"
              value={effectiveDate}
              onChange={e => setEffectiveDate(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.375rem' }}>
              <label className="form-label" style={{ margin: 0 }}>Summary (optional)</label>
              {speechSupported && (
                <button
                  type="button"
                  onClick={toggleDictation}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.375rem',
                    padding: '0.375rem 0.75rem',
                    border: isListening ? '2px solid #ef4444' : '1px solid var(--border)',
                    borderRadius: '0.375rem',
                    background: isListening ? '#fef2f2' : 'white',
                    color: isListening ? '#ef4444' : 'var(--foreground)',
                    fontSize: '0.75rem',
                    fontWeight: 500,
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}
                  title={isListening ? 'Stop dictation' : 'Start dictation'}
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
                  {isListening ? 'Stop' : 'Dictate'}
                </button>
              )}
            </div>
            <div style={{ position: 'relative' }}>
              <textarea
                className="form-textarea"
                rows={3}
                placeholder={isListening ? 'Listening... speak now' : 'Add a brief note about this status...'}
                value={summary}
                onChange={e => setSummary(e.target.value)}
                maxLength={500}
                style={{
                  borderColor: isListening ? '#ef4444' : undefined,
                  boxShadow: isListening ? '0 0 0 2px rgba(239, 68, 68, 0.2)' : undefined,
                }}
              />
              {isListening && (
                <div style={{
                  position: 'absolute',
                  top: '0.5rem',
                  right: '0.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                  color: '#ef4444',
                  fontSize: '0.75rem',
                }}>
                  <span style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: '#ef4444',
                    animation: 'pulse 1.5s infinite',
                  }} />
                  Recording
                </div>
              )}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.25rem', fontSize: '0.75rem', color: 'var(--muted)' }}>
              <span>{summary.length}/500 characters</span>
              {!speechSupported && <span>Dictation not supported in this browser</span>}
            </div>
            <style>{`
              @keyframes pulse {
                0%, 100% { opacity: 1; }
                50% { opacity: 0.5; }
              }
            `}</style>
          </div>

          {error && (
            <div style={{
              background: '#fee2e2',
              color: '#991b1b',
              padding: '0.75rem',
              borderRadius: '0.375rem',
              fontSize: '0.875rem',
              marginBottom: '1rem',
            }}>
              {error}
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
            <button type="button" className="btn btn-outline" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Saving...' : 'Save Status'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
