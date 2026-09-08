import { BackstageProvider, createInstanceStore, createMemoryStorage, type InstanceStore } from '@backstage-app/core';
import { SignalsProvider } from '@backstage-app/signals-react';
import type { WebSocketLike } from '@backstage-app/signals-react';
import { act, render, screen, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import type { NotificationsApi, NotificationStatus } from '../api';
import { UnreadCount } from '../home-widget';
import { NotificationsPage } from '../notifications-page';

const sockets: FakeSocket[] = [];

class FakeSocket implements WebSocketLike {
  readyState = 1;
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
  send() {}
  close() {}
  push(channel: string, message: unknown) {
    this.onmessage?.({ data: JSON.stringify({ channel, message }) });
  }
}

/** Stable across renders: its identity decides when the connection is rebuilt. */
const fakeWebSocket = (url: string, protocols?: string | string[]) => new FakeSocket(url, protocols);

async function signedInStore(): Promise<InstanceStore> {
  const store = createInstanceStore({ instances: createMemoryStorage(), sessions: createMemoryStorage() });
  await store.load();
  const instance = await store.addInstance({ name: 'Prod', baseUrl: 'https://prod.example', provider: 'github' });
  await store.setSession(instance.id, {
    token: 'token-abc',
    userEntityRef: 'user:default/jane.doe',
    ownershipEntityRefs: [],
    provider: 'github',
  });
  return store;
}

const wrapper = (store: InstanceStore) =>
  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <BackstageProvider store={store}>
        <SignalsProvider webSocket={fakeWebSocket}>{children}</SignalsProvider>
      </BackstageProvider>
    );
  };

const latest = () => sockets[sockets.length - 1];

/**
 * An API whose answers change between calls, so a reload is distinguishable from a
 * cached render — and so a test can prove the new values came from the API rather than
 * from the signal payload.
 */
function countingApi(): NotificationsApi & { listCalls: () => number; statusCalls: () => number } {
  let listCalls = 0;
  let statusCalls = 0;
  return {
    async list(query) {
      listCalls += 1;
      return {
        items: [
          {
            id: `n${listCalls}`,
            created: new Date(2026, 8, 7, 12, 0, 0),
            origin: 'plugin-ci',
            title: `Notification from call ${listCalls}`,
            severity: 'normal',
          },
        ],
        totalCount: 1,
      };
    },
    async status(): Promise<NotificationStatus> {
      statusCalls += 1;
      return { unread: statusCalls, read: 0 };
    },
    async update() {},
    listCalls: () => listCalls,
    statusCalls: () => statusCalls,
  };
}

beforeEach(() => {
  sockets.length = 0;
});

describe('notifications react to signals', () => {
  it('reloads the list from the API when a signal arrives', async () => {
    const store = await signedInStore();
    const api = countingApi();
    await render(<NotificationsPage api={api} now={new Date(2026, 8, 7, 12, 0, 0)} />, { wrapper: wrapper(store) });

    await waitFor(() => expect(screen.getByText('● Notification from call 1')).toBeTruthy());
    await waitFor(() => expect(sockets.length).toBeGreaterThan(0));

    await act(async () => {
      latest().push('notifications', { action: 'new_notification' });
    });

    await waitFor(() => expect(screen.getByText('● Notification from call 2')).toBeTruthy());
  });

  it('takes the new values from the API, not from the signal payload', async () => {
    const store = await signedInStore();
    const api = countingApi();
    await render(<NotificationsPage api={api} now={new Date(2026, 8, 7, 12, 0, 0)} />, { wrapper: wrapper(store) });
    await waitFor(() => expect(screen.getByText('● Notification from call 1')).toBeTruthy());
    await waitFor(() => expect(sockets.length).toBeGreaterThan(0));

    await act(async () => {
      // A payload that would be visibly wrong if it were rendered directly.
      latest().push('notifications', { title: 'STRAIGHT FROM THE SIGNAL' });
    });

    await waitFor(() => expect(screen.getByText('● Notification from call 2')).toBeTruthy());
    expect(screen.queryByText('STRAIGHT FROM THE SIGNAL')).toBeNull();
  });

  it('ignores signals published on other channels', async () => {
    const store = await signedInStore();
    const api = countingApi();
    await render(<NotificationsPage api={api} now={new Date(2026, 8, 7, 12, 0, 0)} />, { wrapper: wrapper(store) });
    await waitFor(() => expect(screen.getByText('● Notification from call 1')).toBeTruthy());
    await waitFor(() => expect(sockets.length).toBeGreaterThan(0));

    await act(async () => {
      latest().push('catalog', { changed: true });
    });

    expect(screen.getByText('● Notification from call 1')).toBeTruthy();
  });

  it('reloads the home widget unread count on a signal', async () => {
    const store = await signedInStore();
    const api = countingApi();
    await render(<UnreadCount api={api} />, { wrapper: wrapper(store) });

    await waitFor(() => expect(screen.getByTestId('unread-count').props.children).toBe('1 unread notification'));
    await waitFor(() => expect(sockets.length).toBeGreaterThan(0));

    await act(async () => {
      latest().push('notifications', { action: 'new_notification' });
    });

    await waitFor(() => expect(screen.getByTestId('unread-count').props.children).toBe('2 unread notifications'));
  });

  it('works unchanged with no backend, opening no connection', async () => {
    const api = countingApi();
    await render(<NotificationsPage api={api} demo now={new Date(2026, 8, 7, 12, 0, 0)} />);

    await waitFor(() => expect(screen.getByText('● Notification from call 1')).toBeTruthy());
    expect(sockets).toHaveLength(0);
  });
});
