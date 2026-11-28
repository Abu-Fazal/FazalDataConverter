import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

/**
 * Auth guard (Chunk C).
 * Protects routes - redirects unauthenticated users to login.
 * Can be configured to allow guest access.
 */
export function AuthGuard({ children, allowGuest = false, redirectTo = '/login' }) {
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check session - in real app, check if req.session.user exists
    // For now, check localStorage or session
    const checkAuth = async () => {
      // This will be replaced with actual session check in later chunks
      // For now, allow guest access if configured
      if (allowGuest) {
        setIsAuthenticated(true);
      } else {
        // Check if user is logged in via session
        // In real app: fetch('/api/auth/me')
        const hasSession = !!window.sessionStorage.getItem('fdc-user');
        setIsAuthenticated(hasSession);
      }
      setIsLoading(false);
    };

    checkAuth();
  }, []);

  if (isLoading) {
    return null; // Show spinner or nothing while loading
  }

  if (!isAuthenticated && !allowGuest) {
    navigate(redirectTo);
    return null;
  }

  return children;
}