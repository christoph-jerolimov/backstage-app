## Context

See proposal.md for motivation. Current state that shapes the approach:

- Single Expo SDK 57 project at the repository root. Expo Router (file-based) mounts
  screens from `src/app/`; navigation is the template's native tabs
  (`src/components/app-tabs.tsx` + `.web.tsx`).
- Shared UI primitives (`ThemedText`, `ThemedView`, `HintRow`, `Collapsible`,
  `ExternalLink`), theme tokens, and color-scheme hooks live under `src/`.
- Tooling: TypeScript 6 (strict, `expo/tsconfig.base`, explicit `types`), ESLint 9 with
  `eslint-config-expo` flat config, Jest via `jest-expo` with `moduleNameMapper` for `@/`,
  CI runs typecheck/lint/test/web export plus `expo prebuild` + Gradle/Xcode builds.
- Expo's Metro config (`@expo/metro-config`) resolves the workspace root automatically
  and adds the root `node_modules` and workspace folders to watch/resolution paths, so a
  standard npm-workspaces layout needs no custom `metro.config.js`.
- Expo Router 57 vendors React Navigation and ships `expo-router/drawer` (a `Drawer`
  layout plus `DrawerContentScrollView`, `DrawerItem`, `DrawerToggleButton`). No
  `@react-navigation/drawer` package is needed.
- The sandbox cannot reach docs.expo.dev; the design is grounded in the installed package
  sources listed above.

## Goals / Non-Goals

**Goals:**
- A plugin can be authored as an isolated package that only depends on
  `@backstage-app/core`, and the app integrates it with two edits (register it, mount its
  route file).
- Everything keeps working on iOS, Android, and web with the same checks as today.
- Keep the plugin contract small so later features (real API data, entity filters,
  deep links) extend it rather than replace it.

**Non-Goals:**
- Dynamic or remote plugin loading. Plugins are static workspace packages compiled into
  the app bundle.
- Per-plugin build artifacts or publishing. Packages are consumed as TypeScript source.
- Backstage API clients, auth, or configuration. Those arrive with the individual plugin
  features.
- Nested routes inside plugins. This round supports one main page per plugin; the route
  contract leaves room for more.

## Decisions

### D1. npm workspaces with the Expo app in `packages/app`
The root `package.json` declares `"workspaces": ["packages/*", "plugins/*"]` and holds
only workspace-wide dev tooling (TypeScript, ESLint, Jest runner scripts). The Expo
project (`app.json`, Expo dependencies, `jest` config, `scripts/reset-project.js`,
`assets/`) moves to `packages/app`. Root scripts delegate with
`npm run <script> --workspace packages/app`.

*Alternative considered*: keep the Expo project at the root and only point Expo Router at
`packages/app/src/app`. Rejected because the app would still own every dependency and the
"app is a package" boundary the request asks for would be nominal.

### D2. Packages are consumed as TypeScript source
Each workspace package sets `"main": "src/index.ts"` and `"types": "src/index.ts"`. Metro
compiles TS from any watched folder, and TypeScript with `moduleResolution: bundler`
follows `main` to a `.ts` file. No build step, no `dist/`.

*Alternative considered*: `tsc` build per package with `dist/` outputs. Rejected: adds a
build order and stale-output failure mode for no benefit while everything ships in one
bundle.

### D3. Plugin contract in `@backstage-app/core`
```ts
type PluginRoute = { name: string; component: ComponentType };
type PluginNavItem = { title: string; route: string; icon: PluginIcon };
type PluginIcon = { ios: SFSymbol; android: string; web: string }; // expo-symbols names
interface BackstagePlugin { id: string; name: string; routes: PluginRoute[]; navItems: PluginNavItem[] }
createPlugin(def: BackstagePlugin): BackstagePlugin // validates navItems → routes
createPluginRegistry(plugins: BackstagePlugin[]) // validates unique ids, exposes navItems()
```
`route.name` is the Expo Router file name the app mounts the page at (`catalog` →
`packages/app/src/app/catalog.tsx`). The app's route file is a one-line re-export of the
plugin's page component, which keeps Expo Router's static file-based routing and typed
routes intact.

*Alternative considered*: a catch-all `[...plugin].tsx` route that resolves pages from
the registry at runtime. Rejected: the drawer needs one screen per entry to highlight the
active item, typed routes would not know the paths, and deep links would depend on
runtime lookup. A one-line route file per plugin is an acceptable cost.

### D4. Drawer built from the registry
`packages/app/src/app/_layout.tsx` renders `Drawer` from `expo-router/drawer` wrapped in
`GestureHandlerRootView`. It maps `registry.navItems()` to `<Drawer.Screen name={route}
options={{ title, drawerIcon }} />` in registration order, then appends the app-level
`components` screen ("Expo UI"). Icons use `SymbolView` from `expo-symbols` with the
`{ios, android, web}` name object, which already works in the template's web tabs.
`initialRouteName` is `index` (home plugin). The header's default `DrawerToggleButton`
covers web where swipe is unavailable.

*Alternative considered*: keep native tabs and add the drawer only on web. Rejected: the
request asks for a drawer as the primary navigation, and one navigator keeps behavior
consistent across platforms.

### D5. Shared UI moves to core; app keeps app-only screens
`ThemedText`, `ThemedView`, `HintRow`, `Collapsible`, `ExternalLink`, `theme.ts`,
`global.css`, and the color-scheme hooks move to `packages/core/src/` and are exported
from its index. The app keeps `components.tsx` (Expo UI showcase), the animated icon and
splash overlay, and the web badge. The template's `explore.tsx` and `app-tabs*.tsx` are
deleted along with the tab icon assets and the tutorial image.

### D6. Tooling at the root
- `tsconfig.json` at the root extends `expo/tsconfig.base`, includes `packages/**` and
  `plugins/**`, sets `types: ["expo/types", "jest"]`, and maps `@/*` to
  `packages/app/src/*` and `@/assets/*` to `packages/app/assets/*`. Root `npm run
  typecheck` runs `tsc --noEmit` once for all workspaces.
- ESLint stays at the root (`expo lint` from `packages/app` resolves the root config
  through directory lookup; root script runs `eslint .` with the flat config so plugins
  are covered). The Expo config's `import/no-unresolved`-style checks resolve workspace
  packages through the root `node_modules` symlinks.
- Jest config moves into `packages/app/package.json` with `roots` covering
  `<rootDir>/src`, `<rootDir>/../core/src`, and `<rootDir>/../../plugins`, keeping the
  `jest-expo` preset and the CSS stub. Root `npm test` delegates to the app workspace.

### D7. CI adjustments
All Expo, Gradle, and Xcode steps get `working-directory: packages/app` (Gradle:
`packages/app/android`); artifact paths and the Xcode workspace path gain the prefix.
`npm ci` stays at the root. The `.gitignore` native-folder entries become
`packages/app/ios` and `packages/app/android`.

## Risks / Trade-offs

- [Metro fails to resolve a workspace package on some platform] → Expo's metro-config
  adds the workspace root and `node_modules` automatically; verified in
  `@expo/metro-config/build/getModulesPaths.js`. Web export in CI exercises resolution.
- [`expo prebuild` in a subdirectory changes native paths] → Prebuild writes `ios/` and
  `android/` next to `app.json`, i.e. under `packages/app`; CI paths are updated in the
  same change and the Android/iOS jobs prove it.
- [ESLint import resolver cannot see workspace symlinks] → The TypeScript resolver reads
  the root tsconfig `paths` and `node_modules` symlinks; if a rule misfires, scope it via
  the flat config rather than disabling the rule.
- [Jest `roots` outside `rootDir` confuse coverage or haste] → Only `roots` and
  `moduleNameMapper` are used, no haste; tests for plugins run today with the same preset.
- [Typed routes regenerate under `packages/app/.expo`] → The generated `expo-env.d.ts`
  lands in `packages/app`; it stays gitignored and `expo/types` is declared explicitly.

## Migration Plan

1. Create the workspace skeleton (`packages/app`, `packages/core`, `plugins/*`) with
   `git mv` so history follows the files.
2. Move tooling, run `npm install` at the root to relink, then typecheck/lint/test.
3. Replace tabs with the drawer, add plugins and route files.
4. Run the web export and (in CI) native builds. Rollback is reverting the single PR; no
   data or config outside the repository changes.
