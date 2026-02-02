'use client';

import React, { useState } from 'react';
import styles from './AgendaPreview.module.css';

interface AgendaItem {
  id: string;
  title: string;
  duration: number;
  description: string;
  presenter?: string;
}

interface AgendaPreviewProps {
  items: AgendaItem[];
  totalDuration: number;
  meetingDate: string;
  onItemsUpdate: (items: AgendaItem[]) => void;
}

export function AgendaPreview({
  items,
  totalDuration,
  meetingDate,
  onItemsUpdate,
}: AgendaPreviewProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<AgendaItem>>({});

  const calculateStartTime = (index: number, baseTime: string = '09:00'): string => {
    const [hours, minutes] = baseTime.split(':').map(Number);
    let totalMinutes = hours * 60 + minutes;

    for (let i = 0; i < index; i++) {
      totalMinutes += items[i].duration;
    }

    const newHours = Math.floor(totalMinutes / 60);
    const newMinutes = totalMinutes % 60;

    return `${newHours.toString().padStart(2, '0')}:${newMinutes.toString().padStart(2, '0')}`;
  };

  const formatTime = (time: string): string => {
    const [hours, minutes] = time.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
  };

  const handleEditStart = (item: AgendaItem) => {
    setEditingId(item.id);
    setEditForm({ ...item });
  };

  const handleEditSave = () => {
    if (!editingId || !editForm.title) return;

    const updatedItems = items.map((item) =>
      item.id === editingId
        ? {
            ...item,
            title: editForm.title || item.title,
            duration: editForm.duration || item.duration,
            description: editForm.description || item.description,
            presenter: editForm.presenter,
          }
        : item
    );

    onItemsUpdate(updatedItems);
    setEditingId(null);
    setEditForm({});
  };

  const handleEditCancel = () => {
    setEditingId(null);
    setEditForm({});
  };

  const handleDelete = (id: string) => {
    onItemsUpdate(items.filter((item) => item.id !== id));
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const newItems = [...items];
    [newItems[index - 1], newItems[index]] = [newItems[index], newItems[index - 1]];
    onItemsUpdate(newItems);
  };

  const handleMoveDown = (index: number) => {
    if (index === items.length - 1) return;
    const newItems = [...items];
    [newItems[index], newItems[index + 1]] = [newItems[index + 1], newItems[index]];
    onItemsUpdate(newItems);
  };

  const handleAddItem = () => {
    const newItem: AgendaItem = {
      id: `agenda-${Date.now()}`,
      title: 'New Agenda Item',
      duration: 10,
      description: 'Description of agenda item',
    };
    onItemsUpdate([...items, newItem]);
    handleEditStart(newItem);
  };

  // Calculate progress bar widths
  const maxDuration = Math.max(...items.map((item) => item.duration));

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerInfo}>
          <h3>Meeting Agenda</h3>
          <p>
            {meetingDate && new Date(meetingDate).toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </p>
        </div>
        <div className={styles.duration}>
          <span className={styles.durationValue}>{totalDuration}</span>
          <span className={styles.durationLabel}>minutes total</span>
        </div>
      </div>

      {/* Timeline */}
      <div className={styles.timeline}>
        {items.map((item, index) => {
          const startTime = calculateStartTime(index);
          const endTime = calculateStartTime(index + 1);
          const widthPercent = (item.duration / maxDuration) * 100;

          if (editingId === item.id) {
            return (
              <div key={item.id} className={`${styles.timelineItem} ${styles.editing}`}>
                <div className={styles.editForm}>
                  <div className={styles.editRow}>
                    <div className={styles.editField}>
                      <label>Title</label>
                      <input
                        type="text"
                        value={editForm.title || ''}
                        onChange={(e) =>
                          setEditForm({ ...editForm, title: e.target.value })
                        }
                        className={styles.input}
                      />
                    </div>
                    <div className={styles.editField} style={{ width: '100px' }}>
                      <label>Duration (min)</label>
                      <input
                        type="number"
                        min={1}
                        max={60}
                        value={editForm.duration || 0}
                        onChange={(e) =>
                          setEditForm({
                            ...editForm,
                            duration: parseInt(e.target.value) || 0,
                          })
                        }
                        className={styles.input}
                      />
                    </div>
                  </div>
                  <div className={styles.editField}>
                    <label>Description</label>
                    <textarea
                      value={editForm.description || ''}
                      onChange={(e) =>
                        setEditForm({ ...editForm, description: e.target.value })
                      }
                      className={styles.textarea}
                      rows={2}
                    />
                  </div>
                  <div className={styles.editField}>
                    <label>Presenter (optional)</label>
                    <input
                      type="text"
                      value={editForm.presenter || ''}
                      onChange={(e) =>
                        setEditForm({ ...editForm, presenter: e.target.value })
                      }
                      className={styles.input}
                      placeholder="Who will lead this section?"
                    />
                  </div>
                  <div className={styles.editActions}>
                    <button onClick={handleEditCancel} className={styles.cancelBtn}>
                      Cancel
                    </button>
                    <button onClick={handleEditSave} className={styles.saveBtn}>
                      Save
                    </button>
                  </div>
                </div>
              </div>
            );
          }

          return (
            <div key={item.id} className={styles.timelineItem}>
              <div className={styles.timeColumn}>
                <span className={styles.startTime}>{formatTime(startTime)}</span>
                <div className={styles.timeLine} />
                <span className={styles.endTime}>{formatTime(endTime)}</span>
              </div>

              <div className={styles.contentColumn}>
                <div className={styles.itemHeader}>
                  <h4>{item.title}</h4>
                  <span className={styles.durationBadge}>{item.duration} min</span>
                </div>

                <p className={styles.itemDescription}>{item.description}</p>

                {item.presenter && (
                  <p className={styles.presenter}>
                    <strong>Presenter:</strong> {item.presenter}
                  </p>
                )}

                <div
                  className={styles.progressBar}
                  style={{ width: `${widthPercent}%` }}
                />

                <div className={styles.itemActions}>
                  <button
                    onClick={() => handleMoveUp(index)}
                    disabled={index === 0}
                    className={styles.moveBtn}
                    title="Move up"
                  >
                    ↑
                  </button>
                  <button
                    onClick={() => handleMoveDown(index)}
                    disabled={index === items.length - 1}
                    className={styles.moveBtn}
                    title="Move down"
                  >
                    ↓
                  </button>
                  <button
                    onClick={() => handleEditStart(item)}
                    className={styles.editBtn}
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(item.id)}
                    className={styles.deleteBtn}
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Item Button */}
      <button onClick={handleAddItem} className={styles.addButton}>
        + Add Agenda Item
      </button>
    </div>
  );
}

export default AgendaPreview;
