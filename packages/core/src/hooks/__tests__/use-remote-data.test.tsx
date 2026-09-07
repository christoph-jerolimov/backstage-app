import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { createQueryClient } from '../../query-provider';
import { useRemoteData } from '../use-remote-data';

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function collector() {
  const calls: ReturnType<typeof deferred<string>>[] = [];
  const fetcher = jest.fn(() => {
    const request = deferred<string>();
    calls.push(request);
    return request.promise;
  });
  return { calls, fetcher };
}

describe('useRemoteData', () => {
  const clients: QueryClient[] = [];

  afterEach(() => {
    for (const client of clients.splice(0)) client.clear();
  });

  it('goes from loading to success', async () => {
    const request = deferred<string>();
    const fetcher = () => request.promise;
    const { result } = await renderHook(() => useRemoteData(fetcher, 'k'));

    expect(result.current.status).toBe('loading');
    await act(async () => {
      request.resolve('data');
    });
    await waitFor(() => expect(result.current).toMatchObject({ status: 'success', data: 'data' }));
  });

  it('reports an error after a single attempt and recovers on reload', async () => {
    const { calls, fetcher } = collector();
    const { result } = await renderHook(() => useRemoteData(fetcher, 'k'));

    await act(async () => {
      calls[0].reject(new Error('down'));
    });
    await waitFor(() => expect(result.current.status).toBe('error'));
    expect(result.current.error?.message).toBe('down');
    expect(fetcher).toHaveBeenCalledTimes(1);

    await act(async () => {
      result.current.reload();
    });
    await act(async () => {
      calls[1].resolve('back');
    });
    await waitFor(() => expect(result.current).toMatchObject({ status: 'success', data: 'back' }));
  });

  it('wraps a non-Error rejection', async () => {
    const request = deferred<string>();
    const { result } = await renderHook(() => useRemoteData(() => request.promise, 'k'));

    await act(async () => {
      request.reject('plain string');
    });
    await waitFor(() => expect(result.current.status).toBe('error'));
    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.error?.message).toBe('plain string');
  });

  it('drops the result of a superseded request', async () => {
    const { calls, fetcher } = collector();
    const { result, rerender } = await renderHook(({ term }: { term: string }) => useRemoteData(fetcher, term), {
      initialProps: { term: 'a' },
    });

    await act(async () => {
      rerender({ term: 'b' });
    });
    expect(result.current.status).toBe('loading');

    await act(async () => {
      calls[0].resolve('stale');
    });
    expect(result.current.data).toBeUndefined();

    await act(async () => {
      calls[1].resolve('fresh');
    });
    await waitFor(() => expect(result.current).toMatchObject({ status: 'success', data: 'fresh' }));
  });

  it('aborts the request when the component unmounts', async () => {
    let seen: AbortSignal | undefined;
    const request = deferred<string>();
    const { unmount } = await renderHook(() =>
      useRemoteData((signal) => {
        seen = signal;
        return request.promise;
      }, 'k')
    );

    expect(seen?.aborted).toBe(false);
    await unmount();
    await waitFor(() => expect(seen?.aborted).toBe(true));
  });

  it('serves a cached result inside a shared client without refetching', async () => {
    const client = createQueryClient();
    // The app client keeps results for a day; clear it so its timers do not outlive the test.
    clients.push(client);
    const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
    const { calls, fetcher } = collector();

    const first = await renderHook(() => useRemoteData(fetcher, 'shared'), { wrapper });
    await act(async () => {
      calls[0].resolve('cached');
    });
    await waitFor(() => expect(first.result.current.data).toBe('cached'));
    await first.unmount();

    const second = await renderHook(() => useRemoteData(fetcher, 'shared'), { wrapper });
    expect(second.result.current).toMatchObject({ status: 'success', data: 'cached' });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('keeps components isolated without a provider', async () => {
    const { calls, fetcher } = collector();

    const first = await renderHook(() => useRemoteData(fetcher, 'same-key'));
    await act(async () => {
      calls[0].resolve('one');
    });
    await waitFor(() => expect(first.result.current.data).toBe('one'));

    const second = await renderHook(() => useRemoteData(fetcher, 'same-key'));
    expect(second.result.current.status).toBe('loading');
    await act(async () => {
      calls[1].resolve('two');
    });
    await waitFor(() => expect(second.result.current.data).toBe('two'));
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
});
