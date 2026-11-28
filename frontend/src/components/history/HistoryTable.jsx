import { useMemo, useState } from 'react';
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { Download, Trash2, AlertCircle, Search, FileClock } from 'lucide-react';
import { Button } from '../ui/button.jsx';
import { Input } from '../ui/input.jsx';
import { Progress } from '../ui/progress.jsx';
import { StatusBadge } from '../ui/badge.jsx';
import { Tooltip, TooltipTrigger, TooltipContent } from '../ui/tooltip.jsx';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../ui/table.jsx';
import { EmptyState } from '../ui/empty-state.jsx';
import { cn } from '@/lib/utils';

export function HistoryTable({ data, onDownload, onDelete, onCancel }) {
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });
  const [sorting, setSorting] = useState([]);
  const [filter, setFilter] = useState('');
  // Stable identity: a fresh array each render makes TanStack auto-reset pageIndex in a loop.
  const columnFilters = useMemo(() => [{ id: 'originalFileName', value: filter }], [filter]);
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
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="small"
                    variant="outline"
                    aria-label={`Download ${row.originalFileName}`}
                    onClick={() => onDownload(row.id, row.originalFileName)}
                  >
                    <Download className="w-4 h-4" aria-hidden="true" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Download</TooltipContent>
              </Tooltip>
            )}
            {row.status === 'processing' && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="small"
                    variant="outline"
                    aria-label={`Cancel conversion of ${row.originalFileName}`}
                    onClick={() => onCancel(row.id)}
                  >
                    <AlertCircle className="w-4 h-4" aria-hidden="true" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Cancel</TooltipContent>
              </Tooltip>
            )}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="small"
                  variant="danger"
                  aria-label={`Delete ${row.originalFileName}`}
                  onClick={() => onDelete(row.id, row.originalFileName)}
                >
                  <Trash2 className="w-4 h-4" aria-hidden="true" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Delete</TooltipContent>
            </Tooltip>
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
      columnFilters,
      pagination,
    },
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
    autoResetPageIndex: false,
  });

  const filteredData = table.getFilteredRowModel().rows;
  const pageCount = Math.max(1, Math.ceil(filteredData.length / pagination.pageSize));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="relative w-full sm:w-72">
          <Input
            type="text"
            icon={Search}
            aria-label="Search files"
            placeholder="Search by original file name..."
            value={filter}
            onChange={(e) => {
              setFilter(e.target.value);
              setPagination((p) => ({ ...p, pageIndex: 0 }));
            }}
          />
        </div>
        <div className="flex items-center gap-3">
          <Button
            size="small"
            variant="outline"
            aria-pressed={pagination.pageSize === 10}
            className={cn(pagination.pageSize === 10 && 'border-brand-primary text-brand-primary')}
            onClick={() => setPagination((p) => ({ ...p, pageIndex: 0, pageSize: 10 }))}
          >
            10 / page
          </Button>
          <Button
            size="small"
            variant="outline"
            aria-pressed={pagination.pageSize === 25}
            className={cn(pagination.pageSize === 25 && 'border-brand-primary text-brand-primary')}
            onClick={() => setPagination((p) => ({ ...p, pageIndex: 0, pageSize: 25 }))}
          >
            25 / page
          </Button>
        </div>
      </div>

      <Table caption="Conversion history">
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id} className="hover:bg-transparent">
              {headerGroup.headers.map((header) => {
                const sorted = header.column.getIsSorted();
                return (
                  <TableHead
                    key={header.id}
                    aria-sort={
                      sorted === 'asc' ? 'ascending' : sorted === 'desc' ? 'descending' : undefined
                    }
                    className={cn(sorted && 'text-brand-primary')}
                  >
                    {header.column.getCanSort() ? (
                      <button
                        type="button"
                        onClick={header.column.getToggleSortingHandler()}
                        className="inline-flex select-none items-center gap-1 uppercase tracking-wider hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary rounded-sm"
                      >
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        <span aria-hidden="true">{sorted === 'desc' ? '↓' : sorted === 'asc' ? '↑' : ''}</span>
                        <span className="sr-only">
                          {sorted === 'asc' ? 'sorted ascending' : sorted === 'desc' ? 'sorted descending' : 'not sorted'}
                        </span>
                      </button>
                    ) : (
                      flexRender(header.column.columnDef.header, header.getContext())
                    )}
                  </TableHead>
                );
              })}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getPaginationRowModel().rows.map((row) => (
            <TableRow key={row.id}>
              {row.getVisibleCells().map((cell) => (
                <TableCell key={cell.id}>
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </TableCell>
              ))}
            </TableRow>
          ))}
          {table.getPaginationRowModel().rows.length === 0 && (
            <TableRow className="hover:bg-transparent">
              <TableCell colSpan={columns.length} className="p-0">
                <EmptyState
                  icon={FileClock}
                  title="No conversion history found"
                  description="Your uploaded and converted files will appear here."
                />
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      <div className="flex items-center justify-between gap-4">
        <div className="text-xs text-text-secondary">
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

