import { Link } from 'react-router-dom';
import { ArrowLeftRight, Cpu, Lock } from 'lucide-react';

const columns = [
  {
    title: 'Product',
    links: [
      { label: 'Converter', to: '/converter' },
      { label: 'Excel to JSON', to: '/converter', badge: 'v2.4' },
      { label: 'JSON to Excel', to: '/converter' },
      { label: 'BSON Support', to: '/converter' },
      { label: 'Format Validation', to: '/converter' },
    ],
  },
  {
    title: 'User & Access',
    links: [
      { label: 'Login', to: '/login' },
      { label: 'Account Settings', to: '/login' },
      { label: 'Conversion History', to: '/history' },
      { label: 'Cloudflare R2 Sync', to: '/history', dot: true },
    ],
  },
  {
    title: 'Platform',
    links: [
      { label: 'Live Telemetry', to: '/admin' },
      { label: 'Verification Coverage', to: '/admin', badge: '100%' },
      { label: 'Audit Logging', to: '/admin' },
      { label: 'Admin Console', to: '/admin' },
    ],
  },
  {
    title: 'Legal & Trust',
    links: [
      { label: 'Privacy Policy', to: '/about#trust' },
      { label: 'Terms of Use', to: '/about#trust' },
      { label: 'Security Architecture', to: '/about#trust' },
      { label: 'Data Isolation', to: '/about#trust' },
    ],
  },
];

export function Footer() {
  return (
    <footer className="mt-auto w-full bg-surface-primary pt-14 pb-8" aria-label="Site footer">
      <div className="mx-auto flex max-w-7xl flex-col gap-12 px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-12 gap-x-4 gap-y-8 sm:gap-x-6 sm:gap-y-10 lg:gap-x-10">
          <div className="col-span-12 flex flex-col gap-4 lg:col-span-4 lg:pr-6">
            <Link
              to="/"
              className="flex items-center gap-3 self-start rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
            >
              <span
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-brand text-text-inverse shadow-sm"
                aria-hidden="true"
              >
                <ArrowLeftRight size={18} />
              </span>
              <span className="flex flex-col">
                <span className="text-headline-sm tracking-tight text-text-primary">
                  FazalDataConverter
                </span>
                <span className="-mt-1 text-label-sm uppercase tracking-wider text-text-muted">
                  Precision Data Pipeline
                </span>
              </span>
            </Link>
            <p className="text-body-md leading-relaxed text-text-secondary">
              High-performance Excel, JSON, and BSON data conversion engine with browser-first
              processing, verified type fidelity, and secure cloud storage.
            </p>
            <div className="flex flex-col gap-2 pt-2">
              <div className="inline-flex items-center gap-2 self-start rounded-lg bg-surface-secondary px-3 py-1.5">
                <span className="relative flex h-2 w-2" aria-hidden="true">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success-dot opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-success-dot" />
                </span>
                <span className="text-label-sm font-semibold text-text-primary">
                  System Operational
                </span>
                <span className="text-text-subtle" aria-hidden="true">
                  &middot;
                </span>
                <span className="text-label-sm text-text-muted">99.99% Node Uptime</span>
              </div>
              <div className="flex items-center gap-1.5 text-label-sm text-text-muted">
                <Lock size={16} className="text-brand-primary" aria-hidden="true" />
                Zero-retention browser runtime memory isolation
              </div>
            </div>
          </div>

          {columns.map((column) => (
            <div
              key={column.title}
              className="col-span-6 flex flex-col gap-4 sm:col-span-3 lg:col-span-2"
            >
              <h3 className="text-label-sm font-semibold uppercase tracking-wider text-text-primary">
                {column.title}
              </h3>
              <ul className="flex flex-col gap-2.5 text-body-sm text-text-secondary">
                {column.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      to={link.to}
                      className="group flex items-center gap-1.5 transition-colors duration-150 hover:text-brand-primary"
                    >
                      <span className="transition-transform duration-150 group-hover:translate-x-0.5">
                        {link.label}
                      </span>
                      {link.badge ? (
                        <span
                          className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                            link.badge === 'v2.4'
                              ? 'bg-surface-tertiary text-brand-primary'
                              : 'bg-surface-tertiary text-text-secondary'
                          }`}
                        >
                          {link.badge}
                        </span>
                      ) : null}
                      {link.dot ? (
                        <span className="h-1.5 w-1.5 rounded-full bg-brand-primary" aria-hidden="true" />
                      ) : null}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="flex flex-col items-center justify-between gap-4 rounded-xl bg-surface-secondary/60 px-6 py-4 md:flex-row">
          <div className="flex flex-wrap items-center gap-3 text-label-md text-text-muted">
            <span>&copy; {new Date().getFullYear()} FazalDataConverter. All rights reserved.</span>
            <span className="hidden text-text-subtle sm:inline" aria-hidden="true">
              &bull;
            </span>
            <span className="inline-flex items-center gap-1 text-text-secondary">
              <Cpu size={16} className="text-brand-primary" aria-hidden="true" />
              Browser-First Engine
            </span>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-label-md text-text-muted">
            <Link to="/about#trust" className="transition-colors hover:text-brand-primary">
              Privacy
            </Link>
            <span className="hidden text-text-subtle sm:inline" aria-hidden="true">
              &bull;
            </span>
            <Link to="/about#trust" className="transition-colors hover:text-brand-primary">
              Terms
            </Link>
            <span className="hidden text-text-subtle sm:inline" aria-hidden="true">
              &bull;
            </span>
            <Link to="/about#trust" className="transition-colors hover:text-brand-primary">
              Security Spec
            </Link>
            <span className="hidden text-text-subtle sm:inline" aria-hidden="true">
              &bull;
            </span>
            <Link to="/admin" className="transition-colors hover:text-brand-primary">
              System Health
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}