import { AlertCircle, Download, RefreshCw } from 'lucide-react';
import { Button } from '../ui/button.jsx';
import { cn } from '@/lib/utils';

const MOCK_FAILED_JOBS = [
  {
    id: 'job_003',
    fileName: 'inventory.xls',
    sourceFormat: 'xls',
    targetFormat: 'json',
    user: 'user_a@example.com',
    status: 'failed',
    error: 'Unsupported file structure',
    errorCategory: 'Invalid Format',
    createdAt: '2026-11-20 14:32:10',
  },
  {
    id: 'job_007',
    fileName: 'large_report.xlsx',
    sourceFormat: 'xlsx',
    targetFormat: 'bson',
    user: 'user_b@example.com',
    status: 'failed',
    error: 'File exceeds processing timeout',
    errorCategory: 'Timeout',
    createdAt: '2026-11-19 09:15:45',
  },
  {
    id: 'job_011',
    fileName: 'data.json',
    sourceFormat: 'json',
    targetFormat: 'xlsx',
    user: 'user_c@example.com',
    status: 'failed',
    error: 'Malformed JSON input',
    errorCategory: 'Invalid Data',
    createdAt: '2026-11-18 16:42:00',
  },
];

/**
 * Failed conversion jobs table (Chunk 5.5).
 * Lists failed conversion jobs with error reason and category.
 * Admin can only view metadata — never file contents.
 */
export function FailedJobsTable() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-text-primary">Failed Conversion Jobs</h2>
        <Button size="small" variant="outline">
          <RefreshCw className="w-4 h-4 mr-2" />
          Retry Selected
        </Button>
      </div>

      <div className="rounded-xl border border-border-subtle bg-surface-primary shadow-sm overflow-hidden">
        <table className="w-full text-sm text-left border-collapse">
          <thead className="bg-surface-secondary border-b border-border-subtle">
            <tr>
              <th className="px-4 py-3 font-medium text-text-secondary uppercase tracking-wider text-xs">
                File
              </th>
              <th className="px-4 py-3 font-medium text-text-secondary uppercase tracking-wider text-xs">
                Conversion
              </th>
              <th className="px-4 py-3 font-medium text-text-secondary uppercase tracking-wider text-xs">
                User
              </th>
              <th className="px-4 py-3 font-medium text-text-secondary uppercase tracking-wider text-xs">
                Error Category
              </th>
              <th className="px-4 py-3 font-medium text-text-secondary uppercase tracking-wider text-xs">
                Date
              </th>
              <th className="px-4 py-3 font-medium text-text-secondary uppercase tracking-wider text-xs">
                Action
              </th>
            </tr>
          </thead>
          <tbody>
            {MOCK_FAILED_JOBS.map((job) => (
              <tr
                key={job.id}
                className="border-b border-border-subtle hover:bg-surface-tertiary transition-colors"
              >
                <td className="px-4 py-4 text-text-primary">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-[#B91C1C]" />
                    <span className="font-medium">{job.fileName}</span>
                  </div>
                </td>
                <td className="px-4 py-4 text-text-secondary">
                  {job.sourceFormat} to {job.targetFormat}
                </td>
                <td className="px-4 py-4 text-text-secondary tabular-nums">{job.user}</td>
                <td className="px-4 py-4">
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium border border-[#FECACA] bg-[#FEF2F2] text-[#B91C1C]">
                    {job.errorCategory}
                  </span>
                </td>
                <td className="px-4 py-4 text-text-secondary tabular-nums">{job.createdAt}</td>
                <td className="px-4 py-4">
                  <Button size="small" variant="outline" onClick={() => {}}>
                    <Download className="w-4 h-4" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-text-muted">
        Admin can view conversion metadata only. Original files and converted content are not accessible.
      </p>
    </div>
  );
}
