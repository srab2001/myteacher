'use client';

import clsx from 'clsx';

interface StatusBadgeProps {
  code: 'ON_TRACK' | 'WATCH' | 'CONCERN' | 'URGENT';
  size?: 'sm' | 'md';
}

const STATUS_LABELS: Record<string, string> = {
  ON_TRACK: 'On Track',
  WATCH: 'Watch',
  CONCERN: 'Concern',
  URGENT: 'Urgent',
};

export function StatusBadge({ code, size = 'md' }: StatusBadgeProps) {
  const label = STATUS_LABELS[code] || code;

  return (
    <span
      className={clsx(
        'badge',
        {
          'badge-on-track': code === 'ON_TRACK',
          'badge-watch': code === 'WATCH',
          'badge-concern': code === 'CONCERN',
          'badge-urgent': code === 'URGENT',
        }
      )}
      style={size === 'sm' ? { fontSize: '0.6875rem', padding: '0.125rem 0.375rem' } : undefined}
    >
      {label}
    </span>
  );
}
