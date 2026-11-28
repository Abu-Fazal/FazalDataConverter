export { formatBytes, formatDateTime, formatDuration, directionLabel, modeLabel } from '../history/format.js';

export function formatTimeAgo(iso) {
  if (!iso) return '—';
  const timestamp = new Date(iso).getTime();
  if (Number.isNaN(timestamp)) return '—';
  const diff = Date.now() - timestamp;
  if (diff < 45 * 1000) return 'just now';
  if (diff < 60 * 60 * 1000) return `${Math.max(1, Math.round(diff / 60000))}m ago`;
  if (diff < 24 * 60 * 60 * 1000) return `${Math.round(diff / 3600000)}h ago`;
  if (diff < 30 * 24 * 60 * 60 * 1000) return `${Math.round(diff / 86400000)}d ago`;
  return formatShortDate(iso);
}

function pad(value) {
  return String(value).padStart(2, '0');
}

export function formatShortDate(iso) {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function formatClock(seconds = 0) {
  const safe = Math.max(0, Math.round(Number(seconds) || 0));
  return `${pad(Math.floor(safe / 60))}:${pad(safe % 60)}`;
}

export function percent(value, digits = 1) {
  const number = Number(value) || 0;
  return `${number.toFixed(digits)}%`;
}

export function eventTone(eventType = '') {
  if (eventType.includes('FAILED') || eventType.includes('LOCKOUT') || eventType.includes('BLOCKED')) {
    return 'error';
  }
  if (eventType.includes('SUSPENDED') || eventType.includes('DELETED') || eventType.includes('RECOVERY')) {
    return 'warning';
  }
  if (eventType.includes('SUCCESS') || eventType.includes('REACTIVATED')) return 'success';
  return 'info';
}

export function eventLabel(eventType = '') {
  return eventType
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export function ownerInitials(name = '') {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  return parts
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('');
}

export function formatUtcWindow(startIso, endIso) {
  if (!startIso || !endIso) return 'None';
  const start = new Date(startIso);
  const end = new Date(endIso);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 'None';
  return `${pad(start.getUTCHours())}:${pad(start.getUTCMinutes())} – ${pad(end.getUTCHours())}:${pad(end.getUTCMinutes())} UTC`;
}