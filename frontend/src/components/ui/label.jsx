import { forwardRef } from 'react';
import { cn } from '@/lib/utils';

const Label = forwardRef(({ className, required = false, children, ...props }, ref) => (
  <label
    ref={ref}
    className={cn('block text-label-lg text-text-primary', className)}
    {...props}
  >
    {children}
    {required && (
      <span className="ml-0.5 text-error-text" aria-hidden="true">
        *
      </span>
    )}
  </label>
));

Label.displayName = 'Label';

export { Label };