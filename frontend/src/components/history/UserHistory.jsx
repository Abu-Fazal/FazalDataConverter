import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  CheckCircle2,
  Cloud,
  History,
  Info,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  Shield,
  ShieldCheck,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../ui/button.jsx';
import { Badge } from '../ui/badge.jsx';
import { Input } from '../ui/input.jsx';
import { Select } from '../ui/select.jsx';
import { Skeleton } from '../ui/skeleton.jsx';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog.jsx';
import { HistoryTable } from './HistoryTable.jsx';
import { HistoryDetailsDrawer } from './HistoryDetailsDrawer.jsx';
import { cn } from '@/lib/utils';
import { isActiveStatus } from './format.js';
import { historyApi } from '@/services/history.api';

const STATUS_OPTIONS = [
  { value: 'all', label: 'All States' },
  { value: 'completed', label: 'Completed' },
  { value: 'failed', label: 'Failed / Warning' },
  { value: 'active', label: 'In Progress' },
];

const FORMAT_OPTIONS = [
  { value: 'all', label: 'All Conversion Formats' },
  { value: 'excel-json', label: 'Excel → JSON' },
  { value: 'json-excel', label: 'JSON → Excel' },
  { value: 'excel-bson', label: 'Excel → BSON' },
  { value: 'js-extract', label: 'Static JS Extraction' },
];

const CONFIRM_COPY = {
  entry: {
    title: 'Delete history entry?',
    description:
      'This removes the record from your history. Stored originals and converted outputs remain in your vault until you delete them separately.',
    confirmLabel: 'Delete entry',
    danger: true,
  },
  original: {
    title: 'Delete stored original?',
    description:
      'The original upload will be permanently removed from storage. The history record and converted output are kept.',
    confirmLabel: 'Delete original',
    danger: true,
  },
  output: {
    title: 'Delete converted output?',
    description:
      'The converted file will be permanently removed from storage. The history record and original upload are kept.',
    confirmLabel: 'Delete output',
    danger: true,
  },
  cancel: {
    title: 'Cancel this conversion?',
    description:
      'The queued or running job will be stopped and its temporary buffers purged. This cannot be undone.',
    confirmLabel: 'Cancel conversion',
    danger: true,
  },
  clear: {
    title: 'Clear complete history?',
    description:
      'Completed, failed, and cancelled records will be removed. Active conversions stay. Stored physical files remain safely preserved in your vault.',
    confirmLabel: 'Clear history',
    danger: true,
  },
};

function StatCard({ label, icon: Icon, tone, value, hint, progress }) {
  return (
    <div className="rounded-xl border border-border-subtle bg-surface-primary p-5 shadow-card">
      <div className="flex items-center justify-between gap-2">
        <span className="text-label-md text-text-secondary">{label}</span>
        <span className={cn('flex h-8 w-8 items-center justify-center rounded-lg', tone)} aria-hidden="true">
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <p className="mt-2 text-headline-md font-bold tabular-nums text-text-primary">{value}</p>
      {progress != null ? (
        <div
          className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-surface-secondary"
          role="progressbar"
          aria-label={`${label} ${value}`}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(progress)}
        >
          <div
            className="h-full rounded-full bg-gradient-brand"
            style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
          />
        </div>
      ) : null}
      <p className="mt-0.5 text-label-sm text-text-muted">{hint}</p>
    </div>
  );
}

export function UserHistory() {
  const navigate = useNavigate();
  const [entries, setEntries] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [query, setQuery] = useState('');
  const [formatFilter, setFormatFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedId, setSelectedId] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [busyKey, setBusyKey] = useState(null);

  const load = useCallback(async ({ silent = false } = {}) => {
    if (silent) setRefreshing(true);
    try {
      const res = await historyApi.list();
      setEntries(Array.isArray(res?.data) ? res.data : []);
      setStats(res?.stats || null);
      setLoadError('');
    } catch (error) {
      if (!silent) setLoadError(error.message || 'Could not load conversion history.');
    } finally {
      if (silent) setRefreshing(false);
      else setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') load({ silent: true });
    }, 15000);
    return () => window.clearInterval(timer);
  }, [load]);

  const filteredEntries = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return entries.filter((entry) => {
      const matchesQuery =
        !needle ||
        entry.originalFileName?.toLowerCase().includes(needle) ||
        entry.outputFileName?.toLowerCase().includes(needle) ||
        entry.id?.toLowerCase().includes(needle);
      const matchesFormat =
        formatFilter === 'all' || entry.direction === formatFilter;
      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'active' ? isActiveStatus(entry.status) : entry.status === statusFilter);
      return matchesQuery && matchesFormat && matchesStatus;
    });
  }, [entries, query, formatFilter, statusFilter]);

  const hasFilters = Boolean(query.trim()) || formatFilter !== 'all' || statusFilter !== 'all';
  const selectedEntry = entries.find((entry) => entry.id === selectedId) || null;
  const storage = stats?.storage || {
    objectCount: 0,
    originalCount: 0,
    outputCount: 0,
    usedBytes: 0,
    quotaBytes: 1024 * 1024 * 1024,
  };

  function resetFilters() {
    setQuery('');
    setFormatFilter('all');
    setStatusFilter('all');
  }

  function handleDownloadOutput(entry) {
    historyApi.downloadConverted(entry.id);
    toast.success('Converted output download started', {
      description: entry.outputFileName || entry.originalFileName,
    });
  }

  function handleDownloadOriginal(entry) {
    historyApi.downloadOriginal(entry.id);
    toast.success('Original file download started', {
      description: entry.originalFileName,
    });
  }

  function requestDeleteEntry(entry) {
    setSelectedId(null);
    setConfirm({ type: 'entry', entry });
  }

  async function executeConfirm() {
    if (!confirm) return;
    const { type, entry } = confirm;
    const key = `${type}:${entry?.id || 'all'}`;
    setBusyKey(key);

    try {
      if (type === 'entry') {
        await historyApi.deleteEntry(entry.id);
        setEntries((previous) => previous.filter((item) => item.id !== entry.id));
        if (selectedId === entry.id) setSelectedId(null);
        toast.success('History entry deleted', {
          description: 'Stored files remain safely preserved in your vault.',
        });
      } else if (type === 'original') {
        await historyApi.deleteOriginal(entry.id);
        setEntries((previous) =>
          previous.map((item) => (item.id === entry.id ? { ...item, originalAvailable: false } : item)),
        );
        toast.success('Original file deleted from storage', { description: entry.originalFileName });
      } else if (type === 'output') {
        await historyApi.deleteOutput(entry.id);
        setEntries((previous) =>
          previous.map((item) => (item.id === entry.id ? { ...item, outputAvailable: false } : item)),
        );
        toast.success('Converted output deleted from storage', {
          description: entry.outputFileName || entry.originalFileName,
        });
      } else if (type === 'cancel') {
        await historyApi.cancel(entry.id);
        toast.info('Conversion cancelled', { description: entry.originalFileName });
      } else if (type === 'clear') {
        const result = await historyApi.clearHistory();
        toast.success('Conversion history cleared', {
          description: `${result?.removedCount ?? 0} record(s) removed. Stored files remain in your vault.`,
        });
      }

      setConfirm(null);
      await load({ silent: true });
    } catch (error) {
      toast.error('Action could not be completed', {
        description: error.message || 'Please try again.',
      });
    } finally {
      setBusyKey(null);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6" aria-busy="true" aria-label="Loading conversion history">
        <Skeleton className="h-4 w-72" />
        <Skeleton className="h-9 w-96 max-w-full" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[0, 1, 2, 3].map((key) => (
            <Skeleton key={key} className="h-28 w-full" />
          ))}
        </div>
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-80 w-full" />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="mx-auto max-w-lg rounded-xl border border-error-border bg-surface-primary p-8 text-center shadow-card">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-error-bg text-error-text">
          <AlertTriangle className="h-6 w-6" aria-hidden="true" />
        </span>
        <h1 className="mt-4 text-headline-sm text-text-primary">History is unavailable</h1>
        <p className="mt-1 text-body-sm text-text-secondary">{loadError}</p>
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          <Button
            onClick={() => {
              setLoading(true);
              setLoadError('');
              load();
            }}
          >
            <RefreshCw className="mr-2 h-4 w-4" aria-hidden="true" />
            Try again
          </Button>
          <Button variant="outline" onClick={() => navigate('/converter')}>
            <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
            New conversion
          </Button>
        </div>
      </div>
    );
  }

  const confirmCopy = confirm ? CONFIRM_COPY[confirm.type] : null;
  const confirmTitle =
    confirm?.type === 'entry' && confirm.entry
      ? `Delete ${confirm.entry.originalFileName}?`
      : confirmCopy?.title;
  const confirmDescription =
    confirm?.type === 'original'
      ? `The stored original for "${confirm.entry.originalFileName}" will be permanently removed. The history record and converted output are kept.`
      : confirm?.type === 'output'
        ? `The stored output for "${confirm.entry.originalFileName}" will be permanently removed. The history record and original upload are kept.`
        : confirmCopy?.description;

  return (
    <section aria-labelledby="history-heading" className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-2 text-label-sm uppercase tracking-wider text-text-muted">
            <span className="rounded bg-brand-primary-soft px-1.5 py-0.5 font-bold text-brand-primary">02</span>
            <span>Conversion Archive</span>
            <span className="rounded-full border border-brand-primary-border bg-brand-primary-surface px-2 py-0.5 font-semibold tracking-normal text-brand-primary-deep">
              Registered Vault
            </span>
            <span className="flex items-center gap-1 normal-case tracking-normal text-text-secondary">
              <ShieldCheck className="h-3.5 w-3.5 text-brand-primary" aria-hidden="true" />
              Cloudflare R2 Encrypted Endpoint (TRD §4.1)
            </span>
          </div>
          <h1 id="history-heading" className="text-headline-lg font-bold tracking-tight text-text-primary">
            Conversion History &amp; File Management
          </h1>
          <p className="max-w-2xl text-body-md text-text-secondary">
            Inspect past transformations, download original or converted artifacts, and manage stored file
            lifecycles independently.
          </p>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2.5">
          <Button
            variant="outline"
            disabled={entries.length === 0}
            onClick={() => setConfirm({ type: 'clear' })}
            className="border-error-border text-error-text hover:bg-error-bg"
          >
            <Trash2 className="mr-2 h-4 w-4" aria-hidden="true" />
            Clear Complete History
          </Button>
          <Button
            onClick={() => navigate('/converter')}
            className="bg-gradient-brand text-text-inverse shadow-sm hover:bg-gradient-brand-hover"
          >
            <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
            New Conversion
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total Archive Jobs"
          icon={History}
          tone="bg-brand-primary-soft text-brand-primary"
          value={(stats?.total ?? entries.length).toLocaleString('en-US')}
          hint="Records"
        />
        <StatCard
          label="R2 Vault Objects"
          icon={Cloud}
          tone="bg-brand-secondary-soft text-brand-secondary"
          value={storage.objectCount.toLocaleString('en-US')}
          hint={`${storage.outputCount} converted · ${storage.originalCount} originals`}
        />
        <StatCard
          label="Retention Rule"
          icon={Shield}
          tone="bg-success-bg text-success-text"
          value="Indefinite"
          hint="Registered vault storage"
        />
        <StatCard
          label="Output Verification"
          icon={CheckCircle2}
          tone="bg-info-bg text-info-text"
          value={`${stats?.verificationRate ?? 0}%`}
          hint="Integrity verified"
          progress={stats?.verificationRate ?? 0}
        />
      </div>

      <div className="flex flex-col gap-3 rounded-xl border border-border-subtle bg-surface-primary p-4 shadow-card md:flex-row md:items-center">
        <div className="md:flex-1">
          <Input
            type="search"
            icon={Search}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by file name, schema or ID..."
            aria-label="Search conversion history"
          />
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="sm:w-56">
            <Select
              value={formatFilter}
              onChange={(event) => setFormatFilter(event.target.value)}
              aria-label="Filter by conversion format"
            >
              {FORMAT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </div>
          <div className="sm:w-44">
            <Select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              aria-label="Filter by status"
            >
              {STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </div>
          <Button
            variant="outline"
            onClick={() => load({ silent: true })}
            disabled={refreshing}
            aria-label="Refresh history"
            className="shrink-0"
          >
            <RefreshCw className={cn('h-4 w-4', refreshing && 'animate-spin')} aria-hidden="true" />
            <span className="ml-2 hidden sm:inline">Refresh</span>
          </Button>
        </div>
      </div>

      <HistoryTable
        entries={filteredEntries}
        hasFilters={hasFilters}
        onResetFilters={resetFilters}
        onOpen={setSelectedId}
        onDownloadOutput={handleDownloadOutput}
        onDownloadOriginal={handleDownloadOriginal}
        onDeleteOutput={(entry) => setConfirm({ type: 'output', entry })}
        onDeleteOriginal={(entry) => setConfirm({ type: 'original', entry })}
        onDeleteEntry={requestDeleteEntry}
        onCancel={(entry) => setConfirm({ type: 'cancel', entry })}
        busyKey={busyKey}
      />

      <div className="flex flex-col gap-3 rounded-xl border border-border-subtle bg-surface-app p-4 lg:flex-row lg:items-center lg:justify-between">
        <p className="flex items-start gap-2 text-body-sm text-text-secondary">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-brand-primary" aria-hidden="true" />
          <span>
            <span className="font-medium text-text-primary">PRD §7.4 &amp; §7.5 —</span> Original uploads and
            converted outputs remain in your vault until you delete them. Clearing history preserves stored
            files.
          </span>
        </p>
        <Badge variant="info" className="self-start whitespace-nowrap">
          Cloudflare R2 Native
        </Badge>
      </div>

      <HistoryDetailsDrawer
        entry={selectedEntry}
        open={Boolean(selectedEntry)}
        onClose={() => setSelectedId(null)}
        onDownloadOutput={handleDownloadOutput}
        onDownloadOriginal={handleDownloadOriginal}
        onDeleteEntry={requestDeleteEntry}
      />

      <Dialog open={Boolean(confirm)} onOpenChange={(open) => !open && setConfirm(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <span className="mb-1 flex h-10 w-10 items-center justify-center rounded-full bg-error-bg text-error-text">
              <AlertTriangle className="h-5 w-5" aria-hidden="true" />
            </span>
            <DialogTitle>{confirmTitle}</DialogTitle>
            <DialogDescription>{confirmDescription}</DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:space-x-0">
            <Button variant="outline" onClick={() => setConfirm(null)} disabled={Boolean(busyKey)}>
              Cancel
            </Button>
            <Button
              variant={confirmCopy?.danger ? 'danger' : 'default'}
              onClick={executeConfirm}
              disabled={Boolean(busyKey)}
            >
              {busyKey ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" /> : null}
              {confirmCopy?.confirmLabel}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}