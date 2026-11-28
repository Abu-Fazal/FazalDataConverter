import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  Download,
  FileOutput,
  FileSpreadsheet,
  History,
  ShieldCheck,
  Trash2,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '../ui/dialog.jsx';
import { Button } from '../ui/button.jsx';
import { StatusBadge } from '../ui/badge.jsx';
import { cn } from '@/lib/utils';
import {
  directionLabel,
  formatBytes,
  formatDateTime,
  formatDuration,
  modeLabel,
  outputFormatLabel,
} from './format.js';

function Meta({ label, value, mono = false }) {
  return (
    <div className="min-w-0">
      <dt className="text-label-sm uppercase tracking-wider text-text-muted">{label}</dt>
      <dd
        className={cn(
          'mt-0.5 truncate text-body-md text-text-primary',
          mono && 'font-mono text-label-md tabular-nums',
        )}
      >
        {value || '—'}
      </dd>
    </div>
  );
}

function StoredFile({ icon: Icon, title, state, available, actionLabel, onDownload, primary = false }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border-subtle bg-surface-app p-3">
      <span
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border-subtle bg-surface-primary text-brand-primary"
        aria-hidden="true"
      >
        <Icon className="h-[18px] w-[18px]" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-label-lg font-semibold text-text-primary">{title}</p>
        <p className={cn('text-label-sm', available ? 'text-success-text' : 'text-error-text')}>{state}</p>
      </div>
      <Button
        size="small"
        variant={primary ? 'default' : 'outline'}
        disabled={!available}
        onClick={onDownload}
        aria-label={`${actionLabel}${available ? '' : ' (unavailable)'}`}
      >
        <Download className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
        Download
      </Button>
    </div>
  );
}

export function HistoryDetailsDrawer({
  entry,
  open,
  onClose,
  onDownloadOutput,
  onDownloadOriginal,
  onDeleteEntry,
}) {
  const navigate = useNavigate();
  if (!entry) return null;

  const active = entry.status === 'pending' || entry.status === 'processing';
  const revision = entry.verification?.verified
    ? 'Schema validated'
    : entry.status === 'failed'
      ? 'Validation failed'
      : active
        ? 'Processing'
        : 'Not verified';

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="left-auto right-0 top-0 grid h-full w-full max-w-md translate-x-0 translate-y-0 content-start gap-0 overflow-y-auto rounded-none border-y-0 border-r-0 bg-surface-primary p-0 sm:max-w-md sm:p-0">
        <div className="sticky top-0 z-10 border-b border-border-subtle bg-surface-primary/95 px-6 py-5 backdrop-blur">
          <div className="flex items-center gap-2 pr-8">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-primary-soft text-brand-primary">
              <History className="h-4 w-4" aria-hidden="true" />
            </span>
            <DialogTitle className="text-label-sm uppercase tracking-wider text-text-muted">
              History Entry Details
            </DialogTitle>
          </div>
          <DialogDescription className="mt-2 truncate text-headline-sm text-text-primary">
            {entry.originalFileName}
          </DialogDescription>
        </div>

        <div className="space-y-6 px-6 py-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-label-sm uppercase tracking-wider text-text-muted">Revision Status</p>
              <p className="mt-0.5 text-label-lg font-semibold text-text-primary">
                {revision}
                {entry.integrityScore != null ? ` · Integrity ${entry.integrityScore}%` : ''}
              </p>
            </div>
            <StatusBadge status={entry.status} />
          </div>

          <section aria-labelledby="drawer-metadata-heading">
            <h3
              id="drawer-metadata-heading"
              className="text-label-sm uppercase tracking-wider text-brand-primary"
            >
              Conversion Metadata
            </h3>
            <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-4 rounded-xl border border-border-subtle bg-surface-app p-4">
              <Meta label="Entry ID" value={entry.id} mono />
              <Meta label="File Size" value={formatBytes(entry.fileSizeBytes)} />
              <Meta label="Direction" value={directionLabel(entry)} />
              <Meta label="JSON Mode" value={modeLabel(entry)} />
              <Meta label="Created" value={formatDateTime(entry.createdAt)} mono />
              <Meta label="Duration" value={formatDuration(entry.durationMs)} />
              <Meta
                label="Records"
                value={entry.rowCount != null ? Number(entry.rowCount).toLocaleString('en-US') : null}
              />
              <Meta
                label="Sheets"
                value={entry.sheetCount != null ? String(entry.sheetCount) : null}
              />
              <Meta
                label="Verification"
                value={
                  entry.verification
                    ? `${entry.verification.verified ? 'Passed' : 'Failed'} · ${entry.verification.coveragePct}%`
                    : null
                }
              />
              <Meta label="Retry Of" value={entry.retryOf} mono />
            </dl>
          </section>

          {entry.status === 'failed' && entry.error ? (
            <div className="flex items-start gap-2.5 rounded-xl border border-error-border bg-error-bg p-3.5">
              <AlertTriangle className="mt-0.5 h-[18px] w-[18px] shrink-0 text-error-text" aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <p className="text-label-lg font-semibold text-error-text">Conversion failed</p>
                <p className="mt-0.5 break-words text-body-sm text-error-text">{entry.error}</p>
                <Button
                  size="small"
                  variant="outline"
                  className="mt-2 border-error-border bg-surface-primary text-error-text hover:bg-error-bg"
                  onClick={() => {
                    onClose();
                    navigate(`/converter/error/${entry.id}`);
                  }}
                >
                  Open diagnostics
                </Button>
              </div>
            </div>
          ) : null}

          <section aria-labelledby="drawer-files-heading">
            <h3
              id="drawer-files-heading"
              className="text-label-sm uppercase tracking-wider text-brand-primary"
            >
              Stored Physical Files
            </h3>
            <div className="mt-3 space-y-2.5">
              <StoredFile
                icon={FileSpreadsheet}
                title="Original Input File"
                state={entry.originalAvailable ? 'Stored · Ready' : 'Deleted from storage'}
                available={entry.originalAvailable}
                actionLabel="Download original file"
                onDownload={() => onDownloadOriginal(entry)}
              />
              <StoredFile
                icon={FileOutput}
                title={`Converted Output (${outputFormatLabel(entry)})`}
                state={
                  entry.outputAvailable
                    ? `Stored · Ready${entry.outputSizeBytes ? ` · ${formatBytes(entry.outputSizeBytes)}` : ''}`
                    : 'Unavailable / Deleted'
                }
                available={entry.outputAvailable}
                actionLabel="Download converted output"
                onDownload={() => onDownloadOutput(entry)}
                primary
              />
            </div>
          </section>

          <div className="flex items-start gap-2 rounded-lg border border-border-subtle bg-surface-secondary p-3">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-brand-primary" aria-hidden="true" />
            <p className="text-label-sm leading-5 text-text-secondary">
              Deleting a history entry removes only the record. Stored originals and converted outputs remain
              in your vault until you delete them separately.
            </p>
          </div>

          <Button
            variant="outline"
            className="w-full border-error-border text-error-text hover:bg-error-bg"
            disabled={active}
            onClick={() => onDeleteEntry(entry)}
          >
            <Trash2 className="mr-2 h-4 w-4" aria-hidden="true" />
            Delete history entry
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}