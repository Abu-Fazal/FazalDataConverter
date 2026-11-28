import { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { authApi } from '@/services/auth.api';

/**
 * Route guard for the Sole Admin console (PRD §3.5).
 * Verifies the server session and the admin role before rendering.
 */
export function AdminGuard({ children }) {
  const location = useLocation();
  const [status, setStatus] = useState('checking');

  useEffect(() => {
    let cancelled = false;

    authApi
      .getCurrentUser()
      .then((result) => {
        if (cancelled) return;
        const role = result?.user?.role;
        setStatus(result?.success && role === 'admin' ? 'allowed' : 'denied');
      })
      .catch(() => {
        if (!cancelled) setStatus('denied');
      });

    return () => {
      cancelled = true;
    };
  }, []);

  if (status === 'checking') {
    return (
      <div
        className="flex min-h-screen items-center justify-center bg-surface-app"
        role="status"
        aria-live="polite"
        aria-label="Checking administrator session"
      >
        <Loader2 className="h-6 w-6 animate-spin text-brand-primary" aria-hidden="true" />
      </div>
    );
  }

  if (status === 'denied') {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: `${location.pathname}${location.search}`, mode: 'admin' }}
      />
    );
  }

  return children;
}