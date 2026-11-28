import { useEffect, useState } from 'react';
import { Table2, EyeOff, Info, Sigma, Layers } from 'lucide-react';
import { Button } from '../ui/button.jsx';
import { Checkbox } from '../ui/checkbox.jsx';
import { Badge } from '../ui/badge.jsx';
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

/**
 * Sheet selection modal (Figma: sheet_selection_modal) backed by real
 * worksheet metadata from the inspect endpoint or local inspection.
 */
export function SheetSelectorModal({ open, onOpenChange, file, sheets = [], selectedSheets = [], onConfirm }) {
  const [draft, setDraft] = useState(new Set());

  useEffect(() => {
    if (!open) return;
    const initial = selectedSheets.length > 0 ? selectedSheets : sheets.map((sheet) => sheet.name);
    setDraft(new Set(initial));
  }, [open, selectedSheets, sheets]);

  const toggleSheet = (name) => {
    const next = new Set(draft);
    if (next.has(name)) next.delete(name);
    else next.add(name);
    setDraft(next);
  };

  const allSelected = sheets.length > 0 && sheets.every((sheet) => draft.has(sheet.name));
  const totalRows = sheets.reduce((sum, sheet) => sum + (sheet.dataRows ?? sheet.rows ?? 0), 0);

  const toggleAll = () => {
    setDraft(allSelected ? new Set() : new Set(sheets.map((sheet) => sheet.name)));
  };

  const confirm = () => {
    onConfirm([...draft]);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg" aria-describedby="sheet-modal-description">
        <DialogHeader>
          <div className="mb-1 flex h-10 w-10 items-center justify-center rounded-lg bg-surface-secondary text-brand-primary">
            <Table2 className="h-5 w-5" aria-hidden="true" />
          </div>
          <DialogTitle>Select Worksheets to Convert</DialogTitle>
          <DialogDescription id="sheet-modal-description">
            {file?.name || 'Workbook'} • {formatSize(file?.size)} • {sheets.length} worksheet
            {sheets.length === 1 ? '' : 's'}
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-between rounded-lg border border-brand-primary-border bg-brand-primary-soft px-4 py-3">
          <div>
            <p className="text-label-md text-brand-primary-deep">Estimated Total</p>
            <p className="text-headline-sm text-text-primary">
              {totalRows.toLocaleString()} rows
            </p>
          </div>
          <Layers className="h-6 w-6 text-brand-primary" aria-hidden="true" />
        </div>

        <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
          {sheets.map((sheet) => {
            const hidden = sheet.visibility && sheet.visibility !== 'visible';
            const rows = sheet.dataRows ?? sheet.rows ?? 0;
            const columns = sheet.columns ?? 0;

            return (
              <label
                key={sheet.name}
                className="flex cursor-pointer items-start gap-3 rounded-lg border border-border-subtle bg-surface-primary px-3 py-3 transition-colors hover:bg-surface-secondary"
              >
                <Checkbox
                  className="mt-0.5"
                  checked={draft.has(sheet.name)}
                  onChange={() => toggleSheet(sheet.name)}
                  aria-label={`Include ${sheet.name}`}
                />
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="truncate text-label-lg text-text-primary">{sheet.name}</span>
                    {hidden ? (
                      <Badge variant="warning" className="px-2 py-0 text-[10px]">
                        <EyeOff className="h-3 w-3" aria-hidden="true" />
                        Hidden
                      </Badge>
                    ) : (
                      <Badge variant="success" className="px-2 py-0 text-[10px]">Visible</Badge>
                    )}
                    {sheet.formulaCells > 0 && (
                      <Badge variant="info" className="px-2 py-0 text-[10px]">
                        <Sigma className="h-3 w-3" aria-hidden="true" />
                        {sheet.formulaCells} formulas
                      </Badge>
                    )}
                  </span>
                  <span className="mt-0.5 block text-body-sm text-text-muted">
                    {rows.toLocaleString()} rows × {columns} cols
                    {sheet.missingCachedFormulas > 0
                      ? ` • ${sheet.missingCachedFormulas} cached formula missing`
                      : ''}
                  </span>
                </span>
              </label>
            );
          })}
        </div>

        <button
          type="button"
          onClick={toggleAll}
          className="flex w-full items-center gap-2 rounded-lg border border-border-subtle bg-surface-secondary px-3 py-2 text-left text-label-lg text-text-primary hover:bg-surface-tertiary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
        >
          <Checkbox checked={allSelected} readOnly aria-hidden="true" tabIndex={-1} />
          Select all worksheets
        </button>

        <div className="flex gap-2 rounded-lg border border-info-border bg-info-bg p-3 text-body-sm text-info-text">
          <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          Hidden worksheets are included only when selected, per TRD §7.3. The entire workbook is
          selected by default (PRD §6.9.3).
        </div>

        <DialogFooter>
          <Button type="button" size="medium" onClick={confirm} disabled={draft.size === 0}>
            {`Confirm ${draft.size} Sheet${draft.size === 1 ? '' : 's'} & Proceed`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}