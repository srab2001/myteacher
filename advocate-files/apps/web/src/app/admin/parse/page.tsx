'use client';

import Link from 'next/link';
import { PdfParser } from '@/components/admin';
import styles from './ParsePage.module.css';

export default function AdminParsePage() {
  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <div className={styles.navRow}>
            <Link href="/" className={styles.backLink}>
              ← Home
            </Link>
            <span className={styles.navSep}>|</span>
            <Link href="/admin/documents" className={styles.backLink}>
              Knowledge Base
            </Link>
          </div>
          <h1 className={styles.title}>PDF Document Parser</h1>
          <p className={styles.subtitle}>
            Upload PDFs to extract text, review and edit the content, then ingest into the knowledge base
          </p>
        </div>
      </header>

      <main className={styles.main}>
        <PdfParser />
      </main>
    </div>
  );
}
