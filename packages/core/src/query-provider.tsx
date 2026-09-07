import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import { QueryClient } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { type ReactNode, useEffect, useMemo, useState } from 'react';

import type { KeyValueStorage } from './backstage/instances';
import { createPlatformStorage } from './backstage/storage';

/** How long a cached result is served without revalidating. */
export const STALE_TIME_MS = 30_000;
/** How long an unused result is kept, and how long a persisted one stays valid. */
export const CACHE_TIME_MS = 24 * 60 * 60 * 1000;
export const CACHE_STORAGE_KEY = 'app.queryCache';

/** The query client the app uses: cached, revalidating, and never retrying on its own. */
export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: STALE_TIME_MS,
        gcTime: CACHE_TIME_MS,
        retry: false,
        refetchOnWindowFocus: false,
        refetchOnReconnect: true,
      },
    },
  });
}

export type QueryProviderProps = {
  /** Where the cache is persisted. Defaults to the platform app storage. */
  storage?: KeyValueStorage;
  /**
   * Scopes the persisted cache, normally the active Backstage instance id. Changing it
   * discards both the persisted and the in-memory cache.
   */
  cacheKey?: string;
  /** Injectable for tests. */
  client?: QueryClient;
  /** How long writes to storage are coalesced. */
  persistThrottleMs?: number;
  children: ReactNode;
};

/** Provides the shared query client and restores its cache from device storage. */
export function QueryProvider({ storage, cacheKey = '', client, persistThrottleMs, children }: QueryProviderProps) {
  const [queryClient] = useState(() => client ?? createQueryClient());
  const [store] = useState(() => storage ?? createPlatformStorage().instances);

  const persistOptions = useMemo(
    () => ({
      persister: createAsyncStoragePersister({ storage: store, key: CACHE_STORAGE_KEY, throttleTime: persistThrottleMs }),
      maxAge: CACHE_TIME_MS,
      buster: cacheKey,
      dehydrateOptions: {
        // Only finished, successful reads are worth restoring.
        shouldDehydrateQuery: (query: { state: { status: string } }) => query.state.status === 'success',
      },
    }),
    [store, cacheKey, persistThrottleMs]
  );

  useEffect(() => {
    // A different instance must never see the previous instance's results.
    queryClient.clear();
  }, [queryClient, cacheKey]);

  return (
    <PersistQueryClientProvider client={queryClient} persistOptions={persistOptions}>
      {children}
    </PersistQueryClientProvider>
  );
}
