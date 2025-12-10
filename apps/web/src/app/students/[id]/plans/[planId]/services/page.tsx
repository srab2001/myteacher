'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { format, startOfWeek, addDays } from 'date-fns';
import { useAuth } from '@/lib/auth-context';
import { api, ServiceLog, ServiceType, ServiceSetting, ServiceSummary } from '@/lib/api';
import { DictationTextArea } from '@/components/forms/DictationTextArea';
import styles from './page.module.css';

const SERVICE_TYPE_LABELS: Record<ServiceType, string> = {
  SPECIAL_EDUCATION: 'Special Education',
  SPEECH_LANGUAGE: 'Speech/Language',
  OCCUPATIONAL_THERAPY: 'Occupational Therapy',
  PHYSICAL_THERAPY: 'Physical Therapy',
  COUNSELING: 'Counseling',
  BEHAVIORAL_SUPPORT: 'Behavioral Support',
  READING_SPECIALIST: 'Reading Specialist',
  PARAPROFESSIONAL: 'Paraprofessional',
  OTHER: 'Other',
};

const SERVICE_SETTING_LABELS: Record<ServiceSetting, string> = {
  GENERAL_EDUCATION: 'General Education',
  SPECIAL_EDUCATION: 'Special Education',
  RESOURCE_ROOM: 'Resource Room',
  THERAPY_ROOM: 'Therapy Room',
  COMMUNITY: 'Community',
  HOME: 'Home',
  OTHER: 'Other',
};

export default function ServicesPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const planId = params.planId as string;
  const studentId = params.id as string;

  const [serviceLogs, setServiceLogs] = useState<ServiceLog[]>([]);
  const [summary, setSummary] = useState<ServiceSummary | null>(null);
  const [loadingServices, setLoadingServices] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);

  // Form state
  const [formDate, setFormDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [formMinutes, setFormMinutes] = useState(30);
  const [formServiceType, setFormServiceType] = useState<ServiceType>('SPECIAL_EDUCATION');
  const [formSetting, setFormSetting] = useState<ServiceSetting>('RESOURCE_ROOM');
  const [formNotes, setFormNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/');
    }
  }, [user, loading, router]);

  const loadServices = useCallback(async () => {
    try {
      const { serviceLogs, summary } = await api.getPlanServices(planId);
      setServiceLogs(serviceLogs);
      setSummary(summary);
    } catch (err) {
      console.error('Failed to load services:', err);
    } finally {
      setLoadingServices(false);
    }
  }, [planId]);

  useEffect(() => {
    if (user?.isOnboarded && planId) {
      loadServices();
    }
  }, [user, planId, loadServices]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);

    try {
      await api.createServiceLog(planId, {
        date: formDate,
        minutes: formMinutes,
        serviceType: formServiceType,
        setting: formSetting,
        notes: formNotes || undefined,
      });
      await loadServices();
      // Reset form
      setFormMinutes(30);
      setFormNotes('');
      setShowAddForm(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save service log');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (serviceId: string) => {
    if (!confirm('Are you sure you want to delete this service log?')) return;

    try {
      await api.deleteServiceLog(serviceId);
      await loadServices();
    } catch (err) {
      console.error('Failed to delete service log:', err);
    }
  };

  const formatMinutes = (mins: number) => {
    const hours = Math.floor(mins / 60);
    const minutes = mins % 60;
    if (hours === 0) return `${minutes}m`;
    if (minutes === 0) return `${hours}h`;
    return `${hours}h ${minutes}m`;
  };

  // Get current week dates for quick buttons
  const weekStart = startOfWeek(new Date());
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  if (loading || loadingServices) {
    return (
      <div className={styles.container}>
        <div className="loading-container">
          <div className="spinner" />
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <button className={styles.backBtn} onClick={() => router.push(`/students/${studentId}/plans/${planId}/iep`)}>
          ← Back to IEP
        </button>
        <h1>Service Logs</h1>
      </header>

      <main className={styles.main}>
        {/* Summary Cards */}
        {summary && (
          <div className={styles.summaryGrid}>
            <div className={styles.summaryCard}>
              <span className={styles.summaryLabel}>This Week</span>
              <span className={styles.summaryValue}>{formatMinutes(summary.weeklyMinutes)}</span>
            </div>
            <div className={styles.summaryCard}>
              <span className={styles.summaryLabel}>Total Time</span>
              <span className={styles.summaryValue}>{formatMinutes(summary.totalMinutes)}</span>
            </div>
            <div className={styles.summaryCard}>
              <span className={styles.summaryLabel}>Sessions</span>
              <span className={styles.summaryValue}>{summary.logCount}</span>
            </div>
          </div>
        )}

        {/* Quick Add Button */}
        {!showAddForm && (
          <button
            className={`btn btn-primary ${styles.addBtn}`}
            onClick={() => setShowAddForm(true)}
          >
            + Log Service Time
          </button>
        )}

        {/* Add Form */}
        {showAddForm && (
          <div className={styles.addForm}>
            <h3>Log Service Time</h3>
            <form onSubmit={handleSubmit}>
              {/* Quick Date Selection */}
              <div className={styles.formGroup}>
                <label className={styles.label}>Date</label>
                <div className={styles.dateButtons}>
                  {weekDays.map(day => (
                    <button
                      key={day.toISOString()}
                      type="button"
                      className={`${styles.dateBtn} ${formDate === format(day, 'yyyy-MM-dd') ? styles.selected : ''}`}
                      onClick={() => setFormDate(format(day, 'yyyy-MM-dd'))}
                    >
                      <span className={styles.dayName}>{format(day, 'EEE')}</span>
                      <span className={styles.dayNum}>{format(day, 'd')}</span>
                    </button>
                  ))}
                </div>
                <input
                  type="date"
                  className={styles.dateInput}
                  value={formDate}
                  onChange={e => setFormDate(e.target.value)}
                />
              </div>

              {/* Minutes Selection */}
              <div className={styles.formGroup}>
                <label className={styles.label}>Duration</label>
                <div className={styles.minuteButtons}>
                  {[15, 30, 45, 60, 90, 120].map(mins => (
                    <button
                      key={mins}
                      type="button"
                      className={`${styles.minuteBtn} ${formMinutes === mins ? styles.selected : ''}`}
                      onClick={() => setFormMinutes(mins)}
                    >
                      {formatMinutes(mins)}
                    </button>
                  ))}
                </div>
                <div className={styles.customMinutes}>
                  <input
                    type="number"
                    min="1"
                    max="480"
                    value={formMinutes}
                    onChange={e => setFormMinutes(parseInt(e.target.value) || 30)}
                    className={styles.minuteInput}
                  />
                  <span className={styles.minuteLabel}>minutes</span>
                </div>
              </div>

              {/* Service Type */}
              <div className={styles.formGroup}>
                <label className={styles.label}>Service Type</label>
                <select
                  className={styles.select}
                  value={formServiceType}
                  onChange={e => setFormServiceType(e.target.value as ServiceType)}
                >
                  {Object.entries(SERVICE_TYPE_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>

              {/* Setting */}
              <div className={styles.formGroup}>
                <label className={styles.label}>Setting</label>
                <select
                  className={styles.select}
                  value={formSetting}
                  onChange={e => setFormSetting(e.target.value as ServiceSetting)}
                >
                  {Object.entries(SERVICE_SETTING_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>

              {/* Notes */}
              <div className={styles.formGroup}>
                <DictationTextArea
                  label="Notes (optional)"
                  value={formNotes}
                  onChange={setFormNotes}
                  placeholder="Add any notes about this session..."
                  rows={2}
                />
              </div>

              {error && <div className={styles.error}>{error}</div>}

              <div className={styles.formActions}>
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => setShowAddForm(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Saving...' : 'Save Log'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Service Logs List */}
        <div className={styles.logsSection}>
          <h3>Recent Logs</h3>
          {serviceLogs.length === 0 ? (
            <div className={styles.empty}>
              <p>No service logs recorded yet.</p>
            </div>
          ) : (
            <div className={styles.logsList}>
              {serviceLogs.map(log => (
                <div key={log.id} className={styles.logCard}>
                  <div className={styles.logMain}>
                    <div className={styles.logInfo}>
                      <span className={styles.logDate}>
                        {format(new Date(log.date), 'EEE, MMM d')}
                      </span>
                      <span className={styles.logDuration}>{formatMinutes(log.minutes)}</span>
                    </div>
                    <div className={styles.logDetails}>
                      <span className={styles.logType}>{SERVICE_TYPE_LABELS[log.serviceType]}</span>
                      <span className={styles.logSetting}>{SERVICE_SETTING_LABELS[log.setting]}</span>
                    </div>
                    {log.notes && <p className={styles.logNotes}>{log.notes}</p>}
                  </div>
                  <button
                    className={styles.deleteBtn}
                    onClick={() => handleDelete(log.id)}
                    title="Delete log"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Breakdown by Type */}
        {summary && Object.keys(summary.totalsByType).length > 0 && (
          <div className={styles.breakdownSection}>
            <h3>Time by Service Type</h3>
            <div className={styles.breakdownList}>
              {Object.entries(summary.totalsByType).map(([type, minutes]) => (
                <div key={type} className={styles.breakdownItem}>
                  <span className={styles.breakdownType}>
                    {SERVICE_TYPE_LABELS[type as ServiceType] || type}
                  </span>
                  <span className={styles.breakdownValue}>{formatMinutes(minutes)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
