import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Download,
  Eye,
  Filter,
  Loader2,
  RefreshCw,
  Search,
  ShieldCheck,
  Timer,
} from 'lucide-react';
import { toast } from 'sonner';
import { Badge, StatusBadge } from '../ui/badge.jsx';
import { Button } from '../ui/button.jsx';
import { Card } from '../ui/card.jsx';
import { Input } from '../ui/input.jsx';
import { Select } from '../ui/select.jsx';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../ui/table.jsx';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../ui/tabs.jsx';
import { MetricCard } from './MetricCard.jsx';
import { ConversionInspectorDialog } from './ConversionInspectorDialog.jsx';
import { adminApi } from '@/services/admin.api';
import { formatBytes, formatDuration, formatTimeAgo, modeLabel, percent } from './format.js';

const PAGE_SIZE = 10;
const SMALL_FILE_BYTES = 10 * 1024 * 1024;

const TABS = [
  { value: 'all', label: 'All jobs', countKey: 'total' },
  { value: 'completed', label: 'Succeeded', countKey: 'completed' },
  { value: 'failed', label: 'Failed', countKey: 'failed' },
  { value: 'active', label: 'Active', countKey: 'active' },
];

function slaVerdict(job, targets) {
  if (job.status !== 'completed' || !job.durationMs || !targets) return null;
  const targetSeconds =
    job.sizeBytes <= SMALL_FILE_BYTES ? targets.smallFileSlaSeconds : targets.largeFileSlaSeconds;
  return { met: job.durationMs <= targetSeconds * 1000, targetSeconds };
}

function tabFromParam(value) {
  return TABS.some((tab) => tab.value === value) ? value : 'all';
}

export function AdminConversionsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [jobs, setJobs] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [inspectId, setInspectId] = useState(null);
  const [page, setPage] = useState(1);

  const status = tabFromParam(searchParams.get('status'));
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [direction, setDirection] = useState('all');
  const [range, setRange] = useState('all');
  const [reloadKey, setReloadKey] = useState(0);

  const filters = useMemo(
    () => ({ query: debouncedQuery, status, direction, range }),
    [debouncedQuery, status, direction, range],
  );

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuery(query.trim()), 250);
    return () => window.clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    setPage(1);
  }, [debouncedQuery, status, direction, range]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');

    adminApi
      .getConversions(filters)
      .then((res) => {
        if (cancelled) return;
        setJobs(res.data || []);
        setStats(res.stats || null);
      })
      .catch((loadError) => {
        if (!cancelled) setError(loadError.message || 'Could not load conversion telemetry.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [filters, reloadKey]);

  const changeTab = useCallback(
    (next) => {
      setPage(1);
      setSearchParams(next === 'all' ? {} : { status: next }, { replace: true });
    },
    [setSearchParams],
  );

  async function handleExport() {
    try {
      await adminApi.exportConversions(filters);
      toast.success('Conversion jobs exported', {
        description: `${jobs.length} metadata rows · CSV (RFC 4180).`,
      });
    } catch (exportError) {
      toast.error('Export failed', { description: exportError.message });
    }
  }

  const targets = stats?.targets;
  const failureRate = stats?.total ? (stats.failed / stats.total) * 100 : 0;

  const totalPages = Math.max(1, Math.ceil(jobs.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const visible = jobs.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-border-subtle bg-surface-primary p-5 shadow-card sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="info" dot>
                Metadata-only visibility
              </Badge>
              <Badge variant="neutral">PRD §8.3 · TRD §7.4</Badge>
            </div>
            <h2 className="mt-3 text-headline-lg text-text-primary">Conversion Jobs &amp; Failure Telemetry</h2>
            <p className="mt-1 max-w-3xl text-body-sm text-text-secondary">
              Monitor every conversion across the engine, audit SLA performance, and triage failures.
              Admins can inspect execution metadata and validation diagnostics — never payloads.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="small" onClick={() => setReloadKey((key) => key + 1)} disabled={loading}>
              <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} aria-hidden="true" />
              Sync
            </Button>
            <Button size="small" onClick={handleExport} disabled={jobs.length === 0}>
              <Download className="mr-2 h-4 w-4" aria-hidden="true" />
              Export jobs (CSV)
            </Button>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Total monitored"
          value={(stats?.total ?? jobs.length).toLocaleString()}
          hint={`${stats?.completed ?? 0} succeeded · ${stats?.cancelled ?? 0} cancelled`}
          icon={Activity}
          tone="brand"
        />
        <MetricCard
          label="SLA compliance"
          value={stats ? percent(stats.slaCompliance) : '—'}
          hint={
            targets
              ? `≤ ${targets.smallFileSlaSeconds}s small · ≤ ${targets.largeFileSlaSeconds}s large`
              : 'Targets load with config'
          }
          icon={Timer}
          tone={!stats || stats.slaCompliance >= 95 ? 'success' : stats.slaCompliance >= 85 ? 'warning' : 'error'}
        />
        <MetricCard
          label="Failed jobs"
          value={(stats?.failed ?? 0).toLocaleString()}
          hint={`${percent(failureRate)} of all jobs · fatal only`}
          icon={AlertTriangle}
          tone={stats?.failed ? 'error' : 'neutral'}
        />
        <MetricCard
          label="Active in pipeline"
          value={(stats?.active ?? 0).toLocaleString()}
          hint="Pending + processing right now"
          icon={CheckCircle2}
          tone={stats?.active ? 'info' : 'neutral'}
        />
      </div>

      <p className="flex items-start gap-2 rounded-xl border border-info-border bg-info-bg px-4 py-3 text-body-sm text-info-text">
        <ShieldCheck size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
        Job metadata, format, durations, and diagnostics are visible. Original files and converted
        outputs stay end-to-end isolated from the admin console.
      </p>

      <Tabs value={status} onValueChange={changeTab}>
        <TabsList>
          {TABS.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value}>
              {tab.label}
              <span className="rounded-full bg-surface-secondary px-1.5 text-[11px] font-semibold tabular-nums text-text-secondary">
                {stats ? (stats[tab.countKey] ?? 0) : '—'}
              </span>
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value={status}>
          <Card className="mb-4 p-4 sm:p-5">
            <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
              <div className="min-w-0 flex-1">
                <label htmlFor="job-search" className="sr-only">
                  Search conversion jobs
                </label>
                <Input
                  id="job-search"
                  icon={Search}
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search by job ID, file name, or owner"
                  autoComplete="off"
                />
              </div>
              <div className="flex flex-col gap-3 sm:flex-row">
                <div className="sm:w-48">
                  <label htmlFor="job-direction" className="sr-only">
                    Filter by transformation
                  </label>
                  <Select
                    id="job-direction"
                    value={direction}
                    onChange={(event) => setDirection(event.target.value)}
                  >
                    <option value="all">Transformation: All</option>
                    <option value="excel-json">Excel → JSON</option>
                    <option value="json-excel">JSON → Excel</option>
                    <option value="excel-bson">Excel → BSON</option>
                    <option value="js-extract">JavaScript → JSON</option>
                  </Select>
                </div>
                <div className="sm:w-44">
                  <label htmlFor="job-range" className="sr-only">
                    Filter by time range
                  </label>
                  <Select id="job-range" value={range} onChange={(event) => setRange(event.target.value)}>
                    <option value="all">Range: All-time</option>
                    <option value="24h">Last 24 hours</option>
                    <option value="7d">Last 7 days</option>
                    <option value="30d">Last 30 days</option>
                  </Select>
                </div>
              </div>
            </div>
            <p className="mt-3 flex items-center gap-1.5 text-[11px] text-text-muted">
              <Filter size={12} aria-hidden="true" />
              Showing {jobs.length} matching jobs
            </p>
          </Card>

          {error ? (
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-error-border bg-error-bg px-4 py-3 text-body-sm text-error-text">
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
                <span className="sr-only">Loading conversion jobs</span>
              </div>
            ) : null}

            <Table caption="Conversion jobs with execution metadata and SLA verdicts">
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Job</TableHead>
                  <TableHead>Owner</TableHead>
                  <TableHead>Transformation</TableHead>
                  <TableHead>Payload</TableHead>
                  <TableHead>Duration / SLA</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Inspect</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visible.map((job) => {
                  const sla = slaVerdict(job, targets);
                  return (
                    <TableRow key={job.id}>
                      <TableCell className="whitespace-nowrap">
                        <p className="font-mono text-xs font-medium text-text-primary">{job.id}</p>
                        <p className="text-[11px] text-text-muted">{formatTimeAgo(job.createdAt)}</p>
                      </TableCell>
                      <TableCell>
                        <p className="max-w-[160px] truncate text-body-sm font-medium text-text-primary">
                          {job.owner.name}
                        </p>
                        <p className="max-w-[160px] truncate text-[11px] text-text-muted">
                          {job.owner.email || job.owner.id}
                        </p>
                      </TableCell>
                      <TableCell>
                        <p className="text-body-sm text-text-primary">{job.directionLabel}</p>
                        <p className="text-[11px] text-text-muted">{modeLabel(job)}</p>
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        <p className="max-w-[160px] truncate text-body-sm text-text-primary" title={job.fileName}>
                          {job.fileName}
                        </p>
                        <p className="text-[11px] tabular-nums text-text-muted">
                          {formatBytes(job.sizeBytes)} · {(job.sourceFormat || '').toUpperCase()} →{' '}
                          {(job.targetFormat || '').toUpperCase()}
                        </p>
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        <p className="text-body-sm tabular-nums text-text-primary">
                          {formatDuration(job.durationMs)}
                        </p>
                        {sla ? (
                          <Badge variant={sla.met ? 'success' : 'warning'} className="mt-0.5">
                            {sla.met ? 'SLA met' : 'SLA missed'} · {sla.targetSeconds}s
                          </Badge>
                        ) : job.status === 'processing' || job.status === 'pending' ? (
                          <p className="text-[11px] tabular-nums text-text-muted">{job.progress}% · {job.stage}</p>
                        ) : (
                          <p className="text-[11px] text-text-muted">No duration</p>
                        )}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={job.status} />
                        {job.status === 'failed' && job.errorCategory ? (
                          <p className="mt-1 text-[11px] text-error-text">{job.errorCategory}</p>
                        ) : null}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="small"
                          variant="outline"
                          onClick={() => setInspectId(job.id)}
                          aria-label={`Inspect job ${job.id}`}
                        >
                          <Eye className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
                          Inspect
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {!loading && visible.length === 0 ? (
                  <TableRow className="hover:bg-transparent">
                    <TableCell colSpan={7} className="py-10 text-center">
                      <p className="text-body-md font-medium text-text-primary">No jobs match these filters</p>
                      <p className="mt-1 text-body-sm text-text-secondary">
                        Conversion jobs appear here the moment a user starts a run.
                      </p>
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </div>

          {jobs.length > 0 ? (
            <div className="mt-4 flex flex-col gap-3 text-body-sm text-text-secondary sm:flex-row sm:items-center sm:justify-between">
              <span>
                Showing {(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, jobs.length)} of{' '}
                {jobs.length} jobs
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
        </TabsContent>
      </Tabs>

      <ConversionInspectorDialog
        open={Boolean(inspectId)}
        onOpenChange={(open) => (!open ? setInspectId(null) : null)}
        jobId={inspectId}
      />
    </div>
  );
}