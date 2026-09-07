## 1. Core theme

- [x] 1.1 Replace `Colors` in `packages/core/src/theme.ts` with the Backstage UI derived light and dark sets from design D1 (existing keys plus accent, onAccent, border, borderStrong, and the four status pairs) and switch `ThemedText`'s `linkPrimary` to the accent; verify a unit test asserts the light/dark values for background, backgroundElement, text, textSecondary, and accent
- [x] 1.2 Add `packages/core/src/theme-provider.tsx` (`ThemePreference`, `ThemeProvider` with injectable storage, `useThemePreference`, `useResolvedScheme`), make `useTheme()` read the provider with a device-scheme fallback, and export from the index; verify tests cover default `system` following the device, overriding to dark, persistence via a memory storage round-trip, and `useTheme()` without a provider
- [x] 1.3 Mount `ThemeProvider` in `packages/app/src/app/_layout.tsx` and build the navigation theme and drawer options from tokens per design D3; verify `npm run typecheck` passes and the web export succeeds

## 2. Settings plugin

- [x] 2.1 Create `plugins/settings` (`@backstage-app/plugin-settings`) with `settings-page.tsx` (`SettingsPage` with theme chips, status line, `ThemePreview`), `settings-screen.tsx`, `plugin.ts` (route `settings`, nav "Settings"), `index.ts`; verify render tests cover the selected option, the status line for system/light and dark, and that choosing Dark calls the setter and updates the preview colors when rendered inside `ThemeProvider`
- [x] 2.2 Register `settingsPlugin` after auth in `packages/app/src/plugins.ts`, add `packages/app/src/app/settings.tsx`, the app dependency, the registry test expectation, and the README plugin list; verify the registry test passes

## 3. Verification

- [x] 3.1 Run `npm run typecheck`, `npm run lint -- --max-warnings=0`, `npm test -- --ci`; verify all pass
- [x] 3.2 Run `cd packages/app && npx expo export --platform web`; verify `/settings` is emitted
