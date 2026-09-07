import { normalizeBaseUrl } from './config';

export type BackstageInstance = {
  id: string;
  name: string;
  /** Absolute http(s) URL without a trailing slash. */
  baseUrl: string;
  /** Backstage auth provider id, for example `github` or `guest`. */
  provider: string;
};

export type BackstageSession = {
  token: string;
  userEntityRef: string;
  ownershipEntityRefs: string[];
  /** Epoch milliseconds; undefined when the token has no expiry. */
  expiresAt?: number;
  provider: string;
};

export type InstancesState = {
  instances: BackstageInstance[];
  sessions: Record<string, BackstageSession>;
  activeId?: string;
  /** False until persisted state has been read. */
  loaded: boolean;
};

/** Minimal async key/value storage, satisfied by AsyncStorage, SecureStore, and localStorage wrappers. */
export interface KeyValueStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

export type InstanceStorage = {
  /** Instances and the active selection. */
  instances: KeyValueStorage;
  /** One entry per session; the platform secure store where available. */
  sessions: KeyValueStorage;
};

export type NewInstance = { name: string; baseUrl: string; provider: string };

export interface InstanceStore {
  getState(): InstancesState;
  subscribe(listener: () => void): () => void;
  /** Reads persisted state; resolves once `loaded` is true. */
  load(): Promise<void>;
  addInstance(input: NewInstance): Promise<BackstageInstance>;
  updateInstance(id: string, patch: Partial<NewInstance>): Promise<void>;
  removeInstance(id: string): Promise<void>;
  setActive(id: string | undefined): Promise<void>;
  setSession(id: string, session: BackstageSession): Promise<void>;
  clearSession(id: string): Promise<void>;
}

const INSTANCES_KEY = 'backstage.instances';
const ACTIVE_KEY = 'backstage.activeInstance';
const sessionKey = (id: string) => `backstage.session.${id}`;

export function createMemoryStorage(initial: Record<string, string> = {}): KeyValueStorage {
  const map = new Map(Object.entries(initial));
  return {
    async getItem(key) {
      return map.has(key) ? map.get(key)! : null;
    },
    async setItem(key, value) {
      map.set(key, value);
    },
    async removeItem(key) {
      map.delete(key);
    },
  };
}

export class InvalidBaseUrlError extends Error {
  constructor(value: string) {
    super(`Not an absolute http(s) URL: "${value}"`);
    this.name = 'InvalidBaseUrlError';
  }
}

/** Trims, strips the trailing slash, and requires an absolute http(s) URL. */
export function validateBaseUrl(raw: string): string {
  const normalized = normalizeBaseUrl(raw);
  if (!normalized || !/^https?:\/\/[^\s/]+/i.test(normalized)) {
    throw new InvalidBaseUrlError(raw);
  }
  return normalized;
}

function newId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function createInstanceStore(storage: InstanceStorage): InstanceStore {
  let state: InstancesState = { instances: [], sessions: {}, loaded: false };
  const listeners = new Set<() => void>();

  const emit = () => listeners.forEach((listener) => listener());
  const set = (patch: Partial<InstancesState>) => {
    state = { ...state, ...patch };
    emit();
  };

  const persistInstances = async () => {
    await storage.instances.setItem(INSTANCES_KEY, JSON.stringify(state.instances));
    if (state.activeId) await storage.instances.setItem(ACTIVE_KEY, state.activeId);
    else await storage.instances.removeItem(ACTIVE_KEY);
  };

  const pickActive = (instances: BackstageInstance[], preferred?: string) =>
    instances.some((item) => item.id === preferred) ? preferred : instances[0]?.id;

  return {
    getState: () => state,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    async load() {
      const rawInstances = await storage.instances.getItem(INSTANCES_KEY);
      const instances: BackstageInstance[] = rawInstances ? JSON.parse(rawInstances) : [];
      const activeId = pickActive(instances, (await storage.instances.getItem(ACTIVE_KEY)) ?? undefined);
      const sessions: Record<string, BackstageSession> = {};
      for (const instance of instances) {
        const raw = await storage.sessions.getItem(sessionKey(instance.id));
        if (raw) sessions[instance.id] = JSON.parse(raw);
      }
      set({ instances, sessions, activeId, loaded: true });
    },
    async addInstance(input) {
      const instance: BackstageInstance = {
        id: newId(),
        name: input.name.trim() || input.baseUrl,
        baseUrl: validateBaseUrl(input.baseUrl),
        provider: input.provider.trim() || 'github',
      };
      const instances = [...state.instances, instance];
      set({ instances, activeId: state.activeId ?? instance.id });
      await persistInstances();
      return instance;
    },
    async updateInstance(id, patch) {
      const instances = state.instances.map((item) =>
        item.id === id
          ? {
              ...item,
              ...(patch.name !== undefined ? { name: patch.name.trim() || item.name } : {}),
              ...(patch.baseUrl !== undefined ? { baseUrl: validateBaseUrl(patch.baseUrl) } : {}),
              ...(patch.provider !== undefined ? { provider: patch.provider.trim() || item.provider } : {}),
            }
          : item
      );
      set({ instances });
      await persistInstances();
    },
    async removeInstance(id) {
      const instances = state.instances.filter((item) => item.id !== id);
      const { [id]: _removed, ...sessions } = state.sessions;
      set({ instances, sessions, activeId: pickActive(instances, state.activeId === id ? undefined : state.activeId) });
      await storage.sessions.removeItem(sessionKey(id));
      await persistInstances();
    },
    async setActive(id) {
      set({ activeId: pickActive(state.instances, id) });
      await persistInstances();
    },
    async setSession(id, session) {
      set({ sessions: { ...state.sessions, [id]: session } });
      await storage.sessions.setItem(sessionKey(id), JSON.stringify(session));
    },
    async clearSession(id) {
      const { [id]: _removed, ...sessions } = state.sessions;
      set({ sessions });
      await storage.sessions.removeItem(sessionKey(id));
    },
  };
}
