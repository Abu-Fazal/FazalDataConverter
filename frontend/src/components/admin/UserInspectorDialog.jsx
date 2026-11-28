import { useEffect, useState } from 'react';
import { Loader2, ShieldCheck } from 'lucide-react';
import { Badge } from '../ui/badge.jsx';
import { Button } from '../ui/button.jsx';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog.jsx';
import { StatusBadge } from '../ui/badge.jsx';
import { adminApi } from '@/services/admin.api';

const ACCOUNT_STATUS = {
  active: { variant: 'success', label: 'Active' },
  suspended: { variant: 'warning', label: 'Suspended' },
  deleted: { variant: 'neutral', label: 'Deleted' },
};
import { formatBytes, formatShortDate, formatTimeAgo } from './format.js';

function Stat({ label, value, hint }) {
  return (
    <div className="rounded-lg border border-border-subtle bg-surface-app p-3">
      <p className="text-[11px] uppercase tracking-[0.05em] text-text-muted">{label}</p>
      <p className="mt-1 text-sm font-semibold tabular-nums text-text-primary">{value}</p>
      {hint ? <p className="text-[11px] text-text-muted">{hint}</p> : null}
    </div>
  );
}

/**
 * Metadata-only inspector (PRD §8.2). File contents are never exposed.
 */
export function UserInspectorDialog({ open, onOpenChange, userId }) {
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open || !userId) return undefined;
    let cancelled = false;
    setLoading(true);
    setDetail(null);
    setError('');

    adminApi
      .getUser(userId)
      .then((data) => {
        if (!cancelled) setDetail(data);
      })
      .catch((loadError) => {
        if (!cancelled) setError(loadError.message || 'Could not load user metadata.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, userId]);

  const user = detail?.user;
  const storage = detail?.storage;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Metadata Inspector</DialogTitle>
          <DialogDescription>
            Identity, storage bounds, and execution metrics. Raw file contents remain strictly
            restricted from admin access.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-10" role="status" aria-live="polite">
            <Loader2 className="h-5 w-5 animate-spin text-brand-primary" aria-hidden="true" />
            <span className="sr-only">Loading user metadata</span>
          </div>
        ) : error ? (
          <p className="rounded-lg border border-error-border bg-error-bg px-3 py-2 text-body-sm text-error-text">
            {error}
          </p>
        ) : user ? (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border-subtle bg-surface-app p-4">
              <div>
                <p className="text-body-md font-semibold text-text-primary">{user.name}</p>
                <p className="text-body-sm text-text-secondary">{user.email}</p>
                <p className="mt-1 font-mono text-[11px] text-text-muted">{user.publicId}</p>
              </div>
              <div className="flex flex-col items-end gap-1.5">
                <Badge variant={ACCOUNT_STATUS[user.status]?.variant || 'neutral'}>
                  {ACCOUNT_STATUS[user.status]?.label || user.status}
                </Badge>
                <Badge variant="neutral">{user.role}</Badge>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <Stat label="Joined" value={formatShortDate(user.joinedAt)} />
              <Stat label="Last active" value={formatTimeAgo(user.lastActiveAt)} />
              <Stat
                label="Conversions"
                value={user.conversions.total}
                hint={`${user.conversions.completed} completed · ${user.conversions.failed} failed`}
              />
              <Stat
                label="Storage"
                value={formatBytes(user.storageBytes)}
                hint={`${user.originalCount} originals · ${user.outputCount} outputs`}
              />
            </div>

            <div>
              <div className="flex items-center justify-between text-body-sm">
                <span className="text-text-secondary">Storage quota</span>
                <span className="tabular-nums text-text-primary">
                  {formatBytes(user.storageBytes)} / {formatBytes(user.quotaBytes)}
                </span>
              </div>
              <div
                className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-surface-secondary"
                role="progressbar"
                aria-label="User storage usage"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={
                  user.quotaBytes > 0 ? Math.round((user.storageBytes / user.quotaBytes) * 100) : 0
                }
              >
                <div
                  className="h-full rounded-full bg-gradient-brand"
                  style={{
                    width: `${
                      user.quotaBytes > 0
                        ? Math.min(100, Math.max(1, (user.storageBytes / user.quotaBytes) * 100))
                        : 0
                    }%`,
                  }}
                />
              </div>
            </div>

            <div>
              <h3 className="text-label-lg text-text-primary">Recent conversion metadata</h3>
              {detail.recentConversions.length === 0 ? (
                <p className="mt-2 rounded-lg border border-border-subtle bg-surface-app px-3 py-6 text-center text-body-sm text-text-muted">
                  No conversion runs logged for this account.
                </p>
              ) : (
                <ul className="mt-2 divide-y divide-border-faint rounded-lg border border-border-subtle">
                  {detail.recentConversions.map((job) => (
                    <li key={job.id} className="flex items-center justify-between gap-3 px-3 py-2.5">
                      <div className="min-w-0">
                        <p className="truncate text-body-sm font-medium text-text-primary">{job.fileName}</p>
                        <p className="text-[11px] text-text-muted">
                          {job.directionLabel} · {formatBytes(job.sizeBytes)}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <StatusBadge status={job.status} />
                        <p className="mt-1 text-[11px] text-text-muted">{formatTimeAgo(job.createdAt)}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <p className="flex items-start gap-2 rounded-lg border border-info-border bg-info-bg px-3 py-2 text-[11px] leading-4 text-info-text">
              <ShieldCheck size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
              Tenant isolation is enforced server-side. Only execution metrics, formats, and storage
              bounds are exposed here.
            </p>
          </div>
        ) : null}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Dismiss inspector
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}