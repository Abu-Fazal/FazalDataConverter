import { forwardRef } from 'react';
import { cn } from '@/lib/utils';

const Table = forwardRef(({ className, caption, children, ...props }, ref) => (
  <div className="w-full overflow-x-auto rounded-xl border border-border-subtle bg-surface-primary shadow-card">
    <table ref={ref} className={cn('w-full border-collapse text-left text-body-md', className)} {...props}>
      {caption && <caption className="sr-only">{caption}</caption>}
      {children}
    </table>
  </div>
));
Table.displayName = 'Table';

const TableHeader = forwardRef(({ className, ...props }, ref) => (
  <thead ref={ref} className={cn('border-b border-border-subtle bg-surface-secondary', className)} {...props} />
));
TableHeader.displayName = 'TableHeader';

const TableBody = forwardRef(({ className, ...props }, ref) => (
  <tbody ref={ref} className={cn('[&>tr:last-child]:border-0', className)} {...props} />
));
TableBody.displayName = 'TableBody';

const TableRow = forwardRef(({ className, ...props }, ref) => (
  <tr
    ref={ref}
    className={cn('border-b border-border-subtle transition-colors hover:bg-surface-tertiary', className)}
    {...props}
  />
));
TableRow.displayName = 'TableRow';

const TableHead = forwardRef(({ className, ...props }, ref) => (
  <th
    ref={ref}
    scope="col"
    className={cn('px-4 py-3 text-xs font-medium uppercase tracking-wider text-text-secondary', className)}
    {...props}
  />
));
TableHead.displayName = 'TableHead';

const TableCell = forwardRef(({ className, ...props }, ref) => (
  <td ref={ref} className={cn('px-4 py-4 align-top text-text-primary', className)} {...props} />
));
TableCell.displayName = 'TableCell';

export { Table, TableHeader, TableBody, TableRow, TableHead, TableCell };