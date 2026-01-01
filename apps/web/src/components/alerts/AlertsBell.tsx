'use client';

import { useState, useEffect, useRef } from 'react';
import { format } from 'date-fns';
import { api, InAppAlert, AlertType } from '@/lib/api';
import styles from './AlertsBell.module.css';

const ALERT_TYPE_ICONS: Record<AlertType, string> = {
  REVIEW_DUE_SOON: '📅',
  REVIEW_OVERDUE: '⚠️',
  COMPLIANCE_TASK: '📋',
  SIGNATURE_REQUESTED: '✍️',
  MEETING_SCHEDULED: '📆',
  DOCUMENT_UPLOADED: '📄',
  GENERAL: '🔔',
};

export function AlertsBell() {
  const [alerts, setAlerts] = useState<InAppAlert[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadAlerts();

    // Poll for new alerts every 60 seconds
    const interval = setInterval(() => {
      loadUnreadCount();
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadAlerts = async () => {
    try {
      setLoading(true);
      const { alerts: loadedAlerts, unreadCount: count } = await api.getAlerts(false, 10);
      setAlerts(loadedAlerts);
      setUnreadCount(count);
    } catch (err) {
      console.error('Failed to load alerts:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadUnreadCount = async () => {
    try {
      const { unreadCount: count } = await api.getUnreadAlertCount();
      setUnreadCount(count);
    } catch (err) {
      console.error('Failed to load unread count:', err);
    }
  };

  const handleMarkRead = async (alertId: string) => {
    try {
      await api.markAlertRead(alertId);
      setAlerts(prev =>
        prev.map(alert =>
          alert.id === alertId ? { ...alert, isRead: true } : alert
        )
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Failed to mark alert as read:', err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.markAllAlertsRead();
      setAlerts(prev => prev.map(alert => ({ ...alert, isRead: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Failed to mark all as read:', err);
    }
  };

  const handleAlertClick = (alert: InAppAlert) => {
    if (!alert.isRead) {
      handleMarkRead(alert.id);
    }
    if (alert.linkUrl) {
      window.location.href = alert.linkUrl;
    }
    setIsOpen(false);
  };

  return (
    <div className={styles.container} ref={dropdownRef}>
      <button
        className={styles.bellButton}
        onClick={() => setIsOpen(!isOpen)}
        aria-label={`Alerts${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
      >
        <span className={styles.bellIcon}>🔔</span>
        {unreadCount > 0 && (
          <span className={styles.badge}>
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className={styles.dropdown}>
          <div className={styles.dropdownHeader}>
            <h4>Notifications</h4>
            {unreadCount > 0 && (
              <button
                className={styles.markAllBtn}
                onClick={handleMarkAllRead}
              >
                Mark all read
              </button>
            )}
          </div>

          <div className={styles.alertsList}>
            {loading ? (
              <div className={styles.loading}>
                <div className="spinner" style={{ width: 20, height: 20 }} />
              </div>
            ) : alerts.length === 0 ? (
              <div className={styles.emptyState}>
                <p>No notifications</p>
              </div>
            ) : (
              alerts.map(alert => (
                <button
                  key={alert.id}
                  className={`${styles.alertItem} ${!alert.isRead ? styles.unread : ''}`}
                  onClick={() => handleAlertClick(alert)}
                >
                  <span className={styles.alertIcon}>
                    {ALERT_TYPE_ICONS[alert.alertType]}
                  </span>
                  <div className={styles.alertContent}>
                    <span className={styles.alertTitle}>{alert.title}</span>
                    <span className={styles.alertMessage}>{alert.message}</span>
                    <span className={styles.alertTime}>
                      {format(new Date(alert.createdAt), 'MMM d, h:mm a')}
                    </span>
                  </div>
                  {!alert.isRead && <span className={styles.unreadDot} />}
                </button>
              ))
            )}
          </div>

          {alerts.length > 0 && (
            <div className={styles.dropdownFooter}>
              <a href="/notifications" className={styles.viewAllLink}>
                View all notifications
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
