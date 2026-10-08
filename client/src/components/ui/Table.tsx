import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export interface Column<T> {
  key: string;
  header: React.ReactNode;
  render?: (row: T, index: number) => React.ReactNode;
  className?: string;
  headerClassName?: string;
}

export interface TableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (row: T, index: number) => string | number;
  emptyMessage?: React.ReactNode;
  className?: string;
  onRowClick?: (row: T) => void;
}

export function Table<T>({
  columns,
  data,
  keyExtractor,
  emptyMessage = 'No records found',
  className = '',
  onRowClick,
}: TableProps<T>) {
  return (
    <div className={`w-full overflow-x-auto border border-classic-border rounded-card bg-white shadow-classic ${className}`}>
      <table className="classic-table min-w-full text-left">
        <thead>
          <tr className="bg-[#F3F4F6] border-b-2 border-classic-border-dark">
            {columns.map((col) => (
              <th
                key={col.key}
                className={`px-4 py-3 text-xs font-bold uppercase tracking-wider text-classic-text-primary whitespace-nowrap ${
                  col.headerClassName || ''
                }`}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-classic-border-light bg-white">
          {data.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                className="px-4 py-10 text-center text-sm text-classic-text-muted"
              >
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((row, idx) => (
              <tr
                key={keyExtractor(row, idx)}
                onClick={() => onRowClick?.(row)}
                className={`transition-colors ${
                  onRowClick ? 'cursor-pointer hover:bg-slate-50' : 'hover:bg-classic-surface-hover'
                }`}
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={`px-4 py-3 text-sm text-classic-text-primary ${
                      col.className || ''
                    }`}
                  >
                    {col.render ? col.render(row, idx) : (row as any)[col.key]}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  totalItems?: number;
  itemsPerPage?: number;
}

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  onPageChange,
  totalItems,
}) => {
  if (totalPages <= 1) return null;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-2 py-3 text-xs text-classic-text-secondary">
      {totalItems !== undefined && (
        <span className="font-medium text-classic-text-muted">
          Showing page <strong className="text-classic-text-primary">{currentPage}</strong> of{' '}
          <strong className="text-classic-text-primary">{totalPages}</strong> ({totalItems} total)
        </span>
      )}

      <div className="flex items-center gap-1.5 ml-auto">
        <button
          type="button"
          disabled={currentPage <= 1}
          onClick={() => onPageChange(currentPage - 1)}
          className="p-1.5 rounded-classic border border-classic-border bg-white hover:bg-classic-surface-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors min-h-[34px] min-w-[34px] flex items-center justify-center font-semibold"
          title="Previous Page"
        >
          <ChevronLeft className="w-4 h-4 text-classic-text-primary" />
        </button>

        <span className="font-mono px-2 font-bold text-classic-text-primary">
          {currentPage} / {totalPages}
        </span>

        <button
          type="button"
          disabled={currentPage >= totalPages}
          onClick={() => onPageChange(currentPage + 1)}
          className="p-1.5 rounded-classic border border-classic-border bg-white hover:bg-classic-surface-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors min-h-[34px] min-w-[34px] flex items-center justify-center font-semibold"
          title="Next Page"
        >
          <ChevronRight className="w-4 h-4 text-classic-text-primary" />
        </button>
      </div>
    </div>
  );
};
