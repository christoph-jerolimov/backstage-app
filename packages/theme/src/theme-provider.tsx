import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import AsyncStorage from '@react-native-async-storage/async-storage';

import { useColorScheme } from './hooks/use-color-scheme';
import { type ColorScheme, Colors, type ThemeColors } from './theme';

/**
 * The slice of a key/value store this provider needs. Declared here rather than
 * imported so the theme stays a leaf package: persisting a colour preference should
 * not pull in the Backstage connection. Structurally compatible with core's
 * `KeyValueStorage`, so callers can still pass that.
 */
export type KeyValueStorage = {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
};

/**
 * Plain app storage. A colour preference is not a secret, so it deliberately does not
 * reach for the platform secure store that core's session storage uses.
 */
const defaultStorage: KeyValueStorage = {
  getItem: (key) => AsyncStorage.getItem(key),
  setItem: (key, value) => AsyncStorage.setItem(key, value),
  removeItem: (key) => AsyncStorage.removeItem(key),
};

/** `system` follows the device; `light` and `dark` force a scheme. */
export type ThemePreference = 'system' | 'light' | 'dark';

export const THEME_PREFERENCES: readonly ThemePreference[] = ['system', 'light', 'dark'];

export const THEME_PREFERENCE_KEY = 'app.themePreference';

export type ThemeContextValue = {
  preference: ThemePreference;
  setPreference: (preference: ThemePreference) => void;
  /** The scheme in effect after resolving `system` against the device. */
  scheme: ColorScheme;
  colors: ThemeColors;
};

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function isThemePreference(value: unknown): value is ThemePreference {
  return typeof value === 'string' && (THEME_PREFERENCES as readonly string[]).includes(value);
}

/** Resolves a preference against the device scheme (`null`/`unspecified` count as light). */
export function resolveScheme(preference: ThemePreference, deviceScheme: string | null | undefined): ColorScheme {
  if (preference === 'system') {
    return deviceScheme === 'dark' ? 'dark' : 'light';
  }
  return preference;
}

export type ThemeProviderProps = {
  /** Where the preference is persisted. Defaults to the platform app storage. */
  storage?: KeyValueStorage;
  /** Starting preference before the stored value is read. */
  initialPreference?: ThemePreference;
  children: ReactNode;
};

/** Holds the user's theme preference, persists it, and resolves it to a color scheme. */
export function ThemeProvider({ storage, initialPreference = 'system', children }: ThemeProviderProps) {
  const [store] = useState(() => storage ?? defaultStorage);
  const [preference, setPreferenceState] = useState<ThemePreference>(initialPreference);
  const deviceScheme = useColorScheme();

  useEffect(() => {
    let cancelled = false;
    store
      .getItem(THEME_PREFERENCE_KEY)
      .then((stored) => {
        if (!cancelled && isThemePreference(stored)) {
          setPreferenceState(stored);
        }
      })
      .catch((error: unknown) => console.warn('Could not read the theme preference', error));
    return () => {
      cancelled = true;
    };
  }, [store]);

  const setPreference = useCallback(
    (next: ThemePreference) => {
      setPreferenceState(next);
      store.setItem(THEME_PREFERENCE_KEY, next).catch((error: unknown) => console.warn('Could not save the theme preference', error));
    },
    [store]
  );

  const scheme = resolveScheme(preference, deviceScheme);
  const value = useMemo<ThemeContextValue>(
    () => ({ preference, setPreference, scheme, colors: Colors[scheme] }),
    [preference, setPreference, scheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

/** The theme context, or undefined when rendered outside a `ThemeProvider`. */
export function useThemeContext(): ThemeContextValue | undefined {
  return useContext(ThemeContext);
}

/** Read and change the theme preference. Throws outside a `ThemeProvider`. */
export function useThemePreference(): Pick<ThemeContextValue, 'preference' | 'setPreference' | 'scheme'> {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useThemePreference must be used within a ThemeProvider');
  }
  return { preference: context.preference, setPreference: context.setPreference, scheme: context.scheme };
}

/** The scheme in effect: the preference resolved against the device, or the device scheme without a provider. */
export function useResolvedScheme(): ColorScheme {
  const context = useContext(ThemeContext);
  const deviceScheme = useColorScheme();
  return context ? context.scheme : resolveScheme('system', deviceScheme);
}
