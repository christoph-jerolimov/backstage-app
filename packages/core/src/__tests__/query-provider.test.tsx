import { act, render, renderHook, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { createMemoryStorage, type KeyValueStorage } from '../backstage/instances';
import { useRemoteData } from '../hooks/use-remote-data';
import { CACHE_STORAGE_KEY, QueryProvider, createQueryClient } from '../query-provider';

function wrapperFor(storage: KeyValueStorage, cacheKey: string) {
  const client = createQueryClient();
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <QueryProvider storage={storage} cacheKey={cacheKey} client={client} persistThrottleMs={0}>
      {children}
    </QueryProvider>
  );
  return { Wrapper, client };
}

async function persisted(storage: KeyValueStorage): Promise<string | null> {
  return storage.getItem(CACHE_STORAGE_KEY);
}

describe('QueryProvider', () => {
  it('persists a successful result and restores it into a fresh client', async () => {
    const storage = createMemoryStorage();
    const first = wrapperFor(storage, 'instance-1');
    const fetcher = jest.fn(async () => 'petstore');

    const firstRender = await renderHook(() => useRemoteData(fetcher, 'entities'), { wrapper: first.Wrapper });
    await waitFor(() => expect(firstRender.result.current.data).toBe('petstore'));
    await waitFor(async () => expect(await persisted(storage)).toContain('petstore'));
    // Unmount before clearing: a mounted provider writes every cache change back to storage.
    await firstRender.unmount();
    first.client.clear();

    // A fetcher that never settles: any data that appears must come from the restored cache.
    const second = wrapperFor(storage, 'instance-1');
    const pending = new Promise<string>(() => {});
    const restored = await renderHook(() => useRemoteData(() => pending, 'entities'), { wrapper: second.Wrapper });

    await waitFor(() => expect(restored.result.current).toMatchObject({ status: 'success', data: 'petstore' }));
    second.client.clear();
  });

  it('discards the cache under a different instance', async () => {
    const storage = createMemoryStorage();
    const first = wrapperFor(storage, 'instance-1');
    const firstRender = await renderHook(() => useRemoteData(async () => 'from instance 1', 'entities'), { wrapper: first.Wrapper });
    await waitFor(() => expect(firstRender.result.current.data).toBe('from instance 1'));
    await waitFor(async () => expect(await persisted(storage)).toContain('from instance 1'));
    await firstRender.unmount();
    first.client.clear();

    const second = wrapperFor(storage, 'instance-2');
    const other = await renderHook(() => useRemoteData(async () => 'from instance 2', 'entities'), { wrapper: second.Wrapper });

    await waitFor(() => expect(other.result.current.data).toBe('from instance 2'));
    expect(other.result.current.data).not.toBe('from instance 1');
    second.client.clear();
  });

  it('does not persist failures', async () => {
    const storage = createMemoryStorage();
    const { Wrapper, client } = wrapperFor(storage, 'instance-1');
    const { result } = await renderHook(() => useRemoteData(async () => Promise.reject(new Error('down')), 'entities'), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.status).toBe('error'));
    await act(async () => {});
    expect(await persisted(storage)).not.toContain('"entities"');
    client.clear();
  });

  it('clears the in-memory cache when the instance changes', async () => {
    const storage = createMemoryStorage();
    const client = createQueryClient();
    const fetcher = jest.fn(async () => 'value');

    function Harness({ cacheKey }: { cacheKey: string }) {
      return (
        <QueryProvider storage={storage} cacheKey={cacheKey} client={client} persistThrottleMs={0}>
          <Reader />
        </QueryProvider>
      );
    }
    function Reader() {
      useRemoteData(fetcher, 'entities');
      return null;
    }

    const { rerender } = await render(<Harness cacheKey="instance-1" />);
    await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(1));
    expect(client.getQueryData(['entities'])).toBe('value');

    await act(async () => {
      rerender(<Harness cacheKey="instance-2" />);
    });
    await waitFor(() => expect(client.getQueryData(['entities'])).toBeUndefined());
    client.clear();
  });
});
