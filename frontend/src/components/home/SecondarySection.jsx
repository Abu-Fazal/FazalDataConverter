import { AlertCircle, CheckCircle2, Clock } from 'lucide-react';
import { Button } from '../ui/button.jsx';
import { cn } from '@/lib/utils';

/**
 * Home Secondary Section (Phase 5).
 * Grid of key feature cards per PRD §1.2 design specifications.
 */
export function SecondarySection() {
  const features = [
    {
      icon: AlertCircle,
      title: 'Secure',
      description: 'Bank-level encryption and ownership validation per userId. No unauthorized access.',
    },
    {
      icon: CheckCircle2,
      title: 'Fast',
      description: 'Conversion processing: up to 50MB files within 60 seconds per PRD specifications.',
    },
    {
      icon: Clock,
      title: 'Trusted',
      description: '1-year immutable audit logs. Security logs read-only with mandatory retention.',
    },
  ];

  return (
    <div className="bg-surface-primary py-12 px-4 max-w-5xl mx-auto">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3 max-w-2xl mx-auto">
        {features.map((feature) => (
          <div
            key={feature.title}
            className="group border border-border-subtle rounded-xl p-6 hover:bg-surface-secondary transition-colors"
          >
            <div className="h-12 w-12 group-hover:scale-110 group-hover:text-brand-primary flex items-center justify-center mb-4">
              {feature.icon}
            </div>
            <h3 className="text-lg font-semibold text-text-primary group-hover:text-brand-primary mb-2">{feature.title}</h3>
            <p className="text-text-secondary line-clamp-2">{feature.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}