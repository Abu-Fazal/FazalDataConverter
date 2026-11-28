import { CheckCircle2, AlertTriangle, AlertCircle, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

const alertVariants = {
  info: { box: 'bg-info-bg border-info-border text-info-text', icon: Info },
  success: { box: 'bg-success-bg border-success-border text-success-text', icon: CheckCircle2 },
  warning: { box: 'bg-warning-bg border-warning-border text-warning-text', icon: AlertTriangle },
  error: { box: 'bg-error-bg border-error-border text-error-text', icon: AlertCircle },
};

export function Alert({ variant = 'info', title, className, children, ...props }) {
  const config = alertVariants[variant];
  const Icon = config.icon;
  const assertive = variant === 'error' || variant === 'warning';

  return (
    <div
      role={assertive ? 'alert' : 'status'}
      className={cn('flex items-start gap-3 rounded-lg border p-4', config.box, className)}
      {...props}
    >
      <Icon className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
      <div className="space-y-1">
        {title && <p className="text-label-lg font-semibold">{title}</p>}
        {children && <div className="text-body-sm">{children}</div>}
      </div>
    </div>
  );
}