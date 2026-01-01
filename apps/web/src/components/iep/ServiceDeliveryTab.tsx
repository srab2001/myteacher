'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { format, parseISO, subWeeks, startOfWeek, endOfWeek } from 'date-fns';
import {
  api,
  ScheduledServicePlan,
  ServiceVarianceReport,
  ServiceLog,
  ServiceType,
  CreateScheduledServiceItem,
} from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import styles from './ServiceDeliveryTab.module.css';

interface ServiceDeliveryTabProps {
  planId: string;
  userRole?: string | null;
}

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

type SubTab = 'scheduled' | 'logs' | 'variance';

export function ServiceDeliveryTab({ planId, userRole: propUserRole }: ServiceDeliveryTabProps) {
  const { user } = useAuth();
  const effectiveRole = propUserRole ?? user?.role;
  const [subTab, setSubTab] = useState<SubTab>('scheduled');
  const [scheduledPlan, setScheduledPlan] = useState<ScheduledServicePlan | null>(null);
  const [serviceLogs, setServiceLogs] = useState<ServiceLog[]>([]);
  const [varianceReport, setVarianceReport] = useState<ServiceVarianceReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Date range for variance report
  const [varianceStartDate, setVarianceStartDate] = useState(() => {
    const start = startOfWeek(subWeeks(new Date(), 4), { weekStartsOn: 1 });
    return format(start, 'yyyy-MM-dd');
  });
  const [varianceEndDate, setVarianceEndDate] = useState(() => {
    const end = endOfWeek(new Date(), { weekStartsOn: 1 });
    return format(end, 'yyyy-MM-dd');
  });

  // Edit modal state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingItems, setEditingItems] = useState<CreateScheduledServiceItem[]>([]);

  const canManage = effectiveRole === 'ADMIN' || effectiveRole === 'CASE_MANAGER';

  const loadScheduledServices = useCallback(async () => {
    try {
      const { scheduledPlan: plan } = await api.getScheduledServices(planId);
      setScheduledPlan(plan);
    } catch (err) {
      console.error('Failed to load scheduled services:', err);
    }
  }, [planId]);

  const loadServiceLogs = useCallback(async () => {
    try {
      const { serviceLogs: logs } = await api.getPlanServices(planId);
      setServiceLogs(logs);
    } catch (err) {
      console.error('Failed to load service logs:', err);
    }
  }, [planId]);

  const loadVarianceReport = useCallback(async () => {
    try {
      const report = await api.getServiceVariance(planId, varianceStartDate, varianceEndDate);
      setVarianceReport(report);
    } catch (err) {
      console.error('Failed to load variance report:', err);
    }
  }, [planId, varianceStartDate, varianceEndDate]);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([
        loadScheduledServices(),
        loadServiceLogs(),
      ]);
      setLoading(false);
    };
    loadData();
  }, [loadScheduledServices, loadServiceLogs]);

  useEffect(() => {
    if (subTab === 'variance') {
      loadVarianceReport();
    }
  }, [subTab, loadVarianceReport]);

  const handleOpenEditModal = () => {
    if (scheduledPlan) {
      setEditingItems(scheduledPlan.items.map(item => ({
        serviceType: item.serviceType,
        expectedMinutesPerWeek: item.expectedMinutesPerWeek,
        startDate: item.startDate.split('T')[0],
        endDate: item.endDate?.split('T')[0] || null,
        providerRole: item.providerRole,
        location: item.location,
        notes: item.notes,
      })));
    } else {
      setEditingItems([]);
    }
    setShowEditModal(true);
  };

  const handleAddItem = () => {
    setEditingItems(prev => [...prev, {
      serviceType: 'SPECIAL_EDUCATION',
      expectedMinutesPerWeek: 60,
      startDate: format(new Date(), 'yyyy-MM-dd'),
      endDate: null,
      providerRole: null,
      location: null,
      notes: null,
    }]);
  };

  const handleRemoveItem = (index: number) => {
    setEditingItems(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpdateItem = (index: number, field: keyof CreateScheduledServiceItem, value: unknown) => {
    setEditingItems(prev => prev.map((item, i) =>
      i === index ? { ...item, [field]: value } : item
    ));
  };

  const handleSaveScheduledServices = async () => {
    try {
      setError(null);
      if (scheduledPlan) {
        await api.updateScheduledServices(scheduledPlan.id, { items: editingItems });
      } else {
        await api.createScheduledServices(planId, { items: editingItems });
      }
      await loadScheduledServices();
      setShowEditModal(false);
    } catch (err) {
      console.error('Failed to save scheduled services:', err);
      setError('Failed to save scheduled services');
    }
  };

  const handleExportVarianceCsv = () => {
    if (!varianceReport) return;

    const rows = [
      ['Week Of', 'Week End', 'Service Type', 'Expected Minutes', 'Delivered Minutes', 'Variance', 'Missed Sessions'],
    ];

    for (const week of varianceReport.variance) {
      for (const svc of week.byServiceType) {
        rows.push([
          week.weekOf,
          week.weekEnd,
          SERVICE_TYPE_LABELS[svc.serviceType],
          String(svc.expectedMinutes),
          String(svc.deliveredMinutes),
          String(svc.varianceMinutes),
          String(svc.missedSessions),
        ]);
      }
    }

    const csv = rows.map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `service-variance-${varianceStartDate}-to-${varianceEndDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Group logs by date for display
  const logsByDate = useMemo(() => {
    const grouped: Record<string, ServiceLog[]> = {};
    for (const log of serviceLogs) {
      const date = log.date.split('T')[0];
      if (!grouped[date]) grouped[date] = [];
      grouped[date].push(log);
    }
    return Object.entries(grouped).sort((a, b) => b[0].localeCompare(a[0]));
  }, [serviceLogs]);

  if (loading) {
    return (
      <div className={styles.loading}>
        <div className="spinner" />
        <p>Loading service delivery data...</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2>Service Delivery</h2>
      </div>

      {error && <div className={styles.error}>{error}</div>}

      {/* Sub-tabs */}
      <div className={styles.subTabs}>
        <button
          className={`${styles.subTab} ${subTab === 'scheduled' ? styles.active : ''}`}
          onClick={() => setSubTab('scheduled')}
        >
          Scheduled Services
        </button>
        <button
          className={`${styles.subTab} ${subTab === 'logs' ? styles.active : ''}`}
          onClick={() => setSubTab('logs')}
        >
          Delivered Logs
        </button>
        <button
          className={`${styles.subTab} ${subTab === 'variance' ? styles.active : ''}`}
          onClick={() => setSubTab('variance')}
        >
          Variance Report
        </button>
      </div>

      {/* Scheduled Services Tab */}
      {subTab === 'scheduled' && (
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <h3>Scheduled Services</h3>
            {canManage && (
              <button className="btn btn-primary btn-sm" onClick={handleOpenEditModal}>
                {scheduledPlan ? 'Edit Scheduled Services' : 'Add Scheduled Services'}
              </button>
            )}
          </div>

          {scheduledPlan && scheduledPlan.items.length > 0 ? (
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Service Type</th>
                  <th>Expected Min/Week</th>
                  <th>Start</th>
                  <th>End</th>
                  <th>Provider Role</th>
                  <th>Location</th>
                </tr>
              </thead>
              <tbody>
                {scheduledPlan.items.map(item => (
                  <tr key={item.id}>
                    <td>{SERVICE_TYPE_LABELS[item.serviceType]}</td>
                    <td className={styles.minutesCell}>{item.expectedMinutesPerWeek}</td>
                    <td>{format(parseISO(item.startDate), 'MMM d, yyyy')}</td>
                    <td>{item.endDate ? format(parseISO(item.endDate), 'MMM d, yyyy') : '—'}</td>
                    <td>{item.providerRole || '—'}</td>
                    <td>{item.location || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className={styles.emptyState}>
              <p>No scheduled services defined yet.</p>
              {canManage && <p>Click &quot;Add Scheduled Services&quot; to define expected service delivery.</p>}
            </div>
          )}
        </div>
      )}

      {/* Delivered Logs Tab */}
      {subTab === 'logs' && (
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <h3>Delivered Service Logs</h3>
          </div>

          {logsByDate.length > 0 ? (
            <div className={styles.logsList}>
              {logsByDate.map(([date, logs]) => (
                <div key={date} className={styles.dateGroup}>
                  <div className={styles.dateHeader}>
                    {format(parseISO(date), 'EEEE, MMM d, yyyy')}
                  </div>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>Service Type</th>
                        <th>Minutes</th>
                        <th>Provider</th>
                        <th>Missed?</th>
                        <th>Notes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {logs.map(log => (
                        <tr key={log.id} className={log.minutes === 0 ? styles.missedRow : ''}>
                          <td>{SERVICE_TYPE_LABELS[log.serviceType]}</td>
                          <td className={styles.minutesCell}>{log.minutes}</td>
                          <td>{log.provider?.displayName || '—'}</td>
                          <td>
                            {log.minutes === 0 ? (
                              <span className={styles.missedBadge}>Yes</span>
                            ) : (
                              <span className={styles.deliveredBadge}>No</span>
                            )}
                          </td>
                          <td className={styles.notesCell}>{log.notes || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
          ) : (
            <div className={styles.emptyState}>
              <p>No service logs recorded yet.</p>
            </div>
          )}
        </div>
      )}

      {/* Variance Report Tab */}
      {subTab === 'variance' && (
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <h3>Variance Report (Weekly)</h3>
          </div>

          <div className={styles.varianceFilters}>
            <div className={styles.filterGroup}>
              <label>Start</label>
              <input
                type="date"
                value={varianceStartDate}
                onChange={e => setVarianceStartDate(e.target.value)}
              />
            </div>
            <div className={styles.filterGroup}>
              <label>End</label>
              <input
                type="date"
                value={varianceEndDate}
                onChange={e => setVarianceEndDate(e.target.value)}
              />
            </div>
            <button className="btn btn-outline btn-sm" onClick={loadVarianceReport}>
              Run
            </button>
            <button className="btn btn-outline btn-sm" onClick={handleExportVarianceCsv} disabled={!varianceReport}>
              Export CSV
            </button>
          </div>

          {varianceReport && varianceReport.variance.length > 0 ? (
            <>
              <div className={styles.varianceSummary}>
                <div className={styles.summaryItem}>
                  <span className={styles.summaryLabel}>Total Expected</span>
                  <span className={styles.summaryValue}>{varianceReport.summary.totalExpected} min</span>
                </div>
                <div className={styles.summaryItem}>
                  <span className={styles.summaryLabel}>Total Delivered</span>
                  <span className={styles.summaryValue}>{varianceReport.summary.totalDelivered} min</span>
                </div>
                <div className={styles.summaryItem}>
                  <span className={styles.summaryLabel}>Variance</span>
                  <span className={`${styles.summaryValue} ${varianceReport.summary.totalVariance < 0 ? styles.negative : styles.positive}`}>
                    {varianceReport.summary.totalVariance >= 0 ? '+' : ''}{varianceReport.summary.totalVariance} min
                  </span>
                </div>
              </div>

              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Week Of</th>
                    <th>Service</th>
                    <th>Expected</th>
                    <th>Delivered</th>
                    <th>Variance</th>
                  </tr>
                </thead>
                <tbody>
                  {varianceReport.variance.map(week => (
                    week.byServiceType.map((svc, i) => (
                      <tr key={`${week.weekOf}-${svc.serviceType}`}>
                        {i === 0 && (
                          <td rowSpan={week.byServiceType.length}>
                            {format(parseISO(week.weekOf), 'MMM d')} - {format(parseISO(week.weekEnd), 'MMM d')}
                          </td>
                        )}
                        <td>{SERVICE_TYPE_LABELS[svc.serviceType]}</td>
                        <td className={styles.minutesCell}>{svc.expectedMinutes}</td>
                        <td className={styles.minutesCell}>{svc.deliveredMinutes}</td>
                        <td className={`${styles.minutesCell} ${svc.varianceMinutes < 0 ? styles.negative : styles.positive}`}>
                          {svc.varianceMinutes >= 0 ? '+' : ''}{svc.varianceMinutes}
                        </td>
                      </tr>
                    ))
                  ))}
                </tbody>
              </table>
            </>
          ) : (
            <div className={styles.emptyState}>
              <p>No variance data for the selected period.</p>
              <p>Make sure scheduled services are defined and service logs are recorded.</p>
            </div>
          )}
        </div>
      )}

      {/* Edit Scheduled Services Modal */}
      {showEditModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <h3>Edit Scheduled Services</h3>
              <button className={styles.closeBtn} onClick={() => setShowEditModal(false)}>×</button>
            </div>

            <div className={styles.modalBody}>
              {editingItems.length === 0 ? (
                <div className={styles.emptyState}>
                  <p>No services. Click &quot;Add Item&quot; to add a scheduled service.</p>
                </div>
              ) : (
                <div className={styles.editList}>
                  {editingItems.map((item, index) => (
                    <div key={index} className={styles.editItem}>
                      <div className={styles.editRow}>
                        <div className={styles.editField}>
                          <label>Service Type *</label>
                          <select
                            value={item.serviceType}
                            onChange={e => handleUpdateItem(index, 'serviceType', e.target.value as ServiceType)}
                          >
                            {(Object.keys(SERVICE_TYPE_LABELS) as ServiceType[]).map(type => (
                              <option key={type} value={type}>{SERVICE_TYPE_LABELS[type]}</option>
                            ))}
                          </select>
                        </div>
                        <div className={styles.editField}>
                          <label>Expected Min/Week *</label>
                          <input
                            type="number"
                            value={item.expectedMinutesPerWeek}
                            onChange={e => handleUpdateItem(index, 'expectedMinutesPerWeek', parseInt(e.target.value) || 0)}
                            min={1}
                          />
                        </div>
                        <button className={styles.removeBtn} onClick={() => handleRemoveItem(index)}>×</button>
                      </div>
                      <div className={styles.editRow}>
                        <div className={styles.editField}>
                          <label>Start *</label>
                          <input
                            type="date"
                            value={item.startDate}
                            onChange={e => handleUpdateItem(index, 'startDate', e.target.value)}
                          />
                        </div>
                        <div className={styles.editField}>
                          <label>End</label>
                          <input
                            type="date"
                            value={item.endDate || ''}
                            onChange={e => handleUpdateItem(index, 'endDate', e.target.value || null)}
                          />
                        </div>
                      </div>
                      <div className={styles.editRow}>
                        <div className={styles.editField}>
                          <label>Provider Role</label>
                          <input
                            type="text"
                            value={item.providerRole || ''}
                            onChange={e => handleUpdateItem(index, 'providerRole', e.target.value || null)}
                            placeholder="e.g., Speech Therapist"
                          />
                        </div>
                        <div className={styles.editField}>
                          <label>Location</label>
                          <input
                            type="text"
                            value={item.location || ''}
                            onChange={e => handleUpdateItem(index, 'location', e.target.value || null)}
                            placeholder="e.g., Therapy Room"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <button className="btn btn-outline btn-sm" onClick={handleAddItem} style={{ marginTop: '1rem' }}>
                + Add Item
              </button>
            </div>

            <div className={styles.modalFooter}>
              <button className="btn btn-outline" onClick={() => setShowEditModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSaveScheduledServices} disabled={editingItems.length === 0}>
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
