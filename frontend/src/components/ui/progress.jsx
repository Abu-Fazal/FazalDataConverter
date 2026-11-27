import * as React from 'react';
import { cn } from '@/lib/utils';

/**
 * Progress indicator primitive (Chunk 5.3).
 * Shows a horizontal progress bar with percentage label.
 * Uses project design tokens for processing state.
 */
export function Progress({ value = 0, className, ...props }) {
  return (
    <div
      className={cn('w-full bg-border-subtle rounded-full h-2.5', className)}
      {...props}
    >
      <div
        className="flex-1 h-2.5 rounded-full bg-gradient-brand transition-all duration-300"
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}

/**
 * Status badge for job status (pending, processing, completed, failed, cancelled).
 */
export function StatusBadge({ status }) {
  const variants = {
    pending: 'bg-surface-tertiary text-text-muted border border-border-subtle',
    processing: 'bg-[#EEF2FF] text-[#4338CA] border border-[#C7D2FE]',
    completed: 'bg-[#ECFDF5] text-[#047857] border border-[#A7F3D0]',
    failed: 'bg-[#FEF2F2] text-[#B91C1C] border border-[#FECACA]',
    cancelled: 'bg-surface-tertiary text-text-muted border border-border-subtle',
  };

  const labels = {
    pending: 'Pending',
    processing: 'Processing',
    completed: 'Completed',
    failed: 'Failed',
    cancelled: 'Cancelled',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border',
        variants[status],
      )}
    >
      {labels[status]}
    </span>
  );
}
