import * as React from 'react';
import { cn } from '@/lib/utils';

export const Table = ({
  className,
  ...props
}: React.TableHTMLAttributes<HTMLTableElement>) => (
  <div className="w-full overflow-x-auto rounded-xl border border-ink-200 bg-white dark:border-ink-dark-border dark:bg-ink-dark-surface">
    <table className={cn('min-w-full border-collapse text-sm', className)} {...props} />
  </div>
);

export const TableHead = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLTableSectionElement>) => (
  <thead
    className={cn(
      'text-left text-xs uppercase tracking-[0.14em] text-ink-500 bg-ink-50 dark:bg-white/5 dark:text-ink-dark-muted',
      className
    )}
    {...props}
  />
);

export const TableBody = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLTableSectionElement>) => (
  <tbody
    className={cn('divide-y divide-ink-100 dark:divide-ink-dark-border', className)}
    {...props}
  />
);

export const TableRow = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLTableRowElement>) => (
  <tr
    className={cn('transition-colors hover:bg-ink-50 dark:hover:bg-white/5', className)}
    {...props}
  />
);

export const TableHeaderCell = ({
  className,
  ...props
}: React.ThHTMLAttributes<HTMLTableCellElement>) => (
  <th
    className={cn('px-5 py-3.5 font-semibold text-ink-600 dark:text-ink-dark-muted', className)}
    {...props}
  />
);

export const TableCell = ({
  className,
  ...props
}: React.TdHTMLAttributes<HTMLTableCellElement>) => (
  <td
    className={cn('px-5 py-4 align-top text-ink-800 dark:text-ink-dark-text', className)}
    {...props}
  />
);
