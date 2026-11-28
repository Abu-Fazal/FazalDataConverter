import { useState } from 'react';
import { ArrowRight, Clock, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Button } from '../ui/button.jsx';
import { cn } from '@/lib/utils';

/**
 * History Section (Phase 5).
 * Recent conversions grid per PRD §3.7 and TRD §22.
 */
export function HistorySection() {
  const [conversions, setConversions] = useState([
    {
      id: '1',
      fileName: 'budget_2024.xlsx',
      status: 'completed',
      date: '2026-11-20',
      format: 'xlsx → json',
    },
    {
      id: '2',
      fileName: 'sales_data.json',
      status: 'processing',
      date: '2026-11-19',
      format: 'json → xlsx',
    },
    {
      id: '3',
      fileName: 'inventory.xls',
      status: 'failed',
      date: '2026-11-18',
      format: 'xls → json',
    },
  ]);

  const statusClasses = {
    completed: 'bg-[#ECFDF5] text-[#047857] border border-[#A7F3D0]',
    processing: 'bg-[#EEF2FF] text-[#4338CA] border border-[#C7D2FE]',
    failed: 'bg-[#FEF2F2] text-[#B91C1C] border border-[#FECACA]',
  };

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
                <span className={statusClasses[conversion.status]}>
                  {conversion.status}
                </span>
              </div>
              <div className="flex-1">
                <h3 className="font-medium text-text-primary">{conversion.fileName}</h3>
                <p className="text-xs text-text-muted">
                  {conversion.format}
                </p>
              </div>
            </div>
            <div className="text-right text-xs text-text-muted">
              {conversion.date}
            </div>
          </div>
        ))}
        {conversions.length === 0 && (
          <div className="col-span-2 text-center text-text-muted">
            <Clock className="w-6 h-6 mx-auto mb-2 opacity-50" />
            <p>No conversions yet.</p>
            <Button size="small" variant="outline">
              <ArrowRight className="w-4 h-4 mr-2" />
              Convert File
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}