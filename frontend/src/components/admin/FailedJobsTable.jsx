import { AlertCircle, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Badge } from '../ui/badge.jsx';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../ui/table.jsx';
import { EmptyState } from '../ui/empty-state.jsx';
import { formatTimeAgo } from './format.js';

/**
 * Recent fatal conversion failures (metadata only, PRD §8.3).
 * Raw payloads are never exposed to the Admin.
 */
export function FailedJobsTable({ jobs = [], loading = false }) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-headline-sm text-text-primary">Recent fatal failures</h2>
          <p className="text-body-sm text-text-secondary">Diagnostics metadata only — no payload access.</p>
        </div>
        <Link
          to="/admin/conversions?status=failed"
          className="inline-flex items-center gap-1.5 text-label-lg text-brand-primary hover:text-brand-primary-deep"
        >
          Open failure log
          <ArrowRight size={14} aria-hidden="true" />
        </Link>
      </div>

      {loading ? (
        <p className="rounded-xl border border-border-subtle bg-surface-primary px-4 py-8 text-center text-body-sm text-text-muted">
          Loading failure telemetry…
        </p>
      ) : jobs.length === 0 ? (
        <div className="rounded-xl border border-border-subtle bg-surface-primary">
          <EmptyState
            icon={AlertCircle}
            title="No failed jobs"
            description="Every recent conversion completed without a fatal error."
          />
        </div>
      ) : (
        <Table caption="Recent failed conversion jobs (metadata only)">
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>File</TableHead>
              <TableHead>Owner</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>When</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {jobs.map((job) => (
              <TableRow key={job.id}>
                <TableCell>
                  <div className="flex items-start gap-2">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-error-text" aria-hidden="true" />
                    <div className="min-w-0">
                      <p className="truncate text-body-md font-medium text-text-primary">{job.fileName}</p>
                      <p className="text-[11px] text-text-muted">{job.directionLabel}</p>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-body-sm text-text-secondary">
                  <span className="block max-w-[160px] truncate">{job.owner.name}</span>
                </TableCell>
                <TableCell>
                  <Badge variant="error">{job.errorCategory || 'Unknown'}</Badge>
                </TableCell>
                <TableCell className="whitespace-nowrap text-body-sm text-text-muted">
                  {formatTimeAgo(job.createdAt)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}