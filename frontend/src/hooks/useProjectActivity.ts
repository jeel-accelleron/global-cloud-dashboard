import { useQuery } from '@tanstack/react-query';
import {
  getProjectActivity,
  type ActivityRange,
  type ProjectActivityResponse,
} from '../api/workItems';

export function useProjectActivity(
  range: ActivityRange = 'month',
  bucket?: 'day' | 'week' | 'month'
) {
  const q = useQuery<ProjectActivityResponse>({
    queryKey: ['projectActivity', range, bucket ?? 'auto'],
    queryFn: () => getProjectActivity(range, bucket),
    staleTime: 60_000,
  });
  return {
    data: q.data,
    loading: q.isLoading,
    error: q.error ? (q.error as Error).message : null,
    refetch: () => q.refetch(),
    dataUpdatedAt: q.dataUpdatedAt,
  };
}
