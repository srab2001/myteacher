'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { useAuth } from '@/lib/auth-context';
import {
  api,
  DisputeCase,
  DisputeCaseType,
  DisputeCaseStatus,
  DisputeEventType,
  DisputeEventTypeInfo,
} from '@/lib/api';
import { AlertsBell } from '@/components/alerts/AlertsBell';
import styles from './page.module.css';

const CASE_TYPE_LABELS: Record<DisputeCaseType, string> = {
  SECTION504_COMPLAINT: '504 Complaint',
  IEP_DISPUTE: 'IEP Dispute',
  RECORDS_REQUEST: 'Records Request',
  OTHER: 'Other',
};

const CASE_STATUS_LABELS: Record<DisputeCaseStatus, string> = {
  OPEN: 'Open',
  IN_REVIEW: 'In Review',
  RESOLVED: 'Resolved',
  CLOSED: 'Closed',
};

const CASE_STATUS_COLORS: Record<DisputeCaseStatus, string> = {
  OPEN: '#1976d2',
  IN_REVIEW: '#f57c00',
  RESOLVED: '#388e3c',
  CLOSED: '#757575',
};

const EVENT_TYPE_ICONS: Record<DisputeEventType, string> = {
  INTAKE: '📝',
  MEETING: '👥',
  RESPONSE_SENT: '📤',
  DOCUMENT_RECEIVED: '📥',
  RESOLUTION: '✅',
  STATUS_CHANGE: '🔄',
  NOTE: '📌',
};

interface Props {
  params: Promise<{ id: string; caseId: string }>;
}

export default function CaseDetailPage({ params }: Props) {
  const { id: studentId, caseId } = use(params);
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [disputeCase, setDisputeCase] = useState<DisputeCase | null>(null);
  const [eventTypes, setEventTypes] = useState<DisputeEventTypeInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Edit modal state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editData, setEditData] = useState({
    summary: '',
    status: 'OPEN' as DisputeCaseStatus,
    resolutionSummary: '',
  });
  const [saving, setSaving] = useState(false);

  // Add event modal state
  const [showEventModal, setShowEventModal] = useState(false);
  const [newEventData, setNewEventData] = useState({
    eventType: 'NOTE' as DisputeEventType,
    eventDate: new Date().toISOString().split('T')[0],
    summary: '',
    details: '',
  });
  const [addingEvent, setAddingEvent] = useState(false);

  // Check if user can edit (ADMIN or CASE_MANAGER)
  const canEdit = user?.role === 'ADMIN' || user?.role === 'CASE_MANAGER';

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/');
      return;
    }

    if (user) {
      loadData();
    }
  }, [authLoading, user, studentId, caseId, router]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [caseRes, typesRes] = await Promise.all([
        api.getDispute(caseId),
        api.getDisputeEventTypes(),
      ]);
      setDisputeCase(caseRes.disputeCase);
      setEventTypes(typesRes.eventTypes);
      setEditData({
        summary: caseRes.disputeCase.summary,
        status: caseRes.disputeCase.status,
        resolutionSummary: caseRes.disputeCase.resolutionSummary || '',
      });
    } catch (err) {
      console.error('Error loading case:', err);
      setError('Failed to load case');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!disputeCase) return;

    try {
      setSaving(true);
      const result = await api.updateDispute(caseId, {
        summary: editData.summary,
        status: editData.status,
        resolutionSummary: editData.resolutionSummary || undefined,
      });
      setDisputeCase(result.disputeCase);
      setShowEditModal(false);
    } catch (err) {
      console.error('Error updating case:', err);
      setError('Failed to update case');
    } finally {
      setSaving(false);
    }
  };

  const handleAddEvent = async () => {
    if (!newEventData.summary.trim()) return;

    try {
      setAddingEvent(true);
      const result = await api.createDisputeEvent(caseId, {
        eventType: newEventData.eventType,
        eventDate: newEventData.eventDate,
        summary: newEventData.summary,
        details: newEventData.details || undefined,
      });
      setDisputeCase(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          events: [result.event, ...(prev.events || [])],
        };
      });
      setShowEventModal(false);
      setNewEventData({
        eventType: 'NOTE',
        eventDate: new Date().toISOString().split('T')[0],
        summary: '',
        details: '',
      });
    } catch (err) {
      console.error('Error adding event:', err);
      setError('Failed to add event');
    } finally {
      setAddingEvent(false);
    }
  };

  const handleExportPdf = async () => {
    // Placeholder for PDF export
    alert('PDF export coming soon');
  };

  if (authLoading || loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>
          <div className="spinner" style={{ width: 32, height: 32 }} />
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  if (!disputeCase) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>Case not found</div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <button className={styles.backBtn} onClick={() => router.push(`/students/${studentId}/cases`)}>
            &larr; Back to Cases
          </button>
          <div className={styles.headerActions}>
            <AlertsBell />
          </div>
        </div>
      </header>

      <main className={styles.main}>
        {error && (
          <div className={styles.errorBanner}>
            {error}
            <button onClick={() => setError(null)}>&times;</button>
          </div>
        )}

        {/* Case Header */}
        <div className={styles.caseHeader}>
          <div className={styles.caseInfo}>
            <div className={styles.caseTitle}>
              <span className={styles.caseNumber}>{disputeCase.caseNumber}</span>
              <span className={styles.caseType}>{CASE_TYPE_LABELS[disputeCase.caseType]}</span>
            </div>
            <span
              className={styles.statusBadge}
              style={{ backgroundColor: CASE_STATUS_COLORS[disputeCase.status] }}
            >
              {CASE_STATUS_LABELS[disputeCase.status]}
            </span>
          </div>
          <div className={styles.caseActions}>
            {canEdit && (
              <button className="btn btn-outline" onClick={() => setShowEditModal(true)}>
                Edit
              </button>
            )}
            <button className="btn btn-outline" onClick={handleExportPdf}>
              Export PDF
            </button>
          </div>
        </div>

        {/* Case Meta */}
        <div className={styles.caseMeta}>
          <div className={styles.metaItem}>
            <span className={styles.metaLabel}>Owner</span>
            <span className={styles.metaValue}>{disputeCase.assignedTo?.displayName || 'Unassigned'}</span>
          </div>
          <div className={styles.metaItem}>
            <span className={styles.metaLabel}>Intake Date</span>
            <span className={styles.metaValue}>{format(new Date(disputeCase.filedDate), 'MMMM d, yyyy')}</span>
          </div>
          {disputeCase.planInstance && (
            <div className={styles.metaItem}>
              <span className={styles.metaLabel}>Related Plan</span>
              <span className={styles.metaValue}>{disputeCase.planInstance.planType.name}</span>
            </div>
          )}
          {disputeCase.externalReference && (
            <div className={styles.metaItem}>
              <span className={styles.metaLabel}>External Ref</span>
              <span className={styles.metaValue}>{disputeCase.externalReference}</span>
            </div>
          )}
        </div>

        {/* Summary Section */}
        <div className={styles.section}>
          <h3>Summary</h3>
          <div className={styles.sectionContent}>
            <p>{disputeCase.summary}</p>
          </div>
        </div>

        {/* Resolution Summary (if resolved) */}
        {disputeCase.resolutionSummary && (
          <div className={styles.section}>
            <h3>Resolution</h3>
            <div className={styles.sectionContent}>
              <p>{disputeCase.resolutionSummary}</p>
              {disputeCase.resolvedAt && (
                <p className={styles.resolvedDate}>
                  Resolved on {format(new Date(disputeCase.resolvedAt), 'MMMM d, yyyy')}
                  {disputeCase.resolvedBy && ` by ${disputeCase.resolvedBy.displayName}`}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Timeline Section */}
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <h3>Timeline</h3>
            {canEdit && (
              <button className="btn btn-primary btn-sm" onClick={() => setShowEventModal(true)}>
                Add Event
              </button>
            )}
          </div>
          <div className={styles.timeline}>
            {(!disputeCase.events || disputeCase.events.length === 0) ? (
              <div className={styles.emptyTimeline}>
                <p>No events recorded yet.</p>
              </div>
            ) : (
              disputeCase.events.map(event => (
                <div key={event.id} className={styles.timelineEvent}>
                  <div className={styles.timelineIcon}>
                    {EVENT_TYPE_ICONS[event.eventType]}
                  </div>
                  <div className={styles.timelineContent}>
                    <div className={styles.eventHeader}>
                      <span className={styles.eventType}>
                        {eventTypes.find(t => t.value === event.eventType)?.label || event.eventType}
                      </span>
                      <span className={styles.eventDate}>
                        {format(new Date(event.eventDate), 'MMM d, yyyy')}
                      </span>
                    </div>
                    <p className={styles.eventSummary}>{event.summary}</p>
                    {event.details && (
                      <p className={styles.eventDetails}>{event.details}</p>
                    )}
                    <div className={styles.eventMeta}>
                      Added by {event.createdBy?.displayName || 'Unknown'}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Attachments Section */}
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <h3>Attachments</h3>
            {/* TODO: Add attachment upload */}
          </div>
          <div className={styles.attachmentsList}>
            {(!disputeCase.attachments || disputeCase.attachments.length === 0) ? (
              <div className={styles.emptyAttachments}>
                <p>No attachments uploaded.</p>
              </div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>File</th>
                    <th>Uploaded By</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {disputeCase.attachments.map(att => (
                    <tr key={att.id}>
                      <td>
                        <a href={att.fileUrl} target="_blank" rel="noopener noreferrer">
                          {att.fileName}
                        </a>
                      </td>
                      <td>{att.uploadedBy?.displayName || 'Unknown'}</td>
                      <td>{format(new Date(att.uploadedAt), 'MMM d, yyyy')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </main>

      {/* Edit Modal - Only for ADMIN/CASE_MANAGER */}
      {canEdit && showEditModal && (
        <div className={styles.modalOverlay} onClick={() => setShowEditModal(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>Edit Case</h2>
              <button className={styles.closeBtn} onClick={() => setShowEditModal(false)}>
                &times;
              </button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.formGroup}>
                <label>Status</label>
                <select
                  value={editData.status}
                  onChange={e => setEditData(prev => ({ ...prev, status: e.target.value as DisputeCaseStatus }))}
                >
                  {Object.entries(CASE_STATUS_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>

              <div className={styles.formGroup}>
                <label>Summary</label>
                <textarea
                  value={editData.summary}
                  onChange={e => setEditData(prev => ({ ...prev, summary: e.target.value }))}
                  rows={4}
                />
              </div>

              {(editData.status === 'RESOLVED' || editData.status === 'CLOSED') && (
                <div className={styles.formGroup}>
                  <label>Resolution Summary</label>
                  <textarea
                    value={editData.resolutionSummary}
                    onChange={e => setEditData(prev => ({ ...prev, resolutionSummary: e.target.value }))}
                    placeholder="Describe the resolution..."
                    rows={3}
                  />
                </div>
              )}
            </div>
            <div className={styles.modalFooter}>
              <button className="btn btn-outline" onClick={() => setShowEditModal(false)}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Event Modal - Only for ADMIN/CASE_MANAGER */}
      {canEdit && showEventModal && (
        <div className={styles.modalOverlay} onClick={() => setShowEventModal(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>Add Event</h2>
              <button className={styles.closeBtn} onClick={() => setShowEventModal(false)}>
                &times;
              </button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.formGroup}>
                <label>Event Type</label>
                <select
                  value={newEventData.eventType}
                  onChange={e => setNewEventData(prev => ({ ...prev, eventType: e.target.value as DisputeEventType }))}
                >
                  {eventTypes.map(t => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>

              <div className={styles.formGroup}>
                <label>Date</label>
                <input
                  type="date"
                  value={newEventData.eventDate}
                  onChange={e => setNewEventData(prev => ({ ...prev, eventDate: e.target.value }))}
                />
              </div>

              <div className={styles.formGroup}>
                <label>Summary*</label>
                <textarea
                  value={newEventData.summary}
                  onChange={e => setNewEventData(prev => ({ ...prev, summary: e.target.value }))}
                  placeholder="Brief summary of the event..."
                  rows={2}
                />
              </div>

              <div className={styles.formGroup}>
                <label>Details (optional)</label>
                <textarea
                  value={newEventData.details}
                  onChange={e => setNewEventData(prev => ({ ...prev, details: e.target.value }))}
                  placeholder="Additional details..."
                  rows={3}
                />
              </div>
            </div>
            <div className={styles.modalFooter}>
              <button className="btn btn-outline" onClick={() => setShowEventModal(false)}>
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={handleAddEvent}
                disabled={addingEvent || !newEventData.summary.trim()}
              >
                {addingEvent ? 'Adding...' : 'Add Event'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
