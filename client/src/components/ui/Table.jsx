import * as React from 'react';
import { cn } from '@/utils/cn';

export const Table = ({ className, ...props }) => (
  <div className="w-full overflow-auto rounded-lg border border-dark-200 dark:border-dark-800">
    <table className={cn("w-full caption-bottom text-sm", className)} {...props} />
  </div>
);

export const TableHeader = ({ className, ...props }) => (
  <thead className={cn("bg-dark-50 dark:bg-dark-900 border-b border-dark-200 dark:border-dark-800", className)} {...props} />
);

export const TableBody = ({ className, ...props }) => (
  <tbody className={cn("[&_tr:last-child]:border-0", className)} {...props} />
);

export const TableFooter = ({ className, ...props }) => (
  <tfoot className={cn("bg-dark-50 dark:bg-dark-900 font-medium border-t border-dark-200 dark:border-dark-800", className)} {...props} />
);

export const TableRow = ({ className, ...props }) => (
  <tr
    className={cn(
      "border-b border-dark-100 dark:border-dark-800 transition-colors hover:bg-dark-50/50 dark:hover:bg-dark-800/30 data-[state=selected]:bg-dark-50",
      className
    )}
    {...props}
  />
);

export const TableHead = ({ className, ...props }) => (
  <th
    className={cn(
      "h-12 px-4 text-left align-middle font-medium text-dark-500 dark:text-dark-400 [&:has([role=checkbox])]:pr-0",
      className
    )}
    {...props}
  />
);

export const TableCell = ({ className, ...props }) => (
  <td className={cn("p-4 align-middle [&:has([role=checkbox])]:pr-0 dark:text-white", className)} {...props} />
);

export default Table;
