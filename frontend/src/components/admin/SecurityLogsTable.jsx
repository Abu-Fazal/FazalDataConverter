import { ArrowRight, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Badge } from '../ui/badge.jsx';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../ui/table.jsx';
import { EmptyState } from '../ui/empty-state.jsx';
import { eventLabel, eventTone, formatTimeAgo } from './format.js';

/**
 * Latest entries from the immutable security ledger (PRD §3.8).
 * Read-only: no edit or delete affordances are ever rendered.
 */
export function SecurityLogsTable({ logs = [], loading = false }) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-headline-sm text-text-primary">Latest security events</h2>
          <p className="text-body-sm text-text-secondary">Append-only ledger · 1-year retention.</p>
        </div>
        <Link
          to="/admin/security"
          className="inline-flex items-center gap-1.5 text-label-lg text-brand-primary hover:text-brand-primary-deep"
        >
          Open security logs
          <ArrowRight size={14} aria-hidden="true" />
        </Link>
      </div>

      {loading ? (
        <p className="rounded-xl border border-border-subtle bg-surface-primary px-4 py-8 text-center text-body-sm text-text-muted">
          Loading audit ledger…
        </p>
      ) : logs.length === 0 ? (
        <div className="rounded-xl border border-border-subtle bg-surface-primary">
          <EmptyState
            icon={ShieldCheck}
            title="No security events yet"
            description="Admin authentication and privileged actions will appear here."
          />
        </div>
      ) : (
        <Table caption="Latest immutable security events">
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Event</TableHead>
              <TableHead>Actor / IP</TableHead>
              <TableHead>Outcome</TableHead>
              <TableHead>When</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.map((event) => (
              <TableRow key={event.id}>
                <TableCell>
                  <Badge variant={eventTone(event.eventType)}>{eventLabel(event.eventType)}</Badge>
                </TableCell>
                <TableCell className="text-body-sm text-text-secondary">
                  <span className="block">{event.actorEmail || event.actor}</span>
                  <span className="block text-[11px] text-text-muted tabular-nums">{event.sourceIp}</span>
                </TableCell>
                <TableCell className="text-body-sm text-text-secondary">{event.outcome}</TableCell>
                <TableCell className="whitespace-nowrap text-body-sm text-text-muted">
                  {formatTimeAgo(event.timestamp)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}