import { createInstanceStore, createMemoryStorage, validateBaseUrl } from '../instances';

const storage = () => ({ instances: createMemoryStorage(), sessions: createMemoryStorage() });
const session = (token: string) => ({ token, userEntityRef: 'user:default/jane', ownershipEntityRefs: [], provider: 'github' });

describe('validateBaseUrl', () => {
  it('normalizes and rejects', () => {
    expect(validateBaseUrl(' https://b.example/ ')).toBe('https://b.example');
    expect(() => validateBaseUrl('example.com')).toThrow('Not an absolute http(s) URL');
    expect(() => validateBaseUrl('')).toThrow();
  });
});

describe('createInstanceStore', () => {
  it('adds, activates the first instance, updates, and removes with active re-pick', async () => {
    const store = createInstanceStore(storage());
    await store.load();
    expect(store.getState()).toMatchObject({ instances: [], loaded: true, activeId: undefined });

    const prod = await store.addInstance({ name: 'Production', baseUrl: 'https://prod.example/', provider: 'github' });
    const staging = await store.addInstance({ name: 'Staging', baseUrl: 'https://staging.example', provider: 'guest' });
    expect(prod.baseUrl).toBe('https://prod.example');
    expect(store.getState().activeId).toBe(prod.id);

    await store.setActive(staging.id);
    expect(store.getState().activeId).toBe(staging.id);

    await store.updateInstance(staging.id, { name: 'Stage 2' });
    expect(store.getState().instances[1].name).toBe('Stage 2');

    await store.setSession(staging.id, session('t1'));
    await store.removeInstance(staging.id);
    expect(store.getState().instances.map((i) => i.id)).toEqual([prod.id]);
    expect(store.getState().activeId).toBe(prod.id);
    expect(store.getState().sessions[staging.id]).toBeUndefined();

    await store.removeInstance(prod.id);
    expect(store.getState().activeId).toBeUndefined();
  });

  it('rejects invalid base URLs on add', async () => {
    const store = createInstanceStore(storage());
    await expect(store.addInstance({ name: 'x', baseUrl: 'nope', provider: 'github' })).rejects.toThrow('Not an absolute');
    expect(store.getState().instances).toHaveLength(0);
  });

  it('persists instances, active selection, and sessions across loads', async () => {
    const shared = storage();
    const first = createInstanceStore(shared);
    await first.load();
    const a = await first.addInstance({ name: 'A', baseUrl: 'https://a.example', provider: 'github' });
    const b = await first.addInstance({ name: 'B', baseUrl: 'https://b.example', provider: 'guest' });
    await first.setSession(a.id, session('ta'));
    await first.setSession(b.id, session('tb'));
    await first.setActive(b.id);
    await first.clearSession(a.id);

    const second = createInstanceStore(shared);
    await second.load();
    const state = second.getState();
    expect(state.instances.map((i) => i.name)).toEqual(['A', 'B']);
    expect(state.activeId).toBe(b.id);
    expect(state.sessions[b.id]?.token).toBe('tb');
    expect(state.sessions[a.id]).toBeUndefined();
  });

  it('notifies subscribers', async () => {
    const store = createInstanceStore(storage());
    const listener = jest.fn();
    store.subscribe(listener);
    await store.addInstance({ name: 'A', baseUrl: 'https://a.example', provider: 'github' });
    expect(listener).toHaveBeenCalled();
  });
});
