## Why

The app is a single Expo project with every screen under `src/app/`. The roadmap adds
several Backstage features (home, catalog, search, notifications, APIs, TechDocs) that
should evolve independently, so the codebase needs a plugin boundary now, before those
features land and entangle each other.

## What Changes

- **BREAKING (layout)**: Convert the repository into an npm-workspaces monorepo. The Expo
  app moves from the repository root to `packages/app/` (source in `packages/app/src/`).
  Root-level `app.json`, `tsconfig.json`, Jest config, and Expo scripts move with it; the
  root `package.json` becomes the workspace root that delegates scripts to the app.
- Add a shared `packages/core/` package (`@backstage-app/core`) that defines the plugin
  contract (`createPlugin`, route and navigation item types) and hosts the shared UI
  primitives and theme tokens that plugins render with (moved out of the app).
- Add four demo plugins under `plugins/*/` (`@backstage-app/plugin-home`,
  `plugin-catalog`, `plugin-search`, `plugin-notifications`). Each exports one plugin
  definition with a main page that shows static placeholder content. Later iterations
  replace the static content with real Backstage data.
- Replace the template tab navigation with a drawer. The app registers the installed
  plugins in one list; the drawer lists every plugin navigation item and each item opens
  the plugin's main page. The Expo UI showcase screen stays reachable from the drawer as
  an app-level entry.
- Remove the template "Explore" screen and its unused demo assets.
- Update CI so every job runs Expo commands inside `packages/app/` and native build
  outputs resolve under that directory. Typecheck, lint, and tests cover all workspaces.
- Update the README and the OpenSpec project context for the new layout.

## Capabilities

### New Capabilities
- `plugin-system`: the plugin contract (`createPlugin`, routes, navigation items), the
  workspace layout (`packages/app`, `packages/core`, `plugins/*`), and how the app
  registers plugins.
- `app-navigation`: the drawer navigation that lists plugin navigation items and routes
  to plugin main pages, including the app-level Expo UI entry.
- `demo-plugins`: the four placeholder plugins (home, catalog, search, notifications)
  and the static content each main page shows.

### Modified Capabilities
<!-- No existing specs yet; openspec/specs/ is empty. -->

## Impact

- **Files moved**: everything under `src/`, `assets/`, `app.json`, `tsconfig.json`,
  `jest/`, and `scripts/` moves into `packages/app/`. Shared UI (`themed-text`,
  `themed-view`, `hint-row`, `collapsible`, `external-link`, theme tokens, color scheme
  hooks) moves into `packages/core/src/`.
- **Dependencies**: no new runtime dependencies. Expo Router 57 ships its Drawer layout
  with a vendored React Navigation, so `expo-router/drawer` needs no extra package.
  Workspace packages are consumed as TypeScript source through their `main` entry.
- **Tooling**: root `package.json` gains `workspaces`; `tsconfig.json` at the root
  typechecks all workspaces; ESLint config stays at the root; Jest runs from the app
  workspace with roots covering `packages/` and `plugins/`.
- **CI**: `.github/workflows/ci.yml` gets `working-directory: packages/app` for Expo,
  Gradle, and Xcode steps and updated artifact paths.
- **Docs**: README project layout and scripts; `openspec/config.yaml` context.
