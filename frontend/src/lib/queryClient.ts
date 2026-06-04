import { QueryClient } from '@tanstack/react-query';

/**
 * Shared React Query client. Defaults are tuned for an internal dashboard:
 * data is fresh for 60s (no refetch on focus during that window) and we
 * keep results cached for 5 min so route switches feel instant.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      gcTime: 5 * 60_000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});
