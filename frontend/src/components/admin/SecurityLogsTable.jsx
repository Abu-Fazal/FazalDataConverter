import { useState } from 'react';
import { AlertCircle, Download, Filter, Clock } from 'lucide-react';
import { Button } from '../ui/button.jsx';
import { cn } from '@/lib/utils';

const MOCK_SECURITY_LOGS = [
  {
    id: 'log_001',
    action: 'Admin Login Failure',
    userId: 'admin',
    ipAddress: '192.168.1.45',
    timestamp: '2026-11-25 08:12:03',
    result: 'Failed',
  },
  {
    id: 'log_002',
    action: 'Admin Login Success',
    userId: 'admin',
    ipAddress: '192.168.1.45',
    timestamp: '2026-11-25 08:15:22',
    result: 'Success',
  },
  {
    id: 'log_003',
    action: 'Account Suspended',
    userId: 'user_x',
    ipAddress: '10.0.0.12',
    timestamp: '2026-11-24 16:45:10',
    result: 'Success',
  },
  {
    id: 'log_004',
    action: 'Maintenance Mode Enabled',
    userId: 'admin',
    ipAddress: '192.168.1.45',
    timestamp: '2026-11-24 10:00:00',
    result: 'Success',
  },
  {
    id: 'log_005',
    action: 'Security Log Export',
    userId: 'admin',
    ipAddress: '192.168.1.45',
    timestamp: '2026-11-23 14:22:15',
    result: 'Success',
  },
];

/**
 * Immutable security logs table (Chunk 5.5).
 * Read-only 1-year log table with date-range filter and CSV export.
 * Logs cannot be edited or deleted by the Admin.
 */
export function SecurityLogsTable() {
  const [dateRange, setDateRange] = useState('all');
  const [isExporting, setIsExporting] = useState(false);
  const handleExportCsv = () => {
    setIsExporting(true);
    const headers = ['ID', 'Action', 'User ID', 'IP Address', 'Timestamp', 'Result'];
    const rows = MOCK_SECURITY_LOGS.map((log) => [
      log.id,
      log.action,
      log.userId,
      log.ipAddress,
      log.timestamp,
      log.result,
    ]);
    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute(
      'download',
      `security-logs-${new Date().toISOString().slice(0, 10)}.csv`,
    );
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setIsExporting(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-text-primary">Immutable Security Logs</h2>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Filter className="absolute left-3 top-2.5 w-4 h-4 text-text-muted" />
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="pl-8 pr-3 py-1.5 border border-border-subtle rounded-lg text-sm bg-surface-primary focus:ring-brand-primary focus:border-brand-primary"
            >
              <option value="all">All Time</option>
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
              <option value="90d">Last 90 Days</option>
            </select>
          </div>
          <Button size="small" onClick={handleExportCsv} disabled={isExporting}>
            {isExporting ? (
              <Download className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <Download className="w-4 h-4 mr-2" />
            )}
            Export CSV
          </Button>
        </div>
      </div>

      <div className="rounded-xl border border-border-subtle bg-surface-primary shadow-sm overflow-hidden">
        <table className="w-full text-sm text-left border-collapse">
          <thead className="bg-surface-secondary border-b border-border-subtle">
            <tr>
              <th className="px-4 py-3 font-medium text-text-secondary uppercase tracking-wider text-xs">
                ID
              </th>
              <th className="px-4 py-3 font-medium text-text-secondary uppercase tracking-wider text-xs">
                Action
              </th>
              <th className="px-4 py-3 font-medium text-text-secondary uppercase tracking-wider text-xs">
                User ID
              </th>
              <th className="px-4 py-3 font-medium text-text-secondary uppercase tracking-wider text-xs">
                IP Address
              </th>
              <th className="px-4 py-3 font-medium text-text-secondary uppercase tracking-wider text-xs">
                Timestamp
              </th>
              <th className="px-4 py-3 font-medium text-text-secondary uppercase tracking-wider text-xs">
                Result
              </th>
            </tr>
          </thead>
          <tbody>
            {MOCK_SECURITY_LOGS.map((log) => (
              <tr
                key={log.id}
                className="border-b border-border-subtle hover:bg-surface-tertiary transition-colors"
              >
                <td className="px-4 py-4 text-text-secondary tabular-nums font-mono text-xs">
                  {log.id}
                </td>
                <td className="px-4 py-4 text-text-primary">{log.action}</td>
                <td className="px-4 py-4 text-text-secondary tabular-nums">{log.userId}</td>
                <td className="px-4 py-4 text-text-secondary tabular-nums">{log.ipAddress}</td>
                <td className="px-4 py-4 text-text-secondary tabular-nums">{log.timestamp}</td>
                <td className="px-4 py-4">
                  <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium border ${
                    log.result === 'Success'
                      ? 'border-[#A7F3D0] bg-[#ECFDF5] text-[#047857]'
                      : 'border-[#FECACA] bg-[#FEF2F2] text-[#B91C1C]'
                  }`}>
                    {log.result}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center gap-3 text-xs text-text-muted">
        <Clock className="w-4 h-4" />
        <span>
          Logs are read-only with a 1-year retention period. Passwords, tokens, secrets, and
          file contents are redacted from all log entries.
        </span>
      </div>
    </div>
  );
}

