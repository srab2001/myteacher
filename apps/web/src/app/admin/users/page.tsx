'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import { api, AdminUser, AdminUserRole, AdminPermissions, Jurisdiction } from '@/lib/api';
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
  canReadAll: 'Read All',
  canManageUsers: 'Manage Users',
  canManageDocs: 'Manage Docs',
};

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [jurisdictions, setJurisdictions] = useState<Jurisdiction[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<AdminUserRole | ''>('');

  const loadData = useCallback(async () => {
    try {
      const [usersRes, jurRes] = await Promise.all([
        api.getAdminUsers({
          role: roleFilter || undefined,
          search: searchTerm || undefined,
        }),
        api.getAdminJurisdictions(),
      ]);
      setUsers(usersRes.users);
      setJurisdictions(jurRes.jurisdictions);
    } catch (err) {
      console.error('Failed to load users:', err);
    } finally {
      setLoading(false);
    }
  }, [roleFilter, searchTerm]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCreateComplete = () => {
    setShowCreateModal(false);
    loadData();
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.pageHeader}>
        <div>
          <h2>User Management</h2>
          <p className={styles.description}>
            Manage users, roles, and permissions for the MyTeacher portal.
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
          + Create User
        </button>
      </div>

      <div className={styles.filters}>
        <input
          type="text"
          className={styles.searchInput}
          placeholder="Search by name or email..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <select
          className={styles.filterSelect}
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value as AdminUserRole | '')}
        >
          <option value="">All Roles</option>
          <option value="TEACHER">Teachers</option>
          <option value="CASE_MANAGER">Case Managers</option>
          <option value="ADMIN">Admins</option>
        </select>
      </div>

      {users.length === 0 ? (
        <div className={styles.emptyState}>
          <p>No users found.</p>
          <p className={styles.hint}>
            {searchTerm || roleFilter
              ? 'Try adjusting your search or filters.'
              : 'Create a user to get started.'}
          </p>
        </div>
      ) : (
        <div className={styles.tableContainer}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>User</th>
                <th>Role</th>
                <th>Status</th>
                <th>Permissions</th>
                <th>Students</th>
                <th>Jurisdiction</th>
                <th>Last Login</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id}>
                  <td>
                    <div className={styles.userCell}>
                      <span className={styles.userName}>{user.displayName}</span>
                      <span className={styles.userEmail}>{user.email}</span>
                    </div>
                  </td>
                  <td>
                    <span className={`${styles.roleBadge} ${ROLE_STYLES[user.role]}`}>
                      {ROLE_LABELS[user.role]}
                    </span>
                  </td>
                  <td>
                    <span
                      className={`${styles.statusBadge} ${
                        user.isActive ? styles.active : styles.inactive
                      }`}
                    >
                      {user.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td>
                    <div className={styles.permissions}>
                      {user.permissions ? (
                        Object.entries(user.permissions)
                          .filter(([, enabled]) => enabled)
                          .map(([key]) => (
                            <span key={key} className={`${styles.permBadge} ${styles.enabled}`}>
                              {PERMISSION_LABELS[key as keyof AdminPermissions]}
                            </span>
                          ))
                      ) : (
                        <span className={styles.permBadge}>No permissions</span>
                      )}
                    </div>
                  </td>
                  <td>{user.studentAccessCount ?? 0}</td>
                  <td>{user.jurisdictionName || 'None'}</td>
                  <td>
                    {user.lastLoginAt
                      ? format(new Date(user.lastLoginAt), 'MMM d, yyyy')
                      : 'Never'}
                  </td>
                  <td>
                    <div className={styles.actions}>
                      <Link href={`/admin/users/${user.id}`} className={styles.actionLink}>
                        View
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showCreateModal && (
        <CreateUserModal
          jurisdictions={jurisdictions}
          onClose={() => setShowCreateModal(false)}
          onComplete={handleCreateComplete}
        />
      )}
    </div>
  );
}

function CreateUserModal({
  jurisdictions,
  onClose,
  onComplete,
}: {
  jurisdictions: Jurisdiction[];
  onClose: () => void;
  onComplete: () => void;
}) {
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [role, setRole] = useState<AdminUserRole>('TEACHER');
  const [jurisdictionId, setJurisdictionId] = useState('');
  const [permissions, setPermissions] = useState<AdminPermissions>({
    canCreatePlans: false,
    canUpdatePlans: false,
    canReadAll: false,
    canManageUsers: false,
    canManageDocs: false,
  });
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  const handlePermissionChange = (key: keyof AdminPermissions) => {
    setPermissions((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !displayName) return;

    setCreating(true);
    setError('');

    try {
      await api.createAdminUser({
        email,
        displayName,
        role,
        jurisdictionId: jurisdictionId || null,
        permissions,
      });
      onComplete();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create user');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <h3>Create New User</h3>
        <form onSubmit={handleSubmit}>
          <div className={styles.formGroup}>
            <label>Email *</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@school.edu"
              required
            />
          </div>

          <div className={styles.formGroup}>
            <label>Display Name *</label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="John Smith"
              required
            />
          </div>

          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label>Role *</label>
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
          </div>

          <div className={styles.formGroup}>
            <label>Permissions</label>
            <div className={styles.checkboxGroup}>
              {(Object.entries(PERMISSION_LABELS) as [keyof AdminPermissions, string][]).map(
                ([key, label]) => (
                  <label key={key} className={styles.checkboxLabel}>
                    <input
                      type="checkbox"
                      checked={permissions[key]}
                      onChange={() => handlePermissionChange(key)}
                    />
                    {label}
                  </label>
                )
              )}
            </div>
          </div>

          {error && <p className={styles.error}>{error}</p>}

          <div className={styles.modalActions}>
            <button
              type="button"
              className="btn btn-outline"
              onClick={onClose}
              disabled={creating}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={creating || !email || !displayName}
            >
              {creating ? 'Creating...' : 'Create User'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
