'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { api, State } from '@/lib/api';
import styles from './page.module.css';

type Step = 1 | 2 | 3 | 4;

const ROLES = [
  { value: 'TEACHER', label: 'Teacher', description: 'Classroom teacher or specialist' },
  { value: 'CASE_MANAGER', label: 'Case Manager', description: 'IEP case manager or coordinator' },
  { value: 'ADMIN', label: 'Administrator', description: 'School or district administrator' },
];

export default function OnboardingPage() {
  const { user, loading, refreshUser } = useAuth();
  const router = useRouter();

  const [step, setStep] = useState<Step>(1);
  const [states, setStates] = useState<State[]>([]);
  const [formData, setFormData] = useState({
    role: '',
    stateCode: '',
    districtName: '',
    schoolName: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Redirect if not logged in or already onboarded
  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push('/');
      } else if (user.isOnboarded) {
        router.push('/dashboard');
      }
    }
  }, [user, loading, router]);

  // Load jurisdictions
  useEffect(() => {
    api.getJurisdictions()
      .then(({ states }) => setStates(states))
      .catch(console.error);
  }, []);

  const selectedState = states.find(s => s.stateCode === formData.stateCode);

  const handleNext = () => {
    if (step < 4) {
      setStep((step + 1) as Step);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep((step - 1) as Step);
    }
  };

  const handleSubmit = async () => {
    try {
      setSubmitting(true);
      setError(null);
      await api.updateProfile(formData);
      await refreshUser();
      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save profile');
    } finally {
      setSubmitting(false);
    }
  };

  const isStepValid = () => {
    switch (step) {
      case 1: return !!formData.role;
      case 2: return !!formData.stateCode;
      case 3: return !!formData.districtName;
      case 4: return !!formData.schoolName;
      default: return false;
    }
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
      <div className={styles.card}>
        <div className={styles.header}>
          <h1>Welcome to MyTeacher</h1>
          <p>Let&apos;s set up your profile</p>
        </div>

        <div className={styles.progress}>
          {[1, 2, 3, 4].map(s => (
            <div
              key={s}
              className={`${styles.progressStep} ${s <= step ? styles.active : ''}`}
            />
          ))}
        </div>

        <div className={styles.stepContent}>
          {step === 1 && (
            <div className={styles.step}>
              <h2>Select your role</h2>
              <div className={styles.roleGrid}>
                {ROLES.map(role => (
                  <button
                    key={role.value}
                    className={`${styles.roleCard} ${formData.role === role.value ? styles.selected : ''}`}
                    onClick={() => setFormData({ ...formData, role: role.value })}
                  >
                    <span className={styles.roleLabel}>{role.label}</span>
                    <span className={styles.roleDesc}>{role.description}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 2 && (
            <div className={styles.step}>
              <h2>Select your state</h2>
              <div className="form-group">
                <select
                  className="form-select"
                  value={formData.stateCode}
                  onChange={e => setFormData({ ...formData, stateCode: e.target.value, districtName: '' })}
                >
                  <option value="">Choose a state...</option>
                  {states.map(state => (
                    <option key={state.stateCode} value={state.stateCode}>
                      {state.stateName}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className={styles.step}>
              <h2>Select your district</h2>
              <div className="form-group">
                <select
                  className="form-select"
                  value={formData.districtName}
                  onChange={e => setFormData({ ...formData, districtName: e.target.value })}
                >
                  <option value="">Choose a district...</option>
                  {selectedState?.districts.map(d => (
                    <option key={d.code} value={d.name}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className={styles.step}>
              <h2>Enter your school</h2>
              <div className="form-group">
                <input
                  type="text"
                  className="form-input"
                  placeholder="School name"
                  value={formData.schoolName}
                  onChange={e => setFormData({ ...formData, schoolName: e.target.value })}
                />
              </div>
            </div>
          )}
        </div>

        {error && <div className={styles.error}>{error}</div>}

        <div className={styles.actions}>
          {step > 1 && (
            <button className="btn btn-outline" onClick={handleBack}>
              Back
            </button>
          )}
          {step < 4 ? (
            <button
              className="btn btn-primary"
              onClick={handleNext}
              disabled={!isStepValid()}
            >
              Continue
            </button>
          ) : (
            <button
              className="btn btn-primary"
              onClick={handleSubmit}
              disabled={!isStepValid() || submitting}
            >
              {submitting ? 'Saving...' : 'Complete Setup'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
