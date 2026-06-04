import { useQuery } from '@tanstack/react-query';
import type { WorkItem, WorkItemFilters } from '../api/types';
import { listWorkItems } from '../api/workItems';

/**
 * React-Query backed work-items hook. Keeps the legacy shape
 * (`{ data, loading, error, refetch }`) so existing pages don't change,
 * adds `dataUpdatedAt` for the "refreshed Xm ago" indicator and benefits
 * from the shared cache (route switches no longer re-fetch).
 */
export function useWorkItems(filters: WorkItemFilters = {}) {
  const q = useQuery({
    queryKey: ['workItems', filters],
    queryFn: () => listWorkItems(filters),
    placeholderData: (prev) => prev,
  });
  return {
    data: (q.data ?? []) as WorkItem[],
    loading: q.isLoading,
    fetching: q.isFetching,
    error: q.error ? (q.error as Error).message : null,
    refetch: () => q.refetch(),
    dataUpdatedAt: q.dataUpdatedAt,
  };
}
