'use client';

import { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import { api, FormTemplate, PlanTypeCode, Jurisdiction } from '@/lib/api';
import styles from './page.module.css';

const PLAN_TYPE_LABELS: Record<PlanTypeCode, string> = {
  IEP: 'IEP',
  FIVE_OH_FOUR: '504 Plan',
  BEHAVIOR_PLAN: 'Behavior Plan',
};

export default function FormTemplatesPage() {
  const [templates, setTemplates] = useState<FormTemplate[]>([]);
  const [jurisdictions, setJurisdictions] = useState<Jurisdiction[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<FormTemplate | null>(null);

  const loadData = useCallback(async () => {
    try {
      const [templatesRes, jurRes] = await Promise.all([
        api.getFormTemplates(),
        api.getAdminJurisdictions(),
      ]);
      setTemplates(templatesRes.templates);
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
    setEditingTemplate(null);
    loadData();
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner" />
      </div>
    );
  }

  // Group templates by plan type
  const templatesByType = templates.reduce((acc, t) => {
    const key = t.planType;
    if (!acc[key]) acc[key] = [];
    acc[key].push(t);
    return acc;
  }, {} as Record<PlanTypeCode, FormTemplate[]>);

  return (
    <div className={styles.container}>
      <div className={styles.pageHeader}>
        <div>
          <h2>Form Templates</h2>
          <p className={styles.description}>
            Upload blank IEP, 504, and behavior plan forms for printing.
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowUploadModal(true)}>
          + Upload Template
        </button>
      </div>

      {templates.length === 0 ? (
        <div className={styles.emptyState}>
          <p>No form templates uploaded yet.</p>
          <p className={styles.hint}>
            Upload blank forms that will be used when teachers print plans.
          </p>
        </div>
      ) : (
        <div className={styles.sections}>
          {(['IEP', 'FIVE_OH_FOUR', 'BEHAVIOR_PLAN'] as PlanTypeCode[]).map(planType => (
            templatesByType[planType]?.length ? (
              <section key={planType} className={styles.section}>
                <h3>{PLAN_TYPE_LABELS[planType]} Templates</h3>
                <div className={styles.tableContainer}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>Title</th>
                        <th>Jurisdiction</th>
                        <th>Default</th>
                        <th>Uploaded By</th>
                        <th>Date</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {templatesByType[planType].map(template => (
                        <tr key={template.id}>
                          <td>
                            <div className={styles.titleCell}>
                              <span className={styles.title}>{template.title}</span>
                              {template.description && (
                                <span className={styles.templateDescription}>{template.description}</span>
                              )}
                            </div>
                          </td>
                          <td>{template.jurisdictionName || 'All'}</td>
                          <td>
                            {template.isDefault && (
                              <span className={styles.defaultBadge}>Default</span>
                            )}
                          </td>
                          <td>{template.uploadedBy}</td>
                          <td>{format(new Date(template.createdAt), 'MMM d, yyyy')}</td>
                          <td>
                            <div className={styles.actions}>
                              <a
                                href={api.getFormTemplateDownloadUrl(template.id)}
                                className={styles.actionLink}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                Download
                              </a>
                              <button
                                className={styles.actionBtn}
                                onClick={() => setEditingTemplate(template)}
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
              </section>
            ) : null
          ))}
        </div>
      )}

      {showUploadModal && (
        <UploadModal
          jurisdictions={jurisdictions}
          onClose={() => setShowUploadModal(false)}
          onComplete={handleUploadComplete}
        />
      )}

      {editingTemplate && (
        <EditModal
          template={editingTemplate}
          onClose={() => setEditingTemplate(null)}
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
  const [jurisdictionId, setJurisdictionId] = useState('');
  const [isDefault, setIsDefault] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !title) return;

    setUploading(true);
    setError('');

    try {
      await api.uploadFormTemplate(file, {
        title,
        description: description || undefined,
        planType,
        jurisdictionId: jurisdictionId || undefined,
        isDefault,
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
        <h3>Upload Form Template</h3>
        <form onSubmit={handleSubmit}>
          <div className={styles.formGroup}>
            <label>Title *</label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g., Maryland IEP Form 2024"
              required
            />
          </div>

          <div className={styles.formGroup}>
            <label>Description (optional)</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Brief description of the template..."
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
          </div>

          <div className={styles.formGroup}>
            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={isDefault}
                onChange={e => setIsDefault(e.target.checked)}
              />
              Set as default template for this plan type and jurisdiction
            </label>
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
  template,
  onClose,
  onComplete,
}: {
  template: FormTemplate;
  onClose: () => void;
  onComplete: () => void;
}) {
  const [title, setTitle] = useState(template.title);
  const [description, setDescription] = useState(template.description || '');
  const [isDefault, setIsDefault] = useState(template.isDefault);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title) return;

    setSaving(true);
    setError('');

    try {
      await api.updateFormTemplate(template.id, {
        title,
        description: description || null,
        isDefault,
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
        <h3>Edit Template</h3>
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
                checked={isDefault}
                onChange={e => setIsDefault(e.target.checked)}
              />
              Set as default template
            </label>
            <p className={styles.defaultHint}>
              This will be used when printing {PLAN_TYPE_LABELS[template.planType]} plans
              {template.jurisdictionName ? ` for ${template.jurisdictionName}` : ''}.
            </p>
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
