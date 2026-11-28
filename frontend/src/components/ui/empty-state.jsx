import { cn } from '@/lib/utils';

export function EmptyState({ icon: Icon, title, description, action, className, ...props }) {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-3 px-6 py-12 text-center', className)} {...props}>
      {Icon && (
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-soft">
          <Icon className="h-6 w-6 text-brand-primary" aria-hidden="true" />
        </div>
      )}
      <p className="text-label-lg font-semibold text-text-primary">{title}</p>
      {description && <p className="max-w-sm text-body-sm text-text-secondary">{description}</p>}
      {action && <div className="pt-2">{action}</div>}
    </div>
  );
}