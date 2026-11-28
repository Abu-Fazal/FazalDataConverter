const DIRECTION_LABELS = {
  'excel-json': 'Excel → JSON',
  'json-excel': 'JSON → Excel',
  'excel-bson': 'Excel → BSON',
  'js-extract': 'Static JS Extraction',
};

export function formatBytes(bytes = 0) {
  const value = Number(bytes) || 0;
  if (value <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const exponent = Math.min(Math.floor(Math.log(value) / Math.log(1024)), units.length - 1);
  const scaled = value / 1024 ** exponent;
  return `${scaled >= 100 || exponent === 0 ? scaled.toFixed(0) : scaled.toFixed(2)} ${units[exponent]}`;
}

function pad(value) {
  return String(value).padStart(2, '0');
}

export function formatDateTime(iso) {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function formatDuration(ms = 0) {
  if (!ms) return '—';
  if (ms < 1000) return `${Math.round(ms)} ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

export function directionLabel(entry) {
  return (
    DIRECTION_LABELS[entry?.direction] ||
    `${(entry?.sourceFormat || 'file').toUpperCase()} → ${(entry?.targetFormat || 'output').toUpperCase()}`
  );
}

export function modeLabel(entry) {
  if (entry?.direction === 'js-extract') return 'AST Constant Harvest';
  if (entry?.direction === 'excel-bson') return 'BSON + Sidecar Metadata';
  if (entry?.direction === 'excel-json') {
    return entry.mode === 'workbook' ? 'Workbook Hierarchical' : 'Normal Data JSON';
  }
  if (entry?.direction === 'json-excel') {
    return entry.mode === 'workbook' ? 'Multi-Tab Relational' : 'Normal Data Table';
  }
  return entry?.mode === 'workbook' ? 'Workbook JSON' : 'Normal Data JSON';
}

export function fileExtension(name = '') {
  const match = /\.([a-z0-9]+)$/i.exec(name);
  return match ? match[1].toLowerCase() : '';
}

export function outputFormatLabel(entry) {
  const extension = fileExtension(entry?.outputFileName || '');
  if (extension) return extension.toUpperCase();
  return (entry?.targetFormat || 'OUT').toUpperCase();
}

export function isActiveStatus(status) {
  return status === 'pending' || status === 'processing';
}