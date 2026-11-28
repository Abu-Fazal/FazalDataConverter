import { useEffect, useState } from 'react';
import { AlertTriangle, Loader2, Trash2 } from 'lucide-react';
import { Button } from '../ui/button.jsx';
import { Input } from '../ui/input.jsx';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog.jsx';
import { adminApi } from '@/services/admin.api';
import { formatBytes } from './format.js';

/**
 * Permanent account deletion requires typing DELETE (PRD §8.2).
 * The Admin can never see raw files — only storage metrics.
 */
export function DeleteUserDialog({ open, onOpenChange, user, onDeleted }) {
  const [phrase, setPhrase] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setPhrase('');
      setError('');
    }
  }, [open]);

  async function handleDelete() {
    if (!user || phrase !== 'DELETE') return;
    setBusy(true);
    setError('');
    try {
      const result = await adminApi.deleteUser(user.publicId, 'DELETE');
      onOpenChange(false);
      onDeleted?.(result);
    } catch (deleteError) {
      setError(deleteError.message || 'The account could not be deleted. Please retry.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => (!busy ? onOpenChange(next) : null)}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-error-bg sm:mx-0">
            <Trash2 className="h-6 w-6 text-error-text" aria-hidden="true" />
          </div>
          <DialogTitle>Confirm permanent user account deletion</DialogTitle>
          <DialogDescription>
            Irreversible purge protocol (TRD §4.1). The audit trail entry is recorded in the
            immutable security ledger.
          </DialogDescription>
        </DialogHeader>

        {user ? (
          <div className="space-y-4">
            <div className="rounded-lg border border-error-border bg-error-bg px-4 py-3 text-body-sm text-error-text">
              <p className="font-semibold">Deleting {user.publicId} ({user.email})</p>
              <p className="mt-1 leading-5">
                This permanently erases stored original files, converted outputs, conversion history,
                and revokes active sessions. This action cannot be undone.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-lg border border-border-subtle bg-surface-app p-3">
                <p className="text-[11px] uppercase tracking-wide text-text-muted">Stored bytes</p>
                <p className="mt-1 text-sm font-semibold tabular-nums text-text-primary">
                  {formatBytes(user.storageBytes)}
                </p>
              </div>
              <div className="rounded-lg border border-border-subtle bg-surface-app p-3">
                <p className="text-[11px] uppercase tracking-wide text-text-muted">Original files</p>
                <p className="mt-1 text-sm font-semibold tabular-nums text-text-primary">{user.originalCount}</p>
              </div>
              <div className="rounded-lg border border-border-subtle bg-surface-app p-3">
                <p className="text-[11px] uppercase tracking-wide text-text-muted">Outputs</p>
                <p className="mt-1 text-sm font-semibold tabular-nums text-text-primary">{user.outputCount}</p>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="delete-user-phrase" className="text-body-sm font-medium text-text-primary">
                Type <span className="font-mono font-semibold text-error-text">DELETE</span> to proceed
              </label>
              <Input
                id="delete-user-phrase"
                value={phrase}
                onChange={(event) => setPhrase(event.target.value)}
                placeholder="DELETE"
                autoComplete="off"
                aria-invalid={phrase.length > 0 && phrase !== 'DELETE' ? true : undefined}
              />
            </div>

            {error ? (
              <p role="alert" className="rounded-lg border border-error-border bg-error-bg px-3 py-2 text-body-sm text-error-text">
                {error}
              </p>
            ) : null}

            <p className="flex items-start gap-2 text-[11px] leading-4 text-text-muted">
              <AlertTriangle size={13} className="mt-0.5 shrink-0 text-warning-text" aria-hidden="true" />
              The Admin never accesses file contents. Deletion only purges the isolated storage objects and metadata.
            </p>
          </div>
        ) : null}

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
            Cancel
          </Button>
          <Button variant="danger" onClick={handleDelete} disabled={busy || phrase !== 'DELETE'}>
            {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" /> : <Trash2 className="mr-2 h-4 w-4" aria-hidden="true" />}
            Permanently delete user account
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}