import { useQueryClient } from '@tanstack/react-query';
import { RefreshCw } from '../icons';
import { cn, formatRelative } from '../../lib/utils';

/**
 * Compact "Updated 3m ago · Refresh" pill. `updatedAt` is a millisecond
 * timestamp (e.g. from React Query's `dataUpdatedAt`). When `fetching` is
 * true the icon spins and the click is a no-op.
 */
export function DataFreshness({
  updatedAt,
  fetching,
  onRefresh,
  className,
}: {
  updatedAt?: number;
  fetching?: boolean;
  onRefresh?: () => void;
  className?: string;
}) {
  const qc = useQueryClient();
  const refresh = () => {
    if (fetching) return;
    if (onRefresh) onRefresh();
    else qc.invalidateQueries();
  };
  const label = updatedAt
    ? `Updated ${formatRelative(new Date(updatedAt).toISOString())}`
    : 'Not loaded yet';
  return (
    <button
      type="button"
      onClick={refresh}
      disabled={fetching}
      title="Refresh data (r)"
      className={cn(
        'inline-flex h-9 items-center gap-2 rounded-xl border border-border bg-elevated px-3 text-xs text-subtle hover:text-fg hover:bg-muted disabled:opacity-60',
        className
      )}
    >
      <RefreshCw
        size={13}
        className={cn('shrink-0', fetching && 'animate-spin')}
      />
      <span className="truncate">{label}</span>
    </button>
  );
}
