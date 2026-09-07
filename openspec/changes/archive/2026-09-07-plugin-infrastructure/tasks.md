## 1. Workspace skeleton

- [x] 1.1 Create `packages/app`, `packages/core`, and `plugins/{home,catalog,search,notifications}` directories with a `package.json` each (`@backstage-app/app`, `@backstage-app/core`, `@backstage-app/plugin-*`; core and plugins use `"main": "src/index.ts"`), and verify `find packages plugins -name package.json` lists six files
- [x] 1.2 Turn the root `package.json` into the workspace root (`"workspaces": ["packages/*", "plugins/*"]`, root-only devDependencies, scripts delegating to `packages/app`), then run `npm install` and verify `ls -la node_modules/@backstage-app` shows six symlinks
- [x] 1.3 `git mv` the Expo project files (`app.json`, `assets/`, `scripts/`, `jest/`, `src/app`, app-only components, `expo-env` ignore) into `packages/app`, move the Expo dependencies and Jest config into `packages/app/package.json`, and verify `cd packages/app && npx expo config --type public` prints the app config
- [x] 1.4 Update `.gitignore` (`packages/app/ios`, `packages/app/android`, `packages/app/.expo`, `dist/` under the app) and verify `git status` shows no generated native folders after a local `expo prebuild --no-install` in `packages/app`

## 2. Shared core package

- [x] 2.1 `git mv` `themed-text`, `themed-view`, `hint-row`, `ui/collapsible`, `external-link`, `constants/theme.ts`, `global.css`, and the `use-color-scheme*` / `use-theme` hooks into `packages/core/src/` and export them from `packages/core/src/index.ts`; verify the moved tests under `packages/core/src/**/__tests__` still pass with `npm test`
- [x] 2.2 Implement `createPlugin` and the `BackstagePlugin`, `PluginRoute`, `PluginNavItem`, `PluginIcon` types in `packages/core/src/plugin.ts`, throwing when a nav item references an undeclared route; verify with a unit test covering the valid and invalid cases
- [x] 2.3 Implement `createPluginRegistry` (unique-id validation, ordered `plugins` and `navItems()` accessors) in `packages/core/src/registry.ts`; verify with a unit test covering ordering and the duplicate-id error

## 3. Demo plugins

- [x] 3.1 Implement `plugins/home` with `HomePage` (title, description, welcome card) and `homePlugin = createPlugin({ id: 'home', routes: [{ name: 'index', ... }], navItems: [...] })`; verify `npm run typecheck` passes and a render test finds the title
- [x] 3.2 Implement `plugins/catalog` with `CatalogPage` showing a static list of three entities (name + kind) and `catalogPlugin`; verify with a render test that finds "Catalog" and an entity name
- [x] 3.3 Implement `plugins/search` with `SearchPage` showing three static results and `searchPlugin`; verify with a render test
- [x] 3.4 Implement `plugins/notifications` with `NotificationsPage` showing three static notifications (title + time) and `notificationsPlugin`; verify with a render test

## 4. App integration and drawer

- [x] 4.1 Add `packages/app/src/plugins.ts` that builds the registry from the four plugins in order home, catalog, search, notifications; verify a unit test asserts `navItems()` titles equal `["Home", "Catalog", "Search", "Notifications"]`
- [x] 4.2 Add route files `packages/app/src/app/{index,catalog,search,notifications}.tsx` that re-export each plugin's page as default; verify `npm run typecheck` passes with typed routes
- [x] 4.3 Replace `_layout.tsx` with the drawer layout from design D4 (registry-driven `Drawer.Screen` entries, app-level "Expo UI" entry, `SymbolView` icons, `initialRouteName: 'index'`, `GestureHandlerRootView`), delete `app-tabs.tsx`, `app-tabs.web.tsx`, `explore.tsx`, the tab icon PNGs, and `tutorial-web.png`; verify `npm run lint` and `npm run typecheck` pass
- [x] 4.4 Adjust `components.tsx` and remaining app components to import shared primitives from `@backstage-app/core`; verify no `@/components/themed-*` imports remain (`grep -r "components/themed" packages plugins` is empty)

## 5. Tooling, CI, and docs

- [x] 5.1 Move `tsconfig.json` settings to the root per design D6 (`include` for `packages/**` and `plugins/**`, `paths` for `@/*` and `@/assets/*`, explicit `types`) and verify `npm run typecheck` passes from the root
- [x] 5.2 Point the root lint script at all workspaces (`eslint .` with the existing flat config, ignoring `dist`, `packages/app/ios`, `packages/app/android`) and verify `npm run lint -- --max-warnings=0` passes
- [x] 5.3 Configure Jest (implemented as a root `jest.config.js` so `npm test -- --ci` forwards flags without an npm workspace indirection) in `packages/app/package.json` with `roots` covering the app, core, and plugins plus the existing `moduleNameMapper`; verify `npm test -- --ci` runs every test under `packages/` and `plugins/`
- [x] 5.4 Update `.github/workflows/ci.yml` with `working-directory: packages/app` for Expo/Gradle/Xcode steps and prefixed artifact and workspace paths; verify `python3 -c "import yaml; yaml.safe_load(open('.github/workflows/ci.yml'))"` succeeds and a local `cd packages/app && npx expo export --platform web` produces `packages/app/dist`
- [x] 5.5 Update README (layout, scripts, how to add a plugin) and `openspec/config.yaml` context for the monorepo; verify the README lists `packages/app`, `packages/core`, and `plugins/*`

## 6. Verification

- [x] 6.1 Run `npm run typecheck`, `npm run lint -- --max-warnings=0`, `npm test -- --ci`, and the web export from the root and verify all succeed
- [x] 6.2 Verify the exported web build contains static routes for `/`, `/catalog`, `/search`, `/notifications`, and `/components`
