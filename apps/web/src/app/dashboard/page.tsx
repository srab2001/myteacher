'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { api, Student } from '@/lib/api';
import { StatusBadge } from '@/components/StatusBadge';
import styles from './page.module.css';

export default function DashboardPage() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const [students, setStudents] = useState<Student[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(true);

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
                    <p className={styles.studentId}>ID: {student.studentIdNum}</p>
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
      </main>
    </div>
  );
}
