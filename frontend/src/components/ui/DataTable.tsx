import { useMemo, useState, type ReactNode } from 'react';
import { ChevronDown, ChevronUp, ChevronsUpDown } from '../icons';
import { cn } from '../../lib/utils';
import { EmptyState } from './EmptyState';

export interface Column<T> {
  key: string;
  header: ReactNode;
  accessor: (row: T) => any;
  cell?: (row: T) => ReactNode;
  sortable?: boolean;
  className?: string;
  width?: string;
}

interface Props<T> {
  data: T[];
  columns: Column<T>[];
  pageSize?: number;
  rowKey: (row: T) => string | number;
  onRowClick?: (row: T) => void;
  empty?: ReactNode;
  defaultSort?: { key: string; dir: 'asc' | 'desc' };
}

export function DataTable<T>({
  data,
  columns,
  pageSize = 10,
  rowKey,
  onRowClick,
  empty,
  defaultSort,
}: Props<T>) {
  const [sort, setSort] = useState<{ key: string; dir: 'asc' | 'desc' } | null>(
    defaultSort ?? null
  );
  const [page, setPage] = useState(1);

  const sorted = useMemo(() => {
    if (!sort) return data;
    const col = columns.find((c) => c.key === sort.key);
    if (!col) return data;
    const copy = [...data];
    copy.sort((a, b) => {
      const av = col.accessor(a);
      const bv = col.accessor(b);
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      if (av < bv) return sort.dir === 'asc' ? -1 : 1;
      if (av > bv) return sort.dir === 'asc' ? 1 : -1;
      return 0;
    });
    return copy;
  }, [data, sort, columns]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const slice = sorted.slice((safePage - 1) * pageSize, safePage * pageSize);

  function toggleSort(key: string) {
    setSort((s) => {
      if (s?.key !== key) return { key, dir: 'asc' };
      if (s.dir === 'asc') return { key, dir: 'desc' };
      return null;
    });
  }

  if (!data.length) {
    return <>{empty ?? <EmptyState />}</>;
  }

  return (
    <div className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40 text-left text-xs uppercase tracking-wide text-subtle">
              {columns.map((c) => {
                const isActive = sort?.key === c.key;
                const ariaSort: 'ascending' | 'descending' | 'none' | undefined =
                  c.sortable
                    ? isActive
                      ? sort!.dir === 'asc'
                        ? 'ascending'
                        : 'descending'
                      : 'none'
                    : undefined;
                const inner = (
                  <span className="inline-flex items-center gap-1">
                    {c.header}
                    {c.sortable && (
                      <span className="text-subtle">
                        {isActive ? (
                          sort!.dir === 'asc' ? (
                            <ChevronUp size={12} />
                          ) : (
                            <ChevronDown size={12} />
                          )
                        ) : (
                          <ChevronsUpDown size={12} />
                        )}
                      </span>
                    )}
                  </span>
                );
                return (
                  <th
                    key={c.key}
                    style={c.width ? { width: c.width } : undefined}
                    aria-sort={ariaSort}
                    className={cn('px-4 py-2.5 font-medium', c.className)}
                  >
                    {c.sortable ? (
                      <button
                        type="button"
                        onClick={() => toggleSort(c.key)}
                        className="inline-flex items-center gap-1 select-none hover:text-fg focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
                      >
                        {inner}
                      </button>
                    ) : (
                      inner
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {slice.map((row) => (
              <tr
                key={rowKey(row)}
                onClick={() => onRowClick?.(row)}
                className={cn(
                  'border-b border-border last:border-0 transition-colors',
                  onRowClick && 'cursor-pointer hover:bg-muted/40'
                )}
              >
                {columns.map((c) => (
                  <td
                    key={c.key}
                    className={cn('px-4 py-3 align-middle', c.className)}
                  >
                    {c.cell ? c.cell(row) : (c.accessor(row) ?? '—')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {sorted.length > pageSize && (
        <div className="flex items-center justify-between gap-3 border-t border-border px-4 py-3 text-xs text-subtle">
          <div>
            Showing {(safePage - 1) * pageSize + 1}-
            {Math.min(safePage * pageSize, sorted.length)} of {sorted.length}
          </div>
          <div className="flex items-center gap-2">
            <button
              className="rounded-lg border border-border px-2 py-1 disabled:opacity-40 hover:bg-muted"
              disabled={safePage === 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Prev
            </button>
            <span>
              Page {safePage} / {totalPages}
            </span>
            <button
              className="rounded-lg border border-border px-2 py-1 disabled:opacity-40 hover:bg-muted"
              disabled={safePage === totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
