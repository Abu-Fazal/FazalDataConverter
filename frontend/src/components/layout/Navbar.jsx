import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  ArrowLeftRight,
  ChevronRight,
  FileCheck2,
  HelpCircle,
  History,
  Home,
  Info,
  LogIn,
  LogOut,
  Menu,
  User,
  X,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu.jsx';
import { authApi } from '@/services/auth.api';
import { cn } from '@/lib/utils';

const primaryLinks = [
  { name: 'Home', href: '/', icon: Home },
  { name: 'Converter', href: '/converter', icon: ArrowLeftRight },
  { name: 'History', href: '/history', icon: History },
];

const secondaryLinks = [
  { name: 'About', href: '/about', icon: Info },
  { name: 'Support', href: '/about#support', icon: HelpCircle },
];

const drawerLinks = [
  { name: 'Home', href: '/', icon: Home },
  { name: 'Data Converter', href: '/converter', icon: ArrowLeftRight },
  { name: 'Conversion History', href: '/history', icon: History },
  { name: 'About & Specs', href: '/about', icon: Info },
  { name: 'Support & Docs', href: '/about#support', icon: HelpCircle },
];

export function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [user, setUser] = useState(() => {
    if (typeof window === 'undefined') return null;
    try {
      return JSON.parse(window.sessionStorage.getItem('fdc-user') || 'null');
    } catch {
      return null;
    }
  });
  const location = useLocation();
  const navigate = useNavigate();
  const triggerRef = useRef(null);
  const closeButtonRef = useRef(null);

  useEffect(() => {
    setIsMenuOpen(false);
    try {
      setUser(JSON.parse(window.sessionStorage.getItem('fdc-user') || 'null'));
    } catch {
      setUser(null);
    }
  }, [location.pathname]);

  useEffect(() => {
    if (!isMenuOpen) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKeyDown = (event) => {
      if (event.key === 'Escape') closeMenu();
    };
    document.addEventListener('keydown', onKeyDown);
    closeButtonRef.current?.focus();
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [isMenuOpen]);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) setIsMenuOpen(false);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  function closeMenu() {
    setIsMenuOpen(false);
    triggerRef.current?.focus();
  }

  async function handleSignOut() {
    await authApi.logout();
    setUser(null);
    setIsMenuOpen(false);
    navigate('/');
  }

  function isActive(href) {
    const [path, hash] = href.split('#');
    if (hash) return location.pathname === path && location.hash === `#${hash}`;
    if (path === '/about') return location.pathname === '/about' && location.hash !== '#support';
    return path === '/' ? location.pathname === '/' : location.pathname.startsWith(path);
  }

  const displayName = user?.name || user?.email || 'Account';
  const initial = displayName.charAt(0).toUpperCase();

  const wordmark = (
    <span className="text-base font-bold tracking-tight text-text-primary sm:text-lg">
      fazal
      <span className="bg-gradient-brand bg-clip-text text-transparent">DataConverter</span>
    </span>
  );

  const navLinkClass = (active, compact = false) =>
    cn(
      'flex items-center gap-2 rounded-lg transition-all duration-150',
      compact ? 'px-3 py-1.5 text-sm font-medium' : 'px-3.5 py-1.5 text-sm font-medium',
      active
        ? 'bg-gradient-brand text-text-inverse shadow-sm'
        : compact
          ? 'text-text-muted hover:bg-surface-primary/60 hover:text-brand-primary'
          : 'text-text-secondary hover:bg-surface-primary/80 hover:text-brand-primary',
    );

  return (
    <header className="sticky top-0 z-50 border-b border-border-subtle bg-surface-primary/95 shadow-sm backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3.5 sm:px-6 lg:px-8">
        <Link to="/" className="flex shrink-0 items-center gap-3" aria-label="FazalDataConverter home">
          <span
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-brand text-text-inverse shadow-sm"
            aria-hidden="true"
          >
            <FileCheck2 size={20} />
          </span>
          {wordmark}
        </Link>

        <nav
          className="hidden items-center gap-1.5 rounded-xl border border-border-subtle bg-surface-app p-1 lg:flex"
          aria-label="Main navigation"
        >
          {primaryLinks.map((link) => {
            const active = isActive(link.href);
            const Icon = link.icon;
            return (
              <Link
                key={link.name}
                to={link.href}
                aria-current={active ? 'page' : undefined}
                className={navLinkClass(active)}
              >
                <Icon
                  size={16}
                  aria-hidden="true"
                  className={active ? 'text-white/80' : 'text-text-muted'}
                />
                {link.name}
              </Link>
            );
          })}
          <span className="mx-0.5 h-3.5 w-px bg-border-strong" aria-hidden="true" />
          {secondaryLinks.map((link) => {
            const active = isActive(link.href);
            const Icon = link.icon;
            return (
              <Link
                key={link.name}
                to={link.href}
                aria-current={active ? 'page' : undefined}
                className={navLinkClass(active, true)}
              >
                <Icon
                  size={16}
                  aria-hidden="true"
                  className={active ? 'text-white/80' : 'text-text-muted'}
                />
                {link.name}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2 sm:gap-2.5">
          <Link
            to="/login"
            className="hidden h-10 items-center justify-center rounded-xl border border-border-subtle bg-surface-primary px-4 text-sm font-semibold text-text-primary shadow-sm transition-all hover:border-border-hover hover:bg-surface-secondary hover:text-brand-primary sm:inline-flex"
          >
            <LogIn size={16} className="mr-2 text-text-muted" aria-hidden="true" />
            Login
          </Link>
          <Link
            to="/converter"
            className="hidden h-10 items-center justify-center rounded-xl bg-gradient-brand px-4 text-sm font-semibold text-text-inverse shadow-sm transition-all duration-200 hover:bg-gradient-brand-hover hover:shadow-md active:scale-[0.98] sm:inline-flex"
          >
            Get Started
          </Link>
          <span className="hidden h-6 w-px bg-border-subtle sm:block" aria-hidden="true" />

          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  aria-label={`Open account menu for ${displayName}`}
                  className="group flex h-10 w-10 items-center justify-center rounded-xl border border-border-subtle bg-surface-primary shadow-sm transition-all hover:border-brand-primary-border hover:bg-surface-app focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-brand-primary-surface bg-brand-primary-soft text-xs font-semibold text-brand-primary transition-colors group-hover:bg-brand-primary-surface">
                    {initial}
                  </span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" sideOffset={8} className="w-56">
                <DropdownMenuLabel>
                  <span className="block truncate text-sm font-semibold text-text-primary">
                    {displayName}
                  </span>
                  {user.email ? (
                    <span className="block truncate text-xs font-normal text-text-muted">
                      {user.email}
                    </span>
                  ) : null}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem danger onSelect={handleSignOut}>
                  <LogOut size={16} aria-hidden="true" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Link
              to="/login"
              aria-label="Login to your account"
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-border-subtle bg-surface-primary text-brand-primary shadow-sm transition-all hover:border-brand-primary-border hover:bg-surface-app"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-brand-primary-surface bg-brand-primary-soft">
                <User size={16} aria-hidden="true" />
              </span>
            </Link>
          )}

          <button
            ref={triggerRef}
            type="button"
            aria-label={isMenuOpen ? 'Close main menu' : 'Open main menu'}
            aria-expanded={isMenuOpen}
            aria-controls="mobile-menu"
            onClick={() => (isMenuOpen ? closeMenu() : setIsMenuOpen(true))}
            className="flex h-11 w-11 items-center justify-center rounded-xl border border-brand-primary-surface bg-brand-primary-soft text-brand-primary shadow-sm transition-colors hover:bg-brand-primary hover:text-text-inverse active:scale-95 lg:hidden"
          >
            {isMenuOpen ? <X size={20} aria-hidden="true" /> : <Menu size={20} aria-hidden="true" />}
          </button>
        </div>
      </div>

      {isMenuOpen
        ? createPortal(
            <div className="fixed inset-0 z-[60] lg:hidden">
              <div
                className="absolute inset-0 bg-text-primary/40 backdrop-blur-sm animate-overlay-show"
                onClick={closeMenu}
                aria-hidden="true"
              />
              <aside
                id="mobile-menu"
                role="dialog"
                aria-modal="true"
                aria-label="Main navigation"
                className="absolute right-0 top-0 flex h-full w-[340px] max-w-[90vw] flex-col bg-surface-primary p-5 shadow-dialog animate-drawer-show"
              >
                <div className="flex items-center justify-between border-b border-border-subtle pb-4">
                  <div className="flex items-center gap-2.5">
                    <span
                      className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-brand text-text-inverse shadow-sm"
                      aria-hidden="true"
                    >
                      <FileCheck2 size={16} />
                    </span>
                    <span className="text-sm font-bold tracking-tight text-text-primary">
                      Navigation
                    </span>
                  </div>
                  <button
                    ref={closeButtonRef}
                    type="button"
                    onClick={closeMenu}
                    aria-label="Close main menu"
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-border-subtle text-text-muted transition-colors hover:bg-surface-secondary hover:text-text-primary"
                  >
                    <X size={16} aria-hidden="true" />
                  </button>
                </div>

                <nav className="mt-4 flex-1 space-y-1.5 overflow-y-auto" aria-label="Mobile navigation">
                  {drawerLinks.map((link) => {
                    const active = isActive(link.href);
                    const Icon = link.icon;
                    return (
                      <Link
                        key={link.name}
                        to={link.href}
                        aria-current={active ? 'page' : undefined}
                        onClick={() => setIsMenuOpen(false)}
                        className={cn(
                          'flex items-center justify-between rounded-xl px-3.5 py-2.5 text-sm transition-colors',
                          active
                            ? 'bg-gradient-brand font-semibold text-text-inverse shadow-sm'
                            : 'font-medium text-text-secondary hover:bg-surface-app hover:text-brand-primary',
                        )}
                      >
                        <span className="flex items-center gap-2.5">
                          <Icon
                            size={16}
                            aria-hidden="true"
                            className={active ? 'text-white/80' : 'text-text-muted'}
                          />
                          {link.name}
                        </span>
                        {active ? null : (
                          <ChevronRight size={16} className="text-text-muted" aria-hidden="true" />
                        )}
                      </Link>
                    );
                  })}
                </nav>

                <div className="mt-4 space-y-2.5 border-t border-border-subtle pt-4">
                  <div className="flex items-center gap-3 rounded-xl border border-border-subtle bg-surface-app p-2.5">
                    <span
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-brand-primary-surface bg-brand-primary-soft font-semibold text-brand-primary"
                      aria-hidden="true"
                    >
                      {user ? initial : <User size={16} />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-semibold text-text-primary">
                        {user ? displayName : 'Personal Account'}
                      </p>
                      <p className="truncate text-[11px] text-text-muted">
                        {user?.email || 'Login to save conversions'}
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {user ? (
                      <button
                        type="button"
                        onClick={handleSignOut}
                        className="inline-flex h-10 items-center justify-center rounded-xl border border-border-subtle bg-surface-primary text-xs font-semibold text-text-primary shadow-sm transition-colors hover:bg-surface-secondary hover:text-brand-primary"
                      >
                        <LogOut size={14} className="mr-1.5 text-text-muted" aria-hidden="true" />
                        Sign Out
                      </button>
                    ) : (
                      <Link
                        to="/login"
                        onClick={() => setIsMenuOpen(false)}
                        className="inline-flex h-10 items-center justify-center rounded-xl border border-border-subtle bg-surface-primary text-xs font-semibold text-text-primary shadow-sm transition-colors hover:bg-surface-secondary hover:text-brand-primary"
                      >
                        <LogIn size={14} className="mr-1.5 text-text-muted" aria-hidden="true" />
                        Login
                      </Link>
                    )}
                    <Link
                      to="/converter"
                      onClick={() => setIsMenuOpen(false)}
                      className="inline-flex h-10 items-center justify-center rounded-xl bg-gradient-brand text-xs font-semibold text-text-inverse shadow-sm transition-colors hover:bg-gradient-brand-hover"
                    >
                      Get Started
                    </Link>
                  </div>
                </div>
              </aside>
            </div>,
            document.body,
          )
        : null}
    </header>
  );
}