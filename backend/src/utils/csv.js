/**
 * RFC 4180 CSV serialization for admin report exports (PRD §8.4, §3.8).
 * A UTF-8 BOM is prepended so Excel opens the file correctly.
 */

function escapeCell(value) {
  if (value == null) return '';
  const text = String(value);
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function toCsv(headers, rows) {
  const lines = [
    headers.map(escapeCell).join(','),
    ...rows.map((row) => row.map(escapeCell).join(',')),
  ];
  return lines.join('\r\n');
}

export function sendCsv(res, filename, headers, rows) {
  const body = `\uFEFF${toCsv(headers, rows)}`;
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.status(200).send(body);
}