import { cn } from '@/lib/utils';

const badgeVariants = {
  success: 'bg-success-bg text-success-text border-success-border',
  warning: 'bg-warning-bg text-warning-text border-warning-border',
  error: 'bg-error-bg text-error-text border-error-border',
  info: 'bg-info-bg text-info-text border-info-border',
  processing: 'bg-processing-bg text-processing-text border-processing-border',
  neutral: 'bg-neutral-bg text-neutral-text border-neutral-border',
};

const badgeDots = {
  success: 'bg-success-dot',
  warning: 'bg-warning-dot',
  error: 'bg-error-dot',
  info: 'bg-info-dot',
  processing: 'bg-processing-dot',
  neutral: 'bg-neutral-dot',
};

export function Badge({ variant = 'neutral', dot = false, pulse = false, className, children, ...props }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-label-sm',
        badgeVariants[variant],
        className,
      )}
      {...props}
    >
      {dot && (
        <span
          className={cn('h-2 w-2 rounded-full', badgeDots[variant], pulse && 'animate-pulse')}
          aria-hidden="true"
        />
      )}
      {children}
    </span>
  );
}

const statusMap = {
  pending: { variant: 'neutral', label: 'Pending' },
  processing: { variant: 'processing', label: 'Processing', pulse: true },
  completed: { variant: 'success', label: 'Completed' },
  failed: { variant: 'error', label: 'Failed' },
  cancelled: { variant: 'neutral', label: 'Cancelled' },
};

export function StatusBadge({ status, className }) {
  const config = statusMap[status] || { variant: 'neutral', label: status };
  return (
    <Badge variant={config.variant} dot pulse={config.pulse} className={className}>
      {config.label}
    </Badge>
  );
}