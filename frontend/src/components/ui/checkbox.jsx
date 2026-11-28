import { forwardRef, useId } from 'react';
import { cn } from '@/lib/utils';

const Checkbox = forwardRef(({ className, label, id, disabled = false, ...props }, ref) => {
  const autoId = useId();
  const inputId = id || autoId;

  const box = (
    <input
      ref={ref}
      id={inputId}
      type="checkbox"
      disabled={disabled}
      className={cn(
        'h-4 w-4 shrink-0 cursor-pointer rounded border-input-border accent-brand-primary',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2',
        'disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    />
  );

  if (!label) return box;

  return (
    <label
      htmlFor={inputId}
      className={cn(
        'inline-flex cursor-pointer items-center gap-2 text-body-md text-text-primary',
        disabled && 'cursor-not-allowed text-text-disabled',
      )}
    >
      {box}
      <span>{label}</span>
    </label>
  );
});

Checkbox.displayName = 'Checkbox';

export { Checkbox };