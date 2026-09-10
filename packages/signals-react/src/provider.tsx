import { useBackstage } from '@backstage-app/core';
import type { JsonObject } from '@backstage-app/types';
import { createContext, type ReactNode, useContext, useEffect, useMemo, useState } from 'react';

import { SignalsClient, type SignalSubscriber, type WebSocketFactory } from './client';

export type SignalsContextValue = {
  /** The client for the active instance, or undefined when signals are unavailable. */
  client?: SignalsClient;
};

const SignalsContext = createContext<SignalsContextValue>({});

export type SignalsProviderProps = {
  /**
   * WebSocket implementation, for tests. Defaults to the platform's.
   * Must be stable across renders — its identity is part of what decides when the
   * connection is rebuilt, so an inline arrow would reconnect on every render.
   */
  webSocket?: WebSocketFactory;
  children: ReactNode;
};

/**
 * Owns a single signals client for the app, bound to the active instance and session.
 *
 * A new client is built whenever the base URL or token changes, and the previous one is
 * closed — so signing out, or switching instance, tears the connection down rather than
 * leaving a socket open with a stale token. In demo mode or signed out there is no client
 * at all, which is what makes `useSignal` report signals as unavailable.
 */
export function SignalsProvider({ webSocket, children }: SignalsProviderProps) {
  const { instance, session, signedIn } = useBackstage();
  const baseUrl = instance?.baseUrl;
  const token = signedIn ? session?.token : undefined;

  // Constructing a client is inert: it opens nothing until something subscribes, so it is
  // safe to derive rather than hold in state. A new instance or token yields a new client,
  // and the effect below closes the one it replaces.
  const client = useMemo(
    () => (baseUrl && token ? new SignalsClient({ baseUrl, token, webSocket }) : undefined),
    [baseUrl, token, webSocket]
  );

  useEffect(() => {
    return () => client?.close();
  }, [client]);

  const value = useMemo(() => ({ client }), [client]);

  return <SignalsContext.Provider value={value}>{children}</SignalsContext.Provider>;
}

export function useSignalsClient(): SignalsClient | undefined {
  return useContext(SignalsContext).client;
}

export type UseSignalResult<TMessage extends JsonObject> = {
  /** The most recent message on the channel, or null before one arrives. */
  lastSignal: TMessage | null;
  /** False when no backend is configured or the user is signed out. */
  isSignalsAvailable: boolean;
};

/**
 * Subscribes to a signal channel for as long as the calling component is mounted.
 *
 * Mirrors the shape of upstream's `@backstage/plugin-signals-react` `useSignal`, which
 * cannot be used here because it depends on Material UI and the web plugin API.
 */
export function useSignal<TMessage extends JsonObject = JsonObject>(channel: string): UseSignalResult<TMessage> {
  const client = useSignalsClient();
  const [lastSignal, setLastSignal] = useState<TMessage | null>(null);

  useEffect(() => {
    if (!client) return undefined;
    let subscription: SignalSubscriber | undefined = client.subscribe<TMessage>(channel, (message) => {
      setLastSignal(message);
    });
    return () => {
      subscription?.unsubscribe();
      subscription = undefined;
    };
  }, [client, channel]);

  return { lastSignal, isSignalsAvailable: Boolean(client) };
}
