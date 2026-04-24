import { useCallback, useEffect, useRef, useState } from 'react';
import type { WorkItem, WorkItemFilters } from '../api/types';
import { listWorkItems } from '../api/workItems';

export function useWorkItems(filters: WorkItemFilters = {}) {
  const [data, setData] = useState<WorkItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const filtersRef = useRef(filters);
  filtersRef.current = filters;

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const items = await listWorkItems(filtersRef.current);
      setData(items);
    } catch (e: any) {
      setError(e?.message || 'Failed to load work items');
    } finally {
      setLoading(false);
    }
  }, []);

  // Serialize filters to a primitive so the dependency array stays stable
  // even when callers pass a new object literal each render. This keeps
  // react-hooks/exhaustive-deps satisfied without disabling the rule.
  const filtersKey = JSON.stringify(filters);
  useEffect(() => {
    refetch();
  }, [filtersKey, refetch]);

  return { data, loading, error, refetch };
}
