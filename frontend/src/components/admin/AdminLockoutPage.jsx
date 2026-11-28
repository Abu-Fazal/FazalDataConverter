import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  CheckCircle2,
  Loader2,
  Lock,
  Mail,
  ShieldAlert,
  ShieldCheck,
  Timer,
} from 'lucide-react';
import { Badge } from '../ui/badge.jsx';
import { Button } from '../ui/button.jsx';
import { Input } from '../ui/input.jsx';
import { systemApi } from '@/services/system.api';
import { formatClock, formatDateTime } from './format.js';

/**
 * Sole-admin lockout state and password recovery (PRD §3.6).
 * Public screen — no navbar or footer shell, no credential hints.
 */
export function AdminLockoutPage() {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [remaining, setRemaining] = useState(0);
  const [email, setEmail] = useState('');
  const [requesting, setRequesting] = useState(false);
  const [recoveryMessage, setRecoveryMessage] = useState('');
  const [error, setError] = useState('');
  const refreshingRef = useRef(false);

  const loadStatus = useCallback(async () => {
    try {
      const res = await systemApi.getLockoutStatus();
      setStatus(res);
      setRemaining(res?.remainingSeconds || 0);
      setError('');
    } catch (loadError) {
      setError(loadError.message || 'Could not read the lockout status.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  useEffect(() => {
    if (remaining <= 0) return undefined;
    const timer = window.setInterval(() => {
      setRemaining((current) => Math.max(0, current - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [remaining]);

  useEffect(() => {
    if (remaining > 0 || loading || !status?.locked || refreshingRef.current) return;
    refreshingRef.current = true;
    loadStatus().finally(() => {
      refreshingRef.current = false;
    });
  }, [remaining, loading, status?.locked, loadStatus]);

  async function handleRecovery(event) {
    event.preventDefault();
    setError('');
    setRequesting(true);
    try {
      const result = await systemApi.requestAdminRecovery(email.trim());
      setRecoveryMessage(
        result?.message ||
          'If this email is registered, a single-use recovery link valid for 15 minutes has been sent.',
      );
    } catch (requestError) {
      setError(requestError.message || 'Recovery request could not be sent.');
    } finally {
      setRequesting(false);
    }
  }

  const totalSeconds = (status?.durationMinutes || 15) * 60;
  const progress = status?.locked
    ? Math.min(100, Math.max(0, ((totalSeconds - remaining) / Math.max(totalSeconds, 1)) * 100))
    : 0;

  return (
    <div
      className="flex min-h-screen w-full items-center justify-center px-6 py-8 text-text-primary"
      style={{
        background:
          'radial-gradient(at 50% 30%, rgba(99, 102, 241, 0.12), transparent 60%), radial-gradient(at 80% 70%, rgba(168, 85, 247, 0.08), transparent 50%), #f8f9fc',
      }}
    >
      <div className="relative w-full max-w-lg">
        <div
          className="pointer-events-none absolute -left-12 -top-12 h-48 w-48 rounded-full blur-3xl"
          style={{ background: 'rgba(81, 69, 229, 0.08)' }}
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute -bottom-12 -right-12 h-56 w-56 rounded-full blur-3xl"
          style={{ background: 'rgba(124, 58, 237, 0.08)' }}
          aria-hidden="true"
        />

        <section
          aria-labelledby="lockout-title"
          className="relative rounded-[20px] border border-border-subtle bg-surface-primary p-8 shadow-panel"
        >
          <div className="flex flex-col items-center text-center">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-[14px] bg-gradient-to-br from-danger to-[#B42318] text-text-inverse shadow-brand-ambient">
              {loading ? (
                <Loader2 className="h-6 w-6 animate-spin" aria-hidden="true" />
              ) : (
                <ShieldAlert className="h-6 w-6" aria-hidden="true" />
              )}
            </div>
            <h1 id="lockout-title" className="text-[24px] font-bold leading-8 tracking-tight text-text-primary">
              {loading ? 'Checking admin access' : status?.locked ? 'Admin access temporarily locked' : 'No active lockout'}
            </h1>
            <p className="mt-1 max-w-sm text-[13.5px] leading-5 text-text-secondary">
              {loading
                ? 'Reading the current administrative lockout state.'
                : status?.locked
                  ? 'Too many consecutive failed sign-in attempts triggered a temporary safety lockout on the Sole Admin account.'
                  : 'The admin account is not currently locked. You can return to the sign-in screen and try again.'}
            </p>
          </div>

          {error ? (
            <p
              role="alert"
              className="mt-5 rounded-lg border border-error-border bg-error-bg px-3 py-2 text-body-sm text-error-text"
            >
              {error}
            </p>
          ) : null}

          {!loading && status?.locked ? (
            <>
              <div className="mt-6 rounded-[14px] border border-error-border bg-error-bg px-5 py-5 text-center">
                <p className="flex items-center justify-center gap-1.5 text-label-sm uppercase tracking-[0.05em] text-error-text">
                  <Timer size={14} aria-hidden="true" />
                  Time remaining
                </p>
                <p
                  className="mt-1 text-[40px] font-bold leading-tight tabular-nums text-text-primary"
                  aria-live="polite"
                  aria-label={`${Math.floor(remaining / 60)} minutes and ${remaining % 60} seconds remaining`}
                >
                  {formatClock(remaining)}
                </p>
                <div
                  className="mx-auto mt-2 h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-surface-secondary"
                  role="progressbar"
                  aria-label="Lockout window elapsed"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={Math.round(progress)}
                >
                  <div className="h-full rounded-full bg-danger transition-all duration-1000" style={{ width: `${progress}%` }} />
                </div>
                <p className="mt-2 text-[11.5px] text-text-secondary">
                  Lockout ends {status.lockoutEndsAt ? formatDateTime(status.lockoutEndsAt) : 'shortly'} ·{' '}
                  {status.durationMinutes}-minute window
                </p>
              </div>

              <dl className="mt-4 grid grid-cols-2 gap-3 text-left">
                <div className="rounded-lg border border-border-subtle bg-surface-app px-3 py-2">
                  <dt className="text-[11px] uppercase tracking-[0.05em] text-text-muted">Failed attempts</dt>
                  <dd className="mt-0.5 text-body-md font-semibold tabular-nums text-text-primary">
                    {status.failedAttempts} / {status.threshold}
                  </dd>
                </div>
                <div className="rounded-lg border border-border-subtle bg-surface-app px-3 py-2">
                  <dt className="text-[11px] uppercase tracking-[0.05em] text-text-muted">Source IP</dt>
                  <dd className="mt-0.5 truncate font-mono text-xs text-text-primary">{status.lastSourceIp || 'unknown'}</dd>
                </div>
              </dl>
            </>
          ) : null}

          {!loading && !status?.locked ? (
            <div className="mt-6 flex items-center gap-2 rounded-lg border border-success-border bg-success-bg px-3 py-2.5 text-body-sm text-success-text">
              <CheckCircle2 size={16} className="shrink-0" aria-hidden="true" />
              Sign-in attempts are available again.
            </div>
          ) : null}

          <div className="mt-6 border-t border-border-subtle pt-5">
            <div className="flex items-center gap-2">
              <Lock className="h-4 w-4 text-brand-primary" aria-hidden="true" />
              <h2 className="text-label-lg font-semibold text-text-primary">Request a recovery link</h2>
            </div>
            <p className="mt-1 text-[12.5px] leading-5 text-text-secondary">
              Enter the Sole Admin email. If it matches, a single-use link valid for 15 minutes is sent.
              Responses are always generic so the account identity is never disclosed.
            </p>

            {recoveryMessage ? (
              <div
                role="status"
                className="mt-3 flex items-start gap-2 rounded-lg border border-info-border bg-info-bg px-3 py-2 text-body-sm text-info-text"
              >
                <Mail size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
                <span>{recoveryMessage}</span>
              </div>
            ) : (
              <form className="mt-3 flex flex-col gap-3 sm:flex-row" onSubmit={handleRecovery}>
                <div className="min-w-0 flex-1">
                  <label htmlFor="recovery-email" className="sr-only">
                    Admin email
                  </label>
                  <Input
                    id="recovery-email"
                    type="email"
                    icon={Mail}
                    autoComplete="email"
                    placeholder="admin@fazaldataconverter.io"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    required
                  />
                </div>
                <Button type="submit" size="medium" disabled={requesting}>
                  {requesting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" /> : null}
                  Send link
                </Button>
              </form>
            )}
          </div>

          <div className="mt-6 flex flex-col items-center gap-3 border-t border-border-subtle pt-5">
            <Button asChild variant="outline" size="small" className="w-full sm:w-auto">
              <Link to="/login" state={{ mode: 'admin' }}>
                <ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true" />
                Back to sign in
              </Link>
            </Button>
            <p className="flex items-start gap-2 text-[11px] leading-4 text-text-muted">
              <ShieldCheck size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
              Lockouts last {status?.durationMinutes ?? 15} minutes and counters reset only after a
              successful sign-in. Every attempt is recorded in the security ledger.
            </p>
            {status?.locked ? (
              <Badge variant="warning" dot>
                Lockout protection active
              </Badge>
            ) : null}
          </div>
        </section>
      </div>
    </div>
  );
}