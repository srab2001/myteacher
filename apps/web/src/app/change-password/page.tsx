'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';

export default function ChangePasswordPage() {
  const router = useRouter();
  const { refreshUser } = useAuth();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [errors, setErrors] = useState<string[]>([]);

  const passwordRequirements = [
    { text: 'At least 8 characters', met: newPassword.length >= 8 },
    { text: 'One uppercase letter', met: /[A-Z]/.test(newPassword) },
    { text: 'One lowercase letter', met: /[a-z]/.test(newPassword) },
    { text: 'One number', met: /[0-9]/.test(newPassword) },
  ];

  const allRequirementsMet = passwordRequirements.every((req) => req.met);
  const passwordsMatch = newPassword === confirmPassword && confirmPassword.length > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setErrors([]);

    if (!allRequirementsMet) {
      setError('Please meet all password requirements');
      setLoading(false);
      return;
    }

    if (!passwordsMatch) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    try {
      await api.changePassword(currentPassword, newPassword, confirmPassword);

      // Refresh user to update mustChangePassword flag
      await refreshUser();

      // Redirect to onboarding or dashboard
      router.push('/onboarding');
    } catch (err) {
      console.error('Change password error:', err);
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An error occurred. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8" style={{ background: 'var(--background)' }}>
      <div className="w-full max-w-md">
        <div className="card" style={{ padding: '2rem' }}>
          {/* Header */}
          <div className="text-center" style={{ marginBottom: '2rem' }}>
            <div
              style={{
                width: '64px',
                height: '64px',
                background: 'var(--primary-light)',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 1rem auto',
              }}
            >
              <svg
                style={{ width: '32px', height: '32px', color: 'var(--primary)' }}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                />
              </svg>
            </div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>
              Change Your Password
            </h1>
            <p style={{ color: 'var(--text-muted)' }}>
              For security, please create a new password.
            </p>
          </div>

          {/* Error Display */}
          {(error || errors.length > 0) && (
            <div
              style={{
                marginBottom: '1.5rem',
                padding: '1rem',
                background: 'var(--danger-light)',
                border: '1px solid var(--danger)',
                borderRadius: '0.5rem',
              }}
            >
              {error && (
                <p style={{ color: 'var(--danger)', fontSize: '0.875rem' }}>{error}</p>
              )}
              {errors.map((err, i) => (
                <p key={i} style={{ color: 'var(--danger)', fontSize: '0.875rem' }}>
                  {err}
                </p>
              ))}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="currentPassword" className="form-label">
                Current Password (Temporary)
              </label>
              <input
                id="currentPassword"
                type="password"
                className="form-input"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                placeholder="Enter your temporary password"
              />
            </div>

            <div className="form-group">
              <label htmlFor="newPassword" className="form-label">
                New Password
              </label>
              <input
                id="newPassword"
                type="password"
                className="form-input"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                placeholder="Create a strong password"
              />

              {/* Password Requirements */}
              <div style={{ marginTop: '0.75rem' }}>
                {passwordRequirements.map((req, i) => (
                  <div
                    key={i}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      fontSize: '0.875rem',
                      marginBottom: '0.25rem',
                    }}
                  >
                    {req.met ? (
                      <svg
                        style={{ width: '16px', height: '16px', color: 'var(--success)' }}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    ) : (
                      <svg
                        style={{ width: '16px', height: '16px', color: 'var(--text-muted)' }}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    )}
                    <span
                      style={{
                        color: req.met ? 'var(--success)' : 'var(--text-muted)',
                      }}
                    >
                      {req.text}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="confirmPassword" className="form-label">
                Confirm New Password
              </label>
              <input
                id="confirmPassword"
                type="password"
                className="form-input"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                placeholder="Confirm your new password"
              />
              {confirmPassword.length > 0 && (
                <p
                  style={{
                    marginTop: '0.25rem',
                    fontSize: '0.875rem',
                    color: passwordsMatch ? 'var(--success)' : 'var(--danger)',
                  }}
                >
                  {passwordsMatch ? 'Passwords match' : 'Passwords do not match'}
                </p>
              )}
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading || !allRequirementsMet || !passwordsMatch}
              style={{ width: '100%', marginTop: '1.5rem' }}
            >
              {loading ? 'Changing Password...' : 'Set New Password'}
            </button>
          </form>

          {/* Info */}
          <div
            style={{
              marginTop: '1.5rem',
              padding: '1rem',
              background: 'var(--info-light)',
              border: '1px solid var(--info)',
              borderRadius: '0.5rem',
            }}
          >
            <p style={{ fontSize: '0.875rem', color: 'var(--info)' }}>
              After changing your password, you&apos;ll need to complete your profile
              setup including your role and school information.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
