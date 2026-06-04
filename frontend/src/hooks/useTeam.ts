import { useQuery } from '@tanstack/react-query';
import { getTeam, type TeamInfo } from '../api/workItems';

export function useTeam(team?: string) {
  const q = useQuery<TeamInfo>({
    queryKey: ['team', team ?? ''],
    queryFn: () => getTeam(team),
    staleTime: 5 * 60_000,
  });
  return {
    data: q.data,
    loading: q.isLoading,
    error: q.error ? (q.error as Error).message : null,
    refetch: () => q.refetch(),
  };
}
