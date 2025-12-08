'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { format } from 'date-fns';
import {
  api,
  AdminUserDetail,
  AdminUserRole,
  AdminPermissions,
  StudentAccessEntry,
  Jurisdiction,
} from '@/lib/api';
import styles from './page.module.css';

const ROLE_LABELS: Record<AdminUserRole, string> = {
  TEACHER: 'Teacher',
  CASE_MANAGER: 'Case Manager',
  ADMIN: 'Admin',
};

const ROLE_STYLES: Record<AdminUserRole, string> = {
  TEACHER: styles.teacher,
  CASE_MANAGER: styles.caseManager,
  ADMIN: styles.admin,
};

const PERMISSION_LABELS: Record<keyof AdminPermissions, string> = {
  canCreatePlans: 'Create Plans',
  canUpdatePlans: 'Update Plans',
  canReadAll: 'Read All Students',
  canManageUsers: 'Manage Users',
  canManageDocs: 'Manage Documents',
};

export default function UserDetailPage() {
  const params = useParams();
  const router = useRouter();
  const userId = params.userId as string;

  const [user, setUser] = useState<AdminUserDetail | null>(null);
  const [jurisdictions, setJurisdictions] = useState<Jurisdiction[]>([]);
  const [studentAccess, setStudentAccess] = useState<StudentAccessEntry[]>([]);
  const [canReadAll, setCanReadAll] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAddStudentModal, setShowAddStudentModal] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [userRes, jurRes, accessRes] = await Promise.all([
        api.getAdminUser(userId),
        api.getAdminJurisdictions(),
        api.getUserStudentAccess(userId),
      ]);
      setUser(userRes.user);
      setJurisdictions(jurRes.jurisdictions);
      setCanReadAll(accessRes.canReadAll);
      setStudentAccess(accessRes.studentAccess);
    } catch (err) {
      console.error('Failed to load user:', err);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handlePermissionChange = async (key: keyof AdminPermissions) => {
    if (!user?.permissions) return;

    const newValue = !user.permissions[key];
    try {
      await api.updateAdminUserPermissions(userId, { [key]: newValue });
      setUser((prev) =>
        prev
          ? {
              ...prev,
              permissions: prev.permissions
                ? { ...prev.permissions, [key]: newValue }
                : null,
            }
          : null
      );
      // If canReadAll changed, reload student access
      if (key === 'canReadAll') {
        const accessRes = await api.getUserStudentAccess(userId);
        setCanReadAll(accessRes.canReadAll);
        setStudentAccess(accessRes.studentAccess);
      }
    } catch (err) {
      console.error('Failed to update permission:', err);
    }
  };

  const handleToggleStudentEdit = async (access: StudentAccessEntry) => {
    try {
      await api.updateStudentAccess(userId, access.id, !access.canEdit);
      setStudentAccess((prev) =>
        prev.map((sa) =>
          sa.id === access.id ? { ...sa, canEdit: !sa.canEdit } : sa
        )
      );
    } catch (err) {
      console.error('Failed to update student access:', err);
    }
  };

  const handleRemoveStudent = async (accessId: string) => {
    if (!confirm('Are you sure you want to remove this student access?')) return;

    try {
      await api.removeStudentAccess(userId, accessId);
      setStudentAccess((prev) => prev.filter((sa) => sa.id !== accessId));
    } catch (err) {
      console.error('Failed to remove student access:', err);
    }
  };

  const handleEditComplete = () => {
    setShowEditModal(false);
    loadData();
  };

  const handleAddStudentComplete = () => {
    setShowAddStudentModal(false);
    loadData();
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className={styles.container}>
        <p>User not found.</p>
        <Link href="/admin/users" className="btn btn-outline">
          Back to Users
        </Link>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <Link href="/admin/users" className={styles.backLink}>
        &larr; Back to Users
      </Link>

      <div className={styles.pageHeader}>
        <div>
          <h2>{user.displayName}</h2>
          <p className={styles.userMeta}>{user.email}</p>
        </div>
        <div className={styles.headerActions}>
          <button className="btn btn-outline" onClick={() => setShowEditModal(true)}>
            Edit User
          </button>
        </div>
      </div>

      {/* User Details Section */}
      <div className={styles.section}>
        <h3>User Details</h3>
        <div className={styles.detailGrid}>
          <div className={styles.detailItem}>
            <span className={styles.detailLabel}>Role</span>
            <span className={styles.detailValue}>
              <span className={`${styles.roleBadge} ${ROLE_STYLES[user.role]}`}>
                {ROLE_LABELS[user.role]}
              </span>
            </span>
          </div>
          <div className={styles.detailItem}>
            <span className={styles.detailLabel}>Status</span>
            <span className={styles.detailValue}>
              <span
                className={`${styles.statusBadge} ${
                  user.isActive ? styles.active : styles.inactive
                }`}
              >
                {user.isActive ? 'Active' : 'Inactive'}
              </span>
            </span>
          </div>
          <div className={styles.detailItem}>
            <span className={styles.detailLabel}>Jurisdiction</span>
            <span className={styles.detailValue}>
              {user.jurisdictionName || 'None'}
            </span>
          </div>
          <div className={styles.detailItem}>
            <span className={styles.detailLabel}>Last Login</span>
            <span className={styles.detailValue}>
              {user.lastLoginAt
                ? format(new Date(user.lastLoginAt), 'MMM d, yyyy h:mm a')
                : 'Never'}
            </span>
          </div>
          <div className={styles.detailItem}>
            <span className={styles.detailLabel}>Created</span>
            <span className={styles.detailValue}>
              {format(new Date(user.createdAt), 'MMM d, yyyy')}
            </span>
          </div>
        </div>
      </div>

      {/* Permissions Section */}
      <div className={styles.section}>
        <h3>Permissions</h3>
        <div className={styles.permissionsGrid}>
          {(Object.entries(PERMISSION_LABELS) as [keyof AdminPermissions, string][]).map(
            ([key, label]) => (
              <div
                key={key}
                className={`${styles.permItem} ${
                  user.permissions?.[key] ? styles.enabled : ''
                }`}
              >
                <input
                  type="checkbox"
                  className={styles.permCheckbox}
                  checked={user.permissions?.[key] ?? false}
                  onChange={() => handlePermissionChange(key)}
                />
                <span className={styles.permLabel}>{label}</span>
              </div>
            )
          )}
        </div>
      </div>

      {/* Student Access Section */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <h3>Student Access</h3>
          {!canReadAll && (
            <button
              className="btn btn-primary"
              onClick={() => setShowAddStudentModal(true)}
            >
              + Add Student
            </button>
          )}
        </div>

        {canReadAll ? (
          <div className={styles.canReadAllBanner}>
            <strong>Read All Permission Enabled:</strong> This user has access to all
            students in the system. Individual student access entries are not required.
          </div>
        ) : studentAccess.length === 0 ? (
          <div className={styles.emptyState}>
            <p>No students assigned to this user.</p>
            <p>Add students by their Record ID to grant access.</p>
          </div>
        ) : (
          <div className={styles.tableContainer}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Record ID</th>
                  <th>Grade</th>
                  <th>School</th>
                  <th>Can Edit</th>
                  <th>Granted</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {studentAccess.map((access) => (
                  <tr key={access.id}>
                    <td>
                      <div className={styles.studentInfo}>
                        <span className={styles.studentName}>
                          {access.studentName}
                        </span>
                      </div>
                    </td>
                    <td>{access.recordId}</td>
                    <td>{access.grade}</td>
                    <td>{access.schoolName || '-'}</td>
                    <td>
                      <label className={styles.editToggle}>
                        <input
                          type="checkbox"
                          checked={access.canEdit}
                          onChange={() => handleToggleStudentEdit(access)}
                        />
                        {access.canEdit ? 'Yes' : 'No'}
                      </label>
                    </td>
                    <td>{format(new Date(access.grantedAt), 'MMM d, yyyy')}</td>
                    <td>
                      <div className={styles.actions}>
                        <button
                          className={`${styles.actionBtn} ${styles.danger}`}
                          onClick={() => handleRemoveStudent(access.id)}
                        >
                          Remove
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showEditModal && (
        <EditUserModal
          user={user}
          jurisdictions={jurisdictions}
          onClose={() => setShowEditModal(false)}
          onComplete={handleEditComplete}
        />
      )}

      {showAddStudentModal && (
        <AddStudentModal
          userId={userId}
          onClose={() => setShowAddStudentModal(false)}
          onComplete={handleAddStudentComplete}
        />
      )}
    </div>
  );
}

function EditUserModal({
  user,
  jurisdictions,
  onClose,
  onComplete,
}: {
  user: AdminUserDetail;
  jurisdictions: Jurisdiction[];
  onClose: () => void;
  onComplete: () => void;
}) {
  const [displayName, setDisplayName] = useState(user.displayName);
  const [role, setRole] = useState<AdminUserRole>(user.role);
  const [isActive, setIsActive] = useState(user.isActive);
  const [jurisdictionId, setJurisdictionId] = useState(user.jurisdictionId || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName) return;

    setSaving(true);
    setError('');

    try {
      await api.updateAdminUser(user.id, {
        displayName,
        role,
        isActive,
        jurisdictionId: jurisdictionId || null,
      });
      onComplete();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update user');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <h3>Edit User</h3>
        <form onSubmit={handleSubmit}>
          <div className={styles.formGroup}>
            <label>Email</label>
            <input type="email" value={user.email} disabled />
            <p className={styles.formHint}>Email cannot be changed.</p>
          </div>

          <div className={styles.formGroup}>
            <label>Display Name *</label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              required
            />
          </div>

          <div className={styles.formGroup}>
            <label>Role</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as AdminUserRole)}
            >
              <option value="TEACHER">Teacher</option>
              <option value="CASE_MANAGER">Case Manager</option>
              <option value="ADMIN">Admin</option>
            </select>
          </div>

          <div className={styles.formGroup}>
            <label>Jurisdiction</label>
            <select
              value={jurisdictionId}
              onChange={(e) => setJurisdictionId(e.target.value)}
            >
              <option value="">None</option>
              {jurisdictions.map((j) => (
                <option key={j.id} value={j.id}>
                  {j.districtName} ({j.stateCode})
                </option>
              ))}
            </select>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
              />
              User is active
            </label>
          </div>

          {error && <p className={styles.error}>{error}</p>}

          <div className={styles.modalActions}>
            <button
              type="button"
              className="btn btn-outline"
              onClick={onClose}
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={saving || !displayName}
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function AddStudentModal({
  userId,
  onClose,
  onComplete,
}: {
  userId: string;
  onClose: () => void;
  onComplete: () => void;
}) {
  const [recordId, setRecordId] = useState('');
  const [canEdit, setCanEdit] = useState(false);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recordId) return;

    setAdding(true);
    setError('');

    try {
      await api.addStudentAccess(userId, recordId, canEdit);
      onComplete();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add student access');
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <h3>Add Student Access</h3>
        <form onSubmit={handleSubmit}>
          <div className={styles.formGroup}>
            <label>Student Record ID *</label>
            <input
              type="text"
              value={recordId}
              onChange={(e) => setRecordId(e.target.value)}
              placeholder="e.g., HCPSS-000001"
              required
            />
            <p className={styles.formHint}>
              Enter the student's Record ID to grant this user access.
            </p>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={canEdit}
                onChange={(e) => setCanEdit(e.target.checked)}
              />
              Allow editing (create/update plans)
            </label>
          </div>

          {error && <p className={styles.error}>{error}</p>}

          <div className={styles.modalActions}>
            <button
              type="button"
              className="btn btn-outline"
              onClick={onClose}
              disabled={adding}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={adding || !recordId}
            >
              {adding ? 'Adding...' : 'Add Access'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
