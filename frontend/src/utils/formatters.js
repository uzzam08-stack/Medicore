/**
 * Formatting and Helper Utilities for MediCore
 */

/**
 * Format an ISO date-time string into user-friendly format (e.g. Oct 30, 2026 at 2:30 PM).
 */
export function formatDateTime(isoString) {
  if (!isoString) return '—';
  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return isoString;
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }).format(date);
  } catch {
    return isoString;
  }
}

/**
 * Format date only (e.g. Oct 30, 2026).
 */
export function formatDate(isoString) {
  if (!isoString) return '—';
  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return isoString;
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(date);
  } catch {
    return isoString;
  }
}

/**
 * Format time only (e.g. 2:30 PM).
 */
export function formatTime(isoString) {
  if (!isoString) return '—';
  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return isoString;
    return new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }).format(date);
  } catch {
    return isoString;
  }
}

/**
 * Converts a Date object or ISO string to input datetime-local format (YYYY-MM-DDTHH:MM)
 */
export function toDatetimeLocalInput(isoStringOrDate) {
  if (!isoStringOrDate) {
    const d = new Date();
    // Default to tomorrow 10:00 AM
    d.setDate(d.getDate() + 1);
    d.setHours(10, 0, 0, 0);
    return formatLocalIso(d);
  }
  const date = typeof isoStringOrDate === 'string' ? new Date(isoStringOrDate) : isoStringOrDate;
  return formatLocalIso(date);
}

function formatLocalIso(date) {
  const pad = (num) => String(num).padStart(2, '0');
  const y = date.getFullYear();
  const m = pad(date.getMonth() + 1);
  const d = pad(date.getDate());
  const hh = pad(date.getHours());
  const mm = pad(date.getMinutes());
  return `${y}-${m}-${d}T${hh}:${mm}`;
}

/**
 * Get color metadata for appointment status
 */
export function getStatusBadgeConfig(status) {
  switch (status?.toUpperCase()) {
    case 'SCHEDULED':
      return {
        label: 'Scheduled',
        bg: 'bg-blue-50 text-blue-700 border-blue-200',
        dot: 'bg-blue-500',
        color: '#0284c7',
      };
    case 'RESCHEDULED':
      return {
        label: 'Rescheduled',
        bg: 'bg-purple-50 text-purple-700 border-purple-200',
        dot: 'bg-purple-500',
        color: '#9333ea',
      };
    case 'COMPLETED':
      return {
        label: 'Completed',
        bg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        dot: 'bg-emerald-500',
        color: '#10b981',
      };
    case 'CANCELLED':
      return {
        label: 'Cancelled',
        bg: 'bg-rose-50 text-rose-700 border-rose-200',
        dot: 'bg-rose-500',
        color: '#ef4444',
      };
    default:
      return {
        label: status || 'Unknown',
        bg: 'bg-slate-100 text-slate-700 border-slate-200',
        dot: 'bg-slate-400',
        color: '#64748b',
      };
  }
}

/**
 * Get patient avatar initials
 */
export function getInitials(name) {
  if (!name) return '??';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
