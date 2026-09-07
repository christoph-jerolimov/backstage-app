import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

import type { InstanceStorage, KeyValueStorage } from './instances';

const asyncStorage: KeyValueStorage = {
  getItem: (key) => AsyncStorage.getItem(key),
  setItem: (key, value) => AsyncStorage.setItem(key, value),
  removeItem: (key) => AsyncStorage.removeItem(key),
};

// SecureStore keys may only contain alphanumerics, ".", "-", and "_".
const secureKey = (key: string) => key.replace(/[^A-Za-z0-9._-]/g, '_');

const secureStorage: KeyValueStorage = {
  getItem: (key) => SecureStore.getItemAsync(secureKey(key)),
  async setItem(key, value) {
    try {
      await SecureStore.setItemAsync(secureKey(key), value);
    } catch (error) {
      console.warn('Secure store unavailable, falling back to app storage', error);
      await AsyncStorage.setItem(key, value);
    }
  },
  async removeItem(key) {
    await SecureStore.deleteItemAsync(secureKey(key));
    await AsyncStorage.removeItem(key);
  },
};

/** Native storage: instances in AsyncStorage, sessions in the platform secure store. */
export function createPlatformStorage(): InstanceStorage {
  return { instances: asyncStorage, sessions: secureStorage };
}
