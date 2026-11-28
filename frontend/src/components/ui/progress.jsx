import * as React from 'react';
import { cn } from '@/lib/utils';

/**
 * Progress indicator primitive (Chunk 5.3).
 * Shows a horizontal progress bar with percentage label.
 * Uses project design tokens for processing state.
 */
export function Progress({ value = 0, className, 'aria-label': ariaLabel = 'Conversion progress', ...props }) {
  const clamped = Math.min(100, Math.max(0, value));
  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={clamped}
      aria-label={ariaLabel}
      className={cn('w-full bg-border-subtle rounded-full h-2.5', className)}
      {...props}
    >
      <div
        className="flex-1 h-2.5 rounded-full bg-gradient-brand transition-all duration-300"
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}
