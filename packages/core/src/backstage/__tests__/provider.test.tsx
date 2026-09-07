import { act, render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';

import { createBackstageConfig } from '../config';
import { createInstanceStore, createMemoryStorage } from '../instances';
import { BackstageProvider, seedFromEnv, useBackstage } from '../provider';

function Consumer() {
  const { baseUrl, token, demo, signedIn, sessionExpired, instance } = useBackstage();
  return <Text>{`${demo ? 'demo' : 'live'} ${baseUrl ?? '-'} ${token ?? '-'} ${signedIn ? 'in' : sessionExpired ? 'expired' : 'out'} ${instance?.name ?? '-'}`}</Text>;
}

const storage = () => ({ instances: createMemoryStorage(), sessions: createMemoryStorage() });

describe('BackstageProvider', () => {
  it('exposes an explicit connection value', async () => {
    await render(
      <BackstageProvider value={{ baseUrl: 'https://b.example', token: 't', demo: false }}>
        <Consumer />
      </BackstageProvider>
    );
    expect(screen.getByText('live https://b.example t in -')).toBeTruthy();
  });

  it('is in demo mode without instances and follows the active instance', async () => {
    const store = createInstanceStore(storage());
    await render(
      <BackstageProvider store={store}>
        <Consumer />
      </BackstageProvider>
    );
    await act(async () => {});
    expect(screen.getByText('demo - - out -')).toBeTruthy();

    let prodId = '';
    await act(async () => {
      prodId = (await store.addInstance({ name: 'Prod', baseUrl: 'https://prod.example', provider: 'github' })).id;
      await store.addInstance({ name: 'Stage', baseUrl: 'https://stage.example', provider: 'guest' });
      await store.setSession(prodId, { token: 'tok', userEntityRef: 'user:default/jane', ownershipEntityRefs: [], provider: 'github', expiresAt: Date.now() + 60_000 });
    });
    expect(screen.getByText('live https://prod.example tok in Prod')).toBeTruthy();

    await act(async () => {
      const stage = store.getState().instances[1];
      await store.setActive(stage.id);
    });
    expect(screen.getByText('live https://stage.example - out Stage')).toBeTruthy();
  });

  it('sends no token for an expired session', async () => {
    const store = createInstanceStore(storage());
    await store.load();
    const inst = await store.addInstance({ name: 'Prod', baseUrl: 'https://prod.example', provider: 'github' });
    await store.setSession(inst.id, { token: 'old', userEntityRef: 'u', ownershipEntityRefs: [], provider: 'github', expiresAt: Date.now() - 1000 });

    await render(
      <BackstageProvider store={store}>
        <Consumer />
      </BackstageProvider>
    );
    await act(async () => {});
    expect(screen.getByText('live https://prod.example - expired Prod')).toBeTruthy();
  });

  it('seeds the first instance from the environment config', async () => {
    const store = createInstanceStore(storage());
    await store.load();
    const envConfig = createBackstageConfig({ baseUrl: 'https://env.example/', token: 'static' });
    await seedFromEnv(store, envConfig);
    const state = store.getState();
    expect(state.instances).toMatchObject([{ name: 'Default', baseUrl: 'https://env.example' }]);
    expect(state.activeId).toBe(state.instances[0].id);
    expect(state.sessions[state.instances[0].id]?.token).toBe('static');

    await seedFromEnv(store, envConfig);
    expect(store.getState().instances).toHaveLength(1);
  });

  it('throws when used outside the provider', () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<Consumer />)).rejects.toThrow('useBackstage must be used within a BackstageProvider');
    spy.mockRestore();
  });
});
