import { useBackstage } from '@backstage-app/core';
import { useEffect, useMemo, type ReactNode } from 'react';

import { AnalyticsApiProvider } from './analytics-context';
import { readAnalyticsConfigFromEnv, type AnalyticsConfig } from './config';
import { createNoopAnalyticsApi } from './noop-api';
import { createRestAnalyticsApi, type AppStateLike, type DisposableAnalyticsApi } from './rest-api';

export type AnalyticsProviderProps = {
  /** Explicit settings (tests). Defaults to the public environment. */
  config?: AnalyticsConfig;
  /** Injectable for tests; passed through to the REST implementation. */
  appState?: AppStateLike;
  children: ReactNode;
};

/**
 * Picks the analytics implementation from the active Backstage connection and provides it.
 *
 * Nothing is delivered in demo mode or when analytics are disabled: those pick the no-op
 * implementation, so components can capture events unconditionally.
 *
 * The implementation is rebuilt when the connection changes, and the previous one disposed.
 * Events queued against the old instance are dropped rather than carried over — sending
 * them to a different Backstage than the one they were captured against would be worse
 * than losing them.
 */
export function AnalyticsProvider({ config, appState, children }: AnalyticsProviderProps) {
  const { demo, fetchText } = useBackstage();
  const { enabled, path } = useMemo(() => config ?? readAnalyticsConfigFromEnv(), [config]);

  const api = useMemo<DisposableAnalyticsApi | ReturnType<typeof createNoopAnalyticsApi>>(
    () => (demo || !enabled ? createNoopAnalyticsApi() : createRestAnalyticsApi({ fetchText, path, appState })),
    [demo, enabled, fetchText, path, appState]
  );

  useEffect(() => ('dispose' in api ? () => api.dispose() : undefined), [api]);

  return <AnalyticsApiProvider api={api}>{children}</AnalyticsApiProvider>;
}
