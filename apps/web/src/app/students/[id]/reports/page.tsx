'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { format, subMonths } from 'date-fns';
import { useAuth } from '@/lib/auth-context';
import { api, Student, IEPProgressReport, ServiceMinutesReport } from '@/lib/api';
import styles from './page.module.css';

type ReportType = 'iep-progress' | 'service-minutes';

export default function StudentReportsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const studentId = params.id as string;

  const [student, setStudent] = useState<Student | null>(null);
  const [loadingStudent, setLoadingStudent] = useState(true);
  const [activeReport, setActiveReport] = useState<ReportType>('iep-progress');

  // IEP Progress Report state
  const [iepReport, setIepReport] = useState<IEPProgressReport | null>(null);
  const [loadingIep, setLoadingIep] = useState(false);
  const [iepError, setIepError] = useState<string | null>(null);
  const [iepDateRange, setIepDateRange] = useState({
    from: format(subMonths(new Date(), 3), 'yyyy-MM-dd'),
    to: format(new Date(), 'yyyy-MM-dd'),
  });

  // Service Minutes Report state
  const [serviceReport, setServiceReport] = useState<ServiceMinutesReport | null>(null);
  const [loadingService, setLoadingService] = useState(false);
  const [serviceError, setServiceError] = useState<string | null>(null);
  const [serviceDateRange, setServiceDateRange] = useState({
    from: format(subMonths(new Date(), 3), 'yyyy-MM-dd'),
    to: format(new Date(), 'yyyy-MM-dd'),
  });

  useEffect(() => {
    if (!loading && !user) {
      router.push('/');
    }
  }, [user, loading, router]);

  const loadStudent = useCallback(async () => {
    try {
      const { student } = await api.getStudent(studentId);
      setStudent(student);
    } catch (err) {
      console.error('Failed to load student:', err);
    } finally {
      setLoadingStudent(false);
    }
  }, [studentId]);

  useEffect(() => {
    if (user?.isOnboarded && studentId) {
      loadStudent();
    }
  }, [user, studentId, loadStudent]);

  const fetchIepReport = async () => {
    setLoadingIep(true);
    setIepError(null);
    try {
      const report = await api.getIEPProgressReport(
        studentId,
        iepDateRange.from,
        iepDateRange.to
      );
      setIepReport(report);
    } catch (err) {
      setIepError(err instanceof Error ? err.message : 'Failed to load IEP progress report');
      setIepReport(null);
    } finally {
      setLoadingIep(false);
    }
  };

  const fetchServiceReport = async () => {
    setLoadingService(true);
    setServiceError(null);
    try {
      const report = await api.getServiceMinutesReport(
        studentId,
        serviceDateRange.from,
        serviceDateRange.to
      );
      setServiceReport(report);
    } catch (err) {
      setServiceError(err instanceof Error ? err.message : 'Failed to load service minutes report');
      setServiceReport(null);
    } finally {
      setLoadingService(false);
    }
  };

  const exportJson = (data: IEPProgressReport | ServiceMinutesReport, filename: string) => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportIepCsv = (report: IEPProgressReport) => {
    const headers = ['Goal Code', 'Area', 'Goal Text', 'Baseline', 'Target', 'Target Date', 'Latest Value', 'Latest Date', 'Trend', 'On Track', 'Total Records'];
    const rows = report.goals.map(goal => [
      goal.goalCode,
      goal.area,
      `"${goal.annualGoalText.replace(/"/g, '""')}"`,
      goal.baselineValue ?? '',
      goal.targetValue ?? '',
      goal.targetDate ?? '',
      goal.progressSummary.latestValue ?? '',
      goal.progressSummary.latestDate ?? '',
      goal.progressSummary.trend,
      goal.progressSummary.isOnTrack === null ? '' : goal.progressSummary.isOnTrack ? 'Yes' : 'No',
      goal.progressSummary.totalRecords,
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `iep-progress-${report.studentName.replace(/\s+/g, '-')}-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportServiceCsv = (report: ServiceMinutesReport) => {
    const headers = ['Service Type', 'Date', 'Minutes', 'Notes', 'Provider'];
    const rows: string[][] = [];
    report.services.forEach(service => {
      service.logs.forEach(log => {
        rows.push([
          service.serviceType,
          log.date,
          log.minutes.toString(),
          `"${(log.notes || '').replace(/"/g, '""')}"`,
          log.provider || '',
        ]);
      });
    });
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `service-minutes-${report.studentName.replace(/\s+/g, '-')}-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getTrendLabel = (trend: string) => {
    switch (trend) {
      case 'improving': return { label: 'Improving', className: styles.trendImproving };
      case 'stable': return { label: 'Stable', className: styles.trendStable };
      case 'declining': return { label: 'Declining', className: styles.trendDeclining };
      default: return { label: 'Insufficient Data', className: styles.trendInsufficient };
    }
  };

  if (loading || loadingStudent) {
    return (
      <div className={styles.container}>
        <div className="loading-container">
          <div className="spinner" />
        </div>
      </div>
    );
  }

  if (!student) {
    return (
      <div className={styles.container}>
        <div className={styles.notFound}>
          <h2>Student not found</h2>
          <button className="btn btn-primary" onClick={() => router.push('/dashboard')}>
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <button className={styles.backBtn} onClick={() => router.push(`/students/${studentId}`)}>
            &larr; Back to Student
          </button>
        </div>
      </header>

      <main className={styles.main}>
        <div className={styles.pageHeader}>
          <h1>Reports</h1>
          <p>{student.lastName}, {student.firstName} - Grade {student.grade}</p>
        </div>

        {/* Report Type Tabs */}
        <div className={styles.tabs}>
          <button
            className={`${styles.tab} ${activeReport === 'iep-progress' ? styles.active : ''}`}
            onClick={() => setActiveReport('iep-progress')}
          >
            IEP Progress
          </button>
          <button
            className={`${styles.tab} ${activeReport === 'service-minutes' ? styles.active : ''}`}
            onClick={() => setActiveReport('service-minutes')}
          >
            Service Minutes
          </button>
        </div>

        {/* IEP Progress Report */}
        {activeReport === 'iep-progress' && (
          <section className={styles.reportSection}>
            <div className={styles.reportHeader}>
              <h2>IEP Progress Report</h2>
              <p>Track goal progress and trends over time</p>
            </div>

            <div className={styles.dateForm}>
              <div className={styles.dateField}>
                <label>From</label>
                <input
                  type="date"
                  value={iepDateRange.from}
                  onChange={(e) => setIepDateRange({ ...iepDateRange, from: e.target.value })}
                />
              </div>
              <div className={styles.dateField}>
                <label>To</label>
                <input
                  type="date"
                  value={iepDateRange.to}
                  onChange={(e) => setIepDateRange({ ...iepDateRange, to: e.target.value })}
                />
              </div>
              <button
                className="btn btn-primary"
                onClick={fetchIepReport}
                disabled={loadingIep}
              >
                {loadingIep ? 'Loading...' : 'Generate Report'}
              </button>
            </div>

            {iepError && (
              <div className={styles.errorMessage}>{iepError}</div>
            )}

            {iepReport && (
              <div className={styles.reportContent}>
                <div className={styles.reportMeta}>
                  <p><strong>Plan Status:</strong> {iepReport.planStatus}</p>
                  <p><strong>Plan Start:</strong> {format(new Date(iepReport.planStartDate), 'MMM d, yyyy')}</p>
                  {iepReport.planEndDate && (
                    <p><strong>Plan End:</strong> {format(new Date(iepReport.planEndDate), 'MMM d, yyyy')}</p>
                  )}
                  <p><strong>Total Goals:</strong> {iepReport.totalGoals}</p>
                </div>

                <div className={styles.exportButtons}>
                  <button
                    className="btn btn-outline btn-sm"
                    onClick={() => exportJson(iepReport, `iep-progress-${student.lastName}-${format(new Date(), 'yyyy-MM-dd')}`)}
                  >
                    Export JSON
                  </button>
                  <button
                    className="btn btn-outline btn-sm"
                    onClick={() => exportIepCsv(iepReport)}
                  >
                    Export CSV
                  </button>
                </div>

                {iepReport.goals.length === 0 ? (
                  <p className={styles.emptyMessage}>No goals found for this plan.</p>
                ) : (
                  <div className={styles.goalsTable}>
                    <table>
                      <thead>
                        <tr>
                          <th>Goal</th>
                          <th>Area</th>
                          <th>Baseline</th>
                          <th>Target</th>
                          <th>Latest</th>
                          <th>Trend</th>
                          <th>On Track</th>
                        </tr>
                      </thead>
                      <tbody>
                        {iepReport.goals.map((goal) => {
                          const trend = getTrendLabel(goal.progressSummary.trend);
                          return (
                            <tr key={goal.goalId}>
                              <td>
                                <div className={styles.goalCell}>
                                  <strong>{goal.goalCode}</strong>
                                  <span className={styles.goalText}>{goal.annualGoalText}</span>
                                </div>
                              </td>
                              <td>{goal.area}</td>
                              <td>{goal.baselineValue ?? '-'}</td>
                              <td>{goal.targetValue ?? '-'}</td>
                              <td>
                                {goal.progressSummary.latestValue !== null ? (
                                  <>
                                    {goal.progressSummary.latestValue}
                                    {goal.progressSummary.latestDate && (
                                      <span className={styles.dateNote}>
                                        {format(new Date(goal.progressSummary.latestDate), 'M/d')}
                                      </span>
                                    )}
                                  </>
                                ) : '-'}
                              </td>
                              <td>
                                <span className={trend.className}>{trend.label}</span>
                              </td>
                              <td>
                                {goal.progressSummary.isOnTrack === null ? (
                                  <span className={styles.unknown}>-</span>
                                ) : goal.progressSummary.isOnTrack ? (
                                  <span className={styles.onTrack}>Yes</span>
                                ) : (
                                  <span className={styles.offTrack}>No</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </section>
        )}

        {/* Service Minutes Report */}
        {activeReport === 'service-minutes' && (
          <section className={styles.reportSection}>
            <div className={styles.reportHeader}>
              <h2>Service Minutes Report</h2>
              <p>Track service delivery and minutes logged</p>
            </div>

            <div className={styles.dateForm}>
              <div className={styles.dateField}>
                <label>From</label>
                <input
                  type="date"
                  value={serviceDateRange.from}
                  onChange={(e) => setServiceDateRange({ ...serviceDateRange, from: e.target.value })}
                />
              </div>
              <div className={styles.dateField}>
                <label>To</label>
                <input
                  type="date"
                  value={serviceDateRange.to}
                  onChange={(e) => setServiceDateRange({ ...serviceDateRange, to: e.target.value })}
                />
              </div>
              <button
                className="btn btn-primary"
                onClick={fetchServiceReport}
                disabled={loadingService}
              >
                {loadingService ? 'Loading...' : 'Generate Report'}
              </button>
            </div>

            {serviceError && (
              <div className={styles.errorMessage}>{serviceError}</div>
            )}

            {serviceReport && (
              <div className={styles.reportContent}>
                <div className={styles.reportMeta}>
                  <p><strong>Date Range:</strong> {format(new Date(serviceReport.dateRange.from), 'MMM d, yyyy')} - {format(new Date(serviceReport.dateRange.to), 'MMM d, yyyy')}</p>
                </div>

                <div className={styles.summaryCards}>
                  <div className={styles.summaryCard}>
                    <span className={styles.summaryValue}>{serviceReport.summary.totalMinutes}</span>
                    <span className={styles.summaryLabel}>Total Minutes</span>
                  </div>
                  <div className={styles.summaryCard}>
                    <span className={styles.summaryValue}>{serviceReport.summary.totalSessions}</span>
                    <span className={styles.summaryLabel}>Total Sessions</span>
                  </div>
                  <div className={styles.summaryCard}>
                    <span className={styles.summaryValue}>{serviceReport.summary.averageMinutesPerSession.toFixed(1)}</span>
                    <span className={styles.summaryLabel}>Avg Minutes/Session</span>
                  </div>
                </div>

                <div className={styles.exportButtons}>
                  <button
                    className="btn btn-outline btn-sm"
                    onClick={() => exportJson(serviceReport, `service-minutes-${student.lastName}-${format(new Date(), 'yyyy-MM-dd')}`)}
                  >
                    Export JSON
                  </button>
                  <button
                    className="btn btn-outline btn-sm"
                    onClick={() => exportServiceCsv(serviceReport)}
                  >
                    Export CSV
                  </button>
                </div>

                {serviceReport.services.length === 0 ? (
                  <p className={styles.emptyMessage}>No service logs found for this date range.</p>
                ) : (
                  <div className={styles.servicesList}>
                    {serviceReport.services.map((service) => (
                      <div key={service.serviceType} className={styles.serviceGroup}>
                        <div className={styles.serviceHeader}>
                          <h4>{service.serviceType.replace(/_/g, ' ')}</h4>
                          <span className={styles.serviceTotals}>
                            {service.totalMinutes} min / {service.sessionCount} sessions
                          </span>
                        </div>
                        <table className={styles.serviceTable}>
                          <thead>
                            <tr>
                              <th>Date</th>
                              <th>Minutes</th>
                              <th>Provider</th>
                              <th>Notes</th>
                            </tr>
                          </thead>
                          <tbody>
                            {service.logs.map((log) => (
                              <tr key={log.id}>
                                <td>{format(new Date(log.date), 'MMM d, yyyy')}</td>
                                <td>{log.minutes}</td>
                                <td>{log.provider || '-'}</td>
                                <td className={styles.notesCell}>{log.notes || '-'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  );
}
