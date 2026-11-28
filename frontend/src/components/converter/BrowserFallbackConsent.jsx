import { useState } from 'react';
import { ShieldCheck, Gauge, Gavel, Terminal, PlayCircle } from 'lucide-react';
import { Button } from '../ui/button.jsx';
import { Checkbox } from '../ui/checkbox.jsx';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../ui/dialog.jsx';

function formatSize(bytes) {
  if (bytes == null) return 'Unknown size';
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function estimateSeconds(bytes) {
  if (!bytes) return 2;
  return Math.max(2, Math.round((bytes / (1024 * 1024)) * 0.6));
}

/**
 * Explicit consent gate for eligible client-side fallback processing
 * (PRD §9.1, TRD §7.14).
 */
export function BrowserFallbackConsent({ open, onOpenChange, file, eligibility, onGrant, onDeny, busy = false }) {
  const [confirmed, setConfirmed] = useState(false);

  const handleOpenChange = (nextOpen) => {
    if (!nextOpen) {
      setConfirmed(false);
      onDeny?.();
      return;
    }
    onOpenChange(true);
  };

  const grant = () => {
    setConfirmed(false);
    onGrant?.();
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-xl" aria-describedby="fallback-description">
        <DialogHeader>
          <div className="mb-1 inline-flex w-fit items-center gap-2 rounded-full border border-warning-border bg-warning-bg px-3 py-1 text-label-sm text-warning-text">
            <Terminal className="h-3.5 w-3.5" aria-hidden="true" />
            CONV-03 • Offline Pipeline
          </div>
          <DialogTitle>Browser-Based Conversion Fallback</DialogTitle>
          <DialogDescription id="fallback-description">
            {file?.name || 'Your file'} • {formatSize(file?.size)}. This conversion will run inside
            this tab instead of on the server.
          </DialogDescription>
        </DialogHeader>

        <ul className="space-y-3">
          <li className="flex gap-3 rounded-lg border border-border-subtle bg-surface-secondary p-3">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-success-dot" aria-hidden="true" />
            <div>
              <p className="text-label-lg text-text-primary">100% Client-Side Execution</p>
              <p className="text-body-sm text-text-secondary">
                The local copy is parsed in browser memory. No server upload or telemetry snapshot
                is performed for this conversion.
              </p>
            </div>
          </li>
          <li className="flex gap-3 rounded-lg border border-border-subtle bg-surface-secondary p-3">
            <Gauge className="mt-0.5 h-5 w-5 shrink-0 text-brand-primary" aria-hidden="true" />
            <div>
              <p className="text-label-lg text-text-primary">Memory &amp; Performance Target</p>
              <p className="text-body-sm text-text-secondary">
                Estimated browser execution: about {estimateSeconds(file?.size)} seconds for this
                file. Large workbooks can be memory intensive.
              </p>
            </div>
          </li>
          <li className="flex gap-3 rounded-lg border border-border-subtle bg-surface-secondary p-3">
            <Gavel className="mt-0.5 h-5 w-5 shrink-0 text-brand-primary" aria-hidden="true" />
            <div>
              <p className="text-label-lg text-text-primary">Static Safety Guarantee (TRD §7.12)</p>
              <p className="text-body-sm text-text-secondary">
                No dynamic JavaScript evaluation and no VBA macro execution. Only deterministic,
                verified data structures are read.
              </p>
            </div>
          </li>
        </ul>

        {!eligibility?.eligible && (
          <p className="rounded-lg border border-error-border bg-error-bg p-3 text-body-sm text-error-text">
            {eligibility?.reason || 'This file is not eligible for browser fallback.'}
          </p>
        )}

        <Checkbox
          label="I consent to local processing of this file in my browser."
          checked={confirmed}
          onChange={(event) => setConfirmed(event.target.checked)}
        />

        <p className="text-label-md text-text-muted">Status: Awaiting operator consent</p>

        <DialogFooter>
          <Button type="button" variant="outline" size="medium" onClick={() => handleOpenChange(false)}>
            Deny Consent &amp; Cancel
          </Button>
          <Button
            type="button"
            size="medium"
            disabled={!confirmed || !eligibility?.eligible || busy}
            onClick={grant}
          >
            <PlayCircle className="mr-2 h-4 w-4" aria-hidden="true" />
            {busy ? 'Starting…' : 'Grant Consent & Process'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}