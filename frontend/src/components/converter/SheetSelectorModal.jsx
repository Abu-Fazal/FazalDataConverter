import { useState } from 'react';
import { Sheet } from 'lucide-react';
import { Button } from '../ui/button.jsx';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../ui/dialog.jsx';

/**
 * Sheet selector modal (Chunk 5.2).
 * Lets user pick which Excel sheets to include in Workbook JSON mode.
 * Emits selected sheet names via onConfirm.
 */
export function SheetSelectorModal({ open, onOpenChange, sheets = [], onConfirm }) {
  const [selected, setSelected] = useState(new Set(sheets.map((s) => s.name)));

  const toggleSheet = (name) => {
    const next = new Set(selected);
    if (next.has(name)) next.delete(name);
    else next.add(name);
    setSelected(next);
  };

  const allSelected = sheets.length > 0 && sheets.every((s) => selected.has(s.name));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Select Sheets</DialogTitle>
          <DialogDescription>
            Choose sheets to include in Workbook JSON output.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2 pt-2">
          {sheets.map((sheet) => (
            <label
              key={sheet.name}
              className="flex items-center gap-3 px-3 py-2 rounded-lg border border-border-subtle bg-surface-primary cursor-pointer hover:bg-surface-secondary transition-colors"
            >
              <input
                type="checkbox"
                checked={selected.has(sheet.name)}
                onChange={() => toggleSheet(sheet.name)}
                className="rounded border-border-subtle text-brand-primary focus:ring-brand-primary"
              />
              <span className="text-sm text-text-primary">{sheet.name}</span>
              <span className="ml-auto text-xs text-text-muted">
                {sheet.rows} rows
              </span>
            </label>
          ))}
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border-subtle bg-surface-secondary cursor-pointer select-none" onClick={() => {
            if (allSelected) setSelected(new Set());
            else setSelected(new Set(sheets.map((s) => s.name)));
          }}>
            <input
              type="checkbox"
              checked={allSelected}
              readOnly
              className="rounded border-border-subtle text-brand-primary"
            />
            <span className="text-sm font-medium text-text-primary">Select all</span>
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" size="small" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" size="small" onClick={() => onConfirm([...selected])}>
            Confirm
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
