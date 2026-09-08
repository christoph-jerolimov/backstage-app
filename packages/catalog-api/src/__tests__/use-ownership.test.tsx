import { renderHook, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { createInstanceStore, createMemoryStorage, type InstanceStore } from '@backstage-app/core';
import { BackstageProvider } from '@backstage-app/core';
import { useOwnership } from '../use-ownership';

const OWNERSHIP = ['user:default/jane.doe', 'group:default/team-platform', 'Group:default/engineering'];

async function storeWith(session?: { expiresAt?: number; ownershipEntityRefs?: string[] }): Promise<InstanceStore> {
  const store = createInstanceStore({ instances: createMemoryStorage(), sessions: createMemoryStorage() });
  await store.load();
  const instance = await store.addInstance({ name: 'Prod', baseUrl: 'https://prod.example', provider: 'github' });
  if (session) {
    await store.setSession(instance.id, {
      token: 'token',
      userEntityRef: 'user:default/jane.doe',
      ownershipEntityRefs: session.ownershipEntityRefs ?? OWNERSHIP,
      expiresAt: session.expiresAt,
      provider: 'github',
    });
  }
  return store;
}

const wrapperFor = (store: InstanceStore) =>
  function Wrapper({ children }: { children: ReactNode }) {
    return <BackstageProvider store={store}>{children}</BackstageProvider>;
  };

describe('useOwnership', () => {
  it('reports the identity, its ownership refs, and the groups among them', async () => {
    const { result } = await renderHook(useOwnership, { wrapper: wrapperFor(await storeWith({})) });

    await waitFor(() => expect(result.current.signedIn).toBe(true));
    expect(result.current.userRef).toBe('user:default/jane.doe');
    expect(result.current.ownershipRefs).toEqual(OWNERSHIP);
    expect(result.current.groupRefs).toEqual(['group:default/team-platform', 'Group:default/engineering']);
  });

  it('reports an identity without groups', async () => {
    const store = await storeWith({ ownershipEntityRefs: ['user:default/jane.doe'] });
    const { result } = await renderHook(useOwnership, { wrapper: wrapperFor(store) });

    await waitFor(() => expect(result.current.signedIn).toBe(true));
    expect(result.current.ownershipRefs).toEqual(['user:default/jane.doe']);
    expect(result.current.groupRefs).toEqual([]);
  });

  it('reports nothing when signed out', async () => {
    const { result } = await renderHook(useOwnership, { wrapper: wrapperFor(await storeWith()) });

    await waitFor(() => expect(result.current.ownershipRefs).toEqual([]));
    expect(result.current.signedIn).toBe(false);
    expect(result.current.userRef).toBeUndefined();
    expect(result.current.groupRefs).toEqual([]);
  });

  it('treats an expired session as signed out', async () => {
    const store = await storeWith({ expiresAt: Date.now() - 1000 });
    const { result } = await renderHook(useOwnership, { wrapper: wrapperFor(store) });

    await waitFor(() => expect(result.current.signedIn).toBe(false));
    expect(result.current.ownershipRefs).toEqual([]);
  });
});
