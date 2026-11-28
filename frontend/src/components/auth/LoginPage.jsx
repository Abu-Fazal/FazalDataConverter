import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeftRight, Loader2 } from 'lucide-react';
import { Button } from '../ui/button.jsx';
import { authApi } from '@/services/auth.api';

/**
 * Login page (Chunk C).
 * Google OAuth login entry point.
 */
export function LoginPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      const res = await authApi.googleLogin();
      if (res?.success) {
        navigate('/converter');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center py-12 text-center">
      <div className="bg-surface-primary rounded-xl border border-border-subtle p-8 shadow-sm max-w-md">
        <div className="inline-flex items-center justify-center p-3 bg-brand-primary-soft text-brand-primary rounded-xl mb-6">
          <ArrowLeftRight className="w-6 h-6" aria-hidden="true" />
          <span className="text-sm ml-2">FD</span>
        </div>

        <h1 className="text-2xl font-bold text-text-primary mb-3">Sign in</h1>
        <p className="text-text-secondary mb-6">Welcome back! Continue with Google.</p>

        {loading ? (
          <div className="flex items-center justify-center py-4 text-text-secondary">
            <Loader2 className="animate-spin w-5 h-5 mr-2 text-brand-primary" aria-hidden="true" />
            <span>Signing in...</span>
          </div>
        ) : (
          <Button
            type="button"
            size="large"
            variant="default"
            onClick={handleGoogleLogin}
            className="w-full"
            disabled={loading}
          >
            <span className="mr-3 inline-flex h-6 w-6 items-center justify-center rounded-full bg-white">
              <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  fill="#4285F4"
                  d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z"
                />
                <path
                  fill="#34A853"
                  d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.31 24 12 24z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.98-3.09z"
                />
                <path
                  fill="#EA4335"
                  d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.98 3.09c.95-2.85 3.6-4.96 6.73-4.96z"
                />
              </svg>
            </span>
            <span>Continue with Google</span>
          </Button>
        )}
      </div>
    </div>
  );
}