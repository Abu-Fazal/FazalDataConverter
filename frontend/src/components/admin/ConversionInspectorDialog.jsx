import { useEffect, useState } from 'react';
import { AlertTriangle, Loader2, ShieldCheck } from 'lucide-react';
import { Badge, StatusBadge } from '../ui/badge.jsx';
import { Button } from '../ui/button.jsx';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog.jsx';
import { adminApi } from '@/services/admin.api';
import { formatBytes, formatDateTime, formatDuration, modeLabel } from './format.js';

const SEVERITY = {
  fatal: { variant: 'error', label: 'Fatal' },
  recoverable: { variant: 'warning', label: 'Recoverable' },
  warning: { variant: 'info', label: 'Warning' },
};

function Field({ label, value }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-[0.05em] text-text-muted">{label}</p>
      <p className="mt-0.5 text-body-sm font-medium text-text-primary">{value}</p>
    </div>
  );
}

/**
 * Job metadata and diagnostics inspector (PRD §8.3).
 * No payload preview or download is ever offered to the Admin.
 */
export function ConversionInspectorDialog({ open, onOpenChange, jobId }) {
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open || !jobId) return undefined;
    let cancelled = false;
    setLoading(true);
    setJob(null);
    setError('');

    adminApi
      .getConversion(jobId)
      .then((data) => {
        if (!cancelled) setJob(data);
      })
      .catch((loadError) => {
        if (!cancelled) setError(loadError.message || 'Could not load job metadata.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, jobId]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex flex-wrap items-center gap-2">
            Job inspector
            {job ? <StatusBadge status={job.status} /> : null}
          </DialogTitle>
          <DialogDescription className="font-mono text-xs">{jobId}</DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-10" role="status" aria-live="polite">
            <Loader2 className="h-5 w-5 animate-spin text-brand-primary" aria-hidden="true" />
            <span className="sr-only">Loading job metadata</span>
          </div>
        ) : error ? (
          <p className="rounded-lg border border-error-border bg-error-bg px-3 py-2 text-body-sm text-error-text">
            {error}
          </p>
        ) : job ? (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-3 rounded-lg border border-border-subtle bg-surface-app p-4 sm:grid-cols-4">
              <Field label="File" value={job.fileName} />
              <Field label="Size" value={formatBytes(job.sizeBytes)} />
              <Field label="Transformation" value={job.directionLabel} />
              <Field label="Mode" value={modeLabel(job)} />
              <Field label="Owner" value={job.owner.email || job.owner.name} />
              <Field label="Created" value={formatDateTime(job.createdAt)} />
              <Field label="Duration" value={formatDuration(job.durationMs)} />
              <Field label="Progress" value={`${job.progress}%`} />
              <Field label="Stage" value={job.stage} />
              <Field
                label="Integrity score"
                value={job.integrityScore == null ? '—' : `${job.integrityScore}/100`}
              />
              <Field
                label="Verification"
                value={job.verification?.verified ? `Verified (${job.verification.coveragePct ?? 0}% coverage)` : 'Not verified'}
              />
              <Field label="Output" value={job.output?.available ? formatBytes(job.output.sizeBytes) : 'Not retained'} />
            </div>

            {job.status === 'failed' ? (
              <div className="rounded-lg border border-error-border bg-error-bg px-4 py-3">
                <p className="flex items-center gap-2 text-body-sm font-semibold text-error-text">
                  <AlertTriangle size={15} aria-hidden="true" />
                  {job.errorCategory || 'Processing error'}
                </p>
                <p className="mt-1 font-mono text-xs leading-5 text-error-text">{job.error || 'No error detail recorded.'}</p>
              </div>
            ) : null}

            <div>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-label-lg text-text-primary">Validation diagnostics</h3>
                <span className="text-[11px] text-text-muted">
                  {job.counts.fatal} fatal · {job.counts.recoverable} recoverable · {job.counts.warnings} warnings
                </span>
              </div>
              {job.diagnostics.length === 0 ? (
                <p className="mt-2 rounded-lg border border-border-subtle bg-surface-app px-3 py-6 text-center text-body-sm text-text-muted">
                  No validation diagnostics were recorded for this job.
                </p>
              ) : (
                <ul className="mt-2 space-y-2">
                  {job.diagnostics.map((item, index) => {
                    const severity = SEVERITY[item.severity] || SEVERITY.warning;
                    return (
                      <li
                        key={`${item.code}-${index}`}
                        className="rounded-lg border border-border-subtle bg-surface-primary px-3 py-2.5"
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant={severity.variant}>{severity.label}</Badge>
                          <span className="font-mono text-[11px] text-text-secondary">{item.code}</span>
                          {item.sheet || item.address ? (
                            <span className="text-[11px] text-text-muted">
                              {[item.sheet, item.address].filter(Boolean).join(' · ')}
                            </span>
                          ) : null}
                        </div>
                        <p className="mt-1 text-body-sm text-text-primary">{item.detail || item.message}</p>
                        {item.resolution ? (
                          <p className="mt-0.5 text-[11px] text-text-muted">Resolution: {item.resolution}</p>
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            <div className="rounded-lg border border-border-subtle bg-surface-app px-4 py-3 text-[11px] leading-4 text-text-secondary">
              <p>
                Consent: {job.request.consent ? `v${job.request.consent.version} · ${formatDateTime(job.request.consent.acceptedAt)}` : 'Not recorded'}
                {' · '}Overrides: {job.request.overrideCount}
                {job.request.retryOf ? ` · Retry of ${job.request.retryOf}` : ''}
              </p>
            </div>

            <p className="flex items-start gap-2 rounded-lg border border-info-border bg-info-bg px-3 py-2 text-[11px] leading-4 text-info-text">
              <ShieldCheck size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
              Original payloads and converted outputs are strictly isolated from admin visibility. Only
              execution metrics, formats, and diagnostics are exposed.
            </p>
          </div>
        ) : null}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close inspector
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}