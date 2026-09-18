import React, { useState, useMemo, useEffect } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react';
import { cn } from '../../lib/formatters';

export interface AdminPaginationProps {
  currentPage: number;
  pageSize: number;
  totalItems: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  pageSizeOptions?: number[];
  itemLabel?: string;
  className?: string;
}

export const AdminPagination: React.FC<AdminPaginationProps> = ({
  currentPage,
  pageSize,
  totalItems,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 25, 50, 100],
  itemLabel = 'items',
  className = '',
}) => {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);

  // Auto-correct if currentPage is out of bounds
  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      onPageChange(totalPages);
    }
  }, [currentPage, totalPages, onPageChange]);

  if (totalItems === 0) return null;

  const startIndex = (safeCurrentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalItems);

  // Generate page numbers with ellipses
  const pageItems = Array.from({ length: totalPages }, (_, i) => i + 1)
    .filter((p) => p === 1 || p === totalPages || Math.abs(p - safeCurrentPage) <= 1)
    .reduce<(number | 'ellipsis')[]>((acc, p, idx, arr) => {
      if (idx > 0 && p - (arr[idx - 1] as number) > 1) {
        acc.push('ellipsis');
      }
      acc.push(p);
      return acc;
    }, []);

  return (
    <div
      className={cn(
        'flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-gray-100 bg-gray-50/70 text-xs text-gray-600 select-none',
        className
      )}
    >
      {/* Left: Summary Count and Page Size Selector */}
      <div className="flex flex-wrap items-center gap-3 sm:gap-4 w-full sm:w-auto justify-between sm:justify-start">
        <span className="text-[11px] text-gray-500">
          Showing <strong className="font-bold text-dark">{startIndex + 1}</strong> to{' '}
          <strong className="font-bold text-dark">{endIndex}</strong> of{' '}
          <strong className="font-bold text-dark">{totalItems}</strong> {itemLabel}
        </span>

        {onPageSizeChange && (
          <div className="flex items-center gap-1.5 text-[11px] text-gray-500">
            <span>Per page:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                const newSize = Number(e.target.value);
                onPageSizeChange(newSize);
                onPageChange(1);
              }}
              className="h-7 px-2 bg-white border border-gray-200 rounded-md text-[11px] font-semibold text-dark focus:outline-none focus:border-brand-blue cursor-pointer shadow-2xs"
            >
              {pageSizeOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Right: Page Navigation Controls */}
      <div className="flex items-center gap-1 w-full sm:w-auto justify-center sm:justify-end">
        {/* First Page */}
        <button
          type="button"
          onClick={() => onPageChange(1)}
          disabled={safeCurrentPage === 1}
          className="p-1.5 rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer shadow-2xs"
          title="First Page"
        >
          <ChevronsLeft className="w-3.5 h-3.5" />
        </button>

        {/* Previous Page */}
        <button
          type="button"
          onClick={() => onPageChange(Math.max(1, safeCurrentPage - 1))}
          disabled={safeCurrentPage === 1}
          className="p-1.5 rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer shadow-2xs"
          title="Previous Page"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
        </button>

        {/* Numbered Page Buttons */}
        <div className="flex items-center gap-1 px-1">
          {pageItems.map((item, idx) =>
            item === 'ellipsis' ? (
              <span key={`ell-${idx}`} className="px-1 text-gray-400 font-mono text-xs">
                &hellip;
              </span>
            ) : (
              <button
                key={item}
                type="button"
                onClick={() => onPageChange(item)}
                className={cn(
                  'min-w-[28px] h-7 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer shadow-2xs',
                  safeCurrentPage === item
                    ? 'bg-brand-blue text-white shadow-xs font-extrabold'
                    : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
                )}
              >
                {item}
              </button>
            )
          )}
        </div>

        {/* Next Page */}
        <button
          type="button"
          onClick={() => onPageChange(Math.min(totalPages, safeCurrentPage + 1))}
          disabled={safeCurrentPage === totalPages}
          className="p-1.5 rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer shadow-2xs"
          title="Next Page"
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </button>

        {/* Last Page */}
        <button
          type="button"
          onClick={() => onPageChange(totalPages)}
          disabled={safeCurrentPage === totalPages}
          className="p-1.5 rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer shadow-2xs"
          title="Last Page"
        >
          <ChevronsRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};

/**
 * Convenience hook to manage pagination state and slice items
 */
export function useAdminPagination<T>(items: T[], initialPageSize: number = 25) {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);

  const totalItems = items.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);

  const startIndex = (safeCurrentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalItems);

  const paginatedItems = useMemo(() => {
    return items.slice(startIndex, endIndex);
  }, [items, startIndex, endIndex]);

  return {
    currentPage: safeCurrentPage,
    pageSize,
    setCurrentPage,
    setPageSize,
    paginatedItems,
    totalItems,
    totalPages,
    startIndex,
    endIndex,
  };
}
