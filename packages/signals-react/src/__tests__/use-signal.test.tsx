import { act, renderHook, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { BackstageProvider, createInstanceStore, createMemoryStorage, type InstanceStore } from '@backstage-app/core';

import type { WebSocketLike } from '../client';
import { SignalsProvider, useSignal } from '../provider';

const sockets: FakeSocket[] = [];

class FakeSocket implements WebSocketLike {
  readyState = 1;
  sent: string[] = [];
  closedWith: number | undefined;
  onmessage: ((event: { data: string }) => void) | null = null;
  onerror: ((event?: unknown) => void) | null = null;
  onclose: ((event: { code: number }) => void) | null = null;
  onopen: (() => void) | null = null;

  constructor(
    readonly url: string,
    readonly protocols?: string | string[]
  ) {
    sockets.push(this);
  }
  send(data: string) {
    this.sent.push(data);
  }
  close(code?: number) {
    this.closedWith = code;
    this.readyState = 3;
  }
  receive(channel: string, message: unknown) {
    this.onmessage?.({ data: JSON.stringify({ channel, message }) });
  }
}

async function storeWith(options: { signedIn: boolean; expired?: boolean } = { signedIn: true }): Promise<InstanceStore> {
  const store = createInstanceStore({ instances: createMemoryStorage(), sessions: createMemoryStorage() });
  await store.load();
  const instance = await store.addInstance({ name: 'Prod', baseUrl: 'https://prod.example', provider: 'github' });
  if (options.signedIn) {
    await store.setSession(instance.id, {
      token: 'token-abc',
      userEntityRef: 'user:default/jane.doe',
      ownershipEntityRefs: [],
      expiresAt: options.expired ? Date.now() - 1000 : undefined,
      provider: 'github',
    });
  }
  return store;
}

/** Stable across renders; an unstable factory must not drive reconnection. */
const fakeWebSocket = (url: string, protocols?: string | string[]) => new FakeSocket(url, protocols);

const wrapperFor = (store?: InstanceStore) =>
  function Wrapper({ children }: { children: ReactNode }) {
    const inner = <SignalsProvider webSocket={fakeWebSocket}>{children}</SignalsProvider>;
    return store ? <BackstageProvider store={store}>{inner}</BackstageProvider> : inner;
  };

/** The connection currently in use; earlier ones belong to superseded clients. */
const latest = () => sockets[sockets.length - 1];

beforeEach(() => {
  sockets.length = 0;
});

describe('useSignal', () => {
  it('delivers messages published on its channel', async () => {
    const store = await storeWith();
    const { result } = await renderHook(() => useSignal('notifications'), { wrapper: wrapperFor(store) });

    await waitFor(() => expect(result.current.isSignalsAvailable).toBe(true));
    await waitFor(() => expect(sockets.length).toBeGreaterThan(0));

    await act(async () => {
      latest().receive('notifications', { unread: 4 });
    });

    await waitFor(() => expect(result.current.lastSignal).toEqual({ unread: 4 }));
  });

  it('ignores messages for other channels', async () => {
    const store = await storeWith();
    const { result } = await renderHook(() => useSignal('notifications'), { wrapper: wrapperFor(store) });
    await waitFor(() => expect(sockets.length).toBeGreaterThan(0));

    await act(async () => {
      latest().receive('catalog', { changed: true });
    });

    await waitFor(() => expect(result.current.isSignalsAvailable).toBe(true));
    expect(result.current.lastSignal).toBeNull();
  });

  it('authenticates the socket with the session token as subprotocol', async () => {
    const store = await storeWith();
    renderHook(() => useSignal('notifications'), { wrapper: wrapperFor(store) });

    await waitFor(() => expect(sockets.length).toBeGreaterThan(0));
    expect(latest().url).toBe('wss://prod.example/api/signals');
    expect(latest().protocols).toBe('token-abc');
  });

  it('reports signals unavailable and opens nothing when signed out', async () => {
    const store = await storeWith({ signedIn: false });
    const { result } = await renderHook(() => useSignal('notifications'), { wrapper: wrapperFor(store) });

    await waitFor(() => expect(result.current.isSignalsAvailable).toBe(false));
    expect(sockets).toHaveLength(0);
    expect(result.current.lastSignal).toBeNull();
  });

  it('reports signals unavailable when the session has expired', async () => {
    const store = await storeWith({ signedIn: true, expired: true });
    const { result } = await renderHook(() => useSignal('notifications'), { wrapper: wrapperFor(store) });

    await waitFor(() => expect(result.current.isSignalsAvailable).toBe(false));
    expect(sockets).toHaveLength(0);
  });

  it('reports signals unavailable outside a provider, without throwing', async () => {
    const { result } = await renderHook(() => useSignal('notifications'));

    expect(result.current.isSignalsAvailable).toBe(false);
    expect(result.current.lastSignal).toBeNull();
  });

  it('closes the connection when the subscriber unmounts', async () => {
    const store = await storeWith();
    const { unmount } = await renderHook(() => useSignal('notifications'), { wrapper: wrapperFor(store) });
    await waitFor(() => expect(sockets.length).toBeGreaterThan(0));
    const socket = latest();

    await act(async () => {
      unmount();
    });

    expect(socket.closedWith).toBe(1000);
  });
});
