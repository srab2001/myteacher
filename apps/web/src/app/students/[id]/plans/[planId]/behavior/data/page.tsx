'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { format } from 'date-fns';
import { useAuth } from '@/lib/auth-context';
import { api, Plan, BehaviorTarget, BehaviorEvent, BehaviorMeasurementType, BehaviorEventSummary } from '@/lib/api';
import styles from './page.module.css';

type NewTarget = {
  code: string;
  name: string;
  definition: string;
  examples: string;
  nonExamples: string;
  measurementType: BehaviorMeasurementType;
};

const MEASUREMENT_LABELS: Record<BehaviorMeasurementType, string> = {
  FREQUENCY: 'Frequency (Count)',
  DURATION: 'Duration (Time)',
  INTERVAL: 'Interval Recording',
  RATING: 'Rating Scale',
};

export default function BehaviorDataPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const planId = params.planId as string;
  const studentId = params.id as string;

  const [plan, setPlan] = useState<Plan | null>(null);
  const [targets, setTargets] = useState<BehaviorTarget[]>([]);
  const [selectedTarget, setSelectedTarget] = useState<BehaviorTarget | null>(null);
  const [events, setEvents] = useState<BehaviorEvent[]>([]);
  const [summary, setSummary] = useState<BehaviorEventSummary | null>(null);
  const [loadingPlan, setLoadingPlan] = useState(true);
  const [loadingTargets, setLoadingTargets] = useState(true);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [showTargetModal, setShowTargetModal] = useState(false);
  const [showEventModal, setShowEventModal] = useState(false);
  const [editingTarget, setEditingTarget] = useState<BehaviorTarget | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Date filters for events
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return format(d, 'yyyy-MM-dd');
  });
  const [endDate, setEndDate] = useState(() => format(new Date(), 'yyyy-MM-dd'));

  // New target form
  const [newTarget, setNewTarget] = useState<NewTarget>({
    code: '',
    name: '',
    definition: '',
    examples: '',
    nonExamples: '',
    measurementType: 'FREQUENCY',
  });

  // New event form
  const [newEvent, setNewEvent] = useState({
    eventDate: format(new Date(), 'yyyy-MM-dd'),
    startTime: '',
    endTime: '',
    count: '',
    rating: '',
    durationSeconds: '',
    context: '',
  });

  useEffect(() => {
    if (!loading && !user) {
      router.push('/');
    }
  }, [user, loading, router]);

  const loadPlan = useCallback(async () => {
    try {
      const { plan: loadedPlan } = await api.getPlan(planId);
      setPlan(loadedPlan);
    } catch (err) {
      console.error('Failed to load plan:', err);
      setError('Failed to load plan');
    } finally {
      setLoadingPlan(false);
    }
  }, [planId]);

  const loadTargets = useCallback(async () => {
    setLoadingTargets(true);
    try {
      const { targets: loadedTargets } = await api.getBehaviorTargets(planId);
      setTargets(loadedTargets);
      if (loadedTargets.length > 0 && !selectedTarget) {
        setSelectedTarget(loadedTargets[0]);
      }
    } catch (err) {
      console.error('Failed to load targets:', err);
    } finally {
      setLoadingTargets(false);
    }
  }, [planId, selectedTarget]);

  const loadEvents = useCallback(async () => {
    if (!selectedTarget) return;
    setLoadingEvents(true);
    try {
      const result = await api.getBehaviorEvents(selectedTarget.id, startDate, endDate);
      setEvents(result.events);
      setSummary(result.summary);
    } catch (err) {
      console.error('Failed to load events:', err);
    } finally {
      setLoadingEvents(false);
    }
  }, [selectedTarget, startDate, endDate]);

  useEffect(() => {
    if (user?.isOnboarded && planId) {
      loadPlan();
      loadTargets();
    }
  }, [user, planId, loadPlan, loadTargets]);

  useEffect(() => {
    if (selectedTarget) {
      loadEvents();
    }
  }, [selectedTarget, loadEvents]);

  const handleCreateTarget = async () => {
    if (!newTarget.code || !newTarget.name || !newTarget.definition) {
      setError('Code, name, and definition are required');
      return;
    }

    try {
      await api.createBehaviorTarget(planId, {
        code: newTarget.code,
        name: newTarget.name,
        definition: newTarget.definition,
        examples: newTarget.examples || undefined,
        nonExamples: newTarget.nonExamples || undefined,
        measurementType: newTarget.measurementType,
      });
      setShowTargetModal(false);
      setNewTarget({
        code: '',
        name: '',
        definition: '',
        examples: '',
        nonExamples: '',
        measurementType: 'FREQUENCY',
      });
      await loadTargets();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create target');
    }
  };

  const handleUpdateTarget = async () => {
    if (!editingTarget) return;

    try {
      await api.updateBehaviorTarget(editingTarget.id, {
        name: editingTarget.name,
        definition: editingTarget.definition,
        examples: editingTarget.examples || undefined,
        nonExamples: editingTarget.nonExamples || undefined,
        isActive: editingTarget.isActive,
      });
      setEditingTarget(null);
      await loadTargets();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update target');
    }
  };

  const handleToggleTargetActive = async (target: BehaviorTarget) => {
    try {
      await api.updateBehaviorTarget(target.id, { isActive: !target.isActive });
      await loadTargets();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update target');
    }
  };

  const handleRecordEvent = async () => {
    if (!selectedTarget) return;

    const eventData: Parameters<typeof api.createBehaviorEvent>[1] = {
      eventDate: newEvent.eventDate,
      startTime: newEvent.startTime || undefined,
      endTime: newEvent.endTime || undefined,
      contextJson: newEvent.context ? { notes: newEvent.context } : undefined,
    };

    // Add measurement-specific data
    if (selectedTarget.measurementType === 'FREQUENCY' && newEvent.count) {
      eventData.count = parseInt(newEvent.count, 10);
    } else if (selectedTarget.measurementType === 'DURATION' && newEvent.durationSeconds) {
      eventData.durationSeconds = parseInt(newEvent.durationSeconds, 10);
    } else if (selectedTarget.measurementType === 'RATING' && newEvent.rating) {
      eventData.rating = parseInt(newEvent.rating, 10);
    } else if (selectedTarget.measurementType === 'INTERVAL') {
      // Interval recording uses start/end times
      if (!newEvent.startTime || !newEvent.endTime) {
        setError('Start and end times are required for interval recording');
        return;
      }
    }

    try {
      await api.createBehaviorEvent(selectedTarget.id, eventData);
      setShowEventModal(false);
      setNewEvent({
        eventDate: format(new Date(), 'yyyy-MM-dd'),
        startTime: '',
        endTime: '',
        count: '',
        rating: '',
        durationSeconds: '',
        context: '',
      });
      await loadEvents();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to record event');
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    if (!confirm('Are you sure you want to delete this event?')) return;

    try {
      await api.deleteBehaviorEvent(eventId);
      await loadEvents();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete event');
    }
  };

  if (loading || loadingPlan) {
    return (
      <div className={styles.container}>
        <div className="loading-container">
          <div className="spinner" />
        </div>
      </div>
    );
  }

  if (!plan) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>Plan not found</div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <button className={styles.backBtn} onClick={() => router.push(`/students/${studentId}/plans/${planId}/behavior`)}>
          ← Back to Behavior Plan
        </button>
        <div className={styles.headerInfo}>
          <h1>Behavior Data: {plan.student.firstName} {plan.student.lastName}</h1>
        </div>
      </header>

      <div className={styles.layout}>
        {/* Targets Sidebar */}
        <aside className={styles.sidebar}>
          <div className={styles.sidebarHeader}>
            <h3>Behavior Targets</h3>
            <button
              className="btn btn-primary btn-sm"
              onClick={() => setShowTargetModal(true)}
            >
              + Add Target
            </button>
          </div>

          {loadingTargets ? (
            <div className="loading-container"><div className="spinner" /></div>
          ) : targets.length === 0 ? (
            <p className={styles.emptyMessage}>No behavior targets defined yet.</p>
          ) : (
            <ul className={styles.targetList}>
              {targets.map(target => (
                <li key={target.id}>
                  <button
                    className={`${styles.targetBtn} ${selectedTarget?.id === target.id ? styles.active : ''} ${!target.isActive ? styles.inactive : ''}`}
                    onClick={() => setSelectedTarget(target)}
                  >
                    <span className={styles.targetCode}>{target.code}</span>
                    <span className={styles.targetName}>{target.name}</span>
                    <span className={styles.targetType}>{MEASUREMENT_LABELS[target.measurementType]}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </aside>

        {/* Main Content */}
        <main className={styles.main}>
          {selectedTarget ? (
            <>
              {/* Target Details */}
              <section className={styles.targetDetails}>
                <div className={styles.targetHeader}>
                  <div>
                    <h2>{selectedTarget.name}</h2>
                    <span className={styles.badge}>{MEASUREMENT_LABELS[selectedTarget.measurementType]}</span>
                    {!selectedTarget.isActive && <span className={styles.badgeInactive}>Inactive</span>}
                  </div>
                  <div className={styles.targetActions}>
                    <button
                      className="btn btn-outline btn-sm"
                      onClick={() => setEditingTarget(selectedTarget)}
                    >
                      Edit
                    </button>
                    <button
                      className={`btn btn-sm ${selectedTarget.isActive ? 'btn-outline' : 'btn-secondary'}`}
                      onClick={() => handleToggleTargetActive(selectedTarget)}
                    >
                      {selectedTarget.isActive ? 'Deactivate' : 'Activate'}
                    </button>
                  </div>
                </div>
                <p className={styles.definition}><strong>Definition:</strong> {selectedTarget.definition}</p>
                {selectedTarget.examples && (
                  <p className={styles.examples}><strong>Examples:</strong> {selectedTarget.examples}</p>
                )}
                {selectedTarget.nonExamples && (
                  <p className={styles.nonExamples}><strong>Non-examples:</strong> {selectedTarget.nonExamples}</p>
                )}
              </section>

              {/* Summary */}
              {summary && (
                <section className={styles.summarySection}>
                  <h3>Summary ({startDate} to {endDate})</h3>
                  <div className={styles.summaryGrid}>
                    <div className={styles.summaryCard}>
                      <span className={styles.summaryValue}>{summary.totalEvents}</span>
                      <span className={styles.summaryLabel}>Total Events</span>
                    </div>
                    {summary.totalCount !== undefined && (
                      <div className={styles.summaryCard}>
                        <span className={styles.summaryValue}>{summary.totalCount}</span>
                        <span className={styles.summaryLabel}>Total Count</span>
                      </div>
                    )}
                    {summary.averageCount !== undefined && (
                      <div className={styles.summaryCard}>
                        <span className={styles.summaryValue}>{summary.averageCount.toFixed(1)}</span>
                        <span className={styles.summaryLabel}>Avg Count/Day</span>
                      </div>
                    )}
                    {summary.totalDurationSeconds !== undefined && (
                      <div className={styles.summaryCard}>
                        <span className={styles.summaryValue}>{Math.round(summary.totalDurationSeconds / 60)}m</span>
                        <span className={styles.summaryLabel}>Total Duration</span>
                      </div>
                    )}
                    {summary.averageDurationSeconds !== undefined && (
                      <div className={styles.summaryCard}>
                        <span className={styles.summaryValue}>{Math.round(summary.averageDurationSeconds)}s</span>
                        <span className={styles.summaryLabel}>Avg Duration</span>
                      </div>
                    )}
                    {summary.averageRating !== undefined && (
                      <div className={styles.summaryCard}>
                        <span className={styles.summaryValue}>{summary.averageRating.toFixed(1)}</span>
                        <span className={styles.summaryLabel}>Avg Rating</span>
                      </div>
                    )}
                  </div>
                </section>
              )}

              {/* Events */}
              <section className={styles.eventsSection}>
                <div className={styles.eventsHeader}>
                  <h3>Events</h3>
                  <div className={styles.eventsFilters}>
                    <input
                      type="date"
                      className="form-input"
                      value={startDate}
                      onChange={e => setStartDate(e.target.value)}
                    />
                    <span>to</span>
                    <input
                      type="date"
                      className="form-input"
                      value={endDate}
                      onChange={e => setEndDate(e.target.value)}
                    />
                  </div>
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={() => setShowEventModal(true)}
                    disabled={!selectedTarget.isActive}
                  >
                    + Record Event
                  </button>
                </div>

                {loadingEvents ? (
                  <div className="loading-container"><div className="spinner" /></div>
                ) : events.length === 0 ? (
                  <p className={styles.emptyMessage}>No events recorded in this date range.</p>
                ) : (
                  <div className={styles.eventsList}>
                    {events.map(event => (
                      <div key={event.id} className={styles.eventItem}>
                        <div className={styles.eventMain}>
                          <span className={styles.eventDate}>
                            {format(new Date(event.eventDate), 'MMM d, yyyy')}
                          </span>
                          {event.startTime && (
                            <span className={styles.eventTime}>
                              {format(new Date(event.startTime), 'h:mm a')}
                              {event.endTime && ` - ${format(new Date(event.endTime), 'h:mm a')}`}
                            </span>
                          )}
                          {event.count !== null && (
                            <span className={styles.eventValue}>Count: {event.count}</span>
                          )}
                          {event.durationSeconds !== null && (
                            <span className={styles.eventValue}>Duration: {event.durationSeconds}s</span>
                          )}
                          {event.rating !== null && (
                            <span className={styles.eventValue}>Rating: {event.rating}</span>
                          )}
                        </div>
                        {event.contextJson && (
                          <p className={styles.eventContext}>{(event.contextJson as { notes?: string }).notes}</p>
                        )}
                        <div className={styles.eventMeta}>
                          <span>Recorded by {event.recordedBy?.displayName || 'Unknown'}</span>
                          <button
                            className={styles.deleteBtn}
                            onClick={() => handleDeleteEvent(event.id)}
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </>
          ) : (
            <div className={styles.noTarget}>
              <p>Select a behavior target from the sidebar or add a new one to start recording data.</p>
            </div>
          )}

          {error && <div className={styles.errorMsg}>{error}</div>}
        </main>
      </div>

      {/* Add Target Modal */}
      {showTargetModal && (
        <div className={styles.modal}>
          <div className={styles.modalContent}>
            <h2>Add Behavior Target</h2>
            <div className={styles.modalForm}>
              <div className={styles.formRow}>
                <label>Code *</label>
                <input
                  type="text"
                  className="form-input"
                  value={newTarget.code}
                  onChange={e => setNewTarget(prev => ({ ...prev, code: e.target.value }))}
                  placeholder="e.g., T1, OFF_TASK"
                />
              </div>
              <div className={styles.formRow}>
                <label>Name *</label>
                <input
                  type="text"
                  className="form-input"
                  value={newTarget.name}
                  onChange={e => setNewTarget(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Off-Task Behavior"
                />
              </div>
              <div className={styles.formRow}>
                <label>Measurement Type *</label>
                <select
                  className="form-select"
                  value={newTarget.measurementType}
                  onChange={e => setNewTarget(prev => ({ ...prev, measurementType: e.target.value as BehaviorMeasurementType }))}
                >
                  {Object.entries(MEASUREMENT_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>
              <div className={styles.formRow}>
                <label>Definition *</label>
                <textarea
                  className="form-textarea"
                  rows={3}
                  value={newTarget.definition}
                  onChange={e => setNewTarget(prev => ({ ...prev, definition: e.target.value }))}
                  placeholder="Operational definition of the behavior..."
                />
              </div>
              <div className={styles.formRow}>
                <label>Examples</label>
                <textarea
                  className="form-textarea"
                  rows={2}
                  value={newTarget.examples}
                  onChange={e => setNewTarget(prev => ({ ...prev, examples: e.target.value }))}
                  placeholder="What counts as this behavior..."
                />
              </div>
              <div className={styles.formRow}>
                <label>Non-Examples</label>
                <textarea
                  className="form-textarea"
                  rows={2}
                  value={newTarget.nonExamples}
                  onChange={e => setNewTarget(prev => ({ ...prev, nonExamples: e.target.value }))}
                  placeholder="What does not count as this behavior..."
                />
              </div>
            </div>
            <div className={styles.modalActions}>
              <button className="btn btn-outline" onClick={() => setShowTargetModal(false)}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={handleCreateTarget}>
                Add Target
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Target Modal */}
      {editingTarget && (
        <div className={styles.modal}>
          <div className={styles.modalContent}>
            <h2>Edit Behavior Target</h2>
            <div className={styles.modalForm}>
              <div className={styles.formRow}>
                <label>Code</label>
                <input
                  type="text"
                  className="form-input"
                  value={editingTarget.code}
                  disabled
                />
              </div>
              <div className={styles.formRow}>
                <label>Name *</label>
                <input
                  type="text"
                  className="form-input"
                  value={editingTarget.name}
                  onChange={e => setEditingTarget(prev => prev ? { ...prev, name: e.target.value } : null)}
                />
              </div>
              <div className={styles.formRow}>
                <label>Measurement Type</label>
                <input
                  type="text"
                  className="form-input"
                  value={MEASUREMENT_LABELS[editingTarget.measurementType]}
                  disabled
                />
              </div>
              <div className={styles.formRow}>
                <label>Definition *</label>
                <textarea
                  className="form-textarea"
                  rows={3}
                  value={editingTarget.definition}
                  onChange={e => setEditingTarget(prev => prev ? { ...prev, definition: e.target.value } : null)}
                />
              </div>
              <div className={styles.formRow}>
                <label>Examples</label>
                <textarea
                  className="form-textarea"
                  rows={2}
                  value={editingTarget.examples || ''}
                  onChange={e => setEditingTarget(prev => prev ? { ...prev, examples: e.target.value } : null)}
                />
              </div>
              <div className={styles.formRow}>
                <label>Non-Examples</label>
                <textarea
                  className="form-textarea"
                  rows={2}
                  value={editingTarget.nonExamples || ''}
                  onChange={e => setEditingTarget(prev => prev ? { ...prev, nonExamples: e.target.value } : null)}
                />
              </div>
            </div>
            <div className={styles.modalActions}>
              <button className="btn btn-outline" onClick={() => setEditingTarget(null)}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={handleUpdateTarget}>
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Record Event Modal */}
      {showEventModal && selectedTarget && (
        <div className={styles.modal}>
          <div className={styles.modalContent}>
            <h2>Record Event: {selectedTarget.name}</h2>
            <div className={styles.modalForm}>
              <div className={styles.formRow}>
                <label>Date *</label>
                <input
                  type="date"
                  className="form-input"
                  value={newEvent.eventDate}
                  onChange={e => setNewEvent(prev => ({ ...prev, eventDate: e.target.value }))}
                />
              </div>

              {(selectedTarget.measurementType === 'INTERVAL' || selectedTarget.measurementType === 'DURATION') && (
                <>
                  <div className={styles.formRow}>
                    <label>Start Time</label>
                    <input
                      type="time"
                      className="form-input"
                      value={newEvent.startTime}
                      onChange={e => setNewEvent(prev => ({ ...prev, startTime: e.target.value }))}
                    />
                  </div>
                  <div className={styles.formRow}>
                    <label>End Time</label>
                    <input
                      type="time"
                      className="form-input"
                      value={newEvent.endTime}
                      onChange={e => setNewEvent(prev => ({ ...prev, endTime: e.target.value }))}
                    />
                  </div>
                </>
              )}

              {selectedTarget.measurementType === 'FREQUENCY' && (
                <div className={styles.formRow}>
                  <label>Count *</label>
                  <input
                    type="number"
                    className="form-input"
                    min="0"
                    value={newEvent.count}
                    onChange={e => setNewEvent(prev => ({ ...prev, count: e.target.value }))}
                    placeholder="Number of occurrences"
                  />
                </div>
              )}

              {selectedTarget.measurementType === 'DURATION' && (
                <div className={styles.formRow}>
                  <label>Duration (seconds) *</label>
                  <input
                    type="number"
                    className="form-input"
                    min="0"
                    value={newEvent.durationSeconds}
                    onChange={e => setNewEvent(prev => ({ ...prev, durationSeconds: e.target.value }))}
                    placeholder="Duration in seconds"
                  />
                </div>
              )}

              {selectedTarget.measurementType === 'RATING' && (
                <div className={styles.formRow}>
                  <label>Rating (1-5) *</label>
                  <select
                    className="form-select"
                    value={newEvent.rating}
                    onChange={e => setNewEvent(prev => ({ ...prev, rating: e.target.value }))}
                  >
                    <option value="">Select rating...</option>
                    <option value="1">1 - Minimal</option>
                    <option value="2">2 - Below Average</option>
                    <option value="3">3 - Average</option>
                    <option value="4">4 - Above Average</option>
                    <option value="5">5 - Excellent</option>
                  </select>
                </div>
              )}

              <div className={styles.formRow}>
                <label>Context / Notes</label>
                <textarea
                  className="form-textarea"
                  rows={2}
                  value={newEvent.context}
                  onChange={e => setNewEvent(prev => ({ ...prev, context: e.target.value }))}
                  placeholder="Any relevant context or notes..."
                />
              </div>
            </div>
            <div className={styles.modalActions}>
              <button className="btn btn-outline" onClick={() => setShowEventModal(false)}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={handleRecordEvent}>
                Record Event
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
