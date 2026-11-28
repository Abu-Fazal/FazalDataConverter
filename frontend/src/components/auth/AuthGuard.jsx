import { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { authApi } from '@/services/auth.api';

/**
 * Route guard for registered-user screens.
 * Verifies the server session and redirects to sign-in with the intended path.
 */
export function AuthGuard({ children, allowGuest = false, redirectTo = '/login' }) {
  const location = useLocation();
  const [status, setStatus] = useState(allowGuest ? 'allowed' : 'checking');

  useEffect(() => {
    if (allowGuest) return undefined;
    let cancelled = false;

    authApi
      .getCurrentUser()
      .then((result) => {
        if (!cancelled) setStatus(result?.success ? 'allowed' : 'denied');
      })
      .catch(() => {
        if (!cancelled) setStatus('denied');
      });

    return () => {
      cancelled = true;
    };
  }, [allowGuest]);

  if (status === 'checking') {
    return (
      <div
        className="flex min-h-[420px] items-center justify-center"
        role="status"
        aria-live="polite"
        aria-label="Checking your session"
      >
        <Loader2 className="h-6 w-6 animate-spin text-brand-primary" aria-hidden="true" />
      </div>
    );
  }

  if (status === 'denied') {
    return (
      <Navigate
        to={redirectTo}
        replace
        state={{ from: `${location.pathname}${location.search}` }}
      />
    );
  }

  return children;
}