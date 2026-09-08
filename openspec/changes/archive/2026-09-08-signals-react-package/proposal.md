## Why

The app only learns about new notifications when the user pulls to refresh or reopens the
page. Backstage already pushes these events over its signals WebSocket, so the badge on the
home widget and the notifications list can go stale for as long as the app is open — which,
on a phone left open on a dashboard, is indefinitely.

## What Changes

- Add **`packages/signals-react`** as `@backstage-app/signals-react`: a signals client for
  React Native plus a `useSignal(channel)` hook, mirroring the API shape of upstream's
  `@backstage/plugin-signals-react` so the concepts transfer.
- **Subscribe the notifications plugin to `notifications` for as long as the app is open**,
  so the unread count and the list refresh when the backend pushes a signal, with no polling.
- Connect lazily and disconnect when the last subscriber goes away, so an app with nothing
  listening holds no socket.

## Why the upstream package cannot be reused

Unlike `@backstage/errors`, `types` and `catalog-model`, `@backstage/plugin-signals-react`
is not usable here: it depends on `@material-ui/core` and `@backstage/core-plugin-api`, both
web-only. Its **wire protocol** is what transfers, and this package reimplements the client
against exactly that protocol, keeping upstream's `subscribe(channel, onMessage)` →
`{ unsubscribe }` and `useSignal(channel)` → `{ lastSignal, isSignalsAvailable }` surface.

## Non-goals

- **Not** subscribing anything other than notifications. Other plugins can subscribe later;
  the requirement is that notifications stay live while the app is open.
- **Not** background delivery. This is a foreground WebSocket, not push notifications; when
  the OS suspends the app the socket drops and reconnects on resume.
- **Not** replacing the existing fetches. Signals invalidate and trigger a reload; the REST
  API remains the source of truth, so a missed signal degrades to today's behaviour.
- **Not** a demo-mode implementation. With no backend there is nothing to connect to, and
  `isSignalsAvailable` reports false.

## Capabilities

### New Capabilities

- `signals`: how the app subscribes to Backstage signals while it is open — connection,
  authentication, channel subscription, reconnection, and teardown.

### Modified Capabilities

- `notifications-plugin`: the unread count and the list update when a signal arrives, rather
  than only on manual refresh.

## Impact

- **New** `packages/signals-react/` — the client, a provider, the `useSignal` hook, tests and
  a `knip-report.md`.
- **`plugins/notifications`**: subscribes to the `notifications` channel and reloads on a
  signal.
- **`packages/app`**: mounts the signals provider alongside the existing providers.
- No new third-party dependencies — React Native ships a `WebSocket` implementation.
