import { createContext, useContext, useEffect, useMemo, useState, useSyncExternalStore, type ReactNode } from 'react';

import { isSessionExpired, sessionFromToken } from './auth';
import { createBackstageClient, type FetchJson, type FetchText } from './client';
import { readBackstageConfigFromEnv, type BackstageConfig } from './config';
import {
  createInstanceStore,
  createMemoryStorage,
  type BackstageInstance,
  type BackstageSession,
  type InstanceStore,
  type InstancesState,
} from './instances';
import { createPlatformStorage } from './storage';

export type Backstage = BackstageConfig & {
  /** Authenticated JSON fetch bound to the base URL. Rejects in demo mode. */
  fetchJson: FetchJson;
  /** Authenticated text/HTML fetch bound to the base URL. Rejects in demo mode. */
  fetchText: FetchText;
  /** The active instance, or undefined in demo mode. */
  instance?: BackstageInstance;
  /** The active instance's stored session, expired or not. */
  session?: BackstageSession;
  /** True when a non-expired session exists for the active instance. */
  signedIn: boolean;
  /** True when the session exists but its token has expired. */
  sessionExpired: boolean;
  /** False until persisted instances have been read. */
  loaded: boolean;
};

const BackstageContext = createContext<Backstage | undefined>(undefined);
const StoreContext = createContext<InstanceStore | undefined>(undefined);

function demoFetch<T>(): Promise<T> {
  return Promise.reject(new Error('No Backstage backend configured (demo mode)'));
}

/** Builds a connection from an explicit config (tests and simple consumers). */
export function createBackstage(config: BackstageConfig, fetchImpl?: typeof fetch): Backstage {
  const base = { ...config, signedIn: !!config.token, sessionExpired: false, loaded: true };
  if (!config.baseUrl) {
    return { ...base, demo: true, fetchJson: demoFetch, fetchText: demoFetch };
  }
  const client = createBackstageClient({ baseUrl: config.baseUrl, token: config.token, fetch: fetchImpl });
  return { ...base, demo: false, fetchJson: client.fetchJson, fetchText: client.fetchText };
}

export function deriveBackstage(state: InstancesState, fetchImpl?: typeof fetch, now: number = Date.now()): Backstage {
  const instance = state.instances.find((item) => item.id === state.activeId);
  const session = instance ? state.sessions[instance.id] : undefined;
  const sessionExpired = isSessionExpired(session, now);
  const signedIn = !!session && !sessionExpired;
  const token = signedIn ? session.token : undefined;
  const config: BackstageConfig = { baseUrl: instance?.baseUrl, token, demo: !instance };
  const connection = createBackstage(config, fetchImpl);
  return { ...connection, instance, session, signedIn, sessionExpired, loaded: state.loaded };
}

/**
 * Seeds the store from the public environment when nothing is stored yet. The env
 * variables are inlined at build time, so callers may pass an explicit config.
 */
export async function seedFromEnv(store: InstanceStore, env: BackstageConfig = readBackstageConfigFromEnv()): Promise<void> {
  if (!env.baseUrl || store.getState().instances.length > 0) return;
  const instance = await store.addInstance({ name: 'Default', baseUrl: env.baseUrl, provider: 'github' });
  if (env.token) {
    try {
      await store.setSession(instance.id, sessionFromToken(env.token, 'env'));
    } catch {
      // A static service token is not a JWT with identity claims; keep it as an opaque session.
      await store.setSession(instance.id, {
        token: env.token,
        provider: 'env',
        userEntityRef: 'user:default/service-token',
        ownershipEntityRefs: [],
      });
    }
  }
}

export type BackstageProviderProps = {
  /** Explicit connection (tests). Bypasses the instance store entirely. */
  value?: BackstageConfig;
  /** Explicit store (tests). Defaults to a store on platform storage. */
  store?: InstanceStore;
  /** Injectable fetch for tests. */
  fetch?: typeof fetch;
  children: ReactNode;
};

export function BackstageProvider({ value, store: providedStore, fetch: fetchImpl, children }: BackstageProviderProps) {
  const [store] = useState(
    () => providedStore ?? createInstanceStore(value ? { instances: createMemoryStorage(), sessions: createMemoryStorage() } : createPlatformStorage())
  );

  useEffect(() => {
    if (value) return;
    let cancelled = false;
    store
      .load()
      .then(() => (cancelled ? undefined : seedFromEnv(store)))
      .catch((error) => console.warn('Failed to load Backstage instances', error));
    return () => {
      cancelled = true;
    };
  }, [store, value]);

  const state = useSyncExternalStore(store.subscribe, store.getState, store.getState);

  const backstage = useMemo(
    () => (value ? createBackstage(value, fetchImpl) : deriveBackstage(state, fetchImpl)),
    [value, state, fetchImpl]
  );

  return (
    <StoreContext.Provider value={store}>
      <BackstageContext.Provider value={backstage}>{children}</BackstageContext.Provider>
    </StoreContext.Provider>
  );
}

/** Reads the app's Backstage connection. Must be used inside `BackstageProvider`. */
export function useBackstage(): Backstage {
  const backstage = useContext(BackstageContext);
  if (!backstage) {
    throw new Error('useBackstage must be used within a BackstageProvider');
  }
  return backstage;
}

export type BackstageInstances = InstancesState & Omit<InstanceStore, 'getState' | 'subscribe' | 'load'>;

/** The configured instances and the actions to manage them. */
export function useBackstageInstances(): BackstageInstances {
  const store = useContext(StoreContext);
  if (!store) {
    throw new Error('useBackstageInstances must be used within a BackstageProvider');
  }
  const state = useSyncExternalStore(store.subscribe, store.getState, store.getState);
  return useMemo(
    () => ({
      ...state,
      addInstance: store.addInstance,
      updateInstance: store.updateInstance,
      removeInstance: store.removeInstance,
      setActive: store.setActive,
      setSession: store.setSession,
      clearSession: store.clearSession,
    }),
    [state, store]
  );
}
