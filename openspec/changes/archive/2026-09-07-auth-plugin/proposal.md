## Why

Every user-scoped Backstage API (notifications, starred entities, permissions) needs a
real user session, and a phone is typically used against more than one portal
(production, staging, a lab). Today the app only knows a single build-time URL and
token. This change gives the app sign-in and multi-instance support, which every later
feature (entity pages, TechDocs, Kubernetes, Scaffolder) builds on.

## What Changes

- **BREAKING (config semantics)**: the connection is no longer a build-time constant.
  Core gains an instance store: a list of Backstage instances (name, base URL, auth
  provider), a per-instance session (identity token and identity), and one active
  instance. `EXPO_PUBLIC_BACKSTAGE_URL` / `_TOKEN` now only seed the first instance on a
  fresh install. With no active instance the app stays in demo mode as before.
- Persistence: instances and the active selection in app storage, sessions (tokens) in
  the platform secure store on iOS/Android and local storage on web.
- `BackstageProvider` / `useBackstage()` read the active instance and session; switching
  the active instance swaps the client and every plugin refetches. New
  `useBackstageInstances()` exposes the list and actions.
- New `plugins/auth` (`@backstage-app/plugin-auth`) with an "Account" navigation entry:
  active-instance card with the signed-in identity, instance list with set-active,
  sign-in, sign-out, and remove, and an add-instance form.
- Sign-in flows: (1) browser flow against the Backstage auth backend — an in-app browser
  on iOS/Android that loads the provider's start endpoint and captures the session by
  calling the provider's refresh endpoint from inside the browser; a popup on web that
  receives Backstage's `authorization_response` message; (2) guest provider sign-in with
  a direct refresh call; (3) paste-a-token fallback for static or copied tokens.
- Sessions carry the token's expiry; an expired session counts as signed out.
- README documents instances, providers, and the web-origin allowance Backstage needs.

## Capabilities

### New Capabilities
- `auth-plugin`: instances management UI, sign-in flows, identity display, sign-out.

### Modified Capabilities
- `backstage-connection`: configuration comes from the instance store (env seeds it);
  the provider exposes instance, session, and identity; requests use the active
  session's token.
- `app-navigation`: drawer contents scenario gains Account.
- `demo-plugins`: bundled plugins list gains auth.

## Impact

- `packages/core/src/backstage/`: new `instances.ts` (store + storage adapters),
  `auth.ts` (token decode, auth response parsing, start URL), provider rewrite.
- New `plugins/auth/` with `account-page.tsx`, `sign-in-flow.tsx` (native WebView) and
  `sign-in-flow.web.tsx` (popup), `add-instance-form.tsx`, `plugin.ts`, tests.
- New dependencies (all Expo SDK 57 bundled): `react-native-webview`,
  `expo-secure-store`, `@react-native-async-storage/async-storage`.
- Jest setup gains mocks for secure store, async storage, and WebView.
- `packages/app`: registration, `account` route, dependencies.
