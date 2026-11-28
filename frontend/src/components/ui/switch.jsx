import { forwardRef } from 'react';
import { cn } from '@/lib/utils';

const Switch = forwardRef(
  ({ className, checked = false, onCheckedChange, disabled = false, id, 'aria-label': ariaLabel, ...props }, ref) => (
    <button
      ref={ref}
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={() => onCheckedChange?.(!checked)}
      className={cn(
        'relative inline-flex h-7 w-14 shrink-0 cursor-pointer rounded-full transition-colors duration-200 ease-in-out',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2',
        'disabled:cursor-not-allowed disabled:opacity-50',
        checked ? 'bg-brand-primary' : 'bg-border-hover',
        className,
      )}
      {...props}
    >
      <span
        aria-hidden="true"
        className={cn(
          'pointer-events-none mt-1 inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition duration-200 ease-in-out',
          checked ? 'translate-x-8' : 'translate-x-1',
        )}
      />
    </button>
  ),
);

Switch.displayName = 'Switch';

export { Switch };