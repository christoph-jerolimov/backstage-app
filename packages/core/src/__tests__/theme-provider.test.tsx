import { act, renderHook, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import { useColorScheme as useDeviceColorScheme } from 'react-native';

import { createMemoryStorage } from '../backstage/instances';
import { useTheme } from '../hooks/use-theme';
import { Colors } from '../theme';
import { THEME_PREFERENCE_KEY, ThemeProvider, resolveScheme, useThemePreference } from '../theme-provider';

jest.mock('react-native/Libraries/Utilities/useColorScheme', () => ({
  __esModule: true,
  default: jest.fn(() => 'light'),
}));

const deviceScheme = useDeviceColorScheme as jest.Mock;

function useThemeAndPreference() {
  return { ...useThemePreference(), colors: useTheme() };
}

describe('ThemeProvider', () => {
  beforeEach(() => {
    deviceScheme.mockReturnValue('light');
  });

  it('follows the device scheme by default', async () => {
    deviceScheme.mockReturnValue('dark');
    const wrapper = ({ children }: { children: ReactNode }) => <ThemeProvider storage={createMemoryStorage()}>{children}</ThemeProvider>;
    const { result } = await renderHook(useThemeAndPreference, { wrapper });

    expect(result.current.preference).toBe('system');
    expect(result.current.scheme).toBe('dark');
    expect(result.current.colors).toBe(Colors.dark);
  });

  it('overrides the device scheme and persists the choice', async () => {
    const storage = createMemoryStorage();
    const wrapper = ({ children }: { children: ReactNode }) => <ThemeProvider storage={storage}>{children}</ThemeProvider>;
    const { result } = await renderHook(useThemeAndPreference, { wrapper });

    await act(async () => {
      result.current.setPreference('dark');
    });

    expect(result.current.scheme).toBe('dark');
    expect(result.current.colors).toBe(Colors.dark);
    await waitFor(async () => expect(await storage.getItem(THEME_PREFERENCE_KEY)).toBe('dark'));

    const second = await renderHook(useThemeAndPreference, { wrapper });
    await waitFor(() => expect(second.result.current.preference).toBe('dark'));
    expect(second.result.current.colors).toBe(Colors.dark);
  });

  it('ignores unknown stored values', async () => {
    const storage = createMemoryStorage();
    await storage.setItem(THEME_PREFERENCE_KEY, 'sepia');
    const wrapper = ({ children }: { children: ReactNode }) => <ThemeProvider storage={storage}>{children}</ThemeProvider>;
    const { result } = await renderHook(useThemeAndPreference, { wrapper });

    await act(async () => {});
    expect(result.current.preference).toBe('system');
  });

  it('lets useTheme fall back to the device scheme without a provider', async () => {
    deviceScheme.mockReturnValue('dark');
    const { result } = await renderHook(useTheme);
    expect(result.current).toBe(Colors.dark);
  });

  it('resolves system to light when the device scheme is unknown', () => {
    expect(resolveScheme('system', null)).toBe('light');
    expect(resolveScheme('system', 'unspecified')).toBe('light');
    expect(resolveScheme('light', 'dark')).toBe('light');
    expect(resolveScheme('dark', 'light')).toBe('dark');
  });
});
