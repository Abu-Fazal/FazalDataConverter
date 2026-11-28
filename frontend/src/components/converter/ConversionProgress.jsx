import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Ban,
  CheckCircle2,
  Clock,
  Cpu,
  Download,
  FileJson,
  FileWarning,
  Loader2,
  Lock,
  RefreshCw,
  ShieldCheck,
  Table2,
  Timer,
  TriangleAlert,
  Type,
  XCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../ui/button.jsx';
import { Badge, StatusBadge } from '../ui/badge.jsx';
import { Progress } from '../ui/progress.jsx';
import { OutputReview } from './OutputReview.jsx';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../ui/dialog.jsx';
import { cancelJob, fetchJobOutput, getJob, saveBlob } from '../../services/converter.api.js';

const MAX_BYTES = 50 * 1024 * 1024;

const PIPELINE = [
  {
    id: 1,
    threshold: 20,
    title: 'Input Validation & Structure Check',
    detail: 'Validated MIME signature, schema headers and byte sequence integrity.',
  },
  {
    id: 2,
    threshold: 45,
    title: 'Worksheet Parsing & Cell Type Extraction',
    detail: 'Extracted worksheets and raw cell values with strict type mapping.',
  },
  {
    id: 3,
    threshold: 75,
    title: 'Formula Metadata & Cached Result Mapping',
    detail: 'Recorded formula tokens and cached result state (TRD §7.4).',
  },
  {
    id: 4,
    threshold: 94,
    title: '100% Output Verification Engine',
    detail: 'Verifying schema conformity and numeric precision on converted elements.',
  },
  {
    id: 5,
    threshold: 100,
    title: 'Output Serialization & Integrity Verification',
    detail: 'Checksum generation (SHA-256) and structure finalization.',
  },
];

function formatSize(bytes) {
  if (bytes == null) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function formatElapsed(ms) {
  if (!Number.isFinite(ms) || ms < 0) return '00:00.0';
  const totalSeconds = ms / 1000;
  const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
  const seconds = (totalSeconds % 60).toFixed(1).padStart(4, '0');
  return `${minutes}:${seconds}`;
}

function formatEta(seconds) {
  if (!Number.isFinite(seconds) || seconds <= 0) return '—';
  if (seconds < 60) return `~${Math.ceil(seconds)}s`;
  return `~${Math.ceil(seconds / 60)}m`;
}

function StatCard({ icon: Icon, label, value, detail, tone = 'neutral', children }) {
  const tones = {
    neutral: 'bg-surface-secondary text-text-secondary',
    success: 'bg-success-bg text-success-text',
    warning: 'bg-warning-bg text-warning-text',
    error: 'bg-error-bg text-error-text',
    brand: 'bg-brand-primary-soft text-brand-primary',
  };

  return (
    <div className="rounded-lg border border-border-subtle bg-surface-primary p-4">
      <div className="flex items-center gap-2">
        <span className={`flex h-7 w-7 items-center justify-center rounded-md ${tones[tone]}`}>
          <Icon className="h-3.5 w-3.5" aria-hidden="true" />
        </span>
        <p className="text-label-md uppercase tracking-wide text-text-muted">{label}</p>
      </div>
      <p className="mt-2 text-headline-sm text-text-primary">{value}</p>
      {detail && <p className="text-body-sm text-text-muted">{detail}</p>}
      {children}
    </div>
  );
}

export function ConversionProgress() {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const stageTimesRef = useRef({});
  const [job, setJob] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    let active = true;
    let timer = null;
    let failures = 0;

    async function poll() {
      try {
        const data = await getJob(jobId);
        if (!active) return;
        failures = 0;
        setJob(data.job);
        setLoadError(null);

        if (!['completed', 'failed', 'cancelled'].includes(data.job.status)) {
          timer = window.setTimeout(poll, 1200);
        }
      } catch (error) {
        if (!active) return;
        failures += 1;
        if (failures >= 3) {
          setLoadError(error.message || 'Unable to load job status.');
          return;
        }
        timer = window.setTimeout(poll, 2000);
      }
    }

    poll();

    return () => {
      active = false;
      if (timer) window.clearTimeout(timer);
    };
  }, [jobId]);

  useEffect(() => {
    if (!job) return undefined;
    const startedAt = new Date(job.createdAt).getTime();
    const terminalAt = ['completed', 'failed', 'cancelled'].includes(job.status)
      ? new Date(job.updatedAt).getTime()
      : Date.now();

    const update = () => {
      const end = ['completed', 'failed', 'cancelled'].includes(job.status)
        ? terminalAt
        : Date.now();
      setElapsedMs(Math.max(0, end - startedAt));
    };

    update();
    if (['completed', 'failed', 'cancelled'].includes(job.status)) return undefined;
    const interval = window.setInterval(update, 250);
    return () => window.clearInterval(interval);
  }, [job]);

  useEffect(() => {
    if (!job) return;
    const startedAt = new Date(job.createdAt).getTime();
    const seconds = Math.max(0, (Date.now() - startedAt) / 1000);
    for (const stage of PIPELINE) {
      if (job.progress >= stage.threshold && stageTimesRef.current[stage.id] == null) {
        stageTimesRef.current[stage.id] = seconds;
      }
    }
  }, [job]);

  const status = job?.status || 'pending';
  const isTerminal = ['completed', 'failed', 'cancelled'].includes(status);
  const progress = job?.progress ?? 0;
  const result = job?.result || null;
  const fileSize = job?.file?.sizeBytes || 0;
  const counts = result?.counts || { fatal: 0, recoverable: 0, warnings: 0, totalElements: 0 };
  const elements = counts.totalElements ?? result?.rowCount ?? 0;
  const etaSeconds = progress > 0 && !isTerminal
    ? (elapsedMs / 1000) * ((100 - progress) / progress)
    : null;
  const velocity = elapsedMs > 0 && elements > 0
    ? Math.round(elements / (elapsedMs / 1000))
    : null;

  const completedStages = useMemo(
    () => PIPELINE.filter((stage) => progress >= stage.threshold).length,
    [progress],
  );

  async function confirmCancel() {
    setCancelling(true);
    try {
      await cancelJob(jobId);
      setCancelOpen(false);
      setJob((current) => current ? { ...current, status: 'cancelled', stage: 'Cancelled by user' } : current);
      toast.success('Conversion cancelled and temporary buffers purged.');
    } catch (error) {
      toast.error(error.message || 'The job could not be cancelled.');
    } finally {
      setCancelling(false);
    }
  }

  async function downloadOutput() {
    setDownloading(true);
    try {
      const { blob, filename } = await fetchJobOutput(jobId);
      saveBlob(blob, filename || result?.filename || 'converted-output');
      toast.success('Download started.');
    } catch (error) {
      toast.error(error.message || 'The converted output could not be downloaded.');
    } finally {
      setDownloading(false);
    }
  }

  if (loadError) {
    return (
      <div className="flex min-h-[420px] flex-col items-center justify-center space-y-4 text-center">
        <AlertCircle className="h-10 w-10 text-error-text" aria-hidden="true" />
        <h1 className="text-headline-sm text-text-primary">Unable to load this job</h1>
        <p className="max-w-md text-body-md text-text-secondary">{loadError}</p>
        <Button variant="outline" size="medium" onClick={() => navigate('/converter')}>
          <ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true" />
          Back to Converter
        </Button>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="flex min-h-[420px] flex-col items-center justify-center space-y-4 text-center">
        <Loader2 className="h-9 w-9 animate-spin text-brand-primary" aria-hidden="true" />
        <h1 className="text-headline-sm text-text-primary">Loading job status</h1>
        <p className="text-body-md text-text-secondary">Fetching the latest conversion progress.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={isTerminal ? 'neutral' : 'processing'} dot pulse={!isTerminal}>
              {isTerminal ? 'Pipeline finished' : 'Active Pipeline'} • §10.2
            </Badge>
            <StatusBadge status={status} />
          </div>
          <h1 className="mt-2 text-display-lg-mobile text-text-primary lg:text-headline-lg">
            {status === 'completed'
              ? 'Conversion Complete'
              : status === 'failed'
                ? 'Conversion Failed'
                : status === 'cancelled'
                  ? 'Conversion Cancelled'
                  : 'Conversion in Progress'}
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-body-md text-text-secondary">
            <FileJson className="h-4 w-4 text-text-muted" aria-hidden="true" />
            <span className="font-medium text-text-primary">{job.file?.name || 'Workbook'}</span>
            <span>({formatSize(fileSize)})</span>
            <ArrowRight className="h-3.5 w-3.5 text-text-muted" aria-hidden="true" />
            <span className="uppercase">{result?.targetFormat || job.file?.targetFormat || 'output'}</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-body-sm text-text-secondary">
          <span className="inline-flex items-center gap-1.5">
            <ShieldCheck className="h-4 w-4 text-success-dot" aria-hidden="true" />
            PRD SLA Target: ≤ 60s for files ≤ 50 MB
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Timer className="h-4 w-4 text-text-muted" aria-hidden="true" />
            Elapsed: <span className="font-mono font-medium text-text-primary">{formatElapsed(elapsedMs)}</span>
          </span>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <section className="rounded-xl border border-border-subtle bg-surface-primary p-5 shadow-card sm:p-6">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-label-md uppercase tracking-wide text-text-muted">
                  Overall Transformation Status
                </p>
                <p className="mt-1 text-headline-sm text-text-primary">
                  {job.stage || 'Initiating'}
                </p>
              </div>
              <div className="text-right">
                <p className="text-display-lg-mobile leading-none text-brand-primary">{progress}%</p>
                <p className="text-label-md text-text-muted">{isTerminal ? 'Finished' : 'complete'}</p>
              </div>
            </div>

            <Progress
              value={progress}
              className="mt-4 h-3 bg-border-subtle"
              aria-label="Overall conversion progress"
            />

            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-body-sm text-text-secondary">
              <span className="inline-flex items-center gap-1.5">
                {isTerminal ? (
                  <CheckCircle2 className="h-4 w-4 text-success-dot" aria-hidden="true" />
                ) : (
                  <Loader2 className="h-4 w-4 animate-spin text-brand-primary" aria-hidden="true" />
                )}
                {isTerminal ? 'Processing finished' : 'Streaming buffer ingestion'}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Clock className="h-4 w-4 text-text-muted" aria-hidden="true" />
                {isTerminal ? `Duration: ${formatElapsed(elapsedMs)}` : `Est. remaining: ${formatEta(etaSeconds)}`}
              </span>
            </div>
          </section>

          <section className="rounded-xl border border-border-subtle bg-surface-primary p-5 shadow-card sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-label-md uppercase tracking-wide text-text-muted">Verification Pipeline</p>
                <h2 className="text-headline-sm text-text-primary">Zero Data Loss Protocol (TRD §7.15)</h2>
              </div>
              <Badge variant="neutral">{completedStages} of {PIPELINE.length} stages</Badge>
            </div>

            <ol className="mt-4 space-y-3">
              {PIPELINE.map((stage) => {
                const complete = progress >= stage.threshold;
                const active = !complete && (stage.id === 1 || progress >= PIPELINE[stage.id - 2].threshold);
                const time = stageTimesRef.current[stage.id];

                return (
                  <li
                    key={stage.id}
                    className={`flex gap-3 rounded-lg border p-3 ${
                      active
                        ? 'border-brand-primary-border bg-brand-primary-soft'
                        : 'border-border-subtle bg-surface-primary'
                    }`}
                  >
                    <span
                      className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
                        complete
                          ? 'bg-success-bg text-success-text'
                          : active
                            ? 'bg-brand-primary text-text-inverse'
                            : 'bg-surface-secondary text-text-muted'
                      }`}
                    >
                      {complete ? (
                        <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                      ) : active ? (
                        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                      ) : (
                        <span className="text-label-md">{stage.id}</span>
                      )}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className={`text-label-lg ${complete || active ? 'text-text-primary' : 'text-text-secondary'}`}>
                          {stage.title}
                        </p>
                        <span className="ml-auto text-label-sm uppercase tracking-wide text-text-muted">
                          {complete
                            ? `Completed${time != null ? `, ${time.toFixed(1)}s` : ''}`
                            : active
                              ? `In progress, ${progress}%`
                              : 'Pending'}
                        </span>
                      </div>
                      <p className="text-body-sm text-text-muted">{stage.detail}</p>
                    </div>
                  </li>
                );
              })}
            </ol>
          </section>

          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              icon={Cpu}
              label="Payload"
              value={formatSize(fileSize)}
              detail={`of ${formatSize(MAX_BYTES)} limit`}
              tone="brand"
            >
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-border-subtle">
                <div
                  className="h-full rounded-full bg-brand-primary"
                  style={{ width: `${Math.min(100, (fileSize / MAX_BYTES) * 100)}%` }}
                />
              </div>
            </StatCard>
            <StatCard
              icon={Table2}
              label="Elements"
              value={elements ? elements.toLocaleString() : 'Pending'}
              detail={result?.rowCount != null ? `${result.rowCount.toLocaleString()} output rows` : 'Queued for parsing'}
            />
            <StatCard
              icon={counts.fatal > 0 ? TriangleAlert : ShieldCheck}
              label="Diagnostics"
              value={counts.fatal > 0 ? 'Fatal error' : counts.recoverable + counts.warnings > 0
                ? `${counts.recoverable + counts.warnings} flagged`
                : 'Clean parse state'}
              detail={counts.recoverable > 0 || counts.warnings > 0
                ? `${counts.recoverable} recoverable • ${counts.warnings} warnings`
                : 'No blocking issues detected'}
              tone={counts.fatal > 0 ? 'error' : counts.recoverable + counts.warnings > 0 ? 'warning' : 'success'}
            />
            <StatCard
              icon={RefreshCw}
              label="Stream Velocity"
              value={velocity ? `${velocity.toLocaleString()} / sec` : '—'}
              detail={result?.durationMs ? `${result.durationMs} ms engine time` : 'Measuring live throughput'}
            />
          </section>

          {result?.verification && (
            <div className="flex flex-col gap-2 rounded-xl border border-success-border bg-success-bg p-4 sm:flex-row sm:items-center">
              <CheckCircle2 className="h-5 w-5 shrink-0 text-success-text" aria-hidden="true" />
              <p className="flex-1 text-body-sm text-success-text">
                Output verification passed with {result.verification.coveragePct}% coverage across{' '}
                {result.verification.checks?.length || 0} checks. Integrity score:{' '}
                <span className="font-semibold">{result.integrityScore ?? 100}%</span>.
              </p>
              {(counts.recoverable > 0 || counts.warnings > 0 || counts.fatal > 0) && (
                <Button variant="outline" size="small" onClick={() => navigate(`/converter/error/${jobId}`)}>
                  <FileWarning className="mr-2 h-4 w-4" aria-hidden="true" />
                  Review validation report
                </Button>
              )}
            </div>
          )}

          {status === 'failed' && (
            <section className="rounded-xl border border-error-border bg-error-bg p-5">
              <div className="flex items-start gap-3">
                <XCircle className="mt-0.5 h-6 w-6 shrink-0 text-error-text" aria-hidden="true" />
                <div className="flex-1">
                  <h2 className="text-headline-sm text-error-text">Conversion failed</h2>
                  <p className="mt-1 text-body-sm text-error-text">
                    {job.error || 'The conversion could not be completed.'}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button size="small" variant="outline" onClick={() => navigate(`/converter/error/${jobId}`)}>
                      <FileWarning className="mr-2 h-4 w-4" aria-hidden="true" />
                      Open Error Report
                    </Button>
                    <Button size="small" onClick={() => navigate('/converter')}>
                      <ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true" />
                      Start New Conversion
                    </Button>
                  </div>
                </div>
              </div>
            </section>
          )}

          {status === 'cancelled' && (
            <section className="rounded-xl border border-border-subtle bg-surface-secondary p-5">
              <div className="flex items-start gap-3">
                <Ban className="mt-0.5 h-6 w-6 shrink-0 text-text-muted" aria-hidden="true" />
                <div>
                  <h2 className="text-headline-sm text-text-primary">Conversion cancelled</h2>
                  <p className="mt-1 text-body-sm text-text-secondary">
                    Temporary processing buffers were purged. Start a new conversion whenever you are ready.
                  </p>
                  <Button className="mt-3" size="small" onClick={() => navigate('/converter')}>
                    Back to Converter
                  </Button>
                </div>
              </div>
            </section>
          )}
        </div>

        <aside className="space-y-4">
          <div className="rounded-xl border border-border-subtle bg-surface-primary p-4 shadow-card">
            <div className="flex items-center gap-2">
              <Lock className="h-4 w-4 text-success-dot" aria-hidden="true" />
              <h2 className="text-label-lg text-text-primary">Zero Data Retention</h2>
            </div>
            <p className="mt-2 text-body-sm text-text-secondary">
              No payload packets persist on server disks; volatile memory isolation is guaranteed.
              Temporary files are purged after success, failure or cancellation.
            </p>
          </div>

          <div className="rounded-xl border border-border-subtle bg-surface-primary p-4 shadow-card">
            <div className="flex items-center gap-2">
              <Type className="h-4 w-4 text-brand-primary" aria-hidden="true" />
              <h2 className="text-label-lg text-text-primary">Type Inference</h2>
            </div>
            <p className="mt-2 text-body-sm text-text-secondary">
              Strict typed coercion for IEEE-754 numbers, ISO 8601 timestamps, booleans and nulls.
            </p>
          </div>

          <div className="rounded-xl border border-border-subtle bg-surface-primary p-4 shadow-card">
            <div className="flex items-center gap-2">
              <Cpu className="h-4 w-4 text-brand-secondary" aria-hidden="true" />
              <h2 className="text-label-lg text-text-primary">Deterministic Engine</h2>
            </div>
            <p className="mt-2 text-body-sm text-text-secondary">
              Streaming XLSX parsing with deterministic cell extraction, formula metadata and cached
              result mapping.
            </p>
          </div>

          {!isTerminal && (
            <Button
              variant="outline"
              className="w-full border-error-border text-error-text hover:bg-error-bg"
              onClick={() => setCancelOpen(true)}
            >
              <Ban className="mr-2 h-4 w-4" aria-hidden="true" />
              Cancel Processing
            </Button>
          )}
        </aside>
      </div>

      {status === 'completed' && result && (
        <OutputReview
          subtitle={`${result.sheets?.length || result.sheetCount || 0} sheets • ${result.rowCount ?? '—'} rows • ${result.durationMs} ms`}
          preview={result.preview}
          filename={result.filename}
          onDownload={downloadOutput}
          downloading={downloading}
          verified={result.verification?.verified !== false}
          meta={[
            { label: 'Integrity', value: `${result.integrityScore ?? 100}%` },
            { label: 'Coverage', value: `${result.verification?.coveragePct ?? 100}%` },
            { label: 'Format', value: result.targetFormat?.toUpperCase() },
          ]}
        />
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button variant="ghost" size="small" onClick={() => navigate('/converter')}>
          <ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true" />
          Back to Converter
        </Button>
        {status === 'completed' && (
          <span className="inline-flex items-center gap-1.5 text-body-sm text-text-muted">
            <Download className="h-4 w-4" aria-hidden="true" />
            Guest outputs are purged from server storage after download.
          </span>
        )}
      </div>

      <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="mb-1 flex h-10 w-10 items-center justify-center rounded-lg bg-warning-bg text-warning-text">
              <TriangleAlert className="h-5 w-5" aria-hidden="true" />
            </div>
            <DialogTitle>Cancel Processing?</DialogTitle>
            <DialogDescription>
              Immediate buffer purge action for <span className="font-medium text-text-primary">{job.file?.name}</span>.
              Partial output will not be available.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" size="medium" onClick={() => setCancelOpen(false)} disabled={cancelling}>
              Keep Processing
            </Button>
            <Button variant="danger" size="medium" onClick={confirmCancel} disabled={cancelling}>
              {cancelling ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <Ban className="mr-2 h-4 w-4" aria-hidden="true" />
              )}
              {cancelling ? 'Cancelling…' : 'Cancel Processing'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}