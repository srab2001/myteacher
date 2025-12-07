'use client';

import { useState } from 'react';
import { format } from 'date-fns';

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
            <label className="form-label">Summary (optional)</label>
            <textarea
              className="form-textarea"
              rows={3}
              placeholder="Add a brief note about this status..."
              value={summary}
              onChange={e => setSummary(e.target.value)}
              maxLength={500}
            />
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
