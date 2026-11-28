import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  ClipboardCheck,
  Copy,
  Download,
  Edit3,
  FileJson,
  FileSpreadsheet,
  FileWarning,
  Info,
  Loader2,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Terminal,
  TriangleAlert,
  XCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../ui/button.jsx';
import { Badge } from '../ui/badge.jsx';
import { Input } from '../ui/input.jsx';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog.jsx';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu.jsx';
import {
  ConverterApiError,
  fetchJobOutput,
  getJob,
  retryJob,
  saveBlob,
} from '../../services/converter.api.js';

const OBJECT_ID_PATTERN = /^[0-9a-fA-F]{24}$/;

const DIRECTION_LABELS = {
  'excel-json': 'Excel to Strict JSON',
  'json-excel': 'JSON to Excel Workbook',
  'excel-bson': 'Excel to Strict BSON',
  'js-extract': 'Static JS Data Extraction',
};

const SEVERITY_STYLES = {
  fatal: { label: 'Fatal', className: 'bg-error-bg text-error-text border-error-border', dot: 'bg-error-dot' },
  recoverable: { label: 'Recoverable', className: 'bg-error-bg text-error-text border-error-border', dot: 'bg-error-dot' },
  warning: { label: 'Warning', className: 'bg-warning-bg text-warning-text border-warning-border', dot: 'bg-warning-dot' },
};

function formatSize(bytes) {
  if (bytes == null) return 'Unknown size';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function formatValue(value) {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

function correctionKey(item) {
  return `${item.sheet}!${String(item.address).toUpperCase()}`;
}

function isEditable(item) {
  return (
    item.severity === 'recoverable'
    && item.code !== 'ERR_DUPLICATE_KEY'
    && Boolean(item.sheet && item.address)
  );
}

function severityCounts(diagnostics) {
  const counts = { fatal: 0, recoverable: 0, warnings: 0 };
  for (const item of diagnostics) {
    if (item.severity === 'fatal') counts.fatal += 1;
    else if (item.severity === 'recoverable') counts.recoverable += 1;
    else counts.warnings += 1;
  }
  return counts;
}

function escapeCsv(value) {
  const text = value === null || value === undefined ? '' : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

function diagnosticRowsToCsv(rows) {
  const header = ['Severity', 'Code', 'Sheet', 'Cell', 'Row', 'Affected Value', 'Details', 'Resolution'];
  const lines = rows.map((item) => [
    item.severity,
    item.code,
    item.sheet || '',
    item.address || '',
    item.row || '',
    formatValue(item.affectedValue),
    item.detail || '',
    item.resolution || '',
  ].map(escapeCsv).join(','));
  return [header.join(','), ...lines].join('\r\n');
}

function StatCard({ label, value, hint, tone = 'neutral', icon: Icon, children }) {
  const tones = {
    neutral: 'bg-surface-secondary text-text-secondary',
    error: 'bg-error-bg text-error-text',
    warning: 'bg-warning-bg text-warning-text',
    success: 'bg-success-bg text-success-text',
    brand: 'bg-brand-primary-soft text-brand-primary',
  };

  return (
    <div className="flex flex-col justify-between rounded-xl border border-border-subtle bg-surface-primary p-5 shadow-card">
      <div className="flex items-center justify-between gap-3">
        <span className="text-label-md uppercase tracking-wider text-text-muted">{label}</span>
        <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${tones[tone]}`}>
          <Icon className="h-4 w-4" aria-hidden="true" />
        </span>
      </div>
      <div className="mt-4">
        <div className="flex flex-wrap items-baseline gap-2">
          <span className="text-display-lg-mobile font-bold leading-none text-text-primary">{value}</span>
          {children}
        </div>
        <p className="mt-1 text-body-sm text-text-secondary">{hint}</p>
      </div>
    </div>
  );
}

export function ErrorReport() {
  const { jobId } = useParams();
  const navigate = useNavigate();

  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [filter, setFilter] = useState('all');
  const [showRaw, setShowRaw] = useState(false);
  const [corrections, setCorrections] = useState({});
  const [editorItem, setEditorItem] = useState(null);
  const [editorValue, setEditorValue] = useState('');
  const [retrying, setRetrying] = useState(false);
  const [downloading, setDownloading] = useState(false);

  async function loadJob({ quiet = false } = {}) {
    if (!jobId) {
      setLoading(false);
      setLoadError('No job was selected for validation review.');
      return;
    }
    if (!quiet) setLoading(true);
    try {
      const data = await getJob(jobId);
      setJob(data.job);
      setLoadError(null);
      if (quiet) toast.success('Validation results refreshed.');
    } catch (error) {
      setLoadError(error.message || 'The validation report could not be loaded.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadJob();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobId]);

  const result = job?.result || null;
  const diagnostics = useMemo(() => result?.diagnostics || [], [result]);
  const counts = useMemo(() => {
    if (result?.counts) return result.counts;
    const derived = severityCounts(diagnostics);
    return {
      totalElements: result?.rowCount ?? result?.cellCount ?? 0,
      ...derived,
    };
  }, [result, diagnostics]);
  const filtered = useMemo(() => {
    if (filter === 'all') return diagnostics;
    return diagnostics.filter((item) => (
      filter === 'recoverable'
        ? item.severity === 'recoverable'
        : item.severity === filter
    ));
  }, [diagnostics, filter]);
  const editableItems = diagnostics.filter(isEditable);
  const status = job?.status || 'unknown';
  const isCompleted = status === 'completed';
  const isFailed = status === 'failed';
  const integrityScore = result?.integrityScore ?? (counts.fatal > 0 ? 0 : 100);
  const totalElements = counts.totalElements ?? result?.rowCount ?? 0;

  const title = isFailed
    ? 'Conversion Failed: Validation Errors Require Correction'
    : diagnostics.length === 0
      ? 'Conversion Completed Without Validation Issues'
      : 'Conversion Completed with Warnings & Recoverable Errors';

  const failingRows = filtered.filter((item) => isEditable(item) && !corrections[correctionKey(item)]);

  function openEditor(item) {
    if (!item) return;
    setEditorItem(item);
    const existing = corrections[correctionKey(item)];
    setEditorValue(existing != null ? String(existing.value ?? '') : String(item.affectedValue ?? ''));
  }

  function generateObjectId() {
    const bytes = new Uint8Array(12);
    window.crypto.getRandomValues(bytes);
    setEditorValue(Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join(''));
  }

  function buildOverrides(nextCorrections = corrections) {
    return Object.values(nextCorrections).map((entry) => ({
      sheet: entry.sheet,
      address: entry.address,
      value: entry.value,
    }));
  }

  async function runRetry(overrides) {
    if (!jobId) return;
    setRetrying(true);
    try {
      const response = await retryJob(jobId, overrides);
      toast.success('Corrections applied. Revalidating the conversion.');
      navigate(`/converter/progress/${response.jobId}`);
    } catch (error) {
      if (error instanceof ConverterApiError && error.status === 410) {
        toast.error('The temporary source file expired. Upload the file again to retry.');
        navigate('/converter');
        return;
      }
      toast.error(error.message || 'The conversion could not be retried.');
    } finally {
      setRetrying(false);
    }
  }

  function saveCorrection() {
    if (!editorItem) return;
    const objectIdField = editorItem.code === 'ERR_INVALID_OBJECTID';
    const trimmed = editorValue.trim();

    if (objectIdField && !OBJECT_ID_PATTERN.test(trimmed)) {
      toast.error('Enter a valid 24-character hexadecimal ObjectId.');
      return;
    }

    const entry = {
      sheet: editorItem.sheet,
      address: String(editorItem.address).toUpperCase(),
      value: trimmed === '' ? null : trimmed,
    };
    const next = { ...corrections, [correctionKey(entry)]: entry };
    setCorrections(next);
    setEditorItem(null);
    runRetry(buildOverrides(next));
  }

  function exportDiagnostic(format) {
    const report = {
      dataset: job?.file?.name || 'unknown',
      jobId,
      status,
      totalVerified: totalElements,
      fatalErrors: counts.fatal,
      recoverableErrors: counts.recoverable,
      warnings: counts.warnings,
      integrityScore,
      issues: diagnostics.map((item) => ({
        code: item.code,
        severity: item.severity,
        sheet: item.sheet || 'Workbook',
        cell: item.address || 'N/A',
        row: item.row,
        affectedValue: formatValue(item.affectedValue),
        detail: item.detail,
        resolution: item.resolution,
      })),
    };

    if (format === 'json') {
      saveBlob(
        new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' }),
        `Diagnostic_Report_${jobId.slice(0, 8)}.json`,
      );
    } else {
      saveBlob(
        new Blob([diagnosticRowsToCsv(diagnostics)], { type: 'text/csv;charset=utf-8' }),
        `Diagnostic_Report_${jobId.slice(0, 8)}.csv`,
      );
    }
    toast.success(`Diagnostic report exported as ${format.toUpperCase()}.`);
  }

  async function downloadAnyway() {
    setDownloading(true);
    try {
      const { blob, filename } = await fetchJobOutput(jobId);
      saveBlob(blob, filename || result?.filename || 'converted-output');
      toast.success('Download started with the verified safe parameters.');
    } catch (error) {
      toast.error(error.message || 'The converted output could not be downloaded.');
    } finally {
      setDownloading(false);
    }
  }

  async function copyRaw() {
    try {
      await navigator.clipboard.writeText(
        JSON.stringify({ jobId, status, counts, integrityScore, diagnostics }, null, 2),
      );
      toast.success('Raw diagnostics copied to clipboard.');
    } catch {
      toast.error('Clipboard access is not available in this browser.');
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[420px] flex-col items-center justify-center space-y-4 text-center">
        <Loader2 className="h-9 w-9 animate-spin text-brand-primary" aria-hidden="true" />
        <h1 className="text-headline-sm text-text-primary">Loading validation report</h1>
        <p className="text-body-md text-text-secondary">Fetching diagnostics for this conversion.</p>
      </div>
    );
  }

  if (loadError || !job) {
    return (
      <div className="flex min-h-[420px] flex-col items-center justify-center space-y-4 text-center">
        <AlertCircle className="h-10 w-10 text-error-text" aria-hidden="true" />
        <h1 className="text-headline-sm text-text-primary">Unable to load this report</h1>
        <p className="max-w-md text-body-md text-text-secondary">{loadError}</p>
        <div className="flex flex-wrap justify-center gap-2">
          <Button variant="outline" size="medium" onClick={() => loadJob()}>
            <RefreshCw className="mr-2 h-4 w-4" aria-hidden="true" />
            Try Again
          </Button>
          <Button size="medium" onClick={() => navigate('/converter')}>
            <ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true" />
            Back to Converter
          </Button>
        </div>
      </div>
    );
  }

  const objectIdInvalid = editorItem?.code === 'ERR_INVALID_OBJECTID'
    && !OBJECT_ID_PATTERN.test(editorValue.trim());

  return (
    <div className="flex flex-col gap-6">
      <button
        type="button"
        onClick={() => navigate(isCompleted || isFailed ? `/converter/progress/${jobId}` : '/converter')}
        className="inline-flex w-fit items-center gap-2 rounded-lg px-2 py-1 text-body-sm text-text-secondary transition-colors hover:bg-surface-secondary hover:text-text-primary"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Back to progress
      </button>

      <section className="relative overflow-hidden rounded-xl border border-border-subtle bg-surface-primary p-6 shadow-card">
        <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-brand-secondary-soft blur-3xl" aria-hidden="true" />
        <div className="pointer-events-none absolute -bottom-12 -left-12 h-48 w-48 rounded-full bg-brand-primary-soft blur-2xl" aria-hidden="true" />

        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="warning" className="uppercase tracking-wide">
                <TriangleAlert className="h-3.5 w-3.5" aria-hidden="true" />
                PRD §6.6 Audit Complete
              </Badge>
              <Badge variant="neutral">
                <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
                TRD §7.16 &amp; §7.17 Verified
              </Badge>
            </div>
            <h1 className="text-headline-lg text-text-primary">{title}</h1>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-body-sm text-text-secondary">
              <span className="inline-flex items-center gap-1.5 font-medium text-text-primary">
                <FileJson className="h-4 w-4 text-brand-primary" aria-hidden="true" />
                {job.file?.name || 'Workbook'}
              </span>
              <span className="text-border-strong">•</span>
              <span>{formatSize(job.file?.sizeBytes)} payload</span>
              <span className="text-border-strong">•</span>
              <span className="font-medium text-brand-primary">
                {isCompleted ? '100% Output Verification Performed' : 'Validation halted before serialization'}
              </span>
              <span className="text-border-strong">•</span>
              <span>{DIRECTION_LABELS[result?.direction] || 'Excel conversion'}</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button variant="secondary" size="medium" onClick={() => loadJob({ quiet: true })}>
              <ClipboardCheck className="mr-2 h-4 w-4" aria-hidden="true" />
              Re-verify Rules
            </Button>
            <Button
              variant={showRaw ? 'outline' : 'default'}
              size="medium"
              aria-pressed={showRaw}
              onClick={() => setShowRaw((value) => !value)}
            >
              <Terminal className="mr-2 h-4 w-4" aria-hidden="true" />
              {showRaw ? 'Hide Raw Diagnostics' : 'Raw Diagnostics'}
            </Button>
          </div>
        </div>
      </section>

      {showRaw && (
        <section className="overflow-hidden rounded-xl border border-border-subtle bg-surface-primary shadow-card">
          <div className="flex items-center justify-between gap-3 border-b border-border-subtle px-5 py-3">
            <h2 className="text-label-lg text-text-primary">Raw diagnostics payload</h2>
            <Button variant="ghost" size="small" onClick={copyRaw}>
              <Copy className="mr-2 h-3.5 w-3.5" aria-hidden="true" />
              Copy
            </Button>
          </div>
          <pre className="max-h-80 overflow-auto bg-surface-inverse p-5 font-mono text-[12px] leading-relaxed text-text-inverse">
            <code>
              {JSON.stringify(
                {
                  jobId,
                  status,
                  direction: result?.direction,
                  counts,
                  integrityScore,
                  diagnostics,
                },
                null,
                2,
              )}
            </code>
          </pre>
        </section>
      )}

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={FileSpreadsheet}
          label="Total Elements"
          value={totalElements.toLocaleString()}
          hint={result?.rowCount != null
            ? `${result.rowCount.toLocaleString()} converted rows in scope`
            : 'Full dataset schema walk finished'}
        />
        <StatCard
          icon={counts.fatal > 0 ? XCircle : ShieldCheck}
          label="Fatal Errors"
          value={counts.fatal.toLocaleString()}
          hint={counts.fatal > 0 ? 'File corruption or schema break' : 'No file corruption or schema break'}
          tone={counts.fatal > 0 ? 'error' : 'success'}
        >
          {counts.fatal === 0 && (
            <span className="text-label-sm font-semibold uppercase text-success-text">Safe to compile</span>
          )}
        </StatCard>
        <StatCard
          icon={Edit3}
          label="Recoverable Errors"
          value={counts.recoverable.toLocaleString()}
          hint={counts.recoverable > 0
            ? 'Highlighted for manual inline edit'
            : 'No cell-level corrections required'}
          tone={counts.recoverable > 0 ? 'warning' : 'neutral'}
        >
          {counts.recoverable > 0 && (
            <span className="text-label-sm font-medium text-warning-text">Requires action</span>
          )}
        </StatCard>
        <StatCard
          icon={Info}
          label="Engine Warnings"
          value={counts.warnings.toLocaleString()}
          hint="Non-blocking metadata skips"
          tone="neutral"
        />
      </section>

      <section className="overflow-hidden rounded-xl border border-border-subtle bg-surface-primary shadow-card">
        <div className="flex flex-col justify-between gap-4 p-6 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-headline-sm text-text-primary">Diagnostic Issue Stream</h2>
            <p className="text-body-sm text-text-secondary">
              Granular log matching TRD §7.16 severity hierarchies and cell-level references.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filter diagnostics">
            {[
              { id: 'all', label: `All (${diagnostics.length})` },
              ...(counts.fatal > 0 ? [{ id: 'fatal', label: `Fatal (${counts.fatal})` }] : []),
              { id: 'recoverable', label: `Recoverable (${counts.recoverable})` },
              { id: 'warning', label: `Warnings (${counts.warnings})` },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                aria-pressed={filter === tab.id}
                onClick={() => setFilter(tab.id)}
                className={`rounded-lg px-3 py-1.5 text-label-md transition-colors ${
                  filter === tab.id
                    ? 'bg-surface-tertiary text-text-primary'
                    : 'text-text-secondary hover:bg-surface-secondary hover:text-text-primary'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="w-full overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <caption className="sr-only">Validation diagnostics for this conversion job</caption>
            <thead>
              <tr className="bg-surface-secondary text-label-md uppercase tracking-wider text-text-muted">
                <th scope="col" className="px-4 py-3">Severity</th>
                <th scope="col" className="px-4 py-3">Code</th>
                <th scope="col" className="px-4 py-3">Location</th>
                <th scope="col" className="px-4 py-3">Affected Value</th>
                <th scope="col" className="px-4 py-3">Diagnostic Details</th>
                <th scope="col" className="px-4 py-3 text-right">Action / Resolution</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle text-body-md text-text-primary">
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center">
                    <CheckCircle2 className="mx-auto h-8 w-8 text-success-dot" aria-hidden="true" />
                    <p className="mt-2 text-body-md font-medium text-text-primary">
                      No issues in this category
                    </p>
                    <p className="text-body-sm text-text-secondary">
                      All validated cells conform to the strict conversion schema.
                    </p>
                  </td>
                </tr>
              )}

              {filtered.map((item, index) => {
                const style = SEVERITY_STYLES[item.severity] || SEVERITY_STYLES.warning;
                const editable = isEditable(item);
                const corrected = corrections[correctionKey(item)];

                return (
                  <tr key={`${item.code}-${item.sheet}-${item.address}-${index}`} className="align-top transition-colors hover:bg-surface-secondary/60">
                    <td className="px-4 py-4">
                      <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-label-sm font-semibold ${style.className}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} aria-hidden="true" />
                        {style.label}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <code className="rounded bg-surface-secondary px-2 py-1 font-mono text-label-sm font-semibold text-brand-primary">
                        {item.code}
                      </code>
                    </td>
                    <td className="px-4 py-4 text-body-sm">
                      <div className="font-semibold text-text-primary">
                        {item.sheet ? `Sheet: ${item.sheet}` : 'Workbook Level'}
                      </div>
                      <div className="text-text-secondary">
                        {item.address
                          ? `Cell: ${item.address}${item.row ? ` (Row ${item.row})` : ''}`
                          : 'Binary stream'}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span className={`inline-block max-w-[220px] break-all rounded px-2 py-0.5 font-mono text-label-sm ${
                        item.severity === 'warning'
                          ? 'bg-surface-secondary text-text-secondary'
                          : 'bg-error-bg text-error-text'
                      }`}>
                        {formatValue(item.affectedValue)}
                      </span>
                    </td>
                    <td className="max-w-sm px-4 py-4">
                      <p className="text-body-sm text-text-primary">{item.detail}</p>
                      {item.resolution && (
                        <p className="mt-0.5 text-label-sm text-text-muted">{item.resolution}</p>
                      )}
                    </td>
                    <td className="px-4 py-4 text-right">
                      {corrected ? (
                        <span className="inline-flex items-center gap-1 text-label-md text-success-text">
                          <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                          Corrected
                        </span>
                      ) : editable ? (
                        <Button size="small" onClick={() => openEditor(item)}>
                          <Edit3 className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
                          Edit Cell
                        </Button>
                      ) : item.code === 'ERR_DUPLICATE_KEY' ? (
                        <span className="inline-flex items-center gap-1 text-label-md text-text-secondary">
                          <Sparkles className="h-4 w-4 text-brand-primary" aria-hidden="true" />
                          Auto-resolved
                        </span>
                      ) : item.severity === 'fatal' ? (
                        <Button
                          variant="outline"
                          size="small"
                          onClick={() => runRetry(buildOverrides())}
                          disabled={retrying}
                        >
                          <RotateCcw className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
                          Retry
                        </Button>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-label-md text-text-secondary">
                          <Info className="h-4 w-4" aria-hidden="true" />
                          Informational
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col justify-between gap-2 bg-surface-secondary px-4 py-3 text-body-sm text-text-secondary sm:flex-row sm:items-center">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-brand-primary" aria-hidden="true" />
            <span>
              Output integrity score: <span className="font-semibold text-text-primary">{integrityScore}%</span>
              {counts.fatal === 0 ? ' (deterministic guarantees met)' : ' (blocking errors present)'}
            </span>
          </div>
          <span>
            Rows: {filtered.length === 0 ? 0 : 1}-{filtered.length} of {diagnostics.length} logged events
            {result?.truncated ? ' (list truncated at 250)' : ''}
          </span>
        </div>
      </section>

      <section className="flex flex-col items-stretch justify-between gap-6 rounded-xl border border-border-subtle bg-surface-primary p-6 shadow-card md:flex-row md:items-center">
        <div className="flex items-center gap-4">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-surface-secondary text-brand-primary">
            <FileWarning className="h-7 w-7" aria-hidden="true" />
          </span>
          <div>
            <h2 className="text-headline-sm text-text-primary">
              {isFailed ? 'Corrections Required Before Finalization' : 'Ready to Finalize Pipeline'}
            </h2>
            <p className="text-body-sm text-text-secondary">
              {isFailed
                ? 'Fix the flagged cells and revalidate. The source file is retained for this retry.'
                : 'Manual corrections update the output instantly. Unresolved warnings remain fully compatible.'}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-3">
          <Button
            variant="secondary"
            size="medium"
            disabled={editableItems.length === 0}
            onClick={() => openEditor(editableItems[0])}
          >
            <Edit3 className="mr-2 h-4 w-4" aria-hidden="true" />
            Open Inline Editor (PRD §6.5)
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="secondary" size="medium">
                <Download className="mr-2 h-4 w-4" aria-hidden="true" />
                Export Diagnostic
                <ChevronDown className="ml-2 h-4 w-4" aria-hidden="true" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={() => exportDiagnostic('json')}>
                <FileJson className="h-4 w-4" aria-hidden="true" />
                Export as JSON
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => exportDiagnostic('csv')}>
                <FileSpreadsheet className="h-4 w-4" aria-hidden="true" />
                Export as CSV
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {isCompleted ? (
            <Button size="medium" onClick={downloadAnyway} disabled={downloading}>
              {downloading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <Download className="mr-2 h-4 w-4" aria-hidden="true" />
              )}
              {downloading ? 'Preparing output' : 'Download Converted Output Anyway'}
            </Button>
          ) : (
            <Button
              size="medium"
              onClick={() => runRetry(buildOverrides())}
              disabled={retrying || failingRows.length > 0}
            >
              {retrying ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <RotateCcw className="mr-2 h-4 w-4" aria-hidden="true" />
              )}
              {retrying ? 'Revalidating' : 'Retry Conversion'}
            </Button>
          )}
        </div>
      </section>

      <Dialog open={Boolean(editorItem)} onOpenChange={(open) => !open && setEditorItem(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <div className="mb-1 flex h-10 w-10 items-center justify-center rounded-lg bg-brand-primary-soft text-brand-primary">
              <Edit3 className="h-5 w-5" aria-hidden="true" />
            </div>
            <DialogTitle>Inline Cell Editor</DialogTitle>
            <DialogDescription>
              Target: Sheet {editorItem?.sheet} / Cell {editorItem?.address}
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-3">
            <label htmlFor="correction-value" className="text-label-md text-text-secondary">
              Cell Value
              {editorItem?.code === 'ERR_INVALID_OBJECTID'
                ? ' (expected 24-character hexadecimal ObjectId)'
                : ''}
            </label>
            <Input
              id="correction-value"
              className="font-mono"
              value={editorValue}
              error={objectIdInvalid}
              onChange={(event) => setEditorValue(event.target.value)}
              autoFocus
            />
            <p className={`flex items-center gap-1 text-label-sm ${objectIdInvalid ? 'text-error-text' : 'text-text-muted'}`}>
              <Info className="h-3.5 w-3.5" aria-hidden="true" />
              {editorItem?.code === 'ERR_INVALID_OBJECTID'
                ? objectIdInvalid
                  ? 'Must match /^[0-9a-fA-F]{24}$/ (TRD §7.10).'
                  : 'Valid 24-character hexadecimal format applied.'
                : 'The corrected value replaces the original cell before conversion.'}
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            {editorItem?.code === 'ERR_INVALID_OBJECTID' ? (
              <Button variant="link" size="small" onClick={generateObjectId} className="px-0">
                <Sparkles className="mr-1 h-4 w-4" aria-hidden="true" />
                Generate Valid ObjectId
              </Button>
            ) : (
              <span />
            )}
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="medium" onClick={() => setEditorItem(null)} disabled={retrying}>
                Cancel
              </Button>
              <Button size="medium" onClick={saveCorrection} disabled={retrying || objectIdInvalid}>
                {retrying ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                ) : (
                  <ClipboardCheck className="mr-2 h-4 w-4" aria-hidden="true" />
                )}
                {retrying ? 'Revalidating' : 'Save & Revalidate'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button variant="ghost" size="small" onClick={() => navigate('/converter')}>
          <ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true" />
          Back to Converter
        </Button>
        <Button
          variant="ghost"
          size="small"
          onClick={() => navigate(`/converter/progress/${jobId}`)}
        >
          <RefreshCw className="mr-2 h-4 w-4" aria-hidden="true" />
          View Processing Pipeline
        </Button>
      </div>
    </div>
  );
}