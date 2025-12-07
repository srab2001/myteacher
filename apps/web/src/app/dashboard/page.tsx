'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { api, Student, BestPracticeDocument, FormTemplate } from '@/lib/api';
import { StatusBadge } from '@/components/StatusBadge';
import styles from './page.module.css';

type TabType = 'students' | 'best-practice' | 'templates';

export default function DashboardPage() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const [students, setStudents] = useState<Student[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('students');
  const [bestPracticeDocs, setBestPracticeDocs] = useState<BestPracticeDocument[]>([]);
  const [formTemplates, setFormTemplates] = useState<FormTemplate[]>([]);
  const [loadingAdmin, setLoadingAdmin] = useState(false);

  const isAdmin = user?.role === 'ADMIN';

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
      api.getStudents()
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

  const handleLogout = async () => {
    await logout();
    router.push('/');
  };

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
                <span className={styles.count}>{students.length} students</span>
              </div>

              {loadingStudents ? (
                <div className="loading-container">
                  <div className="spinner" />
                </div>
              ) : students.length === 0 ? (
                <div className={styles.emptyState}>
                  <p>No students assigned yet.</p>
                  <p className={styles.hint}>Students will appear here once they are assigned to you.</p>
                </div>
              ) : (
                <div className={styles.studentGrid}>
                  {students.map(student => (
                    <div
                      key={student.id}
                      className={styles.studentCard}
                      onClick={() => router.push(`/students/${student.id}`)}
                    >
                      <div className={styles.studentInfo}>
                        <h4>{student.lastName}, {student.firstName}</h4>
                        <p>Grade {student.grade} • {student.schoolName}</p>
                        <p className={styles.studentId}>{student.recordId}</p>
                      </div>
                      <div className={styles.studentStatus}>
                        {student.overallStatus ? (
                          <StatusBadge code={student.overallStatus.code} />
                        ) : (
                          <span className={styles.noStatus}>No status</span>
                        )}
                      </div>
                    </div>
                  ))}
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
                        <p>{doc.planTypeName} • {doc.gradeBand || 'All Grades'}</p>
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
