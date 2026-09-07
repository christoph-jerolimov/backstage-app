## Context

See proposal.md. `packages/core/src/theme.ts` exports `Colors.light/dark` with five keys
(`text`, `background`, `backgroundElement`, `backgroundSelected`, `textSecondary`);
`useTheme()` picks a set from `useColorScheme()` (device scheme, hydration-safe on web).
Fifteen files consume `useTheme`/`useColorScheme`. `_layout.tsx` builds the navigation
theme from `DarkTheme`/`DefaultTheme` plus `Colors`. The token values below were read
from `@backstage/ui@0.17.1`'s `dist/css/styles.css` (`:root` light block and
`[data-theme-mode='dark']` block).

## Goals / Non-Goals

**Goals:** Backstage look on all platforms; a user-selectable theme with persistence;
no churn for existing components (keys stay).

**Non-Goals:** per-plugin themes, custom accent colors, matching Backstage UI typography
scales exactly, theming the Expo UI showcase's native controls.

## Decisions

### D1. Token mapping (existing keys keep their names)
| key | light | dark | source token |
| --- | --- | --- | --- |
| background | #f5f5f5 | #333333 | bg-app |
| backgroundElement | #ffffff | #424141 | bg-neutral-1 |
| backgroundSelected | #e5e5e5 | #5c5c5c | gray-3 / bg-neutral-3 |
| text | #000000 | #ffffff | fg-primary |
| textSecondary | #696969 | #a3a3a3 | fg-secondary |
| accent | #1f5493 | #9cc9ff | bg-solid |
| onAccent | #ffffff | #101821 | fg-solid |
| border | #e5e5e5 | #737373 | border-1 |
| borderStrong | #737373 | #a1a1a1 | border-2 |
| danger / dangerBackground | #ec3b18 / #ffe2e2 | #ff5a30 / #300c0c | fg-danger / bg-danger |
| success / successBackground | #1aaf4f / #dcfce7 | #1ed760 / #042713 | fg-success / bg-success |
| warning / warningBackground | #f18900 / #ffedd5 | #f18900 / #302008 | fg-warning / bg-warning |
| info / infoBackground | #0d74ce / #dbeafe | #70b8ff / #132049 | fg-info / bg-info |

`ThemeColor` widens accordingly; `ThemedText type="linkPrimary"` uses `accent` instead
of the hard-coded blue.

### D2. `ThemeProvider` in core
`packages/core/src/theme-provider.tsx`: context `{ preference, setPreference, scheme,
colors }`. On mount it reads the preference from a `KeyValueStorage` (default: the
platform instances storage, i.e. AsyncStorage / localStorage; injectable for tests) and
writes on change. `scheme = preference === 'system' ? deviceScheme : preference`, where
`deviceScheme` comes from the existing hydration-safe `useColorScheme`. `useTheme()`
returns `context.colors` when a provider exists and falls back to the device scheme
otherwise, so existing tests without a provider keep working. `useThemePreference()`
returns `{ preference, setPreference, scheme }`; `useResolvedScheme()` returns `scheme`.

### D3. Navigation theme from tokens
`_layout.tsx` wraps everything in `ThemeProvider`, then a small `NavigationChrome`
component reads `useTheme()`/`useResolvedScheme()` and passes a React Navigation theme
`{ dark, colors: { primary: accent, background, card: backgroundElement, text, border,
notification: danger }, fonts }` (based on `DarkTheme`/`DefaultTheme`) to Expo Router's
`ThemeProvider` and the drawer screen options. This is required because the provider
must sit above the hook consumers.

### D4. Settings plugin
`SettingsPage({ preference, scheme, onChange })` (pure) renders `FilterChips` for the
three options, the status line, and a `ThemePreview` card with four swatches;
`SettingsScreen` wires `useThemePreference`. Route `settings`, nav item "Settings"
after Account, icon `gear` / `settings`.

## Risks / Trade-offs

- [Contrast of `backgroundSelected` on dark] → `#5c5c5c` on `#424141` matches Backstage
  UI's neutral-3 on neutral-1 pairing.
- [Flash of device theme before the stored preference loads] → the preference is read
  in the first effect; a one-frame mismatch is acceptable, and the splash overlay covers
  startup on native.
- [Components hard-coding colors] → grep shows only `linkPrimary`'s blue; it moves to
  `accent`.

## Migration Plan

Single PR. No config changes; the default preference is `system`, so first launch
looks like today's behavior with the new palette.
