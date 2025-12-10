'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import styles from './layout.module.css';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push('/');
      } else if (user.role !== 'ADMIN') {
        router.push('/dashboard');
      }
    }
  }, [user, loading, router]);

  const handleLogout = async () => {
    await logout();
    router.push('/');
  };

  if (loading || !user || user.role !== 'ADMIN') {
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
          <h1 className={styles.logo}>MyTeacher Admin</h1>
          <nav className={styles.nav}>
            <span className={styles.userName}>{user.displayName}</span>
            <button className="btn btn-outline" onClick={handleLogout}>
              Logout
            </button>
          </nav>
        </div>
      </header>

      <div className={styles.mainLayout}>
        <aside className={styles.sidebar}>
          <nav className={styles.sideNav}>
            <Link href="/admin/users" className={styles.navLink}>
              User Management
            </Link>
            <div className={styles.divider} />
            <Link href="/admin/documents/best-practice" className={styles.navLink}>
              Best Practice Documents
            </Link>
            <Link href="/admin/documents/templates" className={styles.navLink}>
              Form Templates
            </Link>
            <Link href="/admin/schemas" className={styles.navLink}>
              Plan Schemas
            </Link>
            <div className={styles.divider} />
            <Link href="/dashboard" className={styles.navLink}>
              Back to Dashboard
            </Link>
          </nav>
        </aside>
        <main className={styles.main}>
          {children}
        </main>
      </div>
    </div>
  );
}
