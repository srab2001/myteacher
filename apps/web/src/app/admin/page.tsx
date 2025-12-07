'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/admin/documents/best-practice');
  }, [router]);

  return (
    <div className="loading-container">
      <div className="spinner" />
    </div>
  );
}
