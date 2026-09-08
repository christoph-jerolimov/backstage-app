## 1. Package and client

- [x] 1.1 Create `packages/signals-react/package.json` as `@backstage-app/signals-react` depending on `@backstage-app/core` (for `useBackstage`) and `@backstage-app/types`, with react/react-native peers; verify `npm install` links it and 19 workspaces are listed
- [x] 1.2 Implement the signals client per design D1/D2: build the `ws(s)://…/api/signals` URL by rewriting the scheme as a string (not via `URL.protocol`), pass the session token as the WebSocket subprotocol, send `{action, channel}` frames, route `{channel, message}` to matching subscribers, and key subscriptions with a counter (not `crypto.randomUUID`); verify tests assert the exact frames sent
- [x] 1.3 Reference-count channels per design D2: send `subscribe` only for a channel's first subscriber and `unsubscribe` only when its last leaves, open the socket lazily on first subscription and close it when the last goes away, and flush frames queued before the socket opened; verify tests cover two subscribers on one channel, and that no socket is created until something subscribes
- [x] 1.4 Implement reconnect per design D3: reconnect on close codes other than 1000/1001 with bounded exponential backoff and re-subscribe every active channel, never surfacing an error; verify tests cover reconnect-and-resubscribe, and that a deliberate close does not reconnect
- [x] 1.5 Make the `WebSocket` implementation injectable per design D5, defaulting to the global; verify the whole suite runs against a fake socket with no real network

## 2. React surface

- [x] 2.1 Add a provider that owns one client for the app, wired to `useBackstage()` for base URL, token and signed-in state, tearing the connection down on sign-out or instance change per design D3; verify a test asserts the connection closes when signed-out
- [x] 2.2 Add `useSignal(channel)` returning `{ lastSignal, isSignalsAvailable }`, matching upstream's shape; verify it delivers messages for its own channel only, reports unavailable with no backend or signed out, and unsubscribes on unmount
- [x] 2.3 Write `packages/signals-react/src/index.ts` exporting the provider, the hook and the client types; verify `npm run typecheck` passes

## 3. Notifications go live

- [x] 3.1 Subscribe the notifications page to the `notifications` channel and reload the list on a signal, reloading from the first page with the current filters preserved per the `notifications-plugin` spec delta; verify a test asserts the list reloads on a signal and that filters survive
- [x] 3.2 Subscribe the home widget's unread count and reload it on a signal per the spec delta; verify a test asserts the count reloads
- [x] 3.3 Confirm signals are used only to trigger a reload, never as the data itself, per design D4; verify by asserting the reloaded values come from the API, not from the signal payload
- [x] 3.4 Mount the signals provider in `packages/app` alongside the existing providers; verify the app's tests pass and demo mode is unaffected

## 4. Verification

- [x] 4.1 Run `npm run knip-reports` and commit changed reports; verify `npm run knip-reports:check` exits zero
- [x] 4.2 Run `npm run typecheck`, `npm run lint -- --max-warnings=0`, and `npm test -- --ci`; verify all pass
- [x] 4.3 Run `cd packages/app && npx expo export --platform web`; verify the export succeeds
- [x] 4.4 Verify the two React Native pitfalls from design D1 are actually avoided: grep the package for `crypto.randomUUID`, `.protocol =` and `new URL(` and confirm they appear only in comments explaining what was avoided, never in executable code
