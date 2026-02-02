'use client';

import React, { useState } from 'react';
import { MaterialType } from '@/lib/meeting-prep/types';
import { AgendaPreview } from './AgendaPreview';
import styles from './GeneratedMaterials.module.css';

interface AgendaItem {
  id: string;
  title: string;
  duration: number;
  description: string;
  presenter?: string;
}

interface Materials {
  agenda: {
    items: AgendaItem[];
    totalDuration: number;
    meetingDate: string;
    meetingType: string;
  };
  questions: string[];
  parentConcernsLetter: string;
  recordsRequestEmail: string;
  followUpEmail: string;
}

interface GeneratedMaterialsProps {
  prepId: string;
  materials: Materials;
  studentAlias: string;
  onMaterialsUpdate: (materials: Materials) => void;
  onExport: (format: 'pdf' | 'docx' | 'html') => Promise<void>;
}

const TABS: { id: MaterialType; label: string; icon: string }[] = [
  { id: 'agenda', label: 'Meeting Agenda', icon: '📋' },
  { id: 'questions', label: 'Questions', icon: '❓' },
  { id: 'parentConcernsLetter', label: 'Concerns Letter', icon: '✉️' },
  { id: 'recordsRequestEmail', label: 'Records Request', icon: '📁' },
  { id: 'followUpEmail', label: 'Follow-Up', icon: '📨' },
];

export function GeneratedMaterials({
  prepId: _prepId,
  materials,
  studentAlias,
  onMaterialsUpdate,
  onExport,
}: GeneratedMaterialsProps) {
  const [activeTab, setActiveTab] = useState<MaterialType>('agenda');
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState('');
  const [copiedTab, setCopiedTab] = useState<MaterialType | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  const handleStartEdit = () => {
    if (activeTab === 'agenda') return; // Agenda has its own edit UI
    if (activeTab === 'questions') {
      setEditedContent(materials.questions.join('\n'));
    } else {
      setEditedContent(materials[activeTab]);
    }
    setIsEditing(true);
  };

  const handleSaveEdit = () => {
    const updatedMaterials = { ...materials };

    if (activeTab === 'questions') {
      updatedMaterials.questions = editedContent
        .split('\n')
        .filter((q) => q.trim() !== '');
    } else if (activeTab !== 'agenda') {
      updatedMaterials[activeTab] = editedContent;
    }

    onMaterialsUpdate(updatedMaterials);
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditedContent('');
  };

  const handleCopy = async () => {
    let content = '';

    if (activeTab === 'agenda') {
      content = materials.agenda.items
        .map(
          (item, i) =>
            `${i + 1}. ${item.title} (${item.duration} min)\n   ${item.description}`
        )
        .join('\n\n');
    } else if (activeTab === 'questions') {
      content = materials.questions.map((q, i) => `${i + 1}. ${q}`).join('\n');
    } else {
      content = materials[activeTab];
    }

    try {
      await navigator.clipboard.writeText(content);
      setCopiedTab(activeTab);
      setTimeout(() => setCopiedTab(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleExport = async (format: 'pdf' | 'docx' | 'html') => {
    setIsExporting(true);
    try {
      await onExport(format);
    } finally {
      setIsExporting(false);
    }
  };

  const handleAgendaUpdate = (updatedItems: AgendaItem[]) => {
    onMaterialsUpdate({
      ...materials,
      agenda: {
        ...materials.agenda,
        items: updatedItems,
        totalDuration: updatedItems.reduce((sum, item) => sum + item.duration, 0),
      },
    });
  };

  const renderTabContent = () => {
    if (isEditing && activeTab !== 'agenda') {
      return (
        <div className={styles.editContainer}>
          <textarea
            value={editedContent}
            onChange={(e) => setEditedContent(e.target.value)}
            className={styles.editTextarea}
            rows={20}
          />
          <div className={styles.editActions}>
            <button onClick={handleCancelEdit} className={styles.cancelButton}>
              Cancel
            </button>
            <button onClick={handleSaveEdit} className={styles.saveButton}>
              Save Changes
            </button>
          </div>
        </div>
      );
    }

    switch (activeTab) {
      case 'agenda':
        return (
          <AgendaPreview
            items={materials.agenda.items}
            totalDuration={materials.agenda.totalDuration}
            meetingDate={materials.agenda.meetingDate}
            onItemsUpdate={handleAgendaUpdate}
          />
        );

      case 'questions':
        return (
          <div className={styles.questionsList}>
            {materials.questions.map((question, index) => (
              <div key={index} className={styles.questionItem}>
                <span className={styles.questionNumber}>{index + 1}</span>
                <span className={styles.questionText}>{question}</span>
              </div>
            ))}
          </div>
        );

      case 'parentConcernsLetter':
      case 'recordsRequestEmail':
      case 'followUpEmail':
        return (
          <div className={styles.letterContent}>
            <pre className={styles.letterText}>{materials[activeTab]}</pre>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className={styles.container}>
      {/* Header with export options */}
      <div className={styles.header}>
        <div>
          <h2>Generated Materials</h2>
          <p className={styles.subtitle}>
            Review and edit your meeting preparation materials for {studentAlias}
          </p>
        </div>
        <div className={styles.exportButtons}>
          <button
            onClick={() => handleExport('html')}
            disabled={isExporting}
            className={styles.exportButton}
          >
            {isExporting ? 'Exporting...' : 'Download HTML'}
          </button>
          <button
            onClick={() => handleExport('pdf')}
            disabled={isExporting}
            className={`${styles.exportButton} ${styles.primary}`}
          >
            Download PDF
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className={styles.tabs}>
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => {
              setActiveTab(tab.id);
              setIsEditing(false);
            }}
            className={`${styles.tab} ${activeTab === tab.id ? styles.activeTab : ''}`}
          >
            <span className={styles.tabIcon}>{tab.icon}</span>
            <span className={styles.tabLabel}>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab Actions */}
      <div className={styles.tabActions}>
        <button onClick={handleCopy} className={styles.actionButton}>
          {copiedTab === activeTab ? '✓ Copied!' : 'Copy to Clipboard'}
        </button>
        {activeTab !== 'agenda' && !isEditing && (
          <button onClick={handleStartEdit} className={styles.actionButton}>
            Edit
          </button>
        )}
      </div>

      {/* Tab Content */}
      <div className={styles.tabContent}>{renderTabContent()}</div>
    </div>
  );
}

export default GeneratedMaterials;
