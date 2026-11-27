import { ArrowUp, ArrowDown, Clock, CheckCircle2, AlertCircle } from 'lucide-react';

const variants = {
  users: { icon: ArrowUp, color: 'text-brand-primary', bg: 'bg-brand-primary-soft' },
  conversions: { icon: CheckCircle2, color: 'text-[#047857]', bg: 'bg-[#ECFDF5]' },
  failure: { icon: AlertCircle, color: 'text-[#B91C1C]', bg: 'bg-[#FEF2F2]' },
  status: { icon: Clock, color: 'text-[#4338CA]', bg: 'bg-[#EEF2FF]' },
};

/**
 * Admin metric card (Chunk 5.5).
 * Displays a key figure with an icon, label, value, and optional delta.
 */
export function MetricCard({ title, value, delta, type = 'users' }) {
  const Icon = variants[type]?.icon || ArrowUp;
  const color = variants[type]?.color || 'text-text-primary';
  const bg = variants[type]?.bg || 'bg-surface-secondary';

  return (
    <div className="rounded-xl border border-border-subtle bg-surface-primary p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-text-secondary">{title}</p>
          <p className="text-2xl font-bold text-text-primary tabular-nums">{value}</p>
          {delta && (
            <p className={`text-xs font-medium ${delta >= 0 ? 'text-[#047857]' : 'text-[#B91C1D]'}`}>
              {delta >= 0 ? '+' : ''}{delta}
            </p>
          )}
        </div>
        <div className={`p-2 rounded-lg ${bg}`}>
          <Icon className={`w-5 h-5 ${color}`} />
        </div>
      </div>
    </div>
  );
}
