import { forwardRef } from 'react';
import { cn } from '@/lib/utils';

const Input = forwardRef(({ className, type = 'text', error = false, icon: Icon, ...props }, ref) => {
  const field = (
    <input
      ref={ref}
      type={type}
      aria-invalid={error || undefined}
      className={cn(
        'w-full rounded-lg border bg-input-bg px-3 py-2.5 text-body-md text-text-primary shadow-sm transition-all duration-150',
        'placeholder:text-input-placeholder',
        'hover:border-input-border-hover',
        'focus:border-input-border-focus focus:outline-none focus:ring-2 focus:ring-input-ring-focus',
        'disabled:cursor-not-allowed disabled:bg-input-bg-disabled disabled:text-text-disabled',
        error
          ? 'border-input-border-error bg-input-bg-error focus:border-input-border-error focus:ring-error-border'
          : 'border-input-border',
        Icon && 'pl-10',
        className,
      )}
      {...props}
    />
  );

  if (!Icon) return field;

  return (
    <div className="relative w-full">
      <Icon
        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted"
        aria-hidden="true"
      />
      {field}
    </div>
  );
});

Input.displayName = 'Input';

export { Input };