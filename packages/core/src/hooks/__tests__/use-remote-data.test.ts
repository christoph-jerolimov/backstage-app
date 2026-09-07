import { act, renderHook } from '@testing-library/react-native';

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

describe('useRemoteData', () => {
  it('goes from loading to success', async () => {
    const request = deferred<string>();
    const fetcher = () => request.promise;
    const { result } = await renderHook(() => useRemoteData(fetcher, 'k'));

    expect(result.current.status).toBe('loading');
    await act(async () => {
      request.resolve('data');
    });
    expect(result.current).toMatchObject({ status: 'success', data: 'data' });
  });

  it('reports errors and recovers on reload', async () => {
    const calls: ReturnType<typeof deferred<string>>[] = [];
    const fetcher = jest.fn(() => {
      const request = deferred<string>();
      calls.push(request);
      return request.promise;
    });
    const { result } = await renderHook(() => useRemoteData(fetcher, 'k'));

    await act(async () => {
      calls[0].reject(new Error('down'));
    });
    expect(result.current.status).toBe('error');
    expect(result.current.error?.message).toBe('down');

    await act(async () => {
      result.current.reload();
    });
    expect(result.current.status).toBe('loading');
    await act(async () => {
      calls[1].resolve('back');
    });
    expect(result.current).toMatchObject({ status: 'success', data: 'back' });
  });

  it('drops results from superseded requests when inputs change', async () => {
    const calls: ReturnType<typeof deferred<string>>[] = [];
    const fetcher = jest.fn(() => {
      const request = deferred<string>();
      calls.push(request);
      return request.promise;
    });
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
    expect(result.current.status).toBe('loading');

    await act(async () => {
      calls[1].resolve('fresh');
    });
    expect(result.current).toMatchObject({ status: 'success', data: 'fresh' });
  });
});
