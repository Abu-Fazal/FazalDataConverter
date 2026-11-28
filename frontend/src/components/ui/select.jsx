import { forwardRef } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

const Select = forwardRef(({ className, error = false, children, ...props }, ref) => (
  <div className="relative w-full">
    <select
      ref={ref}
      aria-invalid={error || undefined}
      className={cn(
        'w-full appearance-none rounded-lg border bg-input-bg px-3 py-2 pr-9 text-body-md text-text-primary shadow-sm transition-all duration-150',
        'hover:border-input-border-hover',
        'focus:border-input-border-focus focus:outline-none focus:ring-2 focus:ring-input-ring-focus',
        'disabled:cursor-not-allowed disabled:bg-input-bg-disabled disabled:text-text-disabled',
        error
          ? 'border-input-border-error bg-input-bg-error focus:border-input-border-error focus:ring-error-border'
          : 'border-input-border',
        className,
      )}
      {...props}
    >
      {children}
    </select>
    <ChevronDown
      className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted"
      aria-hidden="true"
    />
  </div>
));

Select.displayName = 'Select';

export { Select };