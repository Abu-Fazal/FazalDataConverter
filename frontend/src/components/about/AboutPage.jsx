import { Link } from 'react-router-dom';
import {
  ArrowLeftRight,
  ArrowRight,
  BadgeCheck,
  FileCheck2,
  History,
  ShieldCheck,
  Timer,
} from 'lucide-react';
import { Button } from '../ui/button.jsx';

const specs = [
  {
    icon: ArrowLeftRight,
    title: 'Supported formats',
    body: 'XLSX, XLS, and XLSM to Normal or Workbook JSON, JSON to Excel, plus BSON and static JavaScript data extraction.',
  },
  {
    icon: BadgeCheck,
    title: 'Verified output',
    body: '100% of officially supported data elements are checked for values, structure, and supported metadata.',
  },
  {
    icon: ShieldCheck,
    title: 'Data Only Mode',
    body: 'Macros, embedded scripts, and dynamic code are never executed. Unsupported input is reported, not guessed.',
  },
  {
    icon: Timer,
    title: 'File limits',
    body: 'Supported files up to 50 MB. Invalid, corrupt, or unsupported files are rejected with a clear validation report.',
  },
];

const trustPoints = [
  'Each account can access only its own uploaded files, converted outputs, and history.',
  'Temporary processing files are deleted automatically after conversion, failure, or cancellation.',
  'Uploaded files are used only for the requested conversion and are never used for advertising.',
  'Deleted files and converted outputs are permanently removed from active storage.',
];

export function AboutPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <section aria-labelledby="about-heading" className="text-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-brand-primary-surface bg-brand-primary-soft px-3 py-1 text-label-sm uppercase tracking-wider text-brand-primary">
          <span className="h-1.5 w-1.5 rounded-full bg-brand-primary" aria-hidden="true" />
          About FazalDataConverter
        </span>
        <h1
          id="about-heading"
          className="mt-4 text-display-lg-mobile tracking-tight text-text-primary md:text-display-lg"
        >
          Precise conversion, verified end to end
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-body-lg leading-relaxed text-text-secondary">
          FazalDataConverter turns Excel workbooks, JSON, BSON, and static JavaScript data into
          clean, verified output. Every supported element is validated before delivery, and every
          file stays private to its owner.
        </p>
      </section>

      <section aria-label="Product specifications" className="mt-10 grid gap-4 sm:grid-cols-2">
        {specs.map((spec) => {
          const Icon = spec.icon;
          return (
            <div
              key={spec.title}
              className="rounded-xl border border-border-subtle bg-surface-primary p-5 shadow-card"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-primary-soft text-brand-primary">
                <Icon size={20} aria-hidden="true" />
              </span>
              <h2 className="mt-3 text-headline-sm text-text-primary">{spec.title}</h2>
              <p className="mt-1.5 text-body-sm leading-relaxed text-text-secondary">{spec.body}</p>
            </div>
          );
        })}
      </section>

      <section
        id="support"
        aria-labelledby="support-heading"
        className="mt-12 scroll-mt-24 rounded-xl border border-border-subtle bg-surface-primary p-6 shadow-card"
      >
        <h2 id="support-heading" className="text-headline-md text-text-primary">
          Support &amp; docs
        </h2>
        <p className="mt-2 text-body-md leading-relaxed text-text-secondary">
          Start a conversion, review saved results, or check system activity from the admin console.
          Validation and conversion errors always explain what failed and how to retry.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button asChild>
            <Link to="/converter">
              <FileCheck2 className="mr-2 h-4 w-4" aria-hidden="true" />
              Open Converter
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/history">
              <History className="mr-2 h-4 w-4" aria-hidden="true" />
              View History
            </Link>
          </Button>
          <Button asChild variant="ghost">
            <Link to="/admin">
              Admin Console
              <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
            </Link>
          </Button>
        </div>
      </section>

      <section
        id="trust"
        aria-labelledby="trust-heading"
        className="mt-12 scroll-mt-24 rounded-xl border border-border-subtle bg-surface-secondary p-6"
      >
        <h2 id="trust-heading" className="text-headline-md text-text-primary">
          Privacy, security &amp; trust
        </h2>
        <ul className="mt-3 space-y-2.5">
          {trustPoints.map((point) => (
            <li key={point} className="flex items-start gap-2.5 text-body-md text-text-secondary">
              <ShieldCheck
                size={18}
                className="mt-0.5 shrink-0 text-success-text"
                aria-hidden="true"
              />
              <span>{point}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}