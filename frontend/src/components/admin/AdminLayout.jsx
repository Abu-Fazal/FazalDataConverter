import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import {
  Activity,
  ArrowLeftRight,
  FileCheck2,
  History,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings2,
  ShieldCheck,
  SlidersHorizontal,
  UserCog,
  Users,
  X,
} from 'lucide-react';
import { Badge } from '../ui/badge.jsx';
import { authApi } from '@/services/auth.api';
import { systemApi } from '@/services/system.api';
import { cn } from '@/lib/utils';

const adminLinks = [
  { name: 'Overview', href: '/admin', icon: LayoutDashboard, end: true },
  { name: 'User Management', href: '/admin/users', icon: Users },
  { name: 'Conversion Jobs', href: '/admin/conversions', icon: ArrowLeftRight },
  { name: 'Security Logs', href: '/admin/security', icon: ShieldCheck },
  { name: 'System Settings', href: '/admin/settings', icon: SlidersHorizontal },
];

const appLinks = [
  { name: 'Converter', href: '/converter', icon: ArrowLeftRight },
  { name: 'History', href: '/history', icon: History },
  { name: 'Account', href: '/account', icon: UserCog },
];

function readCachedAdmin() {
  try {
    return JSON.parse(window.sessionStorage.getItem('fdc-user') || 'null');
  } catch {
    return null;
  }
}

function useSystemStatus() {
  const [system, setSystem] = useState(null);

  useEffect(() => {
    let cancelled = false;
    const load = () => {
      systemApi.getStatus().then((data) => {
        if (!cancelled) setSystem(data);
      });
    };
    load();
    const timer = window.setInterval(load, 45000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, []);

  return system;
}

function SidebarContent({ system, admin, onNavigate, onSignOut }) {
  const maintenance = Boolean(system?.maintenanceMode);

  return (
    <>
      <div className="flex items-center gap-3 border-b border-border-subtle px-5 py-5">
        <span
          className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-brand text-text-inverse shadow-sm"
          aria-hidden="true"
        >
          <FileCheck2 size={20} />
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-bold tracking-tight text-text-primary">
            fazal<span className="bg-gradient-brand bg-clip-text text-transparent">DataConverter</span>
          </p>
          <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-text-muted">
            Sole Admin Console
          </p>
        </div>
      </div>

      <div className="space-y-2 border-b border-border-subtle px-5 py-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={maintenance ? 'warning' : 'success'} dot pulse={maintenance}>
            {maintenance ? 'Maintenance' : 'Operational'}
          </Badge>
          <Badge variant={maintenance ? 'warning' : 'neutral'}>
            Maintenance: {maintenance ? 'ON' : 'OFF'}
          </Badge>
        </div>
        <p className="flex items-center gap-1.5 text-[11px] text-text-muted">
          <Activity size={12} aria-hidden="true" />
          {system ? `Uptime ${Math.floor((system.uptimeSeconds || 0) / 3600)}h ${Math.floor(((system.uptimeSeconds || 0) % 3600) / 60)}m` : 'Syncing status…'}
        </p>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4" aria-label="Admin console navigation">
        <p className="px-2 pb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-text-subtle">
          Console
        </p>
        <div className="space-y-1">
          {adminLinks.map((link) => {
            const Icon = link.icon;
            return (
              <NavLink
                key={link.href}
                to={link.href}
                end={link.end}
                onClick={onNavigate}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-brand-primary-soft text-brand-primary-deep'
                      : 'text-text-secondary hover:bg-surface-secondary hover:text-text-primary',
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon
                      size={17}
                      aria-hidden="true"
                      className={isActive ? 'text-brand-primary' : 'text-text-muted'}
                    />
                    <span className="truncate">{link.name}</span>
                  </>
                )}
              </NavLink>
            );
          })}
        </div>

        <p className="px-2 pb-2 pt-6 text-[10px] font-semibold uppercase tracking-[0.12em] text-text-subtle">
          User App
        </p>
        <div className="space-y-1">
          {appLinks.map((link) => {
            const Icon = link.icon;
            return (
              <NavLink
                key={link.href}
                to={link.href}
                onClick={onNavigate}
                className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-text-secondary transition-colors hover:bg-surface-secondary hover:text-text-primary"
              >
                <Icon size={17} aria-hidden="true" className="text-text-muted" />
                <span className="truncate">{link.name}</span>
              </NavLink>
            );
          })}
        </div>
      </nav>

      <div className="border-t border-border-subtle p-4">
        <div className="flex items-center gap-3 rounded-xl border border-border-subtle bg-surface-app p-3">
          <span
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-brand-primary-surface bg-brand-primary-soft text-xs font-semibold text-brand-primary"
            aria-hidden="true"
          >
            <ShieldCheck size={16} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold text-text-primary">Sole Administrator</p>
            <p className="truncate text-[11px] text-text-muted">{admin?.email || 'admin session'}</p>
          </div>
          <button
            type="button"
            onClick={onSignOut}
            aria-label="Sign out of the admin console"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-text-muted transition-colors hover:bg-surface-primary hover:text-danger focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
          >
            <LogOut size={16} aria-hidden="true" />
          </button>
        </div>
      </div>
    </>
  );
}

export function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const system = useSystemStatus();
  const admin = readCachedAdmin();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!menuOpen) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKeyDown = (event) => {
      if (event.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [menuOpen]);

  async function handleSignOut() {
    await authApi.logout();
    navigate('/login', { replace: true });
  }

  const maintenance = Boolean(system?.maintenanceMode);

  return (
    <div className="flex min-h-screen w-full bg-surface-app text-text-primary">
      <aside className="sticky top-0 hidden h-screen w-[264px] shrink-0 flex-col border-r border-border-subtle bg-surface-primary lg:flex">
        <SidebarContent system={system} admin={admin} onNavigate={() => {}} onSignOut={handleSignOut} />
      </aside>

      <div className="flex min-h-screen min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-border-subtle bg-surface-primary/95 px-4 py-3 backdrop-blur-md sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              aria-label="Open admin navigation"
              aria-expanded={menuOpen}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border-subtle bg-surface-primary text-text-secondary transition-colors hover:bg-surface-secondary hover:text-text-primary lg:hidden"
            >
              <Menu size={18} aria-hidden="true" />
            </button>
            <div className="min-w-0">
              <p className="truncate text-[11px] font-semibold uppercase tracking-[0.1em] text-text-muted">
                Sole Admin Console
              </p>
              <h1 className="truncate text-headline-sm text-text-primary">Operations &amp; Governance</h1>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Badge variant={maintenance ? 'warning' : 'success'} dot pulse={maintenance} className="hidden sm:inline-flex">
              {maintenance ? 'Maintenance Mode' : 'System Operational'}
            </Badge>
            <Badge variant={maintenance ? 'warning' : 'neutral'} className="hidden md:inline-flex">
              Maintenance: {maintenance ? 'ON' : 'OFF'}
            </Badge>
            <NavLink
              to="/admin/settings"
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-border-subtle text-text-muted transition-colors hover:bg-surface-secondary hover:text-brand-primary"
              aria-label="Open system settings"
            >
              <Settings2 size={16} aria-hidden="true" />
            </NavLink>
          </div>
        </header>

        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <div className="mx-auto w-full max-w-7xl">
            <Outlet />
          </div>
        </main>

        <footer className="border-t border-border-subtle bg-surface-primary px-6 py-4 text-xs text-text-muted">
          <div className="mx-auto flex w-full max-w-7xl flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <span>FazalDataConverter Admin · Metadata-only governance console</span>
            <span>PRD §8 · 1-year immutable audit retention</span>
          </div>
        </footer>
      </div>

      {menuOpen
        ? createPortal(
            <div className="fixed inset-0 z-[70] lg:hidden">
              <div
                className="absolute inset-0 bg-text-primary/40 backdrop-blur-sm animate-overlay-show"
                onClick={() => setMenuOpen(false)}
                aria-hidden="true"
              />
              <aside
                role="dialog"
                aria-modal="true"
                aria-label="Admin navigation"
                className="absolute left-0 top-0 flex h-full w-[288px] max-w-[88vw] flex-col bg-surface-primary shadow-dialog animate-drawer-show"
              >
                <button
                  type="button"
                  onClick={() => setMenuOpen(false)}
                  aria-label="Close admin navigation"
                  className="absolute right-3 top-4 z-10 flex h-8 w-8 items-center justify-center rounded-lg text-text-muted transition-colors hover:bg-surface-secondary hover:text-text-primary"
                >
                  <X size={16} aria-hidden="true" />
                </button>
                <SidebarContent
                  system={system}
                  admin={admin}
                  onNavigate={() => setMenuOpen(false)}
                  onSignOut={handleSignOut}
                />
              </aside>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}