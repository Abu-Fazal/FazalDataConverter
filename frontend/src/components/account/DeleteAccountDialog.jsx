import { useEffect, useState } from 'react';
import {
  BadgeCheck,
  Database,
  FileOutput,
  FolderX,
  KeyRound,
  Loader2,
  Lock,
  ShieldAlert,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog.jsx';
import { Button } from '../ui/button.jsx';
import { Badge } from '../ui/badge.jsx';
import { Checkbox } from '../ui/checkbox.jsx';
import { Input } from '../ui/input.jsx';
import { formatBytes } from '../history/format.js';
import { accountApi } from '@/services/account.api';

const CONFIRMATION_PHRASE = 'DELETE MY ACCOUNT PERMANENTLY';

function ShredRow({ icon: Icon, title, detail, value }) {
  return (
    <li className="flex items-start gap-3 py-2.5">
      <Icon className="mt-0.5 h-[18px] w-[18px] shrink-0 text-text-muted" aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-3">
          <span className="truncate text-label-md font-semibold text-text-primary">{title}</span>
          <span className="shrink-0 text-label-sm font-semibold tabular-nums text-error-text">{value}</span>
        </div>
        <p className="mt-0.5 text-body-sm text-text-secondary">{detail}</p>
      </div>
    </li>
  );
}

export function DeleteAccountDialog({ open, onOpenChange, account, onDeleted }) {
  const [reauthState, setReauthState] = useState('idle');
  const [phrase, setPhrase] = useState('');
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setReauthState('idle');
      setPhrase('');
      setConsent(false);
      setError('');
      setSubmitting(false);
    }
  }, [open]);

  const profile = account?.profile || {};
  const storage = account?.storage || {
    originalCount: 0,
    outputCount: 0,
    originalBytes: 0,
    outputBytes: 0,
    historyCount: 0,
  };

  const phraseMatches = phrase === CONFIRMATION_PHRASE;
  const canDelete = reauthState === 'done' && phraseMatches && consent && !submitting;

  async function handleReauthenticate() {
    setError('');
    setReauthState('loading');
    try {
      await accountApi.reauthenticate();
      setReauthState('done');
      toast.success('Identity re-verified', {
        description: 'You have 5 minutes to complete the deletion.',
      });
    } catch (reauthError) {
      setReauthState('idle');
      setError(reauthError.message || 'Google re-authentication failed. Please try again.');
    }
  }

  async function handleDelete() {
    if (!canDelete) return;
    setSubmitting(true);
    setError('');
    try {
      await accountApi.deleteAccount(CONFIRMATION_PHRASE, true);
      window.sessionStorage.removeItem('fdc-user');
      onOpenChange(false);
      toast.success('Account permanently deleted', {
        description: 'Your profile, history, and stored files have been erased.',
      });
      onDeleted?.();
    } catch (deleteError) {
      setError(deleteError.message || 'Account deletion could not be completed. Please retry.');
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !submitting && onOpenChange(next)}>
      <DialogContent className="max-h-[92vh] max-w-xl overflow-y-auto">
        <DialogHeader>
          <span className="mb-1 flex h-11 w-11 items-center justify-center rounded-full bg-error-bg text-error-text">
            <Trash2 className="h-5 w-5" aria-hidden="true" />
          </span>
          <DialogTitle className="text-headline-sm">Delete Account &amp; Purge Stored Data</DialogTitle>
          <DialogDescription>
            This action is irreversible. Confirm the assets below, re-authenticate, then type the exact
            confirmation phrase.
          </DialogDescription>
        </DialogHeader>

        <section
          aria-labelledby="shred-heading"
          className="rounded-xl border border-error-border bg-error-bg/60 p-4"
        >
          <div className="flex items-center justify-between gap-2">
            <h3
              id="shred-heading"
              className="flex items-center gap-1.5 text-label-sm uppercase tracking-wider text-text-secondary"
            >
              <ShieldAlert className="h-4 w-4 text-error-text" aria-hidden="true" />
              Assets Scheduled for Immediate Shred
            </h3>
            <Badge variant="error">Zero-Recovery</Badge>
          </div>
          <ul className="mt-1 divide-y divide-error-border/60">
            <ShredRow
              icon={FolderX}
              title="Original Uploaded Files"
              detail={`${storage.originalCount} files stored in your R2 vault — permanent shred`}
              value={formatBytes(storage.originalBytes)}
            />
            <ShredRow
              icon={FileOutput}
              title="Converted Outputs"
              detail={`${storage.outputCount} datasets (Excel / JSON / BSON) — zero retention purge`}
              value={formatBytes(storage.outputBytes)}
            />
            <ShredRow
              icon={Database}
              title="History & Transformation Metadata"
              detail="Conversion history records — permanently deleted"
              value={`${storage.historyCount} records`}
            />
            <ShredRow
              icon={KeyRound}
              title="Google OAuth Linkage"
              detail="Active session tokens revoked immediately across all devices"
              value="Revoke all"
            />
          </ul>
        </section>

        <p className="flex items-start gap-2 rounded-lg border border-border-subtle bg-surface-secondary p-3 text-body-sm text-text-secondary">
          <Lock className="mt-0.5 h-4 w-4 shrink-0 text-brand-primary" aria-hidden="true" />
          <span>
            <span className="font-medium text-text-primary">Compliance distinction:</span> required
            cryptographic security and audit logs are preserved under the separate one-year compliance
            retention policy.
          </span>
        </p>

        <section aria-labelledby="reauth-heading" className="space-y-3">
          <h3 id="reauth-heading" className="text-headline-sm font-semibold text-text-primary">
            1. Re-authenticate with Google
          </h3>
          <div className="flex items-center gap-3 rounded-xl border border-border-subtle bg-surface-app p-3">
            <span
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-brand text-sm font-semibold text-text-inverse"
              aria-hidden="true"
            >
              {(profile.name || 'U').charAt(0).toUpperCase()}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-label-lg font-semibold text-text-primary">
                {profile.name || 'User'}
              </p>
              <p className="truncate text-body-sm text-text-secondary">{profile.email || '—'}</p>
            </div>
            {reauthState === 'done' ? (
              <Badge variant="success" className="shrink-0">
                <BadgeCheck className="h-3.5 w-3.5" aria-hidden="true" />
                Verified
              </Badge>
            ) : (
              <Button
                size="small"
                variant="outline"
                onClick={handleReauthenticate}
                disabled={reauthState === 'loading'}
                className="shrink-0"
              >
                {reauthState === 'loading' ? (
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                ) : null}
                {reauthState === 'loading' ? 'Verifying...' : 'Verify identity'}
              </Button>
            )}
          </div>
        </section>

        <section aria-labelledby="phrase-heading" className="space-y-2.5">
          <h3 id="phrase-heading" className="text-headline-sm font-semibold text-text-primary">
            2. Type the confirmation phrase to unlock
          </h3>
          <p className="text-body-sm text-text-secondary">
            Please type{' '}
            <span className="font-mono text-label-md font-semibold tracking-wider text-error-text">
              {CONFIRMATION_PHRASE}
            </span>{' '}
            below:
          </p>
          <label htmlFor="delete-confirmation" className="sr-only">
            Confirmation phrase
          </label>
          <Input
            id="delete-confirmation"
            value={phrase}
            onChange={(event) => setPhrase(event.target.value)}
            placeholder={CONFIRMATION_PHRASE}
            className="font-mono text-label-lg tracking-wide"
            autoComplete="off"
            spellCheck={false}
            error={phrase.length > 0 && !phraseMatches}
          />
          {phrase.length > 0 && !phraseMatches ? (
            <p className="text-label-sm text-error-text">The phrase does not match exactly.</p>
          ) : null}
          <Checkbox
            checked={consent}
            onChange={(event) => setConsent(event.target.checked)}
            label="I understand this action is irreversible and all stored files will be permanently erased."
          />
        </section>

        {error ? (
          <p
            role="alert"
            className="rounded-lg border border-error-border bg-error-bg px-3 py-2 text-body-sm text-error-text"
          >
            {error}
          </p>
        ) : null}

        <DialogFooter className="gap-2 sm:space-x-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button variant="danger" onClick={handleDelete} disabled={!canDelete}>
            {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" /> : null}
            {reauthState !== 'done' ? 'Re-authenticate to delete' : 'Permanently delete account'}
          </Button>
        </DialogFooter>

        <p className="flex items-center gap-1.5 text-label-sm text-text-muted">
          <Lock className="h-3.5 w-3.5" aria-hidden="true" />
          TRD §9.4 compliant — cryptographic storage purge executes immediately upon confirmation.
        </p>
      </DialogContent>
    </Dialog>
  );
}