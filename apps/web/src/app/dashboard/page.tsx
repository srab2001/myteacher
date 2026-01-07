'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { api, StudentStatusSummary, BestPracticeDocument, FormTemplate } from '@/lib/api';
import { StatusBadge } from '@/components/StatusBadge';
// import { ComplianceDashboardCards } from '@/components/compliance/ComplianceDashboardCards';
import { AlertsBell } from '@/components/alerts/AlertsBell';
import styles from './page.module.css';

type TabType = 'students' | 'best-practice' | 'templates';
type StatusFilter = 'ALL' | 'ON_TRACK' | 'WATCH' | 'CONCERN' | 'URGENT' | 'NO_STATUS';

interface Filters {
  status: StatusFilter;
  hasIEP: boolean;
  has504: boolean;
  hasBehavior: boolean;
}

export default function DashboardPage() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const [students, setStudents] = useState<StudentStatusSummary[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('students');
  const [bestPracticeDocs, setBestPracticeDocs] = useState<BestPracticeDocument[]>([]);
  const [formTemplates, setFormTemplates] = useState<FormTemplate[]>([]);
  const [loadingAdmin, setLoadingAdmin] = useState(false);
  const [filters, setFilters] = useState<Filters>({
    status: 'ALL',
    hasIEP: false,
    has504: false,
    hasBehavior: false,
  });

  const isAdmin = user?.role === 'ADMIN';
  // const canManageCompliance = user?.role === 'ADMIN' || user?.role === 'CASE_MANAGER';

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push('/');
      } else if (!user.isOnboarded) {
        router.push('/onboarding');
      }
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (user?.isOnboarded) {
      api.getStudentStatusSummary()
        .then(({ students }) => setStudents(students))
        .catch(console.error)
        .finally(() => setLoadingStudents(false));
    }
  }, [user]);

  // Load admin data when switching to admin tabs
  useEffect(() => {
    if (!isAdmin) return;

    if (activeTab === 'best-practice' && bestPracticeDocs.length === 0) {
      setLoadingAdmin(true);
      api.getBestPracticeDocs()
        .then(({ documents }) => setBestPracticeDocs(documents))
        .catch(console.error)
        .finally(() => setLoadingAdmin(false));
    } else if (activeTab === 'templates' && formTemplates.length === 0) {
      setLoadingAdmin(true);
      api.getFormTemplates()
        .then(({ templates }) => setFormTemplates(templates))
        .catch(console.error)
        .finally(() => setLoadingAdmin(false));
    }
  }, [activeTab, isAdmin, bestPracticeDocs.length, formTemplates.length]);

  // Apply client-side filters
  const filteredStudents = useMemo(() => {
    return students.filter(student => {
      // Status filter
      if (filters.status !== 'ALL') {
        if (filters.status === 'NO_STATUS') {
          if (student.overallStatus) return false;
        } else {
          if (!student.overallStatus || student.overallStatus.code !== filters.status) return false;
        }
      }

      // Plan type filters (any selected must be true)
      if (filters.hasIEP && !student.hasActiveIEP) return false;
      if (filters.has504 && !student.hasActive504) return false;
      if (filters.hasBehavior && !student.hasActiveBehaviorPlan) return false;

      return true;
    });
  }, [students, filters]);

  const handleLogout = async () => {
    await logout();
    router.push('/');
  };

  const clearFilters = () => {
    setFilters({
      status: 'ALL',
      hasIEP: false,
      has504: false,
      hasBehavior: false,
    });
  };

  const hasActiveFilters = filters.status !== 'ALL' || filters.hasIEP || filters.has504 || filters.hasBehavior;

  if (loading || !user) {
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
        <div className={styles.headerContent}>
          <h1 className={styles.logo}>MyTeacher</h1>
          <nav className={styles.nav}>
            <AlertsBell />
            <span className={styles.userName}>{user.displayName}</span>
            <button className="btn btn-outline" onClick={handleLogout}>
              Logout
            </button>
          </nav>
        </div>
      </header>

      <main className={styles.main}>
        <div className={styles.pageHeader}>
          <h2>Dashboard</h2>
          <p>Welcome back, {user.displayName}</p>
        </div>

        {/* Compliance Dashboard Cards - ADMIN and CASE_MANAGER */}
        {/* TODO: Re-enable when compliance models are added to schema */}
        {/* canManageCompliance && (
          <ComplianceDashboardCards />
        ) */}

        {/* Admin Banner */}
        {isAdmin && (
          <div className={styles.adminBanner}>
            <div className={styles.adminBannerText}>
              <h3>Admin Access</h3>
              <p>Manage documents and templates for all teachers</p>
            </div>
            <div className={styles.adminButtons}>
              <button
                className={styles.adminBtn}
                onClick={() => router.push('/admin/users')}
              >
                <span className={styles.icon}>&#128101;</span>
                Manage Users
              </button>
              <button
                className={styles.adminBtn}
                onClick={() => router.push('/admin/students')}
              >
                <span className={styles.icon}>&#127891;</span>
                Manage Students
              </button>
              <button
                className={styles.adminBtn}
                onClick={() => router.push('/admin/documents/best-practice')}
              >
                <span className={styles.icon}>&#128196;</span>
                Best Practice Docs
              </button>
              <button
                className={styles.adminBtn}
                onClick={() => router.push('/admin/documents/templates')}
              >
                <span className={styles.icon}>&#128203;</span>
                Form Templates
              </button>
              <button
                className={styles.adminBtn}
                onClick={() => router.push('/admin/schemas')}
              >
                <span className={styles.icon}>&#128221;</span>
                Plan Schemas
              </button>
            </div>
          </div>
        )}

        {/* Tabs for Admin Users */}
        {isAdmin && (
          <div className={styles.tabs}>
            <button
              className={`${styles.tab} ${activeTab === 'students' ? styles.active : ''}`}
              onClick={() => setActiveTab('students')}
            >
              My Students
            </button>
            <button
              className={`${styles.tab} ${activeTab === 'best-practice' ? styles.active : ''}`}
              onClick={() => setActiveTab('best-practice')}
            >
              Best Practice Docs ({bestPracticeDocs.length})
            </button>
            <button
              className={`${styles.tab} ${activeTab === 'templates' ? styles.active : ''}`}
              onClick={() => setActiveTab('templates')}
            >
              Form Templates ({formTemplates.length})
            </button>
          </div>
        )}

        {/* Tab Content */}
        <div className={styles.tabContent}>
          {activeTab === 'students' && (
            <section className={styles.section}>
              <div className={styles.sectionHeader}>
                <h3>Your Students</h3>
                <span className={styles.count}>
                  {filteredStudents.length} of {students.length} students
                </span>
              </div>

              {/* Filter Panel */}
              <div className={styles.filterPanel}>
                <div className={styles.filterGroup}>
                  <label className={styles.filterLabel}>Status</label>
                  <select
                    className={styles.filterSelect}
                    value={filters.status}
                    onChange={(e) => setFilters({ ...filters, status: e.target.value as StatusFilter })}
                  >
                    <option value="ALL">All Statuses</option>
                    <option value="ON_TRACK">On Track</option>
                    <option value="WATCH">Watch</option>
                    <option value="CONCERN">Concern</option>
                    <option value="URGENT">Urgent</option>
                    <option value="NO_STATUS">No Status</option>
                  </select>
                </div>
                <div className={styles.filterGroup}>
                  <label className={styles.filterLabel}>Plan Types</label>
                  <div className={styles.checkboxGroup}>
                    <label className={styles.checkbox}>
                      <input
                        type="checkbox"
                        checked={filters.hasIEP}
                        onChange={(e) => setFilters({ ...filters, hasIEP: e.target.checked })}
                      />
                      Has IEP
                    </label>
                    <label className={styles.checkbox}>
                      <input
                        type="checkbox"
                        checked={filters.has504}
                        onChange={(e) => setFilters({ ...filters, has504: e.target.checked })}
                      />
                      Has 504
                    </label>
                    <label className={styles.checkbox}>
                      <input
                        type="checkbox"
                        checked={filters.hasBehavior}
                        onChange={(e) => setFilters({ ...filters, hasBehavior: e.target.checked })}
                      />
                      Has Behavior Plan
                    </label>
                  </div>
                </div>
                {hasActiveFilters && (
                  <button className={styles.clearFilters} onClick={clearFilters}>
                    Clear Filters
                  </button>
                )}
              </div>

              {loadingStudents ? (
                <div className="loading-container">
                  <div className="spinner" />
                </div>
              ) : filteredStudents.length === 0 ? (
                <div className={styles.emptyState}>
                  {students.length === 0 ? (
                    <>
                      <p>No students assigned yet.</p>
                      <p className={styles.hint}>Students will appear here once they are assigned to you.</p>
                    </>
                  ) : (
                    <>
                      <p>No students match the current filters.</p>
                      <button className="btn btn-outline" onClick={clearFilters}>
                        Clear Filters
                      </button>
                    </>
                  )}
                </div>
              ) : (
                <div className={styles.tableContainer}>
                  <table className={styles.studentTable}>
                    <thead>
                      <tr>
                        <th>Record ID</th>
                        <th>Name</th>
                        <th>Grade</th>
                        <th>Status</th>
                        <th>IEP</th>
                        <th>504</th>
                        <th>Behavior</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredStudents.map(student => (
                        <tr key={student.studentId}>
                          <td className={styles.recordId}>{student.recordId}</td>
                          <td className={styles.studentName}>
                            {student.lastName}, {student.firstName}
                          </td>
                          <td>{student.gradeLevel}</td>
                          <td>
                            {student.overallStatus ? (
                              <StatusBadge code={student.overallStatus.code} />
                            ) : (
                              <span className={styles.noStatus}>-</span>
                            )}
                          </td>
                          <td>
                            <span className={`${styles.planFlag} ${student.hasActiveIEP ? styles.active : styles.inactive}`}>
                              {student.hasActiveIEP ? 'Yes' : 'No'}
                            </span>
                          </td>
                          <td>
                            <span className={`${styles.planFlag} ${student.hasActive504 ? styles.active : styles.inactive}`}>
                              {student.hasActive504 ? 'Yes' : 'No'}
                            </span>
                          </td>
                          <td>
                            <span className={`${styles.planFlag} ${student.hasActiveBehaviorPlan ? styles.active : styles.inactive}`}>
                              {student.hasActiveBehaviorPlan ? 'Yes' : 'No'}
                            </span>
                          </td>
                          <td>
                            <button
                              className={styles.actionBtn}
                              onClick={() => router.push(`/students/${student.studentId}`)}
                            >
                              Open
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          )}

          {activeTab === 'best-practice' && isAdmin && (
            <section className={styles.section}>
              <div className={styles.sectionHeader}>
                <h3>Best Practice Documents</h3>
                <button
                  className="btn btn-primary"
                  onClick={() => router.push('/admin/documents/best-practice')}
                >
                  Manage Documents
                </button>
              </div>

              {loadingAdmin ? (
                <div className="loading-container">
                  <div className="spinner" />
                </div>
              ) : bestPracticeDocs.length === 0 ? (
                <div className={styles.emptyState}>
                  <p>No best practice documents uploaded.</p>
                  <p className={styles.hint}>Upload example IEPs, 504 plans, and behavior plans.</p>
                </div>
              ) : (
                <div className={styles.studentGrid}>
                  {bestPracticeDocs.slice(0, 5).map(doc => (
                    <div key={doc.id} className={styles.studentCard}>
                      <div className={styles.studentInfo}>
                        <h4>{doc.title}</h4>
                        <p>{doc.planTypeName} - {doc.gradeBand || 'All Grades'}</p>
                        <p className={styles.studentId}>
                          {doc.ingestionStatus === 'COMPLETE' ? `${doc.chunkCount} chunks` : doc.ingestionStatus}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}

          {activeTab === 'templates' && isAdmin && (
            <section className={styles.section}>
              <div className={styles.sectionHeader}>
                <h3>Form Templates</h3>
                <button
                  className="btn btn-primary"
                  onClick={() => router.push('/admin/documents/templates')}
                >
                  Manage Templates
                </button>
              </div>

              {loadingAdmin ? (
                <div className="loading-container">
                  <div className="spinner" />
                </div>
              ) : formTemplates.length === 0 ? (
                <div className={styles.emptyState}>
                  <p>No form templates uploaded.</p>
                  <p className={styles.hint}>Upload blank printable forms for teachers.</p>
                </div>
              ) : (
                <div className={styles.studentGrid}>
                  {formTemplates.slice(0, 5).map(template => (
                    <div key={template.id} className={styles.studentCard}>
                      <div className={styles.studentInfo}>
                        <h4>{template.title}</h4>
                        <p>{template.planTypeName}</p>
                        <p className={styles.studentId}>{template.isDefault ? 'Default' : 'Custom'}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}
        </div>
      </main>
    </div>
  );
}
