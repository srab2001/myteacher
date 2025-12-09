'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import { api, AdminStudent } from '@/lib/api';
import styles from './page.module.css';

export default function AdminStudentsPage() {
  const [students, setStudents] = useState<AdminStudent[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const loadData = useCallback(async () => {
    try {
      const res = await api.getAdminStudents({
        search: searchTerm || undefined,
        limit: 50,
      });
      setStudents(res.students);
      setTotal(res.total);
    } catch (err) {
      console.error('Failed to load students:', err);
    } finally {
      setLoading(false);
    }
  }, [searchTerm]);

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

      {students.length === 0 ? (
        <div className={styles.emptyState}>
          <p>No students found.</p>
          <p className={styles.hint}>
            {searchTerm
              ? 'Try adjusting your search.'
              : 'Create a student to get started.'}
          </p>
        </div>
      ) : (
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
  const [recordId, setRecordId] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [grade, setGrade] = useState('');
  const [schoolName, setSchoolName] = useState('');
  const [districtName, setDistrictName] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recordId || !firstName || !lastName) return;

    setCreating(true);
    setError('');

    try {
      await api.createStudent({
        recordId,
        firstName,
        lastName,
        dateOfBirth: dateOfBirth || undefined,
        grade: grade || undefined,
        schoolName: schoolName || undefined,
        districtName: districtName || undefined,
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
          <div className={styles.formGroup}>
            <label>Record ID *</label>
            <input
              type="text"
              value={recordId}
              onChange={(e) => setRecordId(e.target.value)}
              placeholder="e.g., HCPSS-000001"
              required
            />
            <p className={styles.formHint}>
              Unique identifier for the student in your district.
            </p>
          </div>

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
            <label>School Name</label>
            <input
              type="text"
              value={schoolName}
              onChange={(e) => setSchoolName(e.target.value)}
              placeholder="Lincoln Elementary"
            />
          </div>

          <div className={styles.formGroup}>
            <label>District Name</label>
            <input
              type="text"
              value={districtName}
              onChange={(e) => setDistrictName(e.target.value)}
              placeholder="Howard County Public Schools"
            />
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
              disabled={creating || !recordId || !firstName || !lastName}
            >
              {creating ? 'Creating...' : 'Create Student'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
