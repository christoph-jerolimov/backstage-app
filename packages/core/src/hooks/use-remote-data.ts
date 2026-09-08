import { QueryClient, QueryClientContext, keepPreviousData, useQuery } from '@tanstack/react-query';
import { useCallback, useContext, useState } from 'react';

export type RemoteData<T> =
  | { status: 'loading'; data?: T; error?: undefined }
  | { status: 'success'; data: T; error?: undefined }
  | { status: 'error'; data?: T; error: Error };

export type RemoteDataResult<T> = RemoteData<T> & {
  /** Re-runs the fetcher with the current inputs. */
  reload: () => void;
};

function toError(value: unknown): Error {
  return value instanceof Error ? value : new Error(String(value));
}

/** A client for components rendered outside `QueryProvider`: private and not persisted. */
function createStandaloneClient(): QueryClient {
  return new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0, staleTime: 0 } } });
}

/**
 * Runs `fetcher` for `key` (a string describing the inputs) and reports loading / success /
 * error. Results are cached and revalidated by the app's query client, so returning to a
 * page shows what it last read; outside `QueryProvider` each component gets a private
 * client instead. Pass a memoized fetcher (`useCallback`).
 */
export function useRemoteData<T>(fetcher: (signal: AbortSignal) => Promise<T>, key: string): RemoteDataResult<T> {
  const provided = useContext(QueryClientContext);
  const [standalone] = useState(() => (provided ? undefined : createStandaloneClient()));
  const client = provided ?? (standalone as QueryClient);

  const query = useQuery<T, Error>(
    {
      queryKey: [key],
      // Keep the previous key's result on screen while the new one loads, so changing a
      // filter does not blank the list.
      placeholderData: keepPreviousData,
      queryFn: async ({ signal }) => {
        try {
          return await fetcher(signal);
        } catch (error) {
          throw toError(error);
        }
      },
    },
    client
  );

  const { refetch } = query;
  const reload = useCallback(() => {
    void refetch();
  }, [refetch]);

  if (query.isError) {
    return { status: 'error', data: query.data, error: toError(query.error), reload };
  }
  if (query.data !== undefined) {
    return { status: 'success', data: query.data, reload };
  }
  return { status: 'loading', reload };
}
