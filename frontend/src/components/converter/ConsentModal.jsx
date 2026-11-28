import { ShieldCheck, Lock, HardDrive, FileCheck2 } from 'lucide-react';
import { Button } from '../ui/button.jsx';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../ui/dialog.jsx';

const POLICIES = [
  {
    icon: FileCheck2,
    title: 'Local-First Engine',
    detail: 'Your file is processed only for the conversion you request.',
  },
  {
    icon: HardDrive,
    title: 'Data Retention',
    detail: 'No conversion payloads are permanently stored without administrative elevation.',
  },
  {
    icon: ShieldCheck,
    title: 'Compliance',
    detail: 'Handled under PRD §9.1 and TRD §10.7.D privacy and retention rules.',
  },
];

/**
 * Mandatory first-conversion consent (PRD §9.1).
 */
export function ConsentModal({ open, onOpenChange, onAccept }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl" aria-describedby="consent-description">
        <DialogHeader>
          <div className="mb-1 inline-flex w-fit items-center gap-2 rounded-full border border-processing-border bg-processing-bg px-3 py-1 text-label-sm text-processing-text">
            <Lock className="h-3.5 w-3.5" aria-hidden="true" />
            Mandatory First-Conversion Acceptance (PRD §9.1)
          </div>
          <DialogTitle>Privacy &amp; Terms Consent</DialogTitle>
          <DialogDescription id="consent-description">
            Before running your first dataset conversion with FazalDataConverter, review and
            confirm these client-side processing policies and data handling standards.
          </DialogDescription>
        </DialogHeader>

        <ul className="space-y-3">
          {POLICIES.map((policy) => (
            <li key={policy.title} className="flex gap-3 rounded-lg border border-border-subtle bg-surface-secondary p-3">
              <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface-primary text-brand-primary">
                <policy.icon className="h-4 w-4" aria-hidden="true" />
              </span>
              <div>
                <p className="text-label-lg text-text-primary">{policy.title}</p>
                <p className="text-body-sm text-text-secondary">{policy.detail}</p>
              </div>
            </li>
          ))}
        </ul>

        <p className="text-body-sm text-text-secondary">
          Read the{' '}
          <a className="font-medium text-text-link underline-offset-4 hover:underline" href="/about#trust">
            Privacy Policy
          </a>{' '}
          and{' '}
          <a className="font-medium text-text-link underline-offset-4 hover:underline" href="/about#trust">
            Terms of Use
          </a>
          . Consent is recorded for this session and re-requested when the policy version changes.
        </p>

        <DialogFooter>
          <Button type="button" variant="outline" size="medium" onClick={() => onOpenChange(false)}>
            Not now
          </Button>
          <Button type="button" size="medium" onClick={onAccept}>
            <ShieldCheck className="mr-2 h-4 w-4" aria-hidden="true" />
            Accept &amp; Continue
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}