'use client';

import { useState } from 'react';
import Link from 'next/link';
import { DocumentUploader, DocumentList } from '@/components/admin';
import styles from './AdminDocuments.module.css';

export default function AdminDocumentsPage() {
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleUploadComplete = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <Link href="/" className={styles.backLink}>
              ← Home
            </Link>
            <span style={{ color: '#d1d5db', fontSize: '0.85rem' }}>|</span>
            <Link href="/admin/parse" className={styles.backLink}>
              PDF Parser
            </Link>
          </div>
          <h1 className={styles.title}>Knowledge Base Admin</h1>
          <p className={styles.subtitle}>
            Upload and manage documents for the Maryland Special Education Q&A knowledge base
          </p>
        </div>
      </header>

      <main className={styles.main}>
        <DocumentUploader onUploadComplete={handleUploadComplete} />
        <DocumentList refreshTrigger={refreshTrigger} />
      </main>
    </div>
  );
}
