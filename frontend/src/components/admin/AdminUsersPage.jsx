import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Download,
  Eye,
  Filter,
  Loader2,
  RefreshCw,
  Search,
  ShieldCheck,
  Trash2,
  UserCheck,
  UserX,
  Users,
} from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '../ui/badge.jsx';
import { Button } from '../ui/button.jsx';
import { Card } from '../ui/card.jsx';
import { Input } from '../ui/input.jsx';
import { Select } from '../ui/select.jsx';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../ui/table.jsx';
import { MetricCard } from './MetricCard.jsx';
import { DeleteUserDialog } from './DeleteUserDialog.jsx';
import { UserInspectorDialog } from './UserInspectorDialog.jsx';
import { adminApi } from '@/services/admin.api';
import { formatBytes, formatShortDate, ownerInitials, percent } from './format.js';

const PAGE_SIZE = 10;

const ACCOUNT_STATUS = {
  active: { variant: 'success', label: 'Active' },
  suspended: { variant: 'warning', label: 'Suspended' },
  deleted: { variant: 'neutral', label: 'Deleted' },
};

function successRate(user) {
  if (user.conversions.total === 0) return null;
  return Math.round((user.conversions.completed / user.conversions.total) * 1000) / 10;
}

export function AdminUsersPage() {
  const [dashboard, setDashboard] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionId, setActionId] = useState('');
  const [inspectId, setInspectId] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [page, setPage] = useState(1);

  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [status, setStatus] = useState('all');
  const [activity, setActivity] = useState('all');
  const [joined, setJoined] = useState('all');
  const [reloadKey, setReloadKey] = useState(0);

  const filters = useMemo(
    () => ({ query: debouncedQuery, status, activity, joined }),
    [debouncedQuery, status, activity, joined],
  );

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuery(query.trim()), 250);
    return () => window.clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    setPage(1);
  }, [debouncedQuery, status, activity, joined]);

  useEffect(() => {
    adminApi.getDashboard().then(setDashboard).catch(() => {});
  }, [reloadKey]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');

    adminApi
      .getUsers(filters)
      .then((res) => {
        if (!cancelled) setUsers(res.data || []);
      })
      .catch((loadError) => {
        if (!cancelled) setError(loadError.message || 'Could not load the user directory.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [filters, reloadKey]);

  const metrics = dashboard?.metrics;

  const totalPages = Math.max(1, Math.ceil(users.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const visible = users.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const handleSuspend = useCallback(async (user) => {
    setActionId(user.publicId);
    try {
      const result = await adminApi.suspendUser(user.publicId, 'Suspended from admin console');
      toast.success(result.message || 'User suspended', {
        description: 'Session access revoked on the next request.',
      });
      setReloadKey((key) => key + 1);
    } catch (actionError) {
      toast.error('Suspension failed', { description: actionError.message });
    } finally {
      setActionId('');
    }
  }, []);

  const handleReactivate = useCallback(async (user) => {
    setActionId(user.publicId);
    try {
      const result = await adminApi.reactivateUser(user.publicId);
      toast.success(result.message || 'User reactivated');
      setReloadKey((key) => key + 1);
    } catch (actionError) {
      toast.error('Reactivation failed', { description: actionError.message });
    } finally {
      setActionId('');
    }
  }, []);

  async function handleExport() {
    try {
      await adminApi.exportUsers(filters);
      toast.success('User list exported', {
        description: `${users.length} metadata rows · CSV (RFC 4180).`,
      });
    } catch (exportError) {
      toast.error('Export failed', { description: exportError.message });
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-border-subtle bg-surface-primary p-5 shadow-card sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="info" dot>
                Zero file-access policy active
              </Badge>
              <Badge variant="neutral">PRD §8.2 · TRD §4.1</Badge>
            </div>
            <h2 className="mt-3 text-headline-lg text-text-primary">User Directory &amp; Access Governance</h2>
            <p className="mt-1 max-w-3xl text-body-sm text-text-secondary">
              Manage registered accounts, session lifecycles, and user-level isolation. Admins can view
              activity metadata but have zero access to file contents.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="small" onClick={() => setReloadKey((key) => key + 1)} disabled={loading}>
              <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} aria-hidden="true" />
              Sync
            </Button>
            <Button size="small" onClick={handleExport} disabled={users.length === 0}>
              <Download className="mr-2 h-4 w-4" aria-hidden="true" />
              Export user list (CSV)
            </Button>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Total registered"
          value={(metrics?.totalUsers ?? users.length).toLocaleString()}
          hint="Google OAuth provisioned accounts"
          icon={Users}
          tone="brand"
        />
        <MetricCard
          label="Active accounts"
          value={(metrics?.activeUsers ?? 0).toLocaleString()}
          hint={
            metrics?.totalUsers
              ? `${percent((metrics.activeUsers / metrics.totalUsers) * 100)} of directory`
              : 'No accounts yet'
          }
          icon={UserCheck}
          tone="success"
        />
        <MetricCard
          label="Suspended users"
          value={(metrics?.suspendedUsers ?? 0).toLocaleString()}
          hint="Sessions revoked on next request"
          icon={UserX}
          tone={metrics?.suspendedUsers ? 'warning' : 'neutral'}
        />
        <MetricCard
          label="Permanent deletions (30d)"
          value={(metrics?.deletedLast30d ?? 0).toLocaleString()}
          hint={`${metrics?.deletedUsers ?? 0} archived accounts total`}
          icon={Trash2}
          tone={metrics?.deletedLast30d ? 'error' : 'neutral'}
        />
      </div>

      <p className="flex items-start gap-2 rounded-xl border border-info-border bg-info-bg px-4 py-3 text-body-sm text-info-text">
        <ShieldCheck size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
        Admins can manage identity states and monitor storage consumption, but payloads and conversion
        outputs remain end-to-end user-isolated.
      </p>

      <Card className="p-4 sm:p-5">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
          <div className="min-w-0 flex-1">
            <label htmlFor="user-search" className="sr-only">
              Search users
            </label>
            <Input
              id="user-search"
              icon={Search}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by name, email, or user ID"
              autoComplete="off"
            />
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="sm:w-44">
              <label htmlFor="user-status" className="sr-only">
                Filter by status
              </label>
              <Select id="user-status" value={status} onChange={(event) => setStatus(event.target.value)}>
                <option value="all">Status: All</option>
                <option value="active">Active only</option>
                <option value="suspended">Suspended only</option>
                <option value="deleted">Deleted only</option>
              </Select>
            </div>
            <div className="sm:w-44">
              <label htmlFor="user-activity" className="sr-only">
                Filter by activity
              </label>
              <Select id="user-activity" value={activity} onChange={(event) => setActivity(event.target.value)}>
                <option value="all">Activity: All levels</option>
                <option value="active">Active (30 days)</option>
                <option value="idle">Inactive / zero jobs</option>
              </Select>
            </div>
            <div className="sm:w-44">
              <label htmlFor="user-joined" className="sr-only">
                Filter by join date
              </label>
              <Select id="user-joined" value={joined} onChange={(event) => setJoined(event.target.value)}>
                <option value="all">Joined: All-time</option>
                <option value="30d">Last 30 days</option>
                <option value="quarter">Last quarter</option>
                <option value="ytd">Year to date</option>
              </Select>
            </div>
          </div>
        </div>
        <p className="mt-3 flex items-center gap-1.5 text-[11px] text-text-muted">
          <Filter size={12} aria-hidden="true" />
          Showing {users.length} matching accounts
        </p>
      </Card>

      {error ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-error-border bg-error-bg px-4 py-3 text-body-sm text-error-text">
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
            <span className="sr-only">Loading user directory</span>
          </div>
        ) : null}

        <Table caption="Registered user directory with governance actions">
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>User info</TableHead>
              <TableHead>User ID</TableHead>
              <TableHead>Quota &amp; storage</TableHead>
              <TableHead>Lifetime conversions</TableHead>
              <TableHead>Account status</TableHead>
              <TableHead className="text-right">Admin actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visible.map((user) => {
              const statusConfig = ACCOUNT_STATUS[user.status] || ACCOUNT_STATUS.deleted;
              const rate = successRate(user);
              const quotaPct = user.quotaBytes > 0 ? (user.storageBytes / user.quotaBytes) * 100 : 0;
              const busy = actionId === user.publicId;
              return (
                <TableRow key={user.publicId}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <span
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-brand-primary-surface bg-brand-primary-soft text-xs font-semibold text-brand-primary"
                        aria-hidden="true"
                      >
                        {ownerInitials(user.name)}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-body-md font-semibold text-text-primary">{user.name}</p>
                        <p className="truncate text-body-sm text-text-secondary">{user.email}</p>
                        <p className="text-[11px] text-text-muted">Joined {formatShortDate(user.joinedAt)}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="whitespace-nowrap font-mono text-xs text-text-secondary">
                    {user.publicId}
                  </TableCell>
                  <TableCell className="min-w-[170px]">
                    <p className="text-body-sm tabular-nums text-text-primary">
                      {formatBytes(user.storageBytes)} / {formatBytes(user.quotaBytes)}
                    </p>
                    <div
                      className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-surface-secondary"
                      role="progressbar"
                      aria-label={`${user.name} storage usage`}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-valuenow={Math.round(quotaPct)}
                    >
                      <div
                        className="h-full rounded-full bg-gradient-brand"
                        style={{ width: `${Math.min(100, Math.max(quotaPct, user.storageBytes > 0 ? 1 : 0))}%` }}
                      />
                    </div>
                    <p className="mt-1 text-[11px] text-text-muted">
                      {user.originalCount} originals · {user.outputCount} outputs
                    </p>
                  </TableCell>
                  <TableCell>
                    <p className="text-body-sm font-medium tabular-nums text-text-primary">
                      {user.conversions.total} jobs
                    </p>
                    <p className="text-[11px] text-text-muted">
                      {rate == null ? 'No runs logged' : `${rate}% success`}
                      {user.conversions.failed > 0 ? ` · ${user.conversions.failed} failed` : ''}
                    </p>
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusConfig.variant} dot>
                      {statusConfig.label}
                    </Badge>
                    {user.status === 'suspended' && user.suspendedReason ? (
                      <p className="mt-1 max-w-[150px] truncate text-[11px] text-text-muted" title={user.suspendedReason}>
                        {user.suspendedReason}
                      </p>
                    ) : null}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap items-center justify-end gap-1.5">
                      <Button
                        size="small"
                        variant="outline"
                        onClick={() => setInspectId(user.publicId)}
                        aria-label={`Inspect metadata for ${user.name}`}
                      >
                        <Eye className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
                        Inspect
                      </Button>
                      {user.status === 'active' ? (
                        <Button
                          size="small"
                          variant="secondary"
                          disabled={busy}
                          onClick={() => handleSuspend(user)}
                        >
                          {busy ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : null}
                          Suspend
                        </Button>
                      ) : null}
                      {user.status === 'suspended' ? (
                        <Button
                          size="small"
                          variant="secondary"
                          disabled={busy}
                          onClick={() => handleReactivate(user)}
                        >
                          {busy ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : null}
                          Reactivate
                        </Button>
                      ) : null}
                      {user.status !== 'deleted' ? (
                        <Button
                          size="small"
                          variant="ghost"
                          className="text-error-text hover:bg-error-bg"
                          onClick={() => setDeleteTarget(user)}
                          aria-label={`Delete ${user.name}`}
                        >
                          <Trash2 className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
                          Delete
                        </Button>
                      ) : (
                        <span className="text-[11px] font-medium text-text-muted">Archived</span>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
            {!loading && visible.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={6} className="py-10 text-center">
                  <p className="text-body-md font-medium text-text-primary">No users match these filters</p>
                  <p className="mt-1 text-body-sm text-text-secondary">
                    Registered accounts appear after their first Google sign-in.
                  </p>
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </div>

      {users.length > 0 ? (
        <div className="flex flex-col gap-3 text-body-sm text-text-secondary sm:flex-row sm:items-center sm:justify-between">
          <span>
            Showing {(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, users.length)} of{' '}
            {users.length} users
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

      <UserInspectorDialog
        open={Boolean(inspectId)}
        onOpenChange={(open) => (!open ? setInspectId(null) : null)}
        userId={inspectId}
      />

      <DeleteUserDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => (!open ? setDeleteTarget(null) : null)}
        user={deleteTarget}
        onDeleted={(result) => {
          toast.success('Account permanently deleted', {
            description: `${result.removedJobs ?? 0} history entries and ${result.purgedFiles ?? 0} stored files purged.`,
          });
          setDeleteTarget(null);
          setReloadKey((key) => key + 1);
        }}
      />
    </div>
  );
}