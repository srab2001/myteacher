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
          <Link href="/" className={styles.backLink}>
            ← Back to Home
          </Link>
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
