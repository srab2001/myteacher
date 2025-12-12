'use client';

import { useState, useEffect } from 'react';
import { api, School } from '@/lib/api';
import styles from './page.module.css';

export default function SchoolsPage() {
  const [schools, setSchools] = useState<School[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddSchool, setShowAddSchool] = useState(false);
  const [editingSchool, setEditingSchool] = useState<School | null>(null);
  const [showInactive, setShowInactive] = useState(false);

  // New school form state
  const [newSchool, setNewSchool] = useState({
    name: '',
    code: '',
    stateCode: '',
    address: '',
  });

  useEffect(() => {
    loadSchools();
  }, []);

  const loadSchools = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await api.getAdminSchoolsList();
      setSchools(result.schools);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load schools');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSchool = async () => {
    try {
      await api.createSchool({
        name: newSchool.name,
        code: newSchool.code || undefined,
        stateCode: newSchool.stateCode || undefined,
        address: newSchool.address || undefined,
      });
      setShowAddSchool(false);
      setNewSchool({ name: '', code: '', stateCode: '', address: '' });
      loadSchools();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create school');
    }
  };

  const handleUpdateSchool = async () => {
    if (!editingSchool) return;
    try {
      await api.updateSchool(editingSchool.id, {
        name: editingSchool.name,
        code: editingSchool.code || undefined,
        stateCode: editingSchool.stateCode || undefined,
        isActive: editingSchool.isActive,
      });
      setEditingSchool(null);
      loadSchools();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update school');
    }
  };

  const handleToggleActive = async (school: School) => {
    try {
      if (school.isActive) {
        await api.deleteSchool(school.id);
      } else {
        await api.updateSchool(school.id, { isActive: true });
      }
      loadSchools();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update school');
    }
  };

  const filteredSchools = showInactive ? schools : schools.filter(s => s.isActive);

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1>School Management</h1>
        <div className={styles.headerActions}>
          <label className={styles.toggleLabel}>
            <input
              type="checkbox"
              checked={showInactive}
              onChange={e => setShowInactive(e.target.checked)}
            />
            Show Inactive
          </label>
          <button className="btn btn-primary" onClick={() => setShowAddSchool(true)}>
            + Add School
          </button>
        </div>
      </header>

      {error && <div className={styles.error}>{error}</div>}

      {loading ? (
        <div className="loading-container">
          <div className="spinner" />
        </div>
      ) : (
        <div className={styles.schoolGrid}>
          {filteredSchools.map(school => (
            <div key={school.id} className={`${styles.schoolCard} ${!school.isActive ? styles.inactive : ''}`}>
              <div className={styles.schoolInfo}>
                <h3 className={styles.schoolName}>{school.name}</h3>
                {school.code && (
                  <p className={styles.schoolMeta}>
                    <strong>Code:</strong> {school.code}
                  </p>
                )}
                {school.stateCode && (
                  <p className={styles.schoolMeta}>
                    <strong>State:</strong> {school.stateCode}
                  </p>
                )}
                {school.address && (
                  <p className={styles.schoolMeta}>
                    <strong>Address:</strong> {school.address}
                  </p>
                )}
                {!school.isActive && <span className={styles.inactiveBadge}>Inactive</span>}
              </div>
              <div className={styles.schoolActions}>
                <button
                  className="btn btn-sm btn-outline"
                  onClick={() => setEditingSchool(school)}
                >
                  Edit
                </button>
                <button
                  className={`btn btn-sm ${school.isActive ? 'btn-danger' : 'btn-primary'}`}
                  onClick={() => handleToggleActive(school)}
                >
                  {school.isActive ? 'Deactivate' : 'Activate'}
                </button>
              </div>
            </div>
          ))}
          {filteredSchools.length === 0 && (
            <p className={styles.emptyState}>
              {showInactive ? 'No schools found.' : 'No active schools. Click "Show Inactive" to see deactivated schools.'}
            </p>
          )}
        </div>
      )}

      {/* Add School Modal */}
      {showAddSchool && (
        <div className={styles.modal}>
          <div className={styles.modalContent}>
            <h2>Add New School</h2>
            <div className={styles.formGroup}>
              <label>School Name *</label>
              <input
                type="text"
                value={newSchool.name}
                onChange={e => setNewSchool(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Enter school name"
                className={styles.input}
              />
            </div>
            <div className={styles.formGroup}>
              <label>School Code</label>
              <input
                type="text"
                value={newSchool.code}
                onChange={e => setNewSchool(prev => ({ ...prev, code: e.target.value }))}
                placeholder="Optional school code"
                className={styles.input}
              />
            </div>
            <div className={styles.formGroup}>
              <label>State Code</label>
              <input
                type="text"
                value={newSchool.stateCode}
                onChange={e => setNewSchool(prev => ({ ...prev, stateCode: e.target.value }))}
                placeholder="e.g., MD"
                className={styles.input}
              />
            </div>
            <div className={styles.formGroup}>
              <label>Address</label>
              <textarea
                value={newSchool.address}
                onChange={e => setNewSchool(prev => ({ ...prev, address: e.target.value }))}
                placeholder="School address"
                className={styles.textarea}
                rows={3}
              />
            </div>
            <div className={styles.modalActions}>
              <button className="btn btn-outline" onClick={() => setShowAddSchool(false)}>
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={handleCreateSchool}
                disabled={!newSchool.name.trim()}
              >
                Create School
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit School Modal */}
      {editingSchool && (
        <div className={styles.modal}>
          <div className={styles.modalContent}>
            <h2>Edit School</h2>
            <div className={styles.formGroup}>
              <label>School Name *</label>
              <input
                type="text"
                value={editingSchool.name}
                onChange={e => setEditingSchool(prev => prev ? { ...prev, name: e.target.value } : null)}
                className={styles.input}
              />
            </div>
            <div className={styles.formGroup}>
              <label>School Code</label>
              <input
                type="text"
                value={editingSchool.code || ''}
                onChange={e => setEditingSchool(prev => prev ? { ...prev, code: e.target.value } : null)}
                className={styles.input}
              />
            </div>
            <div className={styles.formGroup}>
              <label>State Code</label>
              <input
                type="text"
                value={editingSchool.stateCode || ''}
                onChange={e => setEditingSchool(prev => prev ? { ...prev, stateCode: e.target.value } : null)}
                className={styles.input}
              />
            </div>
            <div className={styles.modalActions}>
              <button className="btn btn-outline" onClick={() => setEditingSchool(null)}>
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={handleUpdateSchool}
                disabled={!editingSchool.name.trim()}
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
