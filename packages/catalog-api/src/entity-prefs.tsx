import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { type KeyValueStorage, createPlatformStorage } from '@backstage-app/core';

export const STARRED_KEY = 'app.starredEntities';
export const RECENT_KEY = 'app.recentEntities';

/** How many recently viewed entities are remembered. */
export const RECENT_LIMIT = 10;

export type EntityPrefsValue = {
  /** Starred entity refs (`kind:namespace/name`), in the order they were starred. */
  starred: string[];
  /** Recently viewed entity refs, most recent first. */
  recent: string[];
  isStarred: (ref: string) => boolean;
  toggleStar: (ref: string) => void;
  recordVisit: (ref: string) => void;
  /** False until the persisted lists have been read. */
  loaded: boolean;
};

const EMPTY: EntityPrefsValue = {
  starred: [],
  recent: [],
  isStarred: () => false,
  toggleStar: () => {},
  recordVisit: () => {},
  loaded: false,
};

const EntityPrefsContext = createContext<EntityPrefsValue>(EMPTY);

function parseRefs(stored: string | null): string[] {
  if (!stored) return [];
  try {
    const value: unknown = JSON.parse(stored);
    return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
  } catch {
    return [];
  }
}

/** Moves `ref` to the front of `refs` and caps the list at `RECENT_LIMIT`. */
export function withVisit(refs: string[], ref: string): string[] {
  return [ref, ...refs.filter((item) => item !== ref)].slice(0, RECENT_LIMIT);
}

export function withStarToggled(refs: string[], ref: string): string[] {
  return refs.includes(ref) ? refs.filter((item) => item !== ref) : [...refs, ref];
}

export type EntityPrefsProviderProps = {
  /** Where the lists are persisted. Defaults to the platform app storage. */
  storage?: KeyValueStorage;
  children: ReactNode;
};

/** Holds the starred and recently viewed entity refs and persists them. */
export function EntityPrefsProvider({ storage, children }: EntityPrefsProviderProps) {
  const [store] = useState(() => storage ?? createPlatformStorage().instances);
  const [starred, setStarred] = useState<string[]>([]);
  const [recent, setRecent] = useState<string[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    Promise.all([store.getItem(STARRED_KEY), store.getItem(RECENT_KEY)])
      .then(([storedStarred, storedRecent]) => {
        if (cancelled) return;
        setStarred(parseRefs(storedStarred));
        setRecent(parseRefs(storedRecent));
        setLoaded(true);
      })
      .catch((error: unknown) => {
        console.warn('Could not read the entity preferences', error);
        if (!cancelled) setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, [store]);

  const save = useCallback(
    (key: string, refs: string[]) => {
      store.setItem(key, JSON.stringify(refs)).catch((error: unknown) => console.warn('Could not save the entity preferences', error));
    },
    [store]
  );

  const toggleStar = useCallback(
    (ref: string) => {
      setStarred((current) => {
        const next = withStarToggled(current, ref);
        save(STARRED_KEY, next);
        return next;
      });
    },
    [save]
  );

  const recordVisit = useCallback(
    (ref: string) => {
      setRecent((current) => {
        if (current[0] === ref) return current;
        const next = withVisit(current, ref);
        save(RECENT_KEY, next);
        return next;
      });
    },
    [save]
  );

  const value = useMemo<EntityPrefsValue>(
    () => ({ starred, recent, isStarred: (ref: string) => starred.includes(ref), toggleStar, recordVisit, loaded }),
    [starred, recent, toggleStar, recordVisit, loaded]
  );

  return <EntityPrefsContext.Provider value={value}>{children}</EntityPrefsContext.Provider>;
}

/** Starred entity refs and the toggle. Empty and inert outside a provider. */
export function useStarredEntities(): Pick<EntityPrefsValue, 'starred' | 'isStarred' | 'toggleStar' | 'loaded'> {
  const { starred, isStarred, toggleStar, loaded } = useContext(EntityPrefsContext);
  return { starred, isStarred, toggleStar, loaded };
}

/** Recently viewed entity refs and the recorder. Empty and inert outside a provider. */
export function useRecentEntities(): Pick<EntityPrefsValue, 'recent' | 'recordVisit' | 'loaded'> {
  const { recent, recordVisit, loaded } = useContext(EntityPrefsContext);
  return { recent, recordVisit, loaded };
}
