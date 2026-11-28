import { useState } from 'react';
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { Download, Trash2, AlertCircle, Clock } from 'lucide-react';
import { Button } from '../ui/button.jsx';
import { Progress, StatusBadge } from '../ui/progress.jsx';
import { cn } from '@/lib/utils';

export function HistoryTable({ data, onDownload, onDelete, onCancel }) {
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });
  const [sorting, setSorting] = useState([]);
  const [filter, setFilter] = useState('');
  const columnHelper = createColumnHelper();

  const columns = [
    columnHelper.accessor('originalFileName', {
      header: 'File Name',
      cell: (info) => (
        <div className="flex flex-col gap-1">
          <span className="text-sm font-medium text-text-primary">{info.getValue()}</span>
          <span className="text-xs text-text-muted truncate max-w-xs">
            {info.row.original.sourceFormat} to {info.row.original.targetFormat}
          </span>
        </div>
      ),
    }),
    columnHelper.accessor('status', {
      header: 'Status',
      cell: (info) => <StatusBadge status={info.getValue()} />,
    }),
    columnHelper.accessor('progress', {
      header: 'Progress',
      cell: (info) => (
        <div className="flex flex-col gap-2">
          <Progress value={info.getValue()} />
          <span className="text-xs text-text-muted">{info.getValue()}%</span>
        </div>
      ),
    }),
    columnHelper.accessor('fileSizeBytes', {
      header: 'Size',
      cell: (info) => {
        const bytes = info.getValue();
        if (!bytes) return '-';
        const kb = (bytes / 1024).toFixed(1);
        return <span className="text-sm text-text-secondary tabular-nums">{kb} KB</span>;
      },
    }),
    columnHelper.accessor('createdAt', {
      header: 'Date',
      cell: (info) => (
        <span className="text-sm text-text-secondary tabular-nums">
          {new Date(info.getValue()).toLocaleDateString()}
        </span>
      ),
    }),
    columnHelper.display({
      id: 'actions',
      header: () => 'Actions',
      cell: (info) => {
        const row = info.row.original;
        return (
          <div className="flex items-center gap-2">
            {row.status === 'completed' && (
              <Button
                size="small"
                variant="outline"
                onClick={() => onDownload(row.id, row.originalFileName)}
              >
                <Download className="w-4 h-4" />
              </Button>
            )}
            {row.status === 'processing' && (
              <Button size="small" variant="outline" onClick={() => onCancel(row.id)}>
                <AlertCircle className="w-4 h-4" />
              </Button>
            )}
            <Button
              size="small"
              variant="danger"
              onClick={() => onDelete(row.id, row.originalFileName)}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        );
      },
    }),
  ];

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    state: {
      sorting,
      columnFilters: [{ id: 'originalFileName', value: filter }],
      pagination,
    },
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
  });

  const filteredData = table.getFilteredRowModel().rows;
  const pageCount = Math.max(1, Math.ceil(filteredData.length / pagination.pageSize));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="relative">
          <Clock className="absolute left-3 top-3 w-4 h-4 text-text-muted" />
          <input
            type="text"
            placeholder="Search files..."
            className="pl-9 pr-3 py-2 border border-border-subtle rounded-lg text-sm focus:ring-brand-primary focus:border-brand-primary bg-surface-primary"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-3">
          <Button size="small" variant="outline" onClick={() => setPagination((p) => ({ ...p, pageIndex: 0, pageSize: 10 }))}>
            10 / page
          </Button>
          <Button size="small" variant="outline" onClick={() => setPagination((p) => ({ ...p, pageIndex: 0, pageSize: 25 }))}>
            25 / page
          </Button>
        </div>
      </div>

      <div className="rounded-xl border border-border-subtle bg-surface-primary shadow-sm overflow-hidden">
        <table className="w-full text-sm text-left border-collapse">
          <thead className="bg-surface-secondary border-b border-border-subtle">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  const isSorted =
                    sorting.find((s) => s.id === header.id)?.desc
                      ? '↓'
                      : sorting.find((s) => s.id === header.id)
                        ? '↑'
                        : '';
                  return (
                    <th
                      key={header.id}
                      className={cn(
                        'px-4 py-3 font-medium text-text-secondary uppercase tracking-wider text-xs',
                        header.column.getCanSort() ? 'cursor-pointer select-none' : '',
                        header.column.getIsSorted()
                          ? 'text-brand-primary font-semibold'
                          : 'hover:text-text-primary',
                      )}
                      onClick={header.column.getCanSort() ? header.column.getToggleSortingHandler() : undefined}
                    >
                      {flexRender(header.column.columnDef.header, header.getContext())}
                      {isSorted && <span className="ml-1">{isSorted}</span>}
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getPageModel().rows.map((row) => (
              <tr
                key={row.id}
                className="border-b border-border-subtle hover:bg-surface-tertiary transition-colors"
              >
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="px-4 py-4 align-top text-text-primary">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
            {table.getPageModel().rows.length === 0 && (
              <tr>
                <td colSpan={columns.length} className="px-4 py-8 text-center text-text-muted">
                  No conversion history found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between gap-4">
        <div className="text-xs text-text-muted">
          Showing{' '}
          <span className="font-medium text-text-primary tabular-nums">
            {filteredData.length === 0 ? 0 : pagination.pageIndex * pagination.pageSize + 1}
          </span>{' - '}
          <span className="font-medium text-text-primary tabular-nums">
            {Math.min((pagination.pageIndex + 1) * pagination.pageSize, filteredData.length)}
          </span>{' of '}
          <span className="font-medium text-text-primary tabular-nums">
            {filteredData.length}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="small"
            variant="outline"
            disabled={pagination.pageIndex === 0}
            onClick={() => setPagination((p) => ({ ...p, pageIndex: Math.max(0, p.pageIndex - 1) }))}
          >
            Previous
          </Button>
          <Button
            size="small"
            variant="outline"
            disabled={pagination.pageIndex >= pageCount - 1}
            onClick={() => setPagination((p) => ({ ...p, pageIndex: Math.min(pageCount - 1, p.pageIndex + 1) }))}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}

