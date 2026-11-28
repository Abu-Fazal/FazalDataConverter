import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

/**
 * Footer component for FazalDataConverter (Chunk 5.5).
 * Per TRD §12.4 and PRD §10.5 - white-first design, data only mode,
 * grid layout with brand and legal links.
 */
export function Footer() {
  return (
    <footer className="border-t border-border-subtle bg-surface-primary">
      <div className="max-w-5xl mx-auto py-8">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3 gap-6">
          {/* Brand Section */}
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center space-x-2 mb-3">
              <div className="h-7 w-7 rounded-lg bg-gradient-brand flex items-center justify-center text-white font-bold text-sm shadow-sm">
                FD
              </div>
              <span className="font-semibold text-lg text-text-primary tracking-tight">
                FazalDataConverter
              </span>
            </div>
            <p className="text-xs text-text-muted">
              &copy; {new Date().getFullYear()} FazalDataConverter. All rights reserved.
            </p>
            <p className="text-xs text-text-muted">
              Data Only Mode — No macro or script execution
            </p>
          </div>

          {/* Links Grid */}
          <div>
            <p className="text-xs font-medium text-text-secondary uppercase tracking-wider mb-3">Resources</p>
            <div className="space-y-1">
              <Link
                href="/"
                className="block text-xs text-text-muted hover:text-brand-primary transition-colors"
              >
                Privacy
              </Link>
              <Link
                href="/"
                className="block text-xs text-text-muted hover:text-brand-primary transition-colors"
              >
                Terms
              </Link>
              <Link
                href="/"
                className="block text-xs text-text-muted hover:text-brand-primary transition-colors"
              >
                Help
              </Link>
            </div>
          </div>

          {/* File Info */}
          <div>
            <p className="text-xs font-medium text-text-secondary uppercase tracking-wider mb-2">Policy</p>
            <div className="space-y-1 text-xs text-text-muted">
              <span>Max file size: 50 MB</span>
              <span>Data Only Mode — No macro execution</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}