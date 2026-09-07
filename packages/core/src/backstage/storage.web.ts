import { createMemoryStorage, type InstanceStorage, type KeyValueStorage } from './instances';

function localStorageAdapter(): KeyValueStorage {
  return {
    async getItem(key) {
      return globalThis.localStorage?.getItem(key) ?? null;
    },
    async setItem(key, value) {
      globalThis.localStorage?.setItem(key, value);
    },
    async removeItem(key) {
      globalThis.localStorage?.removeItem(key);
    },
  };
}

/** Web storage: localStorage for both (the browser has no secure store; tokens are short-lived). */
export function createPlatformStorage(): InstanceStorage {
  const storage = typeof globalThis.localStorage === 'undefined' ? createMemoryStorage() : localStorageAdapter();
  return { instances: storage, sessions: storage };
}
