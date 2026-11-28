import { AlertCircle, Download } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../ui/button.jsx';
import { Badge } from '../ui/badge.jsx';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../ui/table.jsx';
import { Tooltip, TooltipTrigger, TooltipContent } from '../ui/tooltip.jsx';

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

const CSV_HEADERS = ['ID', 'File', 'Conversion', 'User', 'Error', 'Category', 'Created At'];

function jobToRow(job) {
  return [
    job.id,
    job.fileName,
    `${job.sourceFormat} to ${job.targetFormat}`,
    job.user,
    job.error,
    job.errorCategory,
    job.createdAt,
  ];
}

function downloadCsv(rows, fileName) {
  const csv = [CSV_HEADERS.join(','), ...rows.map((row) => row.map((cell) => `"${cell}"`).join(','))].join('\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Failed conversion jobs table (Chunk 5.5).
 * Admin can only view metadata — never file contents.
 */
export function FailedJobsTable() {
  function exportAll() {
    downloadCsv(
      MOCK_FAILED_JOBS.map(jobToRow),
      `failed-jobs-${new Date().toISOString().slice(0, 10)}.csv`,
    );
    toast.success('Failed jobs metadata exported', { description: `${MOCK_FAILED_JOBS.length} rows, metadata only.` });
  }

  function exportOne(job) {
    downloadCsv([jobToRow(job)], `failed-job-${job.id}.csv`);
    toast.success('Job metadata exported', { description: job.fileName });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-text-primary">Failed Conversion Jobs</h2>
        <Button size="small" variant="outline" onClick={exportAll}>
          <Download className="w-4 h-4 mr-2" aria-hidden="true" />
          Export CSV
        </Button>
      </div>

      <Table caption="Failed conversion jobs (metadata only)">
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead>File</TableHead>
            <TableHead>Conversion</TableHead>
            <TableHead>User</TableHead>
            <TableHead>Error Category</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {MOCK_FAILED_JOBS.map((job) => (
            <TableRow key={job.id}>
              <TableCell>
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-error-text" aria-hidden="true" />
                  <span className="font-medium">{job.fileName}</span>
                </div>
              </TableCell>
              <TableCell className="text-text-secondary">
                {job.sourceFormat} to {job.targetFormat}
              </TableCell>
              <TableCell className="text-text-secondary tabular-nums">{job.user}</TableCell>
              <TableCell>
                <Badge variant="error">{job.errorCategory}</Badge>
              </TableCell>
              <TableCell className="text-text-secondary tabular-nums">{job.createdAt}</TableCell>
              <TableCell>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="small"
                      variant="outline"
                      aria-label={`Export metadata for ${job.fileName}`}
                      onClick={() => exportOne(job)}
                    >
                      <Download className="w-4 h-4" aria-hidden="true" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Export metadata</TooltipContent>
                </Tooltip>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <p className="text-xs text-text-muted">
        Admin can view conversion metadata only. Original files and converted content are not accessible.
      </p>
    </div>
  );
}