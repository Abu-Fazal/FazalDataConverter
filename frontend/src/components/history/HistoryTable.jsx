import { useEffect, useState } from 'react';
import {
  Archive,
  ChevronLeft,
  ChevronRight,
  Download,
  FileCode2,
  FileJson,
  FileOutput,
  FileSpreadsheet,
  Loader2,
  Search,
  ShieldCheck,
  Trash2,
  XCircle,
} from 'lucide-react';
import { Button } from '../ui/button.jsx';
import { StatusBadge } from '../ui/badge.jsx';
import { EmptyState } from '../ui/empty-state.jsx';
import { Tooltip, TooltipTrigger, TooltipContent } from '../ui/tooltip.jsx';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../ui/table.jsx';
import { cn } from '@/lib/utils';
import {
  directionLabel,
  fileExtension,
  formatBytes,
  formatDateTime,
  formatDuration,
  isActiveStatus,
  modeLabel,
  outputFormatLabel,
} from './format.js';

function SourceIcon({ fileName }) {
  const extension = fileExtension(fileName);
  const Icon =
    extension === 'json'
      ? FileJson
      : extension === 'bson'
        ? Archive
        : extension === 'js'
          ? FileCode2
          : FileSpreadsheet;
  return <Icon className="h-[18px] w-[18px]" aria-hidden="true" />;
}

function IconAction({ label, icon: Icon, onClick, disabled = false, tone = 'default', busy = false }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          disabled={disabled || busy}
          aria-label={label}
          onClick={(event) => {
            event.stopPropagation();
            onClick();
          }}
          className={cn(
            'inline-flex h-8 w-8 items-center justify-center rounded-lg border transition-colors',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-1',
            'disabled:cursor-not-allowed disabled:opacity-40',
            tone === 'danger'
              ? 'border-error-border text-error-text hover:bg-error-bg'
              : tone === 'muted'
                ? 'border-border-subtle text-text-muted hover:border-warning-border hover:bg-warning-bg hover:text-warning-text'
                : 'border-border-subtle text-text-secondary hover:border-brand-primary-border hover:bg-brand-primary-soft hover:text-brand-primary',
          )}
        >
          {busy ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <Icon className="h-4 w-4" aria-hidden="true" />
          )}
        </button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

function pageItems(current, total) {
  if (total <= 5) return Array.from({ length: total }, (_, index) => index + 1);
  const items = [1];
  if (current > 3) items.push('start-ellipsis');
  for (let page = Math.max(2, current - 1); page <= Math.min(total - 1, current + 1); page += 1) {
    items.push(page);
  }
  if (current < total - 2) items.push('end-ellipsis');
  items.push(total);
  return items;
}

export function HistoryTable({
  entries,
  hasFilters = false,
  onResetFilters,
  onOpen,
  onDownloadOutput,
  onDownloadOriginal,
  onDeleteOutput,
  onDeleteOriginal,
  onDeleteEntry,
  onCancel,
  busyKey,
}) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    setPage(1);
  }, [entries]);

  const pageCount = Math.max(1, Math.ceil(entries.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const startIndex = (currentPage - 1) * pageSize;
  const visibleEntries = entries.slice(startIndex, startIndex + pageSize);
  const firstRow = entries.length === 0 ? 0 : startIndex + 1;
  const lastRow = Math.min(startIndex + pageSize, entries.length);

  function changePage(next) {
    setPage(Math.min(pageCount, Math.max(1, next)));
  }

  return (
    <div className="space-y-4">
      <Table caption="Conversion history and stored files" className="min-w-[920px]">
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="px-5">Source File &amp; Timestamp</TableHead>
            <TableHead className="px-5">Direction &amp; Mode</TableHead>
            <TableHead className="px-5">Dataset Scale</TableHead>
            <TableHead className="px-5">Status &amp; Verification</TableHead>
            <TableHead className="px-5">Stored Objects</TableHead>
            <TableHead className="px-5 text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {visibleEntries.map((entry) => {
            const active = isActiveStatus(entry.status);
            const outputKey = `output:${entry.id}`;
            const originalKey = `original:${entry.id}`;
            const entryKey = `entry:${entry.id}`;
            const cancelKey = `cancel:${entry.id}`;

            return (
              <TableRow key={entry.id} className="cursor-pointer" onClick={() => onOpen(entry.id)}>
                <TableCell className="px-5">
                  <div className="flex min-w-0 items-center gap-3">
                    <span
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-brand-primary-border bg-brand-primary-soft text-brand-primary"
                      aria-hidden="true"
                    >
                      <SourceIcon fileName={entry.originalFileName} />
                    </span>
                    <div className="min-w-0">
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          onOpen(entry.id);
                        }}
                        aria-label={`View details for ${entry.originalFileName}`}
                        className="block max-w-[230px] truncate text-left text-label-lg font-semibold text-text-primary transition-colors hover:text-brand-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
                      >
                        {entry.originalFileName}
                      </button>
                      <span className="mt-0.5 block text-label-sm tabular-nums text-text-muted">
                        {formatBytes(entry.fileSizeBytes)} · {formatDateTime(entry.createdAt)}
                      </span>
                    </div>
                  </div>
                </TableCell>

                <TableCell className="px-5">
                  <span className="inline-flex whitespace-nowrap rounded-lg border border-brand-primary-border bg-brand-primary-soft px-2.5 py-1 text-label-md font-medium text-brand-primary-deep">
                    {directionLabel(entry)}
                  </span>
                  <span className="mt-1 block text-label-sm text-text-muted">{modeLabel(entry)}</span>
                </TableCell>

                <TableCell className="px-5">
                  {entry.rowCount != null ? (
                    <span
                      className={cn(
                        'block text-body-md font-medium tabular-nums',
                        entry.status === 'failed' ? 'text-error-text' : 'text-text-primary',
                      )}
                    >
                      {Number(entry.rowCount).toLocaleString('en-US')} Records
                    </span>
                  ) : (
                    <span className="block text-body-md text-text-muted">—</span>
                  )}
                  <span className="mt-0.5 block text-label-sm text-text-muted">
                    {entry.sheetCount ? `${entry.sheetCount} Sheets` : entry.cellCount ? `${Number(entry.cellCount).toLocaleString('en-US')} Cells` : '—'}
                  </span>
                </TableCell>

                <TableCell className="px-5">
                  <StatusBadge status={entry.status} />
                  <span className="mt-1.5 flex items-center gap-1 text-label-sm text-text-muted">
                    {entry.status === 'completed' && entry.verification?.verified ? (
                      <>
                        <ShieldCheck className="h-3.5 w-3.5 text-success-dot" aria-hidden="true" />
                        Verified
                      </>
                    ) : entry.status === 'failed' ? (
                      'Diagnostics available'
                    ) : (
                      'In progress'
                    )}
                    {entry.durationMs ? ` · ${formatDuration(entry.durationMs)}` : ''}
                  </span>
                </TableCell>

                <TableCell className="px-5">
                  <div className="flex flex-col gap-1 text-label-sm">
                    <span className="flex items-center gap-1.5 text-text-secondary">
                      <FileSpreadsheet className="h-3.5 w-3.5 text-text-muted" aria-hidden="true" />
                      {entry.originalAvailable ? `Orig: ${formatBytes(entry.fileSizeBytes)}` : 'Original purged'}
                    </span>
                    <span
                      className={cn(
                        'flex items-center gap-1.5',
                        entry.outputAvailable ? 'text-brand-primary-deep' : 'text-text-muted',
                      )}
                    >
                      <FileOutput className="h-3.5 w-3.5" aria-hidden="true" />
                      {entry.outputAvailable
                        ? `${outputFormatLabel(entry)}: ${formatBytes(entry.outputSizeBytes)}`
                        : entry.status === 'failed'
                          ? 'No output'
                          : 'Output deleted'}
                    </span>
                  </div>
                </TableCell>

                <TableCell className="px-5">
                  <div className="flex items-center justify-end gap-1.5">
                    {active ? (
                      <IconAction
                        label={`Cancel conversion of ${entry.originalFileName}`}
                        icon={XCircle}
                        tone="danger"
                        busy={busyKey === cancelKey}
                        onClick={() => onCancel(entry)}
                      />
                    ) : (
                      <>
                        <IconAction
                          label="Download converted output"
                          icon={Download}
                          disabled={!entry.outputAvailable}
                          busy={busyKey === outputKey}
                          onClick={() => onDownloadOutput(entry)}
                        />
                        <IconAction
                          label="Download original file"
                          icon={Download}
                          disabled={!entry.originalAvailable}
                          busy={busyKey === originalKey}
                          onClick={() => onDownloadOriginal(entry)}
                        />
                        <IconAction
                          label="Delete converted output"
                          icon={FileOutput}
                          tone="muted"
                          disabled={!entry.outputAvailable}
                          onClick={() => onDeleteOutput(entry)}
                        />
                        <IconAction
                          label="Delete original file"
                          icon={Archive}
                          tone="muted"
                          disabled={!entry.originalAvailable}
                          onClick={() => onDeleteOriginal(entry)}
                        />
                      </>
                    )}
                    <IconAction
                      label="Delete history entry"
                      icon={Trash2}
                      tone="danger"
                      disabled={active}
                      busy={busyKey === entryKey}
                      onClick={() => onDeleteEntry(entry)}
                    />
                  </div>
                </TableCell>
              </TableRow>
            );
          })}

          {visibleEntries.length === 0 && (
            <TableRow className="hover:bg-transparent">
              <TableCell colSpan={6} className="p-0">
                <EmptyState
                  icon={hasFilters ? Search : Archive}
                  title={hasFilters ? 'No entries match your filters' : 'No conversion history entries found'}
                  description={
                    hasFilters
                      ? 'Adjust the search or filters, or run a new conversion. Stored files remain safely preserved in your vault.'
                      : 'Your uploaded and converted datasets will appear here after your first conversion.'
                  }
                  action={
                    hasFilters ? (
                      <Button size="small" variant="outline" onClick={onResetFilters}>
                        Reset filters
                      </Button>
                    ) : null
                  }
                />
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      {entries.length > 0 && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-body-sm tabular-nums text-text-secondary">
            Showing{' '}
            <span className="font-semibold text-text-primary">
              {firstRow}–{lastRow}
            </span>{' '}
            of <span className="font-semibold text-text-primary">{entries.length}</span> conversions
          </p>

        <div className="flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-1.5 text-body-sm text-text-muted">
              Per page:
              <select
                value={pageSize}
                onChange={(event) => {
                  setPageSize(Number(event.target.value));
                  setPage(1);
                }}
                aria-label="Rows per page"
                className="rounded-lg border border-border-subtle bg-surface-primary px-2 py-1.5 text-body-sm text-text-primary focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary-border"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
            </label>

            <button
              type="button"
              aria-label="Previous page"
              disabled={currentPage === 1}
              onClick={() => changePage(currentPage - 1)}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-border-subtle bg-surface-primary text-text-secondary transition-colors hover:bg-surface-secondary disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            </button>

            {pageItems(currentPage, pageCount).map((item) =>
              typeof item === 'number' ? (
                <button
                  key={item}
                  type="button"
                  aria-label={`Page ${item}`}
                  aria-current={item === currentPage ? 'page' : undefined}
                  onClick={() => changePage(item)}
                  className={cn(
                    'min-w-8 rounded-lg px-2.5 py-1.5 text-label-md font-medium tabular-nums transition-colors',
                    item === currentPage
                      ? 'bg-brand-primary text-text-inverse shadow-sm'
                      : 'bg-surface-primary text-text-secondary hover:bg-surface-secondary',
                  )}
                >
                  {item}
                </button>
              ) : (
                <span key={item} className="px-0.5 text-label-md text-text-muted" aria-hidden="true">
                  …
                </span>
              ),
            )}

            <button
              type="button"
              aria-label="Next page"
              disabled={currentPage === pageCount}
              onClick={() => changePage(currentPage + 1)}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-border-subtle bg-surface-primary text-text-secondary transition-colors hover:bg-surface-secondary disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}