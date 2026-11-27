import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { forwardRef } from 'react';
import { cn } from '@/lib/utils';

const buttonVariants = {
  default: 'bg-brand-primary text-text-inverse hover:bg-brand-primary-dark focus-visible:ring-brand-primary focus-visible:ring-2 focus-visible:ring-offset-2 shadow-sm',
  secondary:
    'bg-surface-secondary text-text-primary border border-border-subtle hover:bg-surface-tertiary focus-visible:ring-brand-primary focus-visible:ring-2 focus-visible:ring-offset-2',
  outline:
    'border border-border-subtle bg-transparent text-text-primary hover:bg-surface-secondary focus-visible:ring-brand-primary focus-visible:ring-2 focus-visible:ring-offset-2',
  ghost:
    'bg-transparent text-text-secondary hover:bg-surface-secondary focus-visible:ring-brand-primary focus-visible:ring-2 focus-visible:ring-offset-2',
  danger:
    'bg-text-error text-text-inverse hover:bg-[#B91C1C] focus-visible:ring-text-error focus-visible:ring-2 focus-visible:ring-offset-2',
  link: 'text-brand-primary underline-offset-4 hover:underline focus-visible:ring-brand-primary focus-visible:ring-2',
};

const buttonSizes = {
  small: 'h-8 px-3 text-xs',
  medium: 'h-10 px-4 py-2 text-sm',
  large: 'h-12 px-6 text-base',
};

const Button = forwardRef(
  ({ className, variant = 'default', size = 'medium', asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center rounded-lg font-medium transition-all duration-150 disabled:pointer-events-none disabled:opacity-50',
          buttonSizes[size],
          buttonVariants[variant],
          className,
        )}
        {...props}
      />
    );
  },
);

Button.displayName = 'Button';

export { Button, buttonVariants, buttonSizes };
