import { useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  CheckCircle2,
  Eye,
  EyeOff,
  FileCheck2,
  Info,
  Loader2,
  Lock,
  Mail,
  ShieldCheck,
} from 'lucide-react';
import { Button } from '../ui/button.jsx';
import { Input } from '../ui/input.jsx';
import { cn } from '@/lib/utils';
import { authApi } from '@/services/auth.api';
import { systemApi } from '@/services/system.api';

const SUPPORTED_FORMATS = [
  { label: 'Excel', className: 'bg-info-bg text-info-text' },
  { label: 'JSON', className: 'bg-brand-primary-soft text-brand-primary-deep' },
  { label: 'BSON', className: 'bg-brand-secondary-soft text-brand-secondary-dark' },
  { label: 'JS', className: 'bg-accent-pink-soft text-accent-pink-dark' },
];

function GoogleMark() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.14C3.26 21.3 7.31 24 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.28 14.24c-.24-.72-.38-1.49-.38-2.24s.14-1.52.38-2.24V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.99-3.14Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.99 3.14c.95-2.85 3.6-4.96 6.72-4.96Z"
      />
    </svg>
  );
}

function ModeTabs({ mode, onChange }) {
  const userRef = useRef(null);
  const adminRef = useRef(null);

  function onKeyDown(event) {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const next = event.key === 'ArrowLeft' || event.key === 'Home' ? 'user' : 'admin';
    onChange(next);
    (next === 'user' ? userRef : adminRef).current?.focus();
  }

  const tabClass = (active) =>
    cn(
      'rounded-md px-3 py-2 text-[13px] transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary',
      active
        ? 'bg-surface-primary font-semibold text-text-primary shadow-sm'
        : 'font-medium text-text-secondary hover:text-text-primary',
    );

  return (
    <div
      role="tablist"
      aria-label="Sign in mode"
      onKeyDown={onKeyDown}
      className="mb-6 grid grid-cols-2 gap-1 rounded-[10px] bg-surface-secondary p-1"
    >
      <button
        ref={userRef}
        type="button"
        role="tab"
        id="tab-user"
        aria-selected={mode === 'user'}
        aria-controls="panel-user"
        tabIndex={mode === 'user' ? 0 : -1}
        onClick={() => onChange('user')}
        className={tabClass(mode === 'user')}
      >
        Registered Users
      </button>
      <button
        ref={adminRef}
        type="button"
        role="tab"
        id="tab-admin"
        aria-selected={mode === 'admin'}
        aria-controls="panel-admin"
        tabIndex={mode === 'admin' ? 0 : -1}
        onClick={() => onChange('admin')}
        className={tabClass(mode === 'admin')}
      >
        Admin Login
      </button>
    </div>
  );
}

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [mode, setMode] = useState(location.state?.mode === 'admin' ? 'admin' : 'user');

  const [googleLoading, setGoogleLoading] = useState(false);
  const [adminLoading, setAdminLoading] = useState(false);
  const [error, setError] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [recoveryVisible, setRecoveryVisible] = useState(false);
  const [recoveryLoading, setRecoveryLoading] = useState(false);

  const registeredRedirect = location.state?.from || '/converter';

  async function handleGoogleLogin() {
    setError('');
    setGoogleLoading(true);
    try {
      const result = await authApi.googleLogin();
      if (result?.success) {
        navigate(registeredRedirect, { replace: true });
      } else {
        setError('Google sign-in could not be completed. Please try again.');
      }
    } catch (loginError) {
      setError(loginError.message || 'Google sign-in failed. Please try again.');
    } finally {
      setGoogleLoading(false);
    }
  }

  async function handleAdminSubmit(event) {
    event.preventDefault();
    setError('');
    setAdminLoading(true);
    try {
      const result = await authApi.adminLogin(email.trim(), password);
      if (result?.success) {
        navigate('/admin', { replace: true });
      } else {
        setError('Incorrect admin email or password.');
      }
    } catch (loginError) {
      if (loginError.status === 423) {
        navigate('/admin/lockout', { replace: true });
        return;
      }
      const remaining = loginError.data?.remainingAttempts;
      setError(
        loginError.status === 401 && typeof remaining === 'number'
          ? `Incorrect admin email or password. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining before a 15-minute lockout.`
          : loginError.message || 'Admin sign-in failed. Please try again.',
      );
    } finally {
      setAdminLoading(false);
    }
  }

  async function handleRecoveryRequest() {
    setError('');
    setRecoveryVisible(false);
    if (!email.trim()) {
      setError('Enter the admin email first, then request a recovery link.');
      return;
    }
    setRecoveryLoading(true);
    try {
      await systemApi.requestAdminRecovery(email.trim());
      setRecoveryVisible(true);
    } catch (recoveryError) {
      setError(recoveryError.message || 'Recovery request could not be sent.');
    } finally {
      setRecoveryLoading(false);
    }
  }

  return (
    <div
      className="flex min-h-screen w-full items-center justify-center overflow-hidden px-6 py-8 text-text-primary"
      style={{
        background:
          'radial-gradient(at 50% 30%, rgba(99, 102, 241, 0.12), transparent 60%), radial-gradient(at 80% 70%, rgba(168, 85, 247, 0.08), transparent 50%), #f8f9fc',
      }}
    >
      <div className="relative w-full max-w-md">
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
          aria-labelledby="signin-title"
          className="relative rounded-[20px] border border-border-subtle bg-surface-primary p-8 shadow-panel"
        >
          <div className="mb-6 flex flex-col items-center text-center">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-[14px] bg-gradient-brand text-text-inverse shadow-brand-ambient">
              <FileCheck2 className="h-6 w-6" aria-hidden="true" />
            </div>
            <h1 id="signin-title" className="text-[24px] font-bold leading-8 tracking-tight text-text-primary">
              FazalDataConverter
            </h1>
            <p className="mt-1 text-[13.5px] leading-5 text-text-secondary">
              Precision dataset conversion for technical teams
            </p>
          </div>

          <ModeTabs
            mode={mode}
            onChange={(next) => {
              setMode(next);
              setError('');
            }}
          />

          {error ? (
            <p
              role="alert"
              className="mb-4 rounded-lg border border-error-border bg-error-bg px-3 py-2 text-body-sm text-error-text"
            >
              {error}
            </p>
          ) : null}

          {mode === 'user' ? (
            <div role="tabpanel" id="panel-user" aria-labelledby="tab-user" className="flex flex-col">
              <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={googleLoading}
                className="flex w-full items-center justify-center gap-3 rounded-lg bg-brand-primary px-4 py-3 text-sm font-semibold text-text-inverse shadow-brand-ambient transition-all hover:bg-brand-primary-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70"
              >
                <span className="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full bg-white p-0.5">
                  {googleLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin text-brand-primary" aria-hidden="true" />
                  ) : (
                    <GoogleMark />
                  )}
                </span>
                <span>{googleLoading ? 'Connecting to Google...' : 'Sign in with Google'}</span>
              </button>

              <div className="mt-4 flex items-start gap-2.5 rounded-[10px] border border-border-subtle bg-surface-app p-3.5">
                <Info className="mt-0.5 h-[18px] w-[18px] shrink-0 text-brand-primary" aria-hidden="true" />
                <p className="text-[12.5px] leading-[18px] text-text-secondary">
                  First-time sign-in automatically creates your workspace account. No separate registration is
                  required.
                </p>
              </div>

              <div className="mt-6 flex flex-wrap items-center justify-between gap-2 border-t border-border-subtle pt-5">
                <span className="text-label-sm uppercase tracking-[0.05em] text-text-muted">
                  Supported Formats
                </span>
                <div className="flex flex-wrap items-center gap-1.5">
                  {SUPPORTED_FORMATS.map((format) => (
                    <span
                      key={format.label}
                      className={cn(
                        'rounded-full px-2.5 py-[3px] text-label-sm font-semibold tracking-[0.01em]',
                        format.className,
                      )}
                    >
                      {format.label}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div role="tabpanel" id="panel-admin" aria-labelledby="tab-admin" className="flex flex-col">
              <form className="flex flex-col gap-4" onSubmit={handleAdminSubmit}>
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="admin-email" className="text-[13px] font-medium text-text-primary">
                    Admin Email
                  </label>
                  <Input
                    id="admin-email"
                    type="email"
                    icon={Mail}
                    autoComplete="username"
                    placeholder="admin@fazaldataconverter.io"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    required
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <label htmlFor="admin-password" className="text-[13px] font-medium text-text-primary">
                      Password
                    </label>
                    <button
                      type="button"
                      onClick={handleRecoveryRequest}
                      disabled={recoveryLoading}
                      className="text-[12.5px] font-medium text-brand-primary hover:text-brand-primary-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary disabled:opacity-60"
                    >
                      {recoveryLoading ? 'Sending…' : 'Forgot Password?'}
                    </button>
                  </div>
                  <div className="relative">
                    <Input
                      id="admin-password"
                      type={showPassword ? 'text' : 'password'}
                      icon={Lock}
                      autoComplete="current-password"
                      placeholder="Enter admin password"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      required
                      className="pr-11"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((visible) => !visible)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      aria-pressed={showPassword}
                      className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-text-muted transition-colors hover:bg-surface-secondary hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
                    >
                      {showPassword ? (
                        <EyeOff className="h-[18px] w-[18px]" aria-hidden="true" />
                      ) : (
                        <Eye className="h-[18px] w-[18px]" aria-hidden="true" />
                      )}
                    </button>
                  </div>
                </div>

                {recoveryVisible ? (
                  <div
                    role="status"
                    className="flex items-center gap-2 rounded-lg bg-brand-primary-soft px-3 py-2 text-[12.5px] text-brand-primary"
                  >
                    <Mail className="h-[18px] w-[18px] shrink-0" aria-hidden="true" />
                    <span>If this email is registered, a single-use recovery link valid for 15 minutes has been sent.</span>
                  </div>
                ) : null}

                <Button
                  type="submit"
                  size="large"
                  disabled={adminLoading}
                  className="mt-1 w-full"
                >
                  {adminLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                      Signing in...
                    </>
                  ) : (
                    'Sign in as Admin'
                  )}
                </Button>
              </form>

              <div className="mt-5 flex items-start gap-2.5 rounded-lg border border-warning-border bg-warning-bg p-3.5">
                <ShieldCheck className="mt-0.5 h-[18px] w-[18px] shrink-0 text-warning-text" aria-hidden="true" />
                <div className="flex flex-col gap-0.5">
                  <span className="flex items-center gap-1.5 text-[13px] font-semibold text-warning-text">
                    <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                    Lockout Protection Active
                  </span>
                  <p className="text-[12px] leading-[17px] text-warning-text">
                    Sole Admin account only. 5 consecutive failed attempts trigger a 15-minute temporary
                    lockout.
                  </p>
                </div>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}