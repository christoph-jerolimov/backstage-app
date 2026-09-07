## Why

The app still wears the Expo template's palette and follows the device color scheme
only. A portal client should look like Backstage and let the user pick a theme; the
Backstage UI design system (`@backstage/ui`) publishes light and dark token sets that
give the app a recognizable, consistent look on every platform.

## What Changes

- Replace the template colors in `@backstage-app/core` with two themes derived from the
  Backstage UI tokens (light: app background `#f5f5f5`, surfaces `#ffffff`/`#f7f7f7`,
  text `#000000`/`#696969`, accent `#1f5493`; dark: app background `#333333`, surfaces
  `#424141`/`#504f4f`/`#5c5c5c`, text `#ffffff`/`#a3a3a3`, accent `#9cc9ff`; plus
  borders and danger/success/warning/info pairs). Existing color keys keep their names
  so every component keeps working; new keys are added for accent, borders, and status.
- Add a theme preference (`system` | `light` | `dark`) to core: a `ThemeProvider` that
  resolves the effective scheme from the preference and the device scheme, persists the
  preference, and drives `useTheme()`; a `useThemePreference()` hook for reading and
  setting it. The app's navigation theme (drawer, header, scene background) is built
  from the same tokens.
- Add `plugins/settings` (`@backstage-app/plugin-settings`) with a "Settings" navigation
  entry after Account: a theme selector (System / Light / Dark) with a live preview and a
  pointer to Account for instances.
- Keep `useColorScheme` (device scheme) available for the hydration-safe web behavior;
  `useTheme()` now returns the resolved theme's colors.

## Capabilities

### New Capabilities
- `app-theme`: the two Backstage UI derived themes, preference resolution, persistence,
  and how the app chrome follows the theme.
- `settings-plugin`: the Settings entry and the theme selector.

### Modified Capabilities
- `app-navigation`: drawer contents scenario gains Settings.
- `demo-plugins`: bundled plugins list gains settings.

## Impact

- `packages/core/src/theme.ts` (tokens), new `packages/core/src/theme-provider.tsx`
  (`ThemeProvider`, `useThemePreference`, `useResolvedScheme`), `hooks/use-theme.ts`
  reads the provider with a device-scheme fallback.
- `packages/app/src/app/_layout.tsx` mounts `ThemeProvider` and builds the navigation
  theme from tokens.
- New `plugins/settings/`; `packages/app` registration and `settings` route.
- No new dependencies (persistence reuses the AsyncStorage/localStorage adapters).
