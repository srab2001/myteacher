'use client';

import { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import { api, BestPracticeDocument, PlanTypeCode, Jurisdiction } from '@/lib/api';
import styles from './page.module.css';

const PLAN_TYPE_LABELS: Record<PlanTypeCode, string> = {
  IEP: 'IEP',
  FIVE_OH_FOUR: '504 Plan',
  BEHAVIOR_PLAN: 'Behavior Plan',
};

const GRADE_BANDS = ['K-2', '3-5', '6-8', '9-12'];

export default function BestPracticeDocsPage() {
  const [documents, setDocuments] = useState<BestPracticeDocument[]>([]);
  const [jurisdictions, setJurisdictions] = useState<Jurisdiction[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [editingDoc, setEditingDoc] = useState<BestPracticeDocument | null>(null);

  const loadData = useCallback(async () => {
    try {
      const [docsRes, jurRes] = await Promise.all([
        api.getBestPracticeDocs(),
        api.getAdminJurisdictions(),
      ]);
      setDocuments(docsRes.documents);
      setJurisdictions(jurRes.jurisdictions);
    } catch (err) {
      console.error('Failed to load data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleUploadComplete = () => {
    setShowUploadModal(false);
    loadData();
  };

  const handleEditComplete = () => {
    setEditingDoc(null);
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
          <h2>Best Practice Documents</h2>
          <p className={styles.description}>
            Upload example IEPs, 504 plans, and behavior plans for teachers to reference.
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowUploadModal(true)}>
          + Upload Document
        </button>
      </div>

      {documents.length === 0 ? (
        <div className={styles.emptyState}>
          <p>No best practice documents uploaded yet.</p>
          <p className={styles.hint}>
            Upload de-identified example plans to help teachers create better documents.
          </p>
        </div>
      ) : (
        <div className={styles.tableContainer}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Title</th>
                <th>Plan Type</th>
                <th>Grade Band</th>
                <th>Jurisdiction</th>
                <th>Status</th>
                <th>Uploaded By</th>
                <th>Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {documents.map(doc => (
                <tr key={doc.id}>
                  <td>
                    <div className={styles.titleCell}>
                      <span className={styles.title}>{doc.title}</span>
                      {doc.description && (
                        <span className={styles.docDescription}>{doc.description}</span>
                      )}
                    </div>
                  </td>
                  <td>
                    <span className={styles.planTypeBadge}>
                      {PLAN_TYPE_LABELS[doc.planType]}
                    </span>
                  </td>
                  <td>{doc.gradeBand || '-'}</td>
                  <td>{doc.jurisdictionName || 'All'}</td>
                  <td>
                    <span className={`${styles.statusBadge} ${doc.isActive ? styles.active : styles.inactive}`}>
                      {doc.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td>{doc.uploadedBy}</td>
                  <td>{format(new Date(doc.createdAt), 'MMM d, yyyy')}</td>
                  <td>
                    <div className={styles.actions}>
                      <a
                        href={api.getBestPracticeDocDownloadUrl(doc.id)}
                        className={styles.actionLink}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Download
                      </a>
                      <button
                        className={styles.actionBtn}
                        onClick={() => setEditingDoc(doc)}
                      >
                        Edit
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showUploadModal && (
        <UploadModal
          jurisdictions={jurisdictions}
          onClose={() => setShowUploadModal(false)}
          onComplete={handleUploadComplete}
        />
      )}

      {editingDoc && (
        <EditModal
          document={editingDoc}
          onClose={() => setEditingDoc(null)}
          onComplete={handleEditComplete}
        />
      )}
    </div>
  );
}

function UploadModal({
  jurisdictions,
  onClose,
  onComplete,
}: {
  jurisdictions: Jurisdiction[];
  onClose: () => void;
  onComplete: () => void;
}) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [planType, setPlanType] = useState<PlanTypeCode>('IEP');
  const [gradeBand, setGradeBand] = useState('');
  const [jurisdictionId, setJurisdictionId] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !title) return;

    setUploading(true);
    setError('');

    try {
      await api.uploadBestPracticeDoc(file, {
        title,
        description: description || undefined,
        planType,
        gradeBand: gradeBand || undefined,
        jurisdictionId: jurisdictionId || undefined,
      });
      onComplete();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <h3>Upload Best Practice Document</h3>
        <form onSubmit={handleSubmit}>
          <div className={styles.formGroup}>
            <label>Title *</label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g., Example IEP - Reading Goals"
              required
            />
          </div>

          <div className={styles.formGroup}>
            <label>Description (optional)</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Brief description of the document..."
              rows={2}
            />
          </div>

          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label>Plan Type *</label>
              <select value={planType} onChange={e => setPlanType(e.target.value as PlanTypeCode)}>
                <option value="IEP">IEP</option>
                <option value="FIVE_OH_FOUR">504 Plan</option>
                <option value="BEHAVIOR_PLAN">Behavior Plan</option>
              </select>
            </div>

            <div className={styles.formGroup}>
              <label>Grade Band (optional)</label>
              <select value={gradeBand} onChange={e => setGradeBand(e.target.value)}>
                <option value="">All Grades</option>
                {GRADE_BANDS.map(band => (
                  <option key={band} value={band}>{band}</option>
                ))}
              </select>
            </div>
          </div>

          <div className={styles.formGroup}>
            <label>Jurisdiction (optional)</label>
            <select value={jurisdictionId} onChange={e => setJurisdictionId(e.target.value)}>
              <option value="">All Jurisdictions</option>
              {jurisdictions.map(j => (
                <option key={j.id} value={j.id}>
                  {j.districtName} ({j.stateCode})
                </option>
              ))}
            </select>
          </div>

          <div className={styles.formGroup}>
            <label>File *</label>
            <input
              type="file"
              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
              onChange={e => setFile(e.target.files?.[0] || null)}
              required
            />
            <p className={styles.fileHint}>PDF, DOC, DOCX, JPEG, PNG (max 20MB)</p>
          </div>

          {error && <p className={styles.error}>{error}</p>}

          <div className={styles.modalActions}>
            <button type="button" className="btn btn-outline" onClick={onClose} disabled={uploading}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={uploading || !file || !title}>
              {uploading ? 'Uploading...' : 'Upload'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function EditModal({
  document,
  onClose,
  onComplete,
}: {
  document: BestPracticeDocument;
  onClose: () => void;
  onComplete: () => void;
}) {
  const [title, setTitle] = useState(document.title);
  const [description, setDescription] = useState(document.description || '');
  const [isActive, setIsActive] = useState(document.isActive);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title) return;

    setSaving(true);
    setError('');

    try {
      await api.updateBestPracticeDoc(document.id, {
        title,
        description: description || null,
        isActive,
      });
      onComplete();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Update failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <h3>Edit Document</h3>
        <form onSubmit={handleSubmit}>
          <div className={styles.formGroup}>
            <label>Title *</label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              required
            />
          </div>

          <div className={styles.formGroup}>
            <label>Description (optional)</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={2}
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={isActive}
                onChange={e => setIsActive(e.target.checked)}
              />
              Active (visible to teachers)
            </label>
          </div>

          {error && <p className={styles.error}>{error}</p>}

          <div className={styles.modalActions}>
            <button type="button" className="btn btn-outline" onClick={onClose} disabled={saving}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving || !title}>
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
