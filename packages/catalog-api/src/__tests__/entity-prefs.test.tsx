import { act, renderHook, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { createMemoryStorage, type KeyValueStorage } from '@backstage-app/core';
import {
  EntityPrefsProvider,
  RECENT_KEY,
  RECENT_LIMIT,
  STARRED_KEY,
  useRecentEntities,
  useStarredEntities,
  withStarToggled,
  withVisit,
} from '../entity-prefs';

const petstore = 'component:default/petstore';
const sharedUi = 'component:default/shared-ui';

function usePrefs() {
  return { ...useStarredEntities(), ...useRecentEntities() };
}

const wrapperFor = (storage: KeyValueStorage) =>
  function Wrapper({ children }: { children: ReactNode }) {
    return <EntityPrefsProvider storage={storage}>{children}</EntityPrefsProvider>;
  };

describe('entity preferences', () => {
  it('stars, un-stars, and persists', async () => {
    const storage = createMemoryStorage();
    const { result } = await renderHook(usePrefs, { wrapper: wrapperFor(storage) });
    await waitFor(() => expect(result.current.loaded).toBe(true));

    await act(async () => result.current.toggleStar(petstore));
    expect(result.current.starred).toEqual([petstore]);
    expect(result.current.isStarred(petstore)).toBe(true);
    await waitFor(async () => expect(await storage.getItem(STARRED_KEY)).toBe(JSON.stringify([petstore])));

    await act(async () => result.current.toggleStar(petstore));
    expect(result.current.starred).toEqual([]);
    expect(result.current.isStarred(petstore)).toBe(false);

    const second = await renderHook(usePrefs, { wrapper: wrapperFor(storage) });
    await waitFor(() => expect(second.result.current.loaded).toBe(true));
    expect(second.result.current.starred).toEqual([]);
  });

  it('reads stored lists on mount', async () => {
    const storage = createMemoryStorage({ [STARRED_KEY]: JSON.stringify([petstore]), [RECENT_KEY]: JSON.stringify([sharedUi]) });
    const { result } = await renderHook(usePrefs, { wrapper: wrapperFor(storage) });

    await waitFor(() => expect(result.current.starred).toEqual([petstore]));
    expect(result.current.recent).toEqual([sharedUi]);
  });

  it('records visits most recent first without duplicates', async () => {
    const storage = createMemoryStorage();
    const { result } = await renderHook(usePrefs, { wrapper: wrapperFor(storage) });
    await waitFor(() => expect(result.current.loaded).toBe(true));

    await act(async () => result.current.recordVisit(petstore));
    await act(async () => result.current.recordVisit(sharedUi));
    await act(async () => result.current.recordVisit(petstore));

    expect(result.current.recent).toEqual([petstore, sharedUi]);
    await waitFor(async () => expect(await storage.getItem(RECENT_KEY)).toBe(JSON.stringify([petstore, sharedUi])));
  });

  it('survives unreadable and throwing storage', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const broken: KeyValueStorage = {
      getItem: async () => {
        throw new Error('nope');
      },
      setItem: async () => {},
      removeItem: async () => {},
    };
    const { result } = await renderHook(usePrefs, { wrapper: wrapperFor(broken) });
    await waitFor(() => expect(result.current.loaded).toBe(true));
    expect(result.current.starred).toEqual([]);
    expect(result.current.recent).toEqual([]);

    const garbage = await renderHook(usePrefs, { wrapper: wrapperFor(createMemoryStorage({ [STARRED_KEY]: 'not json' })) });
    await waitFor(() => expect(garbage.result.current.loaded).toBe(true));
    expect(garbage.result.current.starred).toEqual([]);
    warn.mockRestore();
  });

  it('is inert without a provider', async () => {
    const { result } = await renderHook(usePrefs);
    expect(result.current.starred).toEqual([]);
    expect(result.current.isStarred(petstore)).toBe(false);
    await act(async () => {
      result.current.toggleStar(petstore);
      result.current.recordVisit(petstore);
    });
    expect(result.current.starred).toEqual([]);
    expect(result.current.recent).toEqual([]);
  });

  it('caps the recent list and toggles purely', () => {
    let refs: string[] = [];
    for (let i = 0; i < RECENT_LIMIT + 1; i += 1) refs = withVisit(refs, `component:default/e${i}`);
    expect(refs).toHaveLength(RECENT_LIMIT);
    expect(refs[0]).toBe(`component:default/e${RECENT_LIMIT}`);
    expect(refs).not.toContain('component:default/e0');

    expect(withStarToggled([], petstore)).toEqual([petstore]);
    expect(withStarToggled([petstore], petstore)).toEqual([]);
    expect(withStarToggled([petstore], sharedUi)).toEqual([petstore, sharedUi]);
  });
});
