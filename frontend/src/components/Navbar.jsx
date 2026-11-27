import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Menu, X, User, Bell, HelpCircle, LogOut } from 'lucide-react';
import { Button } from './ui/button.jsx';
import { cn } from '@/lib/utils';

/**
 * Responsive top navigation bar (Chunk 5.1).
 *
 * Presentational — accepts optional `user` and `onLogout` props so the
 * auth layer (later chunks) can drive the signed-in state. Renders in
 * guest mode by default.
 */
export function Navbar({ user, onLogout }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const navLinks = [
    { name: 'Home', href: '/' },
    { name: 'Converter', href: '/converter' },
    { name: 'History', href: '/history' },
    { name: 'Admin', href: '/admin' },
  ];

  return (
    <header className="sticky top-0 z-50 border-b border-border-subtle bg-surface-primary/95 backdrop-blur supports-[backdrop-filter]:bg-surface-primary/80">
      <div className="px-6 h-14 flex items-center justify-between">
        {/* Brand */}
        <Link to="/" className="flex items-center space-x-3">
          <div className="h-8 w-8 rounded-lg bg-gradient-brand flex items-center justify-center text-white font-bold text-sm shadow-sm">
            FD
          </div>
          <span className="font-semibold text-lg text-text-primary tracking-tight">
            FazalDataConverter
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center space-x-1">
          {navLinks.map((link) => (
            <Link
              key={link.name}
              to={link.href}
              className="text-xs font-medium text-text-secondary hover:text-brand-primary transition-colors"
            >
              {link.name}
            </Link>
          ))}
        </nav>

        {/* Right actions */}
        <div className="flex items-center space-x-3">
          <Button asChild size="small" variant="ghost">
            <Link to="/" className="flex items-center space-x-1.5">
              <HelpCircle className="w-4 h-4" />
              <span className="hidden sm:inline">Help</span>
            </Link>
          </Button>
          {user ? (
            <div className="flex items-center space-x-2">
              <Button size="small" variant="outline" className="hidden sm:flex">
                <User className="w-4 h-4 mr-1.5" />
                {user.name || user.email}
              </Button>
              <Button size="small" variant="ghost" onClick={onLogout} className="hidden sm:flex">
                <LogOut className="w-4 h-4" />
              </Button>
              <div className="relative">
                <Button size="small" variant="ghost" onClick={() => setIsMenuOpen(!isMenuOpen)}>
                  <Bell className={cn('w-5 h-5', isMenuOpen ? 'text-brand-primary' : 'text-text-muted')} />
                </Button>
              </div>
            </div>
          ) : (
            <Button size="small" variant="default" className="hidden sm:flex">
              Sign in
            </Button>
          )}
          {/* Mobile menu toggle */}
          <Button
            size="small"
            variant="ghost"
            className="md:hidden"
            aria-label="Open main menu"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </Button>
        </div>
      </div>

      {/* Mobile menu panel */}
      {isMenuOpen && (
        <div className="md:hidden border-t border-border-subtle bg-surface-primary">
          <div className="px-6 pb-4 pt-2 space-y-2">
            {navLinks.map((link) => (
              <Link
                key={link.name}
                to={link.href}
                onClick={() => setIsMenuOpen(false)}
                className="block px-3 py-2.5 text-sm font-medium text-text-primary hover:bg-surface-secondary hover:text-brand-primary rounded-lg transition-colors"
              >
                {link.name}
              </Link>
            ))}
            <div className="border-t border-border-subtle pt-3 mt-2 space-y-2">
              {user ? (
                <>
                  <Button variant="ghost" onClick={onLogout} className="w-full text-left">
                    <LogOut className="w-4 h-4 mr-2" />
                    Sign out
                  </Button>
                </>
              ) : (
                <Button variant="default" className="w-full">
                  Sign in
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
