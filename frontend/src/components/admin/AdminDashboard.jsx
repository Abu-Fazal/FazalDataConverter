import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity,
  ArrowLeftRight,
  CheckCircle2,
  Clock3,
  Database,
  Loader2,
  RefreshCw,
  ShieldCheck,
  SlidersHorizontal,
  Users,
  XCircle,
} from 'lucide-react';
import { Badge } from '../ui/badge.jsx';
import { Button } from '../ui/button.jsx';
import { Card } from '../ui/card.jsx';
import { MetricCard } from './MetricCard.jsx';
import { FailedJobsTable } from './FailedJobsTable.jsx';
import { SecurityLogsTable } from './SecurityLogsTable.jsx';
import { adminApi } from '@/services/admin.api';
import { formatBytes, formatShortDate, formatTimeAgo, percent } from './format.js';

function formatUptime(seconds = 0) {
  const total = Math.max(0, Math.round(seconds));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m ${total % 60}s`;
}

const quickLinks = [
  {
    to: '/admin/users',
    icon: Users,
    title: 'User Management',
    description: 'Search, filter, suspend, reactivate, or permanently delete registered accounts.',
  },
  {
    to: '/admin/conversions',
    icon: ArrowLeftRight,
    title: 'Conversion Monitoring',
    description: 'Live job telemetry, failure diagnostics, and SLA compliance metadata.',
  },
  {
    to: '/admin/security',
    icon: ShieldCheck,
    title: 'Reports & Security Logs',
    description: 'Immutable audit ledger, CSV exports, and lockout history.',
  },
  {
    to: '/admin/settings',
    icon: SlidersHorizontal,
    title: 'System Settings',
    description: 'File-size caps, SLA targets, engine limits, and maintenance mode.',
  },
];

function StatusRow({ label, value, tone = 'text-text-primary' }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-border-faint py-2 text-body-sm last:border-0">
      <span className="text-text-secondary">{label}</span>
      <span className={`text-right font-medium tabular-nums ${tone}`}>{value}</span>
    </div>
  );
}

export function AdminDashboard() {
  const [data, setData] = useState(null);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [syncedAt, setSyncedAt] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [dashboard, security] = await Promise.all([
        adminApi.getDashboard(),
        adminApi.getSecurityLogs({ range: '7d' }),
      ]);
      setData(dashboard);
      setLogs((security.data || []).slice(0, 5));
      setSyncedAt(new Date());
    } catch (loadError) {
      setError(loadError.message || 'Could not load admin telemetry.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading && !data) {
    return (
      <div className="flex min-h-[420px] items-center justify-center" role="status" aria-live="polite">
        <Loader2 className="h-6 w-6 animate-spin text-brand-primary" aria-hidden="true" />
        <span className="sr-only">Loading admin dashboard</span>
      </div>
    );
  }

  if (error && !data) {
    return (
      <Card className="p-8 text-center">
        <p className="text-headline-sm text-text-primary">Dashboard unavailable</p>
        <p className="mt-1 text-body-sm text-text-secondary">{error}</p>
        <Button className="mt-4" onClick={load}>
          <RefreshCw className="mr-2 h-4 w-4" aria-hidden="true" />
          Retry
        </Button>
      </Card>
    );
  }

  if (!data) return null;

  const { metrics, directionSplit, weekly, recentConversions, recentFailures, system } = data;
  const maxWeekly = Math.max(1, ...weekly.map((entry) => entry.count));
  const maintenance = system.maintenanceMode;
  const failureRate = metrics.totalConversions > 0 ? (metrics.failedConversions / metrics.totalConversions) * 100 : 0;

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-border-subtle bg-surface-primary p-5 shadow-card sm:p-6" aria-labelledby="operations-title">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={maintenance ? 'warning' : 'success'} dot pulse={maintenance}>
                {maintenance ? 'Maintenance Mode' : 'System Operational'}
              </Badge>
              <Badge variant="neutral">Maintenance: {maintenance ? 'ON' : 'OFF'}</Badge>
              <span className="text-[11px] text-text-muted">
                Last synced: {syncedAt ? syncedAt.toLocaleTimeString() : 'just now'}
              </span>
            </div>
            <h2 id="operations-title" className="mt-3 text-headline-lg text-text-primary">
              Operations &amp; Monitoring
            </h2>
            <p className="mt-1 max-w-2xl text-body-sm text-text-secondary">
              Live metrics from the in-memory engine. Admin access is metadata-only — file contents stay
              isolated to their owners (PRD §8.1).
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="small" onClick={load} disabled={loading}>
              <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} aria-hidden="true" />
              Refresh
            </Button>
            <Button asChild size="small">
              <Link to="/admin/settings">
                <SlidersHorizontal className="mr-2 h-4 w-4" aria-hidden="true" />
                Quick Config
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Registered Users"
          value={metrics.totalUsers.toLocaleString()}
          hint={`${metrics.activeUsers} active · ${metrics.suspendedUsers} suspended`}
          icon={Users}
          tone="brand"
        />
        <MetricCard
          label="Total Conversions"
          value={metrics.totalConversions.toLocaleString()}
          hint={`${percent(metrics.successRate)} success rate`}
          icon={ArrowLeftRight}
          tone="success"
          delta={metrics.todayConversions - metrics.yesterdayConversions}
        />
        <MetricCard
          label="Failed Conversions"
          value={metrics.failedConversions.toLocaleString()}
          hint={`${percent(failureRate)} of all jobs`}
          icon={XCircle}
          tone={metrics.failedConversions > 0 ? 'error' : 'neutral'}
        />
        <MetricCard
          label="Active Jobs"
          value={metrics.activeJobs.toLocaleString()}
          hint={`${metrics.completedConversions} completed historically`}
          icon={Activity}
          tone={metrics.activeJobs > 0 ? 'info' : 'neutral'}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <Card className="p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-headline-sm text-text-primary">Format split</h3>
              <p className="text-body-sm text-text-secondary">Direction share across all conversion jobs.</p>
            </div>
            <Badge variant="neutral">{metrics.totalConversions} jobs</Badge>
          </div>
          <div className="mt-5 space-y-4">
            {directionSplit.map((entry) => (
              <div key={entry.direction}>
                <div className="flex items-center justify-between gap-3 text-body-sm">
                  <span className="font-medium text-text-primary">{entry.label}</span>
                  <span className="tabular-nums text-text-secondary">
                    {entry.count} · {percent(entry.share)}
                  </span>
                </div>
                <div
                  className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-surface-secondary"
                  role="progressbar"
                  aria-label={`${entry.label} share`}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={Math.round(entry.share)}
                >
                  <div
                    className="h-full rounded-full bg-gradient-brand"
                    style={{ width: `${Math.min(100, Math.max(entry.share, entry.count > 0 ? 2 : 0))}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 border-t border-border-faint pt-4">
            <div className="flex items-center justify-between gap-2">
              <h4 className="text-label-lg text-text-primary">Last 7 days</h4>
              <span className="text-[11px] text-text-muted">UTC daily totals</span>
            </div>
            <div className="mt-3 flex h-24 items-end gap-2" role="img" aria-label="Conversions per day over the last seven days">
              {weekly.map((entry) => (
                <div key={entry.date} className="flex flex-1 flex-col items-center gap-1">
                  <span className="text-[10px] tabular-nums text-text-muted">{entry.count}</span>
                  <div
                    className="w-full rounded-t bg-brand-primary-surface"
                    style={{ height: `${Math.max(4, (entry.count / maxWeekly) * 68)}px` }}
                    title={`${formatShortDate(entry.date)}: ${entry.count} conversions`}
                  />
                  <span className="text-[10px] text-text-subtle">{entry.date.slice(5)}</span>
                </div>
              ))}
            </div>
          </div>
        </Card>

        <Card className="p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-headline-sm text-text-primary">System status</h3>
              <p className="text-body-sm text-text-secondary">Engine, storage, and maintenance state.</p>
            </div>
            <span
              className={`flex h-9 w-9 items-center justify-center rounded-lg ${
                maintenance ? 'bg-warning-bg text-warning-text' : 'bg-success-bg text-success-text'
              }`}
            >
              <Database size={18} aria-hidden="true" />
            </span>
          </div>
          <div className="mt-4">
            <StatusRow
              label="Service state"
              value={maintenance ? 'Maintenance' : 'Online & healthy'}
              tone={maintenance ? 'text-warning-text' : 'text-success-text'}
            />
            <StatusRow label="Uptime" value={formatUptime(system.uptimeSeconds)} />
            <StatusRow label="Node runtime" value={system.nodeVersion} />
            <StatusRow
              label="Memory footprint"
              value={`${system.memory.usedMb} MB / ${system.memory.limitMb} MB`}
            />
            <StatusRow label="Stored objects" value={`${system.storage.objectCount} · ${formatBytes(system.storage.usedBytes)}`} />
            <StatusRow label="Per-file cap" value={`${system.maxFileSizeMb} MB`} />
            <StatusRow label="SLA targets" value={`≤${system.settings.smallFileSlaSeconds}s small · ≤${system.settings.largeFileSlaSeconds}s large`} />
          </div>
          <p className="mt-4 rounded-lg border border-border-subtle bg-surface-app px-3 py-2 text-[11px] leading-4 text-text-secondary">
            {maintenance ? system.maintenanceMessage : 'Sole Admin access remains active during maintenance mode.'}
          </p>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {quickLinks.map((link) => {
          const Icon = link.icon;
          return (
            <Link
              key={link.to}
              to={link.to}
              className="group rounded-xl border border-border-subtle bg-surface-primary p-5 shadow-card transition-all hover:border-brand-primary-border hover:shadow-card-hover"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-primary-soft text-brand-primary">
                <Icon size={17} aria-hidden="true" />
              </span>
              <p className="mt-3 text-label-lg font-semibold text-text-primary group-hover:text-brand-primary-deep">
                {link.title}
              </p>
              <p className="mt-1 text-body-sm text-text-secondary">{link.description}</p>
            </Link>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Card className="p-5 sm:p-6">
          <div className="mb-4 flex items-center justify-between gap-2">
            <h3 className="text-headline-sm text-text-primary">Recent conversions</h3>
            <Link to="/admin/conversions" className="text-label-lg text-brand-primary hover:text-brand-primary-deep">
              View all
            </Link>
          </div>
          {recentConversions.length === 0 ? (
            <p className="rounded-lg border border-border-subtle bg-surface-app px-4 py-8 text-center text-body-sm text-text-muted">
              No conversion jobs have been processed yet.
            </p>
          ) : (
            <ul className="divide-y divide-border-faint">
              {recentConversions.map((job) => (
                <li key={job.id} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <CheckCircle2
                      size={16}
                      className={job.status === 'failed' ? 'shrink-0 text-error-text' : 'shrink-0 text-success-text'}
                      aria-hidden="true"
                    />
                    <div className="min-w-0">
                      <p className="truncate text-body-sm font-medium text-text-primary">{job.fileName}</p>
                      <p className="truncate text-[11px] text-text-muted">
                        {job.owner.name} · {job.directionLabel}
                      </p>
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <Badge
                      variant={job.status === 'failed' ? 'error' : job.status === 'completed' ? 'success' : 'processing'}
                    >
                      {job.status}
                    </Badge>
                    <p className="mt-1 text-[11px] text-text-muted">{formatTimeAgo(job.createdAt)}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="p-5 sm:p-6">
          <div className="mb-4 flex items-center gap-2 text-text-secondary">
            <Clock3 size={16} aria-hidden="true" />
            <p className="text-body-sm">Immutable audit coverage: 365 days · integrity verified</p>
          </div>
          <SecurityLogsTable logs={logs} loading={loading} />
        </Card>
      </div>

      <Card className="p-5 sm:p-6">
        <FailedJobsTable jobs={recentFailures} loading={loading} />
      </Card>
    </div>
  );
}