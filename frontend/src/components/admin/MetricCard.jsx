import { ArrowUp, Clock, CheckCircle2, AlertCircle } from 'lucide-react';
import { Card } from '../ui/card.jsx';

const variants = {
  users: { icon: ArrowUp, color: 'text-brand-primary', bg: 'bg-brand-primary-soft' },
  conversions: { icon: CheckCircle2, color: 'text-success-text', bg: 'bg-success-bg' },
  failure: { icon: AlertCircle, color: 'text-error-text', bg: 'bg-error-bg' },
  status: { icon: Clock, color: 'text-processing-text', bg: 'bg-processing-bg' },
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
    <Card className="p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-text-secondary">{title}</p>
          <p className="text-2xl font-bold text-text-primary tabular-nums">{value}</p>
          {delta != null && (
            <p className={`text-xs font-medium ${delta >= 0 ? 'text-success-text' : 'text-error-text'}`}>
              {delta >= 0 ? '+' : ''}{delta}
            </p>
          )}
        </div>
        <div className={`p-2 rounded-lg ${bg}`}>
          <Icon className={`w-5 h-5 ${color}`} aria-hidden="true" />
        </div>
      </div>
    </Card>
  );
}