import { ArrowRight, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../ui/button.jsx';
import { StatusBadge } from '../ui/badge.jsx';

/**
 * History Section (Phase 5).
 * Recent conversions grid per PRD §3.7 and TRD §22.
 */
export function HistorySection() {
  const navigate = useNavigate();
  const conversions = [
    {
      id: '1',
      fileName: 'budget_2024.xlsx',
      status: 'completed',
      date: '2026-11-20',
      format: 'xlsx to json',
    },
    {
      id: '2',
      fileName: 'sales_data.json',
      status: 'processing',
      date: '2026-11-19',
      format: 'json to xlsx',
    },
    {
      id: '3',
      fileName: 'inventory.xls',
      status: 'failed',
      date: '2026-11-18',
      format: 'xls to json',
    },
  ];

  return (
    <div className="bg-surface-primary py-12 px-4 max-w-5xl mx-auto">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {conversions.map((conversion) => (
          <div
            key={conversion.id}
            className="border border-border-subtle rounded-xl p-4 hover:bg-surface-secondary transition-colors"
          >
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0">
                <StatusBadge status={conversion.status} />
              </div>
              <div className="flex-1">
                <h3 className="font-medium text-text-primary">{conversion.fileName}</h3>
                <p className="text-xs text-text-muted">{conversion.format}</p>
              </div>
            </div>
            <div className="text-right text-xs text-text-muted">{conversion.date}</div>
          </div>
        ))}
        {conversions.length === 0 && (
          <div className="col-span-2 text-center text-text-muted">
            <Clock className="w-6 h-6 mx-auto mb-2 opacity-50" aria-hidden="true" />
            <p>No conversions yet.</p>
            <Button size="small" variant="outline" onClick={() => navigate('/converter')}>
              <ArrowRight className="w-4 h-4 mr-2" aria-hidden="true" />
              Convert File
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}