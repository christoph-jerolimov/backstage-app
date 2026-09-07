import './global.css';

import { Platform } from 'react-native';

/**
 * Light and dark palettes derived from the Backstage UI (`@backstage/ui`) design tokens:
 * `bg-app`, `bg-neutral-*`, `fg-primary`, `fg-secondary`, `bg-solid`, `border-*`, and the
 * status foreground/background pairs.
 */
export const Colors = {
  light: {
    text: '#000000',
    textSecondary: '#696969',
    background: '#f5f5f5',
    backgroundElement: '#ffffff',
    backgroundSelected: '#e5e5e5',
    accent: '#1f5493',
    onAccent: '#ffffff',
    border: '#e5e5e5',
    borderStrong: '#737373',
    danger: '#ec3b18',
    dangerBackground: '#ffe2e2',
    success: '#1aaf4f',
    successBackground: '#dcfce7',
    warning: '#f18900',
    warningBackground: '#ffedd5',
    info: '#0d74ce',
    infoBackground: '#dbeafe',
  },
  dark: {
    text: '#ffffff',
    textSecondary: '#a3a3a3',
    background: '#333333',
    backgroundElement: '#424141',
    backgroundSelected: '#5c5c5c',
    accent: '#9cc9ff',
    onAccent: '#101821',
    border: '#737373',
    borderStrong: '#a1a1a1',
    danger: '#ff5a30',
    dangerBackground: '#300c0c',
    success: '#1ed760',
    successBackground: '#042713',
    warning: '#f18900',
    warningBackground: '#302008',
    info: '#70b8ff',
    infoBackground: '#132049',
  },
} as const;

export type ColorScheme = keyof typeof Colors;
export type ThemeColors = (typeof Colors)[ColorScheme];

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const MaxContentWidth = 800;
