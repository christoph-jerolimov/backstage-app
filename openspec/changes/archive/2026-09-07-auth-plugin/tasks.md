## 1. Core: instances and auth helpers

- [x] 1.1 Add `packages/core/src/backstage/instances.ts` (types, `KeyValueStorage`, `createInstanceStore`, `createMemoryStorage`) and platform adapters `storage.ts` / `storage.web.ts` (AsyncStorage + SecureStore on native, localStorage on web); verify unit tests with memory storage cover add/update/remove, active re-pick on removal, set/clear session, persistence round-trip via `load()`
- [x] 1.2 Add `packages/core/src/backstage/auth.ts` (`decodeIdentityToken`, `isSessionExpired`, `sessionFromAuthResponse`, `buildAuthStartUrl`, `refreshSession`); verify unit tests cover a valid token, a non-JWT, expiry, the auth response shape, the start URL with and without origin, and the guest refresh request (method, header, credentials)
- [x] 1.3 Rewrite `provider.tsx` per design D2 (`store` and `value` props, env seeding, `useSyncExternalStore`, derived `Backstage` with instance/session/identity/signedIn/loaded, `useBackstageInstances`), update `index.ts` exports and dependents (`createBackstage` callers); verify provider tests cover env seeding into an empty store, explicit value, switching the active instance changing `baseUrl`, and an expired session yielding no token
- [x] 1.4 Add `react-native-webview`, `expo-secure-store`, and `@react-native-async-storage/async-storage` to `packages/app` (via `npx expo install` versions) and as peer deps of core/auth; add Jest mocks in `packages/app/jest/setup.js`; verify `npm install` links them and `npm test -- --ci` still passes

## 2. Auth plugin

- [x] 2.1 Create `plugins/auth` (`@backstage-app/plugin-auth`) with `sign-in-flow.tsx` (native WebView modal per D4) and `sign-in-flow.web.tsx` (popup per D5), both exposing `SignInFlow({ instance, onSession, onCancel })`; verify a render test with the WebView mock simulates a `backstage-session` message and asserts `onSession` receives the parsed session, and a cancel test asserts `onCancel`
- [x] 2.2 Add `add-instance-form.tsx` (name, base URL, provider chips + custom) and `token-form.tsx` (paste token); verify render tests cover URL validation error, successful add with normalized URL, and the invalid-token message
- [x] 2.3 Add `account-page.tsx` (`AccountPage` with props for state + actions + fetch) and `account-screen.tsx` (wires `useBackstageInstances`, `useBackstage`, and the platform sign-in flow), `plugin.ts` (route `account`, nav item "Account", icon person), `index.ts`; verify render tests cover: active card states (not signed in, signed in with refs, expired), set active, remove (active re-pick), sign out, guest sign-in through an injected fetch, and pasted token storing a session
- [x] 2.4 Register `authPlugin` after techdocs in `packages/app/src/plugins.ts`, add `packages/app/src/app/account.tsx`, app dependency, registry test expectation, README (instances, providers, web origin allowance, env seeding); verify the registry test passes and the README mentions `experimentalExtraAllowedOrigins`

## 3. Verification

- [x] 3.1 Run `npm run typecheck`, `npm run lint -- --max-warnings=0`, `npm test -- --ci`; verify all pass
- [x] 3.2 Run `cd packages/app && npx expo export --platform web`; verify `/account` is emitted, and run `npx expo prebuild --platform android --no-install` to verify the new native modules configure cleanly
