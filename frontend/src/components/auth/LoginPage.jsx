import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../ui/button.jsx';
import { cn } from '@/lib/utils';

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
      // Will be handled by API call in later chunks
      // For now, navigate to converter (guest mode)
      setLoading(false);
      navigate('/converter');
    } catch (err) {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center py-12 text-center">
      <div className="bg-surface-primary rounded-xl border border-border-subtle p-8 shadow-sm max-w-md">
        <div className="inline-flex items-center justify-center p-3 bg-brand-primary-soft text-brand-primary rounded-xl mb-6">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h1v4h1m-1-4h1v4h1m4-5v1m-4 5v1m0 0v5m-5 0H8m4 5H8m5-3v2m3-3v2m0 0v5m-5 0H5m5 3v2m-3 3v2m0 0v5m-5 0H2m5-3v2m3-3v2m0 0v5m-5 0H2L19.5 13H6l.5 8.5L21 8z" />
          </svg>
          <span className="text-sm ml-2">FD</span>
        </div>

        <h1 className="text-2xl font-bold text-text-primary mb-3">Sign in</h1>
        <p className="text-text-secondary mb-6">Welcome back! Continue with Google.</p>

        {loading ? (
          <div className="flex items-center justify-center py-4">
            <svg className="animate-spin w-5 h-5 mr-2 text-white" viewBox="0 0 24 24">
              <path fill="currentColor" d="M12 7a5 5 0 015 5 5 5 0 01-5 5 5 5 0 01-5-5 5 5 0 015-5z" />
            </svg>
            <span className="ml-2">Signing in...</span>
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
            <svg
              className="w-5 h-5 mr-3 inline-block align-middle"
              viewBox="0 0 24 24"
            >
              <circle cx="12" cy="12" r="10" fill="none" />
              <path
                fill="currentColor"
                d="M8.36 11.25A5.986 5.986 0 0112 8c-.68 0-1.33.08-1.98.2l-.55.18a.7.7 0 00-.02.31.7.7 0 00-.01.31l.55.18a5.986 5.986 0 011.88 0 5.986 5.986 0 01-1.88 0 5.986 5.986 0 01-.98-.2l-.55-.18a.7.7 0 00-.01-.31.7.7 0 00-.02-.3l.55-.18A5.985 5.985 0 0115 13c-.68 0-1.33-.08-1.98-.2l-.55-.18a.7.7 0 00-.01-.31.7.7 0 00-.01-.31l-.55-.18a5.986 5.986 0 01-1.88 0 5.986 5.986 0 01.98-.2l.55.18a.7.7 0 00.02.31.7.7 0 00.01.31l-.55.18a5.986 5.986 0 01-1.88 0 5.986 5.986 0 01.98.2l-.55.18a.7.7 0 00.01.31.7.7 0 00.02.3l.55.18z"
              />
            </svg>
            <span>Continue with Google</span>
          </Button>
        )}
      </div>
    </div>
  );
}