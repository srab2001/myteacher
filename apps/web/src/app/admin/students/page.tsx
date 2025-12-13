'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import { api, AdminStudent, User, AdminUser } from '@/lib/api';
import styles from './page.module.css';

export default function AdminStudentsPage() {
  const [students, setStudents] = useState<AdminStudent[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [assigningStudent, setAssigningStudent] = useState<string | null>(null);
  const [assignMessage, setAssignMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showAssignModal, setShowAssignModal] = useState<AdminStudent | null>(null);

  const loadData = useCallback(async () => {
    setError(null);
    try {
      const [studentsRes, userRes, usersRes] = await Promise.all([
        api.getAdminStudents({
          search: searchTerm || undefined,
          limit: 50,
        }),
        api.getMe(),
        api.getAdminUsers(),
      ]);
      setStudents(studentsRes.students);
      setTotal(studentsRes.total);
      setCurrentUser(userRes.user);
      setUsers(usersRes.users.filter(u => u.isActive));
    } catch (err) {
      console.error('Failed to load students:', err);
      setError(err instanceof Error ? err.message : 'Failed to load students');
      setStudents([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [searchTerm]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleAssignToMe = async (student: AdminStudent) => {
    if (!currentUser) return;
    await handleAssignToUser(student, currentUser.id, currentUser.displayName || 'you');
  };

  const handleAssignToUser = async (student: AdminStudent, userId: string, userName: string) => {
    setAssigningStudent(student.id);
    setAssignMessage(null);

    try {
      await api.addStudentAccess(userId, student.recordId, true);
      setAssignMessage({
        type: 'success',
        text: `${student.firstName} ${student.lastName} has been assigned to ${userName}!`,
      });
      setShowAssignModal(null);
      // Clear message after 3 seconds
      setTimeout(() => setAssignMessage(null), 3000);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to assign student';
      setAssignMessage({ type: 'error', text: message });
    } finally {
      setAssigningStudent(null);
    }
  };

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
      <Link href="/dashboard" className={styles.backLink}>
        &larr; Back to Dashboard
      </Link>

      <div className={styles.pageHeader}>
        <div>
          <h2>Student Management</h2>
          <p className={styles.description}>
            Create and manage students in the system. Students can then be assigned to teachers.
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
          + Create Student
        </button>
      </div>

      <div className={styles.filters}>
        <input
          type="text"
          className={styles.searchInput}
          placeholder="Search by name or Record ID..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <span className={styles.resultCount}>
          {students.length} of {total} students
        </span>
      </div>

      {assignMessage && (
        <div className={assignMessage.type === 'success' ? styles.successBanner : styles.errorBanner}>
          <p>{assignMessage.text}</p>
        </div>
      )}

      {error && (
        <div className={styles.errorBanner}>
          <p>Error: {error}</p>
          <button className="btn btn-outline" onClick={loadData}>
            Retry
          </button>
        </div>
      )}

      {!error && students.length === 0 ? (
        <div className={styles.emptyState}>
          <p>No students found.</p>
          <p className={styles.hint}>
            {searchTerm
              ? 'Try adjusting your search.'
              : 'Create a student to get started.'}
          </p>
        </div>
      ) : !error && (
        <div className={styles.tableContainer}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Record ID</th>
                <th>Name</th>
                <th>Grade</th>
                <th>School</th>
                <th>District</th>
                <th>Status</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {students.map((student) => (
                <tr key={student.id}>
                  <td className={styles.recordId}>{student.recordId}</td>
                  <td>
                    <div className={styles.studentCell}>
                      <span className={styles.studentName}>
                        {student.lastName}, {student.firstName}
                      </span>
                    </div>
                  </td>
                  <td>{student.grade || '-'}</td>
                  <td>{student.schoolName || '-'}</td>
                  <td>{student.districtName || '-'}</td>
                  <td>
                    <span
                      className={`${styles.statusBadge} ${
                        student.isActive ? styles.active : styles.inactive
                      }`}
                    >
                      {student.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td>
                    {student.createdAt
                      ? format(new Date(student.createdAt), 'MMM d, yyyy')
                      : '-'}
                  </td>
                  <td className={styles.actionsCell}>
                    <button
                      className={styles.assignButton}
                      onClick={() => handleAssignToMe(student)}
                      disabled={assigningStudent === student.id}
                    >
                      {assigningStudent === student.id ? 'Assigning...' : 'Assign to Me'}
                    </button>
                    <button
                      className={styles.assignButtonOutline}
                      onClick={() => setShowAssignModal(student)}
                      disabled={assigningStudent === student.id}
                    >
                      Assign to...
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showCreateModal && (
        <CreateStudentModal
          onClose={() => setShowCreateModal(false)}
          onComplete={handleCreateComplete}
        />
      )}

      {showAssignModal && (
        <AssignStudentModal
          student={showAssignModal}
          users={users}
          onClose={() => setShowAssignModal(null)}
          onAssign={(userId, userName) => handleAssignToUser(showAssignModal, userId, userName)}
          assigning={assigningStudent === showAssignModal.id}
        />
      )}
    </div>
  );
}

function CreateStudentModal({
  onClose,
  onComplete,
}: {
  onClose: () => void;
  onComplete: () => void;
}) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [grade, setGrade] = useState('');

  // Location dropdowns state
  const [states, setStates] = useState<{ id: string; code: string; name: string }[]>([]);
  const [districts, setDistricts] = useState<{ id: string; code: string; name: string }[]>([]);
  const [schools, setSchools] = useState<{ id: string; code: string | null; name: string; schoolType: string }[]>([]);
  const [selectedStateId, setSelectedStateId] = useState('');
  const [selectedDistrictId, setSelectedDistrictId] = useState('');
  const [selectedSchoolId, setSelectedSchoolId] = useState('');

  const [loadingStates, setLoadingStates] = useState(true);
  const [loadingDistricts, setLoadingDistricts] = useState(false);
  const [loadingSchools, setLoadingSchools] = useState(false);

  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  // Load states on mount
  useEffect(() => {
    async function loadStates() {
      try {
        const statesData = await api.getReferenceStates();
        setStates(statesData);
      } catch (err) {
        console.error('Failed to load states:', err);
      } finally {
        setLoadingStates(false);
      }
    }
    loadStates();
  }, []);

  // Load districts when state changes
  useEffect(() => {
    if (!selectedStateId) {
      setDistricts([]);
      setSelectedDistrictId('');
      return;
    }

    async function loadDistricts() {
      setLoadingDistricts(true);
      try {
        const districtsData = await api.getReferenceDistricts(selectedStateId);
        setDistricts(districtsData);
      } catch (err) {
        console.error('Failed to load districts:', err);
        setDistricts([]);
      } finally {
        setLoadingDistricts(false);
      }
    }
    loadDistricts();
  }, [selectedStateId]);

  // Load schools when district changes
  useEffect(() => {
    if (!selectedDistrictId) {
      setSchools([]);
      setSelectedSchoolId('');
      return;
    }

    async function loadSchools() {
      setLoadingSchools(true);
      try {
        const schoolsData = await api.getReferenceSchools(selectedDistrictId);
        setSchools(schoolsData);
      } catch (err) {
        console.error('Failed to load schools:', err);
        setSchools([]);
      } finally {
        setLoadingSchools(false);
      }
    }
    loadSchools();
  }, [selectedDistrictId]);

  const handleStateChange = (stateId: string) => {
    setSelectedStateId(stateId);
    setSelectedDistrictId('');
    setSelectedSchoolId('');
    setDistricts([]);
    setSchools([]);
  };

  const handleDistrictChange = (districtId: string) => {
    setSelectedDistrictId(districtId);
    setSelectedSchoolId('');
    setSchools([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName || !lastName) return;

    setCreating(true);
    setError('');

    try {
      await api.createStudent({
        firstName,
        lastName,
        dateOfBirth: dateOfBirth || undefined,
        grade: grade || undefined,
        schoolId: selectedSchoolId || undefined,
      });
      onComplete();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create student');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <h3>Create New Student</h3>
        <form onSubmit={handleSubmit}>
          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label>First Name *</label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="John"
                required
              />
            </div>

            <div className={styles.formGroup}>
              <label>Last Name *</label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Smith"
                required
              />
            </div>
          </div>

          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label>Date of Birth</label>
              <input
                type="date"
                value={dateOfBirth}
                onChange={(e) => setDateOfBirth(e.target.value)}
              />
            </div>

            <div className={styles.formGroup}>
              <label>Grade</label>
              <select value={grade} onChange={(e) => setGrade(e.target.value)}>
                <option value="">Select Grade</option>
                <option value="PK">Pre-K</option>
                <option value="K">Kindergarten</option>
                <option value="1">1st Grade</option>
                <option value="2">2nd Grade</option>
                <option value="3">3rd Grade</option>
                <option value="4">4th Grade</option>
                <option value="5">5th Grade</option>
                <option value="6">6th Grade</option>
                <option value="7">7th Grade</option>
                <option value="8">8th Grade</option>
                <option value="9">9th Grade</option>
                <option value="10">10th Grade</option>
                <option value="11">11th Grade</option>
                <option value="12">12th Grade</option>
              </select>
            </div>
          </div>

          <div className={styles.formGroup}>
            <label>State</label>
            <select
              value={selectedStateId}
              onChange={(e) => handleStateChange(e.target.value)}
              disabled={loadingStates}
            >
              <option value="">
                {loadingStates ? 'Loading states...' : 'Select State'}
              </option>
              {states.map((state) => (
                <option key={state.id} value={state.id}>
                  {state.name} ({state.code})
                </option>
              ))}
            </select>
          </div>

          <div className={styles.formGroup}>
            <label>District</label>
            <select
              value={selectedDistrictId}
              onChange={(e) => handleDistrictChange(e.target.value)}
              disabled={!selectedStateId || loadingDistricts}
            >
              <option value="">
                {loadingDistricts
                  ? 'Loading districts...'
                  : !selectedStateId
                  ? 'Select a state first'
                  : districts.length === 0
                  ? 'No districts available'
                  : 'Select District'}
              </option>
              {districts.map((district) => (
                <option key={district.id} value={district.id}>
                  {district.name}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.formGroup}>
            <label>School</label>
            <select
              value={selectedSchoolId}
              onChange={(e) => setSelectedSchoolId(e.target.value)}
              disabled={!selectedDistrictId || loadingSchools}
            >
              <option value="">
                {loadingSchools
                  ? 'Loading schools...'
                  : !selectedDistrictId
                  ? 'Select a district first'
                  : schools.length === 0
                  ? 'No schools available'
                  : 'Select School'}
              </option>
              {schools.map((school) => (
                <option key={school.id} value={school.id}>
                  {school.name}
                </option>
              ))}
            </select>
          </div>

          <p className={styles.formHint}>
            A unique Record ID (e.g., STU-000001) will be automatically generated.
          </p>

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
              disabled={creating || !firstName || !lastName}
            >
              {creating ? 'Creating...' : 'Create Student'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function AssignStudentModal({
  student,
  users,
  onClose,
  onAssign,
  assigning,
}: {
  student: AdminStudent;
  users: AdminUser[];
  onClose: () => void;
  onAssign: (userId: string, userName: string) => void;
  assigning: boolean;
}) {
  const [selectedUserId, setSelectedUserId] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const filteredUsers = users.filter(
    (u) =>
      u.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedUser = users.find((u) => u.id === selectedUserId);

  const handleAssign = () => {
    if (!selectedUserId || !selectedUser) return;
    onAssign(selectedUserId, selectedUser.displayName);
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <h3>Assign Student to User</h3>
        <p className={styles.assignStudentInfo}>
          Assigning <strong>{student.firstName} {student.lastName}</strong> ({student.recordId})
        </p>

        <div className={styles.formGroup}>
          <label>Search Users</label>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by name or email..."
          />
        </div>

        <div className={styles.userList}>
          {filteredUsers.length === 0 ? (
            <p className={styles.noUsers}>No users found</p>
          ) : (
            filteredUsers.map((user) => (
              <div
                key={user.id}
                className={`${styles.userItem} ${selectedUserId === user.id ? styles.selected : ''}`}
                onClick={() => setSelectedUserId(user.id)}
              >
                <div className={styles.userInfo}>
                  <span className={styles.userName}>{user.displayName}</span>
                  <span className={styles.userEmail}>{user.email}</span>
                </div>
                <span className={styles.userRole}>{user.role}</span>
              </div>
            ))
          )}
        </div>

        <div className={styles.modalActions}>
          <button
            type="button"
            className="btn btn-outline"
            onClick={onClose}
            disabled={assigning}
          >
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleAssign}
            disabled={assigning || !selectedUserId}
          >
            {assigning ? 'Assigning...' : 'Assign Student'}
          </button>
        </div>
      </div>
    </div>
  );
}
