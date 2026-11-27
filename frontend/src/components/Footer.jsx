import { Link } from 'react-router-dom';

/**
 * Application footer (Chunk 5.1).
 * Clean, white-first design with project info and legal links.
 */
export function Footer() {
  return (
    <footer className="border-t border-border-subtle bg-surface-primary mt-auto">
      <div className="px-6 py-8">
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center space-x-3">
              <div className="h-7 w-7 rounded-lg bg-gradient-brand flex items-center justify-center text-white font-bold text-sm shadow-sm">
                FD
              </div>
              <span className="font-semibold text-sm text-text-primary tracking-tight">
                FazalDataConverter
              </span>
            </div>
            <div className="text-xs text-text-muted">
              &copy; {new Date().getFullYear()} FazalDataConverter. All rights reserved.
            </div>
          </div>
          <div className="mt-6 md:mt-0 border-t border-border-subtle pt-4 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs text-text-muted">
            <span>Data Only Mode — No macro or script execution</span>
            <span className="border-r border-border-subtle pr-3">Max file size: 50 MB</span>
            <span>Secure, server-side ownership validation</span>
            <div className="flex items-center space-x-3">
              <Link to="/" className="hover:text-brand-primary transition-colors">Privacy</Link>
              <Link to="/" className="hover:text-brand-primary transition-colors">Terms</Link>
              <Link to="/" className="hover:text-brand-primary transition-colors">Help</Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
