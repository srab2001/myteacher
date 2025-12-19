'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';

const API_URL = process.env.NEXT_PUBLIC_API_URL || '';

function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { refreshUser } = useAuth();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const code = searchParams.get('code');
    const redirect = searchParams.get('redirect') || '/dashboard';

    if (!code) {
      setError('No authentication code provided');
      setTimeout(() => router.push('/'), 2000);
      return;
    }

    const exchangeToken = async () => {
      try {
        const response = await fetch(`${API_URL}/auth/token-exchange?code=${code}`, {
          credentials: 'include',
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Authentication failed');
        }

        await refreshUser();
        router.push(redirect);
      } catch (err) {
        console.error('Token exchange error:', err);
        setError(err instanceof Error ? err.message : 'Authentication failed');
        setTimeout(() => router.push('/?error=auth_failed'), 2000);
      }
    };

    exchangeToken();
  }, [searchParams, router, refreshUser]);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      padding: '2rem',
    }}>
      {error ? (
        <>
          <div style={{ color: '#dc2626', marginBottom: '1rem' }}>{error}</div>
          <p>Redirecting to login...</p>
        </>
      ) : (
        <>
          <div className="spinner" style={{ marginBottom: '1rem' }} />
          <p>Completing sign in...</p>
        </>
      )}
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
      }}>
        <div className="spinner" />
        <p>Loading...</p>
      </div>
    }>
      <AuthCallbackContent />
    </Suspense>
  );
}
