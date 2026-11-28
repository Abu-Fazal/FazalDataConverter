import { forwardRef } from 'react';
import { cn } from '@/lib/utils';

const Textarea = forwardRef(({ className, error = false, rows = 3, ...props }, ref) => (
  <textarea
    ref={ref}
    rows={rows}
    aria-invalid={error || undefined}
    className={cn(
      'w-full resize-none rounded-lg border bg-input-bg p-3 text-body-sm text-text-primary shadow-sm transition-all duration-150',
      'placeholder:text-input-placeholder',
      'hover:border-input-border-hover',
      'focus:border-input-border-focus focus:outline-none focus:ring-2 focus:ring-input-ring-focus',
      'disabled:cursor-not-allowed disabled:bg-input-bg-disabled disabled:text-text-disabled',
      error
        ? 'border-input-border-error bg-input-bg-error focus:border-input-border-error focus:ring-error-border'
        : 'border-input-border',
      className,
    )}
    {...props}
  />
));

Textarea.displayName = 'Textarea';

export { Textarea };