# Backstage App

A universal [Expo](https://expo.dev) app written in TypeScript. It uses
[Expo Router](https://docs.expo.dev/router/introduction) for file-based
navigation and [`@expo/ui`](https://docs.expo.dev/versions/v57.0.0/sdk/ui/)
for native SwiftUI (iOS) and Jetpack Compose (Android) components.

Planning happens with [OpenSpec](https://github.com/Fission-AI/OpenSpec):
specs live in `openspec/`, and the `/opsx:*` slash commands drive the
spec-driven workflow from Claude Code.

## Get started

1. Install dependencies

   ```bash
   npm install
   ```

2. Start the app

   ```bash
   npx expo start
   ```

In the output, you'll find options to open the app in a

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

> `@expo/ui` ships native code, so the **Expo UI** tab needs a
> [development build](https://docs.expo.dev/develop/development-builds/introduction/)
> on iOS and Android. On web the components fall back to plain React Native views.

## Connecting to Backstage

Open **Account** in the drawer to add one or more Backstage instances (name, base URL,
auth provider). Exactly one instance is active; every plugin loads its data from the
active instance, and switching instances reloads everything. Instances and the active
selection are stored on the device; session tokens go to the platform secure store on
iOS and Android.

Sign-in options per instance:

- **Sign in** opens Backstage's auth flow for the instance's provider (`github`,
  `google`, `microsoft`, `okta`, `oidc`, or any custom provider id). On iOS and Android
  this runs in an in-app browser and captures the session through Backstage's refresh
  endpoint; on web it uses a popup, which requires the app's origin to be allowed by the
  backend (`app.baseUrl` or `auth.experimentalExtraAllowedOrigins` in `app-config.yaml`).
- **Guest** provider instances sign in directly against `/api/auth/guest/refresh`.
- **Use a token** stores a pasted Backstage identity token (a JWT); its user and expiry
  are read from the token.

Sessions expire with the token (about an hour); the Account page then shows "Session
expired" and one tap signs in again.

On a fresh install with no instances, the public environment variables seed a first
instance named "Default" (see `.env.example`):

| Variable | Purpose |
| --- | --- |
| `EXPO_PUBLIC_BACKSTAGE_URL` | Base URL of the seeded instance, for example `https://backstage.example.com` |
| `EXPO_PUBLIC_BACKSTAGE_TOKEN` | Optional token stored as that instance's session |

The Notifications API is scoped to the signed-in user, so it needs a real user session
(browser sign-in or a pasted user token); a static service token is rejected there with
401/403. Catalog and search work with either kind of token.

Without any instance the app runs in **demo mode**: plugins show built-in sample data and
a banner explains how to connect.

## Project layout

The repository is an npm-workspaces monorepo:

- `packages/app/` — the Expo app (`@backstage-app/app`). `src/app/` holds the Expo Router
  routes; `_layout.tsx` renders the drawer, and each plugin route is a one-line re-export.
- `packages/core/` — `@backstage-app/core`: the plugin contract (`createPlugin`,
  `createPluginRegistry`), shared UI primitives (`Page`, `ListCard`, `ThemedText`, …), the
  theme tokens, and the color-scheme hooks.
- `plugins/*/` — one package per plugin (`@backstage-app/plugin-home`, `-catalog`,
  `-search`, `-notifications`, `-apis`, `-techdocs`, `-auth`, `-settings`). Each exports a plugin definition and
  its page components. `plugin-apis` and `plugin-techdocs` compose the catalog listing
  (fixed to API entities, and to entities with the TechDocs annotation); `plugin-techdocs`
  also renders the built TechDocs HTML of an entity in a web view (iframe on web).
- `openspec/` — OpenSpec specs and change proposals

### Adding a plugin

1. Create `plugins/<name>/` with a `package.json` (`"main": "src/index.ts"`) that depends
   on `@backstage-app/core`.
2. Export a plugin from `src/index.ts`:

   ```ts
   export const myPlugin = createPlugin({
     id: 'my-plugin',
     name: 'My Plugin',
     routes: [{ name: 'my-plugin', component: MyPage }],
     navItems: [{ title: 'My Plugin', route: 'my-plugin', icon: { ios: 'star', android: 'star', web: 'star' } }],
   });
   ```

3. Add the dependency to `packages/app/package.json`, register the plugin in
   `packages/app/src/plugins.ts`, and mount its route with
   `packages/app/src/app/my-plugin.tsx` containing
   `export { MyPage as default } from '@backstage-app/plugin-my-plugin';`.
4. Run `npm install` at the root to link the workspace.

Pages that should not appear in the drawer (detail pages, for example) are declared as
hidden routes: `{ name: 'entity/[kind]/[namespace]/[name]', component: EntityScreen,
title: 'Entity', hidden: true, backRoute: 'catalog' }`. The app mounts them with a header
back button, and the route file lives at the matching nested path under `src/app/`.

## Scripts

| Command | What it does |
| --- | --- |
| `npm start` | Start the Metro dev server |
| `npm run web` | Start and open in the browser |
| `npm run ios` / `npm run android` | Build a development build and open it on a simulator or device |
| `npm run lint` | Run ESLint via `expo lint` |
| `npm run typecheck` | Typecheck with `tsc` |
| `npm test` | Run the Jest test suite (`jest-expo` preset) |

All scripts run from the repository root and cover every workspace.

## Continuous integration

The [CI workflow](.github/workflows/ci.yml) runs on every pull request and on
pushes to `main`:

1. **Check** — typecheck, lint, tests, and a static web export (uploaded as an artifact).
2. **Android** — `expo prebuild` plus a Gradle debug build (APK uploaded as an artifact).
3. **iOS** — `expo prebuild` plus an Xcode build for the iOS Simulator (currently
   disabled with `if: false` in the workflow to save macOS runner time).

## Learn more

- [Expo documentation](https://docs.expo.dev/)
- [Expo UI reference](https://docs.expo.dev/versions/v57.0.0/sdk/ui/)
- [Expo Router](https://docs.expo.dev/router/introduction)
- [OpenSpec](https://github.com/Fission-AI/OpenSpec)
