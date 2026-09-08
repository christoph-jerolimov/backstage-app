## 1. Theme package

- [x] 1.1 Create `packages/theme/package.json` as `@backstage-app/theme` (`private`, `main`/`types` → `src/index.ts`) with react, react-native and async-storage as peer dependencies and **no dependency on `@backstage-app/core`** per design D2; verify `npm install` links it
- [x] 1.2 Move `theme.ts`, `global.css`, `theme-provider.tsx`, `hooks/use-color-scheme.ts`, `hooks/use-color-scheme.web.ts` and `hooks/use-theme.ts` out of core into `packages/theme/src`, keeping the `.web` basename pair together per design D3; verify the files no longer exist under `packages/core/src`
- [x] 1.3 Replace `ThemeProvider`'s storage fallback with a locally declared `KeyValueStorage` type and an AsyncStorage adapter per design D2; verify the `storage` prop still accepts core's storage object unchanged and the theme tests pass unmodified
- [x] 1.4 Move the theme tests from core and write `packages/theme/src/index.ts` exporting the tokens, provider and hooks; verify the moved tests pass without edits

## 2. UI package

- [x] 2.1 Create `packages/ui/package.json` as `@backstage-app/ui` depending on `@backstage-app/theme`, with react/react-native/expo peer dependencies as the components require; verify `npm install` links it and 18 workspaces are listed
- [x] 2.2 Move all ten components and their tests from `packages/core/src/components` into `packages/ui/src`, repointing their theme imports at `@backstage-app/theme` per design D3; verify each moved test passes unmodified
- [x] 2.3 Write `packages/ui/src/index.ts` exporting every component and its props type; verify each name core previously exported for these components is exported here

## 3. Core

- [x] 3.1 Trim `packages/core/src/index.ts` to the plugin system, the Backstage connection, `useRemoteData` and `formatRelativeTime`; verify core exports no component, token, provider or scheme hook
- [x] 3.2 Verify nothing left under `packages/core/src` imports from `@backstage-app/ui` or `@backstage-app/theme`, so the dependency direction runs one way only

## 4. Repoint consumers

- [x] 4.1 Repoint every import across `packages/app`, `packages/catalog-api` and all ten plugins at `@backstage-app/ui` / `@backstage-app/theme` per design D4; verify no source file outside the two new packages imports a component or token from `@backstage-app/core`
- [x] 4.2 Update every consumer `package.json`, adding the new dependencies and dropping `@backstage-app/core` where nothing from it is used any more; verify knip reports no unlisted or unused dependency

## 5. Verification

- [x] 5.1 Run `npm run knip-reports` and commit all changed reports; verify `npm run knip-reports:check` exits zero with no new findings
- [x] 5.2 Run `npm run typecheck`, `npm run lint -- --max-warnings=0`, and `npm test -- --ci`; verify the suite passes and the test count is unchanged at 318, since this change moves tests without adding or removing any
- [x] 5.3 Run `cd packages/app && npx expo export --platform web`; verify the export succeeds, emits the same 23 routes, and so exercises the `.web` variant of `use-color-scheme` per design D3
