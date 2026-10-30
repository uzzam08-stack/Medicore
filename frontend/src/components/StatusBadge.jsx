import React from 'react';
import { getStatusBadgeConfig } from '../utils/formatters';

export function StatusBadge({ status, type = 'appointment' }) {
  if (type === 'availability') {
    const isAvailable = Boolean(status);
    return (
      <span className={`status-badge ${isAvailable ? 'badge-available' : 'badge-unavailable'}`}>
        <span className={`status-dot ${isAvailable ? 'dot-available' : 'dot-unavailable'}`} />
        {isAvailable ? 'Available' : 'Unavailable'}
      </span>
    );
  }

  const config = getStatusBadgeConfig(status);
  return (
    <span className={`status-badge badge-${status?.toLowerCase() || 'default'}`}>
      <span className="status-dot" style={{ backgroundColor: config.color }} />
      {config.label}
    </span>
  );
}

export default StatusBadge;
