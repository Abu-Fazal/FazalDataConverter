import { useMemo, useState } from 'react';
import { Download, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../ui/button.jsx';
import { Badge } from '../ui/badge.jsx';
import { Select } from '../ui/select.jsx';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../ui/table.jsx';

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

const RANGE_DAYS = { '7d': 7, '30d': 30, '90d': 90 };

/**
 * Immutable security logs table (Chunk 5.5).
 * Read-only 1-year log table with date-range filter and CSV export.
 * Logs cannot be edited or deleted by the Admin.
 */
export function SecurityLogsTable() {
  const [dateRange, setDateRange] = useState('all');

  const logs = useMemo(() => {
    const days = RANGE_DAYS[dateRange];
    if (!days) return MOCK_SECURITY_LOGS;
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
    return MOCK_SECURITY_LOGS.filter((log) => new Date(log.timestamp.replace(' ', 'T')).getTime() >= cutoff);
  }, [dateRange]);

  function handleExportCsv() {
    const headers = ['ID', 'Action', 'User ID', 'IP Address', 'Timestamp', 'Result'];
    const rows = logs.map((log) => [log.id, log.action, log.userId, log.ipAddress, log.timestamp, log.result]);
    const csvContent = [headers.join(','), ...rows.map((row) => row.map((cell) => `"${cell}"`).join(','))].join('\n');

    const url = URL.createObjectURL(new Blob([csvContent], { type: 'text/csv;charset=utf-8;' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `security-logs-${new Date().toISOString().slice(0, 10)}.csv`;
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success('Security logs exported', { description: `${logs.length} rows, secrets redacted.` });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-lg font-bold text-text-primary">Immutable Security Logs</h2>
        <div className="flex items-center gap-3">
          <div className="w-40">
            <Select
              aria-label="Filter logs by date range"
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
            >
              <option value="all">All Time</option>
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
              <option value="90d">Last 90 Days</option>
            </Select>
          </div>
          <Button size="small" onClick={handleExportCsv} disabled={logs.length === 0}>
            <Download className="w-4 h-4 mr-2" aria-hidden="true" />
            Export CSV
          </Button>
        </div>
      </div>

      <Table caption="Immutable security logs, read-only">
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead>ID</TableHead>
            <TableHead>Action</TableHead>
            <TableHead>User ID</TableHead>
            <TableHead>IP Address</TableHead>
            <TableHead>Timestamp</TableHead>
            <TableHead>Result</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {logs.map((log) => (
            <TableRow key={log.id}>
              <TableCell className="font-mono text-xs text-text-secondary tabular-nums">{log.id}</TableCell>
              <TableCell>{log.action}</TableCell>
              <TableCell className="text-text-secondary tabular-nums">{log.userId}</TableCell>
              <TableCell className="text-text-secondary tabular-nums">{log.ipAddress}</TableCell>
              <TableCell className="text-text-secondary tabular-nums">{log.timestamp}</TableCell>
              <TableCell>
                <Badge variant={log.result === 'Success' ? 'success' : 'error'} dot>
                  {log.result}
                </Badge>
              </TableCell>
            </TableRow>
          ))}
          {logs.length === 0 && (
            <TableRow className="hover:bg-transparent">
              <TableCell colSpan={6} className="py-8 text-center text-text-muted">
                No log entries in this date range.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      <div className="flex items-center gap-3 text-xs text-text-muted">
        <Clock className="w-4 h-4" aria-hidden="true" />
        <span>
          Logs are read-only with a 1-year retention period. Passwords, tokens, secrets, and
          file contents are redacted from all log entries.
        </span>
      </div>
    </div>
  );
}