import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react';
import { Card } from '../ui/card.jsx';
import { cn } from '@/lib/utils';

const tones = {
  brand: { icon: 'text-brand-primary', bg: 'bg-brand-primary-soft' },
  success: { icon: 'text-success-text', bg: 'bg-success-bg' },
  warning: { icon: 'text-warning-text', bg: 'bg-warning-bg' },
  error: { icon: 'text-error-text', bg: 'bg-error-bg' },
  info: { icon: 'text-info-text', bg: 'bg-info-bg' },
  neutral: { icon: 'text-text-secondary', bg: 'bg-surface-secondary' },
};

/**
 * Admin metric card (PRD §8.1). Every figure shown is computed from live data.
 */
export function MetricCard({ label, value, hint, icon: Icon, tone = 'brand', delta, className }) {
  const style = tones[tone] || tones.brand;
  const trend = typeof delta === 'number' ? delta : null;
  const TrendIcon = trend == null || trend === 0 ? Minus : trend > 0 ? ArrowUpRight : ArrowDownRight;

  return (
    <Card className={cn('p-5', className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-[0.06em] text-text-muted">{label}</p>
          <p className="mt-1.5 text-2xl font-bold tabular-nums tracking-tight text-text-primary">{value}</p>
          {hint ? <p className="mt-1 text-xs text-text-secondary">{hint}</p> : null}
          {trend != null ? (
            <p
              className={cn(
                'mt-2 inline-flex items-center gap-1 text-label-sm',
                trend > 0 ? 'text-success-text' : trend < 0 ? 'text-error-text' : 'text-text-muted',
              )}
            >
              <TrendIcon size={13} aria-hidden="true" />
              {trend > 0 ? '+' : ''}
              {trend} today vs yesterday
            </p>
          ) : null}
        </div>
        {Icon ? (
          <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-lg', style.bg)}>
            <Icon className={cn('h-5 w-5', style.icon)} aria-hidden="true" />
          </span>
        ) : null}
      </div>
    </Card>
  );
}