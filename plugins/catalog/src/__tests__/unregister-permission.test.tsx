import { type CatalogApi, type CatalogLocation, createDemoCatalogApi } from '@backstage-app/catalog-api';
import {
  BackstageProvider,
  QueryProvider,
  createInstanceStore,
  createMemoryStorage,
  createQueryClient,
  type InstanceStore,
} from '@backstage-app/core';
import { AuthorizeResult } from '@backstage-app/permissions-react';
import { catalogEntityDeletePermission } from '@backstage/plugin-catalog-common/alpha';
import { render, screen, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { EntityPage } from '../entity-page';
import { EntityScreen } from '../entity-screen';

const petstore = { kind: 'component', namespace: 'default', name: 'petstore' };
const location: CatalogLocation = { id: 'loc-1', type: 'url', target: 'https://github.com/example/petstore/blob/main/catalog-info.yaml' };

function apiWith(overrides: Partial<CatalogApi>): CatalogApi {
  return { ...createDemoCatalogApi(), ...overrides };
}

const withLocation = () => apiWith({ getLocationByEntity: async () => location });

describe('the delete permission this gate uses', () => {
  it('is the catalog resource permission the backend evaluates', () => {
    expect(catalogEntityDeletePermission.name).toBe('catalog.entity.delete');
    expect(catalogEntityDeletePermission.type).toBe('resource');
    expect(catalogEntityDeletePermission.resourceType).toBe('catalog-entity');
  });
});

/**
 * The page half: rendered directly, with no BackstageProvider, exactly as the existing
 * maintenance tests do. That is the point of taking the verdict as a prop.
 */
describe('EntityPage unregister gate', () => {
  it('hides Unregister when not permitted, leaving the rest of the page alone', async () => {
    await render(<EntityPage entityRef={petstore} api={withLocation()} canUnregister={false} />);

    await waitFor(() => expect(screen.getByTestId('refresh-entity')).toBeTruthy());
    expect(screen.queryByTestId('unregister-entity')).toBeNull();
    expect(screen.getByTestId('entity-maintenance')).toBeTruthy();
  });

  it('shows Unregister when permitted', async () => {
    await render(<EntityPage entityRef={petstore} api={withLocation()} canUnregister />);

    await waitFor(() => expect(screen.getByTestId('unregister-entity')).toBeTruthy());
  });

  it('shows Unregister when the prop is omitted, so existing callers are unchanged', async () => {
    await render(<EntityPage entityRef={petstore} api={withLocation()} />);

    await waitFor(() => expect(screen.getByTestId('unregister-entity')).toBeTruthy());
  });
});

/** The screen half: asks the permission backend for real. */
let authorizeCalls: { resourceRef?: string; permission: string }[] = [];
let decide: (resourceRef?: string) => AuthorizeResult | 'never';

function mockFetch() {
  globalThis.fetch = jest.fn(async (url: unknown, init?: RequestInit) => {
    const path = String(url);
    if (path.includes('/api/permission/authorize')) {
      const body = JSON.parse(String(init?.body));
      const item = body.items[0];
      authorizeCalls.push({ resourceRef: item.resourceRef, permission: item.permission.name });
      const verdict = decide(item.resourceRef);
      if (verdict === 'never') return new Promise(() => {}) as unknown as Response;
      return json({ items: [{ id: item.id, result: verdict }] });
    }
    if (path.includes('/locations/by-entity')) return json(location);
    if (path.includes('/entities/by-name')) {
      return json({ apiVersion: 'backstage.io/v1alpha1', kind: 'Component', metadata: { name: 'petstore', namespace: 'default' }, spec: {} });
    }
    return json({});
  }) as unknown as typeof fetch;
}

const json = (value: unknown) =>
  ({ ok: true, status: 200, headers: new Headers({ 'content-type': 'application/json' }), json: async () => value }) as unknown as Response;

async function storeFor(signedIn: boolean): Promise<InstanceStore> {
  const store = createInstanceStore({ instances: createMemoryStorage(), sessions: createMemoryStorage() });
  await store.load();
  if (signedIn) {
    const instance = await store.addInstance({ name: 'Prod', baseUrl: 'https://prod.example', provider: 'github' });
    await store.setSession(instance.id, { token: 't', userEntityRef: 'user:default/jane', ownershipEntityRefs: [], provider: 'github' });
  }
  return store;
}

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

jest.mock('expo-router', () => ({
  ...jest.requireActual('expo-router'),
  useLocalSearchParams: () => ({ kind: 'component', namespace: 'default', name: 'petstore' }),
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
}));

beforeEach(() => {
  authorizeCalls = [];
  decide = () => AuthorizeResult.ALLOW;
  mockFetch();
});

describe('EntityScreen unregister gate', () => {
  it('offers Unregister when the backend allows deleting this entity', async () => {
    await render(<EntityScreen />, { wrapper: wrapperFor(await storeFor(true)) });

    await waitFor(() => expect(screen.getByTestId('unregister-entity')).toBeTruthy());
    expect(authorizeCalls[0]).toEqual({ permission: 'catalog.entity.delete', resourceRef: 'component:default/petstore' });
  });

  it('does not offer Unregister when the backend denies', async () => {
    decide = () => AuthorizeResult.DENY;
    await render(<EntityScreen />, { wrapper: wrapperFor(await storeFor(true)) });

    await waitFor(() => expect(screen.getByTestId('refresh-entity')).toBeTruthy());
    await waitFor(() => expect(authorizeCalls.length).toBeGreaterThan(0));
    expect(screen.queryByTestId('unregister-entity')).toBeNull();
  });

  it('asks about the entity on screen, so a denial elsewhere does not apply here', async () => {
    decide = (ref) => (ref === 'component:default/petstore' ? AuthorizeResult.ALLOW : AuthorizeResult.DENY);
    await render(<EntityScreen />, { wrapper: wrapperFor(await storeFor(true)) });

    await waitFor(() => expect(screen.getByTestId('unregister-entity')).toBeTruthy());
    expect(authorizeCalls.every((call) => call.resourceRef === 'component:default/petstore')).toBe(true);
  });

  it('does not offer Unregister before the answer arrives', async () => {
    decide = () => 'never';
    await render(<EntityScreen />, { wrapper: wrapperFor(await storeFor(true)) });

    await waitFor(() => expect(screen.getByTestId('refresh-entity')).toBeTruthy());
    expect(screen.queryByTestId('unregister-entity')).toBeNull();
  });

  it('asks nothing in demo mode, leaving the page to behave as it did before', async () => {
    await render(<EntityScreen />, { wrapper: wrapperFor(await storeFor(false)) });

    await waitFor(() => expect(screen.getByTestId('entity-maintenance')).toBeTruthy());

    // The meaningful claim: no permission request is issued when there is no backend to
    // ask, so the gate resolves to allowed and cannot suppress anything. Whether Unregister
    // then renders is still decided by the location alone — the demo catalog knows none —
    // which is exactly the pre-existing behaviour this change must not disturb.
    expect(authorizeCalls).toHaveLength(0);
  });
});
