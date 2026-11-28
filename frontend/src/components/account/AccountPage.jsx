import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  BadgeCheck,
  Database,
  Infinity as InfinityIcon,
  Loader2,
  Lock,
  LogOut,
  Monitor,
  RefreshCw,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  UploadCloud,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../ui/button.jsx';
import { Badge } from '../ui/badge.jsx';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card.jsx';
import { Progress } from '../ui/progress.jsx';
import { Skeleton } from '../ui/skeleton.jsx';
import { DeleteAccountDialog } from './DeleteAccountDialog.jsx';
import { authApi } from '@/services/auth.api';
import { accountApi } from '@/services/account.api';
import { formatBytes } from '../history/format.js';

const GIB = 1024 * 1024 * 1024;

function ReadOnlyField({ label, value }) {
  return (
    <div>
      <dt className="text-label-sm uppercase tracking-wider text-text-muted">{label}</dt>
      <dd className="mt-1 flex items-center gap-2 rounded-lg border border-border-subtle bg-surface-app px-3 py-2.5">
        <Lock className="h-4 w-4 shrink-0 text-text-muted" aria-hidden="true" />
        <span className="truncate text-body-md font-medium text-text-primary">{value || '—'}</span>
      </dd>
    </div>
  );
}

function StorageTile({ icon: Icon, label, count, detail }) {
  return (
    <div className="rounded-xl border border-border-subtle bg-surface-app p-3.5">
      <span className="flex items-center gap-1.5 text-label-sm uppercase tracking-wider text-text-muted">
        <Icon className="h-4 w-4 text-brand-primary" aria-hidden="true" />
        {label}
      </span>
      <p className="mt-1 text-headline-sm font-bold tabular-nums text-text-primary">
        {count.toLocaleString('en-US')}
      </p>
      <p className="text-label-sm tabular-nums text-text-muted">{detail}</p>
    </div>
  );
}

export function AccountPage() {
  const navigate = useNavigate();
  const [account, setAccount] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const load = useCallback(async () => {
    try {
      const response = await accountApi.getAccount();
      setAccount(response);
      setError('');
    } catch (loadError) {
      setError(loadError.message || 'Could not load your account details.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleSignOut() {
    setSigningOut(true);
    await authApi.logout();
    toast.success('Signed out of this device');
    navigate('/');
  }

  if (loading) {
    return (
      <div className="space-y-6" aria-busy="true" aria-label="Loading account settings">
        <Skeleton className="h-4 w-64" />
        <Skeleton className="h-9 w-80 max-w-full" />
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-6">
            <Skeleton className="h-72 w-full" />
            <Skeleton className="h-56 w-full" />
          </div>
          <div className="space-y-6">
            <Skeleton className="h-80 w-full" />
            <Skeleton className="h-48 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !account) {
    return (
      <div className="mx-auto max-w-lg rounded-xl border border-error-border bg-surface-primary p-8 text-center shadow-card">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-error-bg text-error-text">
          <AlertTriangle className="h-6 w-6" aria-hidden="true" />
        </span>
        <h1 className="mt-4 text-headline-sm text-text-primary">Account settings are unavailable</h1>
        <p className="mt-1 text-body-sm text-text-secondary">{error || 'Please sign in again to continue.'}</p>
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          <Button
            onClick={() => {
              setLoading(true);
              setError('');
              load();
            }}
          >
            <RefreshCw className="mr-2 h-4 w-4" aria-hidden="true" />
            Try again
          </Button>
          <Button variant="outline" onClick={() => navigate('/login')}>
            Go to sign in
          </Button>
        </div>
      </div>
    );
  }

  const { profile, session, storage } = account;
  const isAdmin = profile.role === 'admin';
  const isGoogle = profile.provider === 'google';
  const quota = storage.quotaBytes || GIB;
  const used = storage.usedBytes || 0;
  const percent = Math.min(100, Math.round((used / quota) * 1000) / 10);
  const percentLabel = used > 0 && percent < 0.1 ? '<0.1' : String(percent);
  const donutStop = Math.max(percent, 0.5);
  const displayName = profile.name || 'User';
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <section aria-labelledby="account-heading" className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2 text-label-sm uppercase tracking-wider">
            <span className="text-brand-primary">01 / Account &amp; Storage</span>
            <span className="text-text-muted">{isAdmin ? 'Administrator' : 'Registered User'}</span>
          </div>
          <h1 id="account-heading" className="text-headline-lg font-bold tracking-tight text-text-primary">
            Account Settings
          </h1>
          <p className="max-w-xl text-body-md text-text-secondary">
            Manage your identity, active session, and the datasets stored in your Cloudflare R2 vault.
          </p>
        </div>
        <Badge variant="success" dot className="self-start sm:self-auto">
          Cloudflare R2 Synced
        </Badge>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-6">
          <Card>
            <CardHeader className="gap-2">
              <span className="text-label-sm uppercase tracking-wider text-text-muted">Identity</span>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <CardTitle>{isGoogle ? 'Google Account Profile' : 'Administrator Profile'}</CardTitle>
                <Badge variant={isGoogle ? 'success' : 'neutral'}>
                  {isGoogle ? (
                    <BadgeCheck className="h-3.5 w-3.5" aria-hidden="true" />
                  ) : (
                    <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
                  )}
                  {isGoogle ? 'Google-Linked' : 'Password-Managed'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="flex items-center gap-3.5">
                {profile.avatarUrl ? (
                  <img
                    src={profile.avatarUrl}
                    alt=""
                    className="h-14 w-14 rounded-full border border-border-subtle object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <span
                    className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-brand text-lg font-semibold text-text-inverse"
                    aria-hidden="true"
                  >
                    {initial}
                  </span>
                )}
                <div className="min-w-0">
                  <p className="truncate text-headline-sm font-semibold text-text-primary">{displayName}</p>
                  <p className="truncate text-body-sm text-text-secondary">{profile.email || '—'}</p>
                  <p className="mt-0.5 flex items-center gap-1 text-label-sm text-text-muted">
                    <Lock className="h-3 w-3" aria-hidden="true" />
                    {isGoogle ? 'Managed by Google Account' : 'Managed by server environment'}
                  </p>
                </div>
              </div>

              <dl className="grid gap-4 sm:grid-cols-2">
                <ReadOnlyField label="Full Name" value={profile.name} />
                <ReadOnlyField label="Email Address" value={profile.email} />
              </dl>

              <p className="flex items-start gap-2 rounded-lg border border-border-subtle bg-surface-secondary p-3 text-body-sm text-text-secondary">
                <Lock className="mt-0.5 h-4 w-4 shrink-0 text-brand-primary" aria-hidden="true" />
                {isGoogle
                  ? 'Profile details are read-only and managed directly through your linked Google Account.'
                  : 'Admin credentials are managed through the server environment and cannot be edited here.'}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="gap-2">
              <span className="text-label-sm uppercase tracking-wider text-text-muted">Security &amp; Access</span>
              <CardTitle>Session Management</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3 rounded-xl border border-border-subtle bg-surface-app p-3.5">
                <span
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-brand-primary-border bg-brand-primary-soft text-brand-primary"
                  aria-hidden="true"
                >
                  <Monitor className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-2 text-label-lg font-semibold text-text-primary">
                    <span className="truncate">{session.device || 'Current browser'}</span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-success-bg px-2 py-0.5 text-label-sm font-medium text-success-text">
                      <span className="h-1.5 w-1.5 rounded-full bg-success-dot" aria-hidden="true" />
                      Active Now
                    </span>
                  </p>
                  <p className="mt-0.5 truncate text-body-sm text-text-secondary">
                    Session ID: fdc_{session.id || 'transient'} • Authenticated via{' '}
                    {isGoogle ? 'Google OAuth' : 'admin credentials'}
                  </p>
                </div>
              </div>

              <Button variant="outline" onClick={handleSignOut} disabled={signingOut}>
                {signingOut ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                ) : (
                  <LogOut className="mr-2 h-4 w-4" aria-hidden="true" />
                )}
                Sign Out of Current Device
              </Button>

              <p className="flex items-start gap-2 text-label-sm leading-5 text-text-muted">
                <Shield className="mt-0.5 h-4 w-4 shrink-0 text-brand-secondary" aria-hidden="true" />
                Signing out here only ends the session on this browser. Other active device sessions remain
                unaffected.
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader className="gap-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-label-sm uppercase tracking-wider text-text-muted">Object Storage</span>
                <Badge className="border-brand-secondary-border bg-brand-secondary-soft text-brand-secondary-dark">
                  R2 Bucket
                </Badge>
              </div>
              <CardTitle>Cloudflare R2 Usage</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="flex flex-wrap items-center gap-5">
                <div
                  className="relative h-28 w-28 shrink-0 rounded-full"
                  style={{
                    background: `conic-gradient(from -90deg, #5145E5 0%, #7C3AED ${donutStop}%, #E6E8F0 ${donutStop}%, #E6E8F0 100%)`,
                  }}
                  role="img"
                  aria-label={`${percentLabel}% of ${formatBytes(quota)} storage quota used`}
                >
                  <div className="absolute inset-[10px] flex flex-col items-center justify-center rounded-full bg-surface-primary">
                    <span className="text-headline-sm font-bold tabular-nums text-text-primary">{percentLabel}%</span>
                    <span className="text-label-sm text-text-muted">of {formatBytes(quota)}</span>
                  </div>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-label-sm uppercase tracking-wider text-text-muted">Total Storage Used</p>
                  <p className="mt-0.5 text-headline-lg font-bold tabular-nums text-text-primary">
                    {formatBytes(used)}
                    <span className="ml-1 text-body-md font-normal text-text-muted">/ {formatBytes(quota)}</span>
                  </p>
                  <p className="mt-1 text-body-sm text-text-secondary">
                    {percentLabel}% quota used • {storage.objectCount} total objects persisted
                  </p>
                </div>
              </div>

              <Progress value={percent} aria-label="Cloudflare R2 storage usage" />

              <div className="grid grid-cols-2 gap-3">
                <StorageTile
                  icon={UploadCloud}
                  label="Originals"
                  count={storage.originalCount || 0}
                  detail={`${formatBytes(storage.originalBytes)} active`}
                />
                <StorageTile
                  icon={Database}
                  label="Converted"
                  count={storage.outputCount || 0}
                  detail={`${formatBytes(storage.outputBytes)} outputs`}
                />
              </div>

              <div className="flex items-start gap-2.5 rounded-xl border border-border-subtle bg-surface-app p-3.5">
                <InfinityIcon className="mt-0.5 h-5 w-5 shrink-0 text-brand-primary" aria-hidden="true" />
                <div>
                  <p className="text-label-lg font-semibold text-text-primary">No Auto-Expiry Policy</p>
                  <p className="mt-0.5 text-body-sm text-text-secondary">
                    Your original datasets and converted outputs remain stored in Cloudflare R2 indefinitely
                    until you manually delete them or close your account.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {!isAdmin ? (
            <Card className="border-error-border">
              <CardHeader className="gap-2">
                <span className="flex items-center gap-1.5 text-label-sm uppercase tracking-wider text-error-text">
                  <ShieldAlert className="h-4 w-4" aria-hidden="true" />
                  Danger Zone
                </span>
                <CardTitle>Permanent Account Self-Deletion</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-body-md text-text-secondary">
                  Deleting your account is irreversible. It requires fresh Google re-authentication and
                  explicit final confirmation, permanently erasing your profile, conversion history, and all
                  Cloudflare R2 files.
                </p>
                <Button variant="danger" onClick={() => setDeleteOpen(true)}>
                  <Trash2 className="mr-2 h-4 w-4" aria-hidden="true" />
                  Delete Account
                </Button>
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>

      {!isAdmin ? (
        <DeleteAccountDialog
          open={deleteOpen}
          onOpenChange={setDeleteOpen}
          account={account}
          onDeleted={() => navigate('/', { replace: true })}
        />
      ) : null}
    </section>
  );
}