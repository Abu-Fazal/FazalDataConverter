import { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  Download,
  FileClock,
  Filter,
  Loader2,
  Lock,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
} from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '../ui/badge.jsx';
import { Button } from '../ui/button.jsx';
import { Card } from '../ui/card.jsx';
import { Input } from '../ui/input.jsx';
import { Select } from '../ui/select.jsx';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog.jsx';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../ui/table.jsx';
import { MetricCard } from './MetricCard.jsx';
import { adminApi } from '@/services/admin.api';
import { eventLabel, eventTone, formatDateTime } from './format.js';

const PAGE_SIZE = 12;
const RANGE_LABELS = {
  all: 'All-time (up to 1 year)',
  '24h': 'Last 24 hours',
  '7d': 'Last 7 days',
  '30d': 'Last 30 days',
  '1y': 'Last 365 days',
};

export function AdminSecurityPage() {
  const [logs, setLogs] = useState([]);
  const [summary, setSummary] = useState(null);
  const [eventTypes, setEventTypes] = useState([{ id: 'all', label: 'All Events' }]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [exportOpen, setExportOpen] = useState(false);
  const [exportAck, setExportAck] = useState(false);
  const [exporting, setExporting] = useState(false);

  const [eventType, setEventType] = useState('all');
  const [range, setRange] = useState('all');
  const [ip, setIp] = useState('');
  const [debouncedIp, setDebouncedIp] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  const filters = useMemo(
    () => ({ eventType, range, ip: debouncedIp }),
    [eventType, range, debouncedIp],
  );

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedIp(ip.trim()), 250);
    return () => window.clearTimeout(timer);
  }, [ip]);

  useEffect(() => {
    setPage(1);
  }, [eventType, range, debouncedIp]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');

    adminApi
      .getSecurityLogs(filters)
      .then((res) => {
        if (cancelled) return;
        setLogs(res.data || []);
        setSummary(res.summary || null);
        if (Array.isArray(res.eventTypes)) setEventTypes(res.eventTypes);
      })
      .catch((loadError) => {
        if (!cancelled) setError(loadError.message || 'Could not load the security ledger.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [filters, reloadKey]);

  function closeExport(nextOpen) {
    setExportOpen(nextOpen);
    if (!nextOpen) setExportAck(false);
  }

  async function handleExport() {
    setExporting(true);
    try {
      await adminApi.exportSecurityLogs(filters);
      toast.success('Security ledger exported', {
        description: `${logs.length} rows · export action audited as SECURITY_LOG_EXPORTED.`,
      });
      closeExport(false);
      setReloadKey((key) => key + 1);
    } catch (exportError) {
      toast.error('Export failed', { description: exportError.message });
    } finally {
      setExporting(false);
    }
  }

  const totalPages = Math.max(1, Math.ceil(logs.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const visible = logs.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-border-subtle bg-surface-primary p-5 shadow-card sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="success" dot>
                Immutable audit ledger
              </Badge>
              <Badge variant="neutral">PRD §3.8 · TRD §7.6</Badge>
            </div>
            <h2 className="mt-3 text-headline-lg text-text-primary">Security Logs &amp; Audit Trail</h2>
            <p className="mt-1 max-w-3xl text-body-sm text-text-secondary">
              Every privileged action, authentication event, and lockout is recorded with a one-year
              retention window. Entries are append-only — they cannot be edited or deleted.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="small" onClick={() => setReloadKey((key) => key + 1)} disabled={loading}>
              <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} aria-hidden="true" />
              Sync
            </Button>
            <Button size="small" onClick={() => setExportOpen(true)} disabled={logs.length === 0}>
              <Download className="mr-2 h-4 w-4" aria-hidden="true" />
              Export CSV
            </Button>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Total events retained"
          value={(summary?.totalEvents ?? logs.length).toLocaleString()}
          hint={`${summary?.retentionDays ?? 365}-day rolling retention`}
          icon={FileClock}
          tone="brand"
        />
        <MetricCard
          label="Events in last 24h"
          value={(summary?.last24h ?? 0).toLocaleString()}
          hint="Auth, governance, and config activity"
          icon={Activity}
          tone="info"
        />
        <MetricCard
          label="Privileged actions"
          value={(summary?.privilegedActions ?? 0).toLocaleString()}
          hint="Suspensions, deletions, config changes"
          icon={ShieldAlert}
          tone={summary?.privilegedActions ? 'warning' : 'neutral'}
        />
        <MetricCard
          label="Ledger integrity"
          value={summary?.integrity ?? '—'}
          hint={
            summary?.activeLockouts
              ? `${summary.activeLockouts} active admin lockout`
              : 'No active admin lockouts'
          }
          icon={summary?.activeLockouts ? Lock : ShieldCheck}
          tone={summary?.activeLockouts ? 'warning' : 'success'}
        />
      </div>

      <Card className="p-4 sm:p-5">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
          <div className="flex flex-1 flex-col gap-3 sm:flex-row">
            <div className="sm:w-56">
              <label htmlFor="log-event" className="sr-only">
                Filter by event type
              </label>
              <Select id="log-event" value={eventType} onChange={(event) => setEventType(event.target.value)}>
                {eventTypes.map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.label}
                  </option>
                ))}
              </Select>
            </div>
            <div className="sm:w-52">
              <label htmlFor="log-range" className="sr-only">
                Filter by time range
              </label>
              <Select id="log-range" value={range} onChange={(event) => setRange(event.target.value)}>
                {Object.entries(RANGE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
            </div>
          </div>
          <div className="min-w-0 sm:w-64">
            <label htmlFor="log-ip" className="sr-only">
              Filter by source IP
            </label>
            <Input
              id="log-ip"
              icon={Search}
              value={ip}
              onChange={(event) => setIp(event.target.value)}
              placeholder="Source IP contains…"
              autoComplete="off"
            />
          </div>
        </div>
        <p className="mt-3 flex items-center gap-1.5 text-[11px] text-text-muted">
          <Filter size={12} aria-hidden="true" />
          Showing {logs.length} matching entries · read-only ledger
        </p>
      </Card>

      {error ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-error-border bg-error-bg px-4 py-3 text-body-sm text-error-text">
          <span>{error}</span>
          <Button size="small" variant="outline" onClick={() => setReloadKey((key) => key + 1)}>
            Retry
          </Button>
        </div>
      ) : null}

      <div className="relative">
        {loading ? (
          <div className="absolute inset-0 z-10 flex items-start justify-center rounded-xl bg-surface-primary/60 pt-16">
            <Loader2 className="h-5 w-5 animate-spin text-brand-primary" aria-hidden="true" />
            <span className="sr-only">Loading security logs</span>
          </div>
        ) : null}

        <Table caption="Immutable security ledger, append-only">
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Event</TableHead>
              <TableHead>Actor</TableHead>
              <TableHead>Source IP</TableHead>
              <TableHead>Outcome</TableHead>
              <TableHead>Failed attempts</TableHead>
              <TableHead>Timestamp</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visible.map((log) => (
              <TableRow key={log.id}>
                <TableCell>
                  <Badge variant={eventTone(log.eventType)}>{eventLabel(log.eventType)}</Badge>
                  <p className="mt-1 font-mono text-[11px] text-text-muted">{log.id}</p>
                </TableCell>
                <TableCell>
                  <p className="max-w-[180px] truncate text-body-sm text-text-primary">{log.actor}</p>
                  <p className="max-w-[180px] truncate text-[11px] text-text-muted">{log.actorEmail || '—'}</p>
                </TableCell>
                <TableCell className="whitespace-nowrap font-mono text-xs text-text-secondary">
                  {log.sourceIp}
                </TableCell>
                <TableCell className="whitespace-nowrap text-body-sm text-text-secondary">{log.outcome}</TableCell>
                <TableCell className="tabular-nums text-body-sm text-text-secondary">
                  {log.failedCount ?? '—'}
                </TableCell>
                <TableCell className="whitespace-nowrap text-body-sm tabular-nums text-text-secondary">
                  {formatDateTime(log.timestamp)}
                </TableCell>
              </TableRow>
            ))}
            {!loading && visible.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={6} className="py-10 text-center">
                  <p className="text-body-md font-medium text-text-primary">No events match these filters</p>
                  <p className="mt-1 text-body-sm text-text-secondary">
                    Authentication, governance, and configuration events will appear here.
                  </p>
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </div>

      {logs.length > 0 ? (
        <div className="flex flex-col gap-3 text-body-sm text-text-secondary sm:flex-row sm:items-center sm:justify-between">
          <span>
            Showing {(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, logs.length)} of{' '}
            {logs.length} entries
          </span>
          <div className="flex items-center gap-2">
            <Button
              size="small"
              variant="outline"
              disabled={safePage <= 1}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
            >
              Previous
            </Button>
            <span className="px-1 tabular-nums">
              Page {safePage} of {totalPages}
            </span>
            <Button
              size="small"
              variant="outline"
              disabled={safePage >= totalPages}
              onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
            >
              Next
            </Button>
          </div>
        </div>
      ) : null}

      <p className="flex items-start gap-2 rounded-xl border border-border-subtle bg-surface-app px-4 py-3 text-[11px] leading-5 text-text-secondary">
        <Lock size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
        Log entries are append-only and retained for one year. Passwords, tokens, secrets, and file
        contents are never written to the ledger. CSV exports leave an audit record of their own.
      </p>

      <Dialog open={exportOpen} onOpenChange={closeExport}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Export security ledger</DialogTitle>
            <DialogDescription>
              A CSV of the current filter ({logs.length} entries) will be generated. The export action
              is recorded in the ledger as SECURITY_LOG_EXPORTED.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="rounded-lg border border-border-subtle bg-surface-app px-3 py-2.5 text-body-sm text-text-secondary">
              <p>
                Event type: <span className="font-medium text-text-primary">{eventTypes.find((type) => type.id === eventType)?.label || 'All Events'}</span>
              </p>
              <p>
                Range: <span className="font-medium text-text-primary">{RANGE_LABELS[range]}</span>
              </p>
              <p>
                Source IP filter: <span className="font-mono text-text-primary">{debouncedIp || 'none'}</span>
              </p>
            </div>
            <label className="flex items-start gap-2 text-body-sm text-text-secondary">
              <input
                type="checkbox"
                className="mt-0.5 h-4 w-4 rounded border-border-strong text-brand-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
                checked={exportAck}
                onChange={(event) => setExportAck(event.target.checked)}
              />
              I understand this export is audited and contains administrative metadata only.
            </label>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => closeExport(false)} disabled={exporting}>
              Cancel
            </Button>
            <Button onClick={handleExport} disabled={!exportAck || exporting}>
              {exporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" /> : null}
              Export CSV
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}