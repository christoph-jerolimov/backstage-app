import { createContext, useContext, useMemo, type ReactNode } from 'react';

import { createBackstageClient, type FetchJson } from './client';
import { readBackstageConfigFromEnv, type BackstageConfig } from './config';

export type Backstage = BackstageConfig & {
  /** Authenticated JSON fetch bound to the base URL. Rejects in demo mode. */
  fetchJson: FetchJson;
};

const BackstageContext = createContext<Backstage | undefined>(undefined);

function demoFetchJson<T>(): Promise<T> {
  return Promise.reject(new Error('No Backstage backend configured (demo mode)'));
}

export function createBackstage(config: BackstageConfig, fetchImpl?: typeof fetch): Backstage {
  if (!config.baseUrl) {
    return { ...config, demo: true, fetchJson: demoFetchJson };
  }
  const client = createBackstageClient({ baseUrl: config.baseUrl, token: config.token, fetch: fetchImpl });
  return { ...config, demo: false, fetchJson: client.fetchJson };
}

export type BackstageProviderProps = {
  /** Explicit connection (tests, future settings screen). Defaults to the environment. */
  value?: BackstageConfig;
  /** Injectable fetch for tests. */
  fetch?: typeof fetch;
  children: ReactNode;
};

export function BackstageProvider({ value, fetch: fetchImpl, children }: BackstageProviderProps) {
  const backstage = useMemo(
    () => createBackstage(value ?? readBackstageConfigFromEnv(), fetchImpl),
    [value, fetchImpl]
  );

  return <BackstageContext.Provider value={backstage}>{children}</BackstageContext.Provider>;
}

/** Reads the app's Backstage connection. Must be used inside `BackstageProvider`. */
export function useBackstage(): Backstage {
  const backstage = useContext(BackstageContext);
  if (!backstage) {
    throw new Error('useBackstage must be used within a BackstageProvider');
  }
  return backstage;
}
