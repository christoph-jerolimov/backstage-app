import {
  BackstageProvider,
  QueryProvider,
  createInstanceStore,
  createMemoryStorage,
  createQueryClient,
  type InstanceStore,
} from '@backstage-app/core';
import { AuthorizeResult, createPermission } from '@backstage/plugin-permission-common';
import { renderHook, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { usePermission } from '../use-permission';

const readEntity = createPermission({ name: 'catalog.entity.read', attributes: { action: 'read' }, resourceType: 'catalog-entity' });
const createTask = createPermission({ name: 'scaffolder.task.create', attributes: { action: 'create' } });

let requests: { body: unknown }[] = [];
let respond: (body: unknown) => unknown;

/**
 * Stands in for the network at the `fetch` boundary, so the hook exercises the real
 * client, the real `useRemoteData` and the real React Query cache.
 */
function mockFetch() {
  globalThis.fetch = jest.fn(async (_url: unknown, init?: RequestInit) => {
    const body = JSON.parse(String(init?.body));
    requests.push({ body });
    const result = respond(body);
    if (result instanceof Error) throw result;
    return { ok: true, status: 200, headers: new Headers({ 'content-type': 'application/json' }), json: async () => result } as unknown as Response;
  }) as unknown as typeof fetch;
}

async function signedInStore(): Promise<InstanceStore> {
  const store = createInstanceStore({ instances: createMemoryStorage(), sessions: createMemoryStorage() });
  await store.load();
  const instance = await store.addInstance({ name: 'Prod', baseUrl: 'https://prod.example', provider: 'github' });
  await store.setSession(instance.id, { token: 'token-abc', userEntityRef: 'user:default/jane', ownershipEntityRefs: [], provider: 'github' });
  return store;
}

async function demoStore(): Promise<InstanceStore> {
  const store = createInstanceStore({ instances: createMemoryStorage(), sessions: createMemoryStorage() });
  await store.load();
  return store;
}

/**
 * The app's client with a short garbage-collection window, and in-memory persistence.
 * `packages/core`'s own query-provider test documents why: React Query schedules collection
 * `gcTime` out as a real timer, and at the app's day-long window that timer keeps the Jest
 * worker alive indefinitely.
 */
function testClient(): ReturnType<typeof createQueryClient> {
  const client = createQueryClient();
  client.setDefaultOptions({ queries: { ...client.getDefaultOptions().queries, gcTime: 1000 } });
  return client;
}

const wrapperFor = (store: InstanceStore) => {
  const client = testClient();
  const storage = createMemoryStorage();
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <BackstageProvider store={store}>
        <QueryProvider storage={storage} cacheKey="test" client={client} persistThrottleMs={0}>
          {children}
        </QueryProvider>
      </BackstageProvider>
    );
  };
};

beforeEach(() => {
  requests = [];
  respond = () => ({ items: [{ id: '0', result: AuthorizeResult.ALLOW }] });
  mockFetch();
});

describe('usePermission against a backend', () => {
  it('reports allowed when the backend allows', async () => {
    const { result } = await renderHook(() => usePermission({ permission: createTask }), { wrapper: wrapperFor(await signedInStore()) });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.allowed).toBe(true);
    expect(result.current.error).toBeUndefined();
  });

  it('reports not allowed when the backend denies', async () => {
    respond = () => ({ items: [{ id: '0', result: AuthorizeResult.DENY }] });
    const { result } = await renderHook(() => usePermission({ permission: createTask }), { wrapper: wrapperFor(await signedInStore()) });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.allowed).toBe(false);
  });

  it('does not report allowed for a conditional decision', async () => {
    respond = () => ({ items: [{ id: '0', result: AuthorizeResult.CONDITIONAL }] });
    const { result } = await renderHook(() => usePermission({ permission: readEntity, resourceRef: 'component:default/foo' }), {
      wrapper: wrapperFor(await signedInStore()),
    });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.allowed).toBe(false);
  });

  it('is not allowed while the answer is still loading', async () => {
    const { result } = await renderHook(() => usePermission({ permission: createTask }), { wrapper: wrapperFor(await signedInStore()) });

    expect(result.current.loading).toBe(true);
    expect(result.current.allowed).toBe(false);
  });

  it('asks about the named resource', async () => {
    const { result } = await renderHook(() => usePermission({ permission: readEntity, resourceRef: 'component:default/foo' }), {
      wrapper: wrapperFor(await signedInStore()),
    });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect((requests[0].body as { items: { resourceRef?: string }[] }).items[0].resourceRef).toBe('component:default/foo');
  });
});

describe('usePermission request sharing', () => {
  it('asks once when two components ask the same question', async () => {
    const store = await signedInStore();
    const { result } = await renderHook(
      () => [usePermission({ permission: createTask }), usePermission({ permission: createTask })] as const,
      { wrapper: wrapperFor(store) }
    );

    await waitFor(() => expect(result.current[0].loading).toBe(false));
    await waitFor(() => expect(result.current[1].loading).toBe(false));

    expect(result.current[0].allowed).toBe(true);
    expect(result.current[1].allowed).toBe(true);
    expect(requests).toHaveLength(1);
  });

  it('does not reuse one resource answer for a different resource', async () => {
    respond = (body) => {
      const ref = (body as { items: { resourceRef?: string }[] }).items[0].resourceRef;
      return { items: [{ id: '0', result: ref === 'component:default/allowed' ? AuthorizeResult.ALLOW : AuthorizeResult.DENY }] };
    };
    const store = await signedInStore();
    const { result } = await renderHook(
      () =>
        [
          usePermission({ permission: readEntity, resourceRef: 'component:default/allowed' }),
          usePermission({ permission: readEntity, resourceRef: 'component:default/denied' }),
        ] as const,
      { wrapper: wrapperFor(store) }
    );

    await waitFor(() => expect(result.current[0].loading).toBe(false));
    await waitFor(() => expect(result.current[1].loading).toBe(false));

    expect(result.current[0].allowed).toBe(true);
    expect(result.current[1].allowed).toBe(false);
    expect(requests).toHaveLength(2);
  });
});

describe('usePermission when the backend cannot be asked', () => {
  it('is allowed in demo mode, and asks nothing', async () => {
    const { result } = await renderHook(() => usePermission({ permission: createTask }), { wrapper: wrapperFor(await demoStore()) });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.allowed).toBe(true);
    expect(requests).toHaveLength(0);
  });

  it('requires a BackstageProvider, inheriting core\'s contract rather than working around it', async () => {
    // `useBackstage` throws outside its provider by design, and this hook does not paper
    // over that: a Backstage-connected hook used outside the connection is a wiring bug,
    // not a permission question with a sensible default.
    await expect(renderHook(() => usePermission({ permission: createTask }))).rejects.toThrow('BackstageProvider');
  });
});

describe('usePermission when the request fails', () => {
  it('reports the error and does not report allowed', async () => {
    respond = () => new Error('permission backend unreachable');
    const { result } = await renderHook(() => usePermission({ permission: createTask }), { wrapper: wrapperFor(await signedInStore()) });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.allowed).toBe(false);
    expect(result.current.error).toBeInstanceOf(Error);
  });
});
