## Context

See proposal.md. Today `BackstageProvider` builds one client from env vars
(`readBackstageConfigFromEnv`) and exposes `{ baseUrl, token, demo, fetchJson }`; every
plugin API is memoized on `[demo, fetchJson]`, so swapping the client swaps the data.

Backstage auth backend contract (as implemented in `@backstage/plugin-auth-backend`):
- `GET /api/auth/<provider>/start?env=production[&origin=<appOrigin>]` begins the
  provider's login; after the callback, `GET /api/auth/<provider>/handler/frame` renders a
  page that `postMessage`s `{ type: 'authorization_response', response: { profile,
  providerInfo, backstageIdentity: { token, identity: { type: 'user', userEntityRef,
  ownershipEntityRefs } } } }` to `window.opener` and sets an HttpOnly refresh cookie
  scoped to the auth backend.
- `POST /api/auth/<provider>/refresh` with the cookie and header `X-Requested-With:
  XMLHttpRequest` returns the same response shape; `POST /api/auth/guest/refresh` needs
  no cookie.
- The identity token is a JWT whose `sub` is the user entity ref, `ent` the ownership
  refs, `exp` the expiry (about one hour).
- The backend only honors `origin` values allowed by `app.baseUrl` or
  `auth.experimentalExtraAllowedOrigins`; the popup flow on web needs the app's origin
  listed there. The native flow does not depend on origins.

The sandbox cannot reach backstage.io; the contract above comes from the auth backend's
source as shipped and from the web app's `OAuthRequestManager`.

## Goals / Non-Goals

**Goals:** real sessions on native and web with no backend changes; several instances
with independent sessions; deterministic tests through injectable storage and fetch.

**Non-Goals:** silent token refresh (a later change can run the refresh call in a hidden
WebView), SSO logout at the provider, per-instance theme, permission checks.

## Decisions

### D1. Instance store in core
`packages/core/src/backstage/instances.ts`:
```ts
type BackstageInstance = { id: string; name: string; baseUrl: string; provider: string };
type BackstageSession = { token: string; userEntityRef: string; ownershipEntityRefs: string[]; expiresAt?: number; provider: string };
type InstancesState = { instances: BackstageInstance[]; sessions: Record<string, BackstageSession>; activeId?: string; loaded: boolean };
createInstanceStore(storage: { instances: KeyValueStorage; sessions: KeyValueStorage }) → { getState, subscribe, load, addInstance, updateInstance, removeInstance, setActive, setSession, clearSession }
```
`KeyValueStorage = { getItem(key), setItem(key, value), removeItem(key) }` (async).
Instances and `activeId` live in `instances` storage (AsyncStorage on native,
`localStorage` on web); each session in `sessions` storage under `session:<id>`
(`expo-secure-store` on native, `localStorage` on web — the web has no secure store, and
the identity token is short-lived). Tests use an in-memory adapter. Removing an instance
removes its session and re-picks `activeId`.

### D2. Provider reads the store
`BackstageProvider` creates the store once (or takes `store`/`value` props for tests),
calls `load()` on mount, seeds from env when the loaded store is empty, and subscribes
with `useSyncExternalStore`. It derives `Backstage`: `{ instance, session, identity,
signedIn: session && !expired, baseUrl, token: signedIn ? session.token : undefined,
demo: !instance, fetchJson }` and memoizes the client on `[baseUrl, token]`.
`useBackstageInstances()` returns the state plus the actions. Until `loaded` the provider
renders children with `demo: true` — pages show demo data for a frame at most; a
`loaded` flag is exposed so the account page can show a spinner instead.

### D3. Auth helpers in core
`packages/core/src/backstage/auth.ts`: `decodeIdentityToken(jwt)` (base64url decode of
the payload, no signature check; returns `{ userEntityRef, ownershipEntityRefs,
expiresAt }` or throws `Not a valid token`), `sessionFromAuthResponse(json, provider)`,
`buildAuthStartUrl(baseUrl, provider, origin?)`, `refreshSession(fetch, baseUrl,
provider)` (guest and web-popup helper), `isSessionExpired(session, now)`.

### D4. Native browser flow: WebView + injected refresh
`plugins/auth/src/sign-in-flow.tsx` renders a full-screen `Modal` with
`react-native-webview` at the start URL. `injectedJavaScript` (run on every navigation)
fetches `<baseUrl>/api/auth/<provider>/refresh` with `credentials: 'include'` and the
`X-Requested-With` header; on a 200 with `backstageIdentity` it posts
`{ type: 'backstage-session', response }` through `window.ReactNativeWebView`. The
component parses it, calls `onSession(session)`, and closes. The user's existing cookies
in the WebView make repeat sign-ins instant. `sharedCookiesEnabled` is on so the
cookie survives app restarts on iOS.

*Alternative*: `expo-auth-session` / `openAuthSessionAsync`. Rejected: Backstage does
not redirect back to a custom scheme; the session is only obtainable from the frame's
`postMessage` (no opener on native) or the cookie-backed refresh endpoint, which the
WebView can call and the app's fetch cannot.

### D5. Web popup flow
`sign-in-flow.web.tsx` opens the start URL with `origin=window.location.origin` in a
popup, listens for `message` events whose data has `type === 'authorization_response'`
from the instance's origin, stores the session, and closes the popup; a closed popup
without a message resolves as cancelled. README documents
`auth.experimentalExtraAllowedOrigins`.

### D6. Account page
`AccountPage({ store })` (pure, takes the store's state + actions via props so tests can
drive it) and `AccountScreen` (reads `useBackstageInstances`). Sections: active instance
card (name, URL, identity or "Not signed in" / "Session expired", Sign in / Use a token /
Sign out), instance list (`ListCard`-like rows with Set active / Remove), add-instance
form (`TextInput` name + URL, provider chips: github, google, microsoft, okta, oidc,
guest, plus a free text field), paste-token sheet.

### D7. Jest
`packages/app/jest/setup.js` mocks `react-native-webview` (a `View` that records
props), `expo-secure-store` and `@react-native-async-storage/async-storage` with
in-memory maps, so tests never touch native modules.

## Risks / Trade-offs

- [Refresh-from-WebView depends on the cookie being set on the backend origin] → this
  is exactly how the Backstage web app's own refresh works; if a deployment splits
  frontend and backend origins, the cookie is on the backend origin, which is where the
  WebView calls it.
- [Token expiry after ~1 h with no silent refresh] → surfaced as "Session expired" and
  one tap to sign in again (cookies make it instant); silent refresh is a follow-up.
- [Secure store value size limit (2 KB on Android)] → identity tokens are ~1 KB; the
  session is stored as one JSON value per instance; a failure to store falls back to the
  instances storage with a console warning.
- [Web popups blocked] → the sign-in button is a direct user gesture, which browsers
  allow; the fallback "Use a token" always works.

## Migration Plan

Single PR. Existing checkouts with env vars keep working: the env seeds a "Default"
instance on first launch. Without env vars the app stays in demo mode.
