import { useCallback, useEffect, useState } from 'react';

export type RemoteData<T> =
  | { status: 'loading'; data?: T; error?: undefined }
  | { status: 'success'; data: T; error?: undefined }
  | { status: 'error'; data?: T; error: Error };

export type RemoteDataResult<T> = RemoteData<T> & {
  /** Re-runs the fetcher with the current inputs. */
  reload: () => void;
};

type Settled<T> = { id: string } & ({ status: 'success'; data: T } | { status: 'error'; error: Error });

function toError(value: unknown): Error {
  return value instanceof Error ? value : new Error(String(value));
}

/**
 * Runs `fetcher` whenever `key` (a string describing the inputs) or the fetcher identity
 * changes, reporting loading / success / error. Results for superseded keys are dropped so
 * only the latest inputs are ever shown. Pass a memoized fetcher (`useCallback`).
 */
export function useRemoteData<T>(fetcher: (signal: AbortSignal) => Promise<T>, key: string): RemoteDataResult<T> {
  const [tick, setTick] = useState(0);
  const [settled, setSettled] = useState<Settled<T> | undefined>(undefined);
  const requestId = `${key}#${tick}`;

  useEffect(() => {
    const controller = new AbortController();
    fetcher(controller.signal).then(
      (data) => {
        if (!controller.signal.aborted) setSettled({ id: requestId, status: 'success', data });
      },
      (error: unknown) => {
        if (!controller.signal.aborted) setSettled({ id: requestId, status: 'error', error: toError(error) });
      }
    );
    return () => controller.abort();
  }, [fetcher, requestId]);

  const reload = useCallback(() => setTick((value) => value + 1), []);

  const lastData = settled?.status === 'success' ? settled.data : undefined;
  if (!settled || settled.id !== requestId) {
    return { status: 'loading', data: lastData, reload };
  }
  if (settled.status === 'error') {
    return { status: 'error', data: lastData, error: settled.error, reload };
  }
  return { status: 'success', data: settled.data, reload };
}
