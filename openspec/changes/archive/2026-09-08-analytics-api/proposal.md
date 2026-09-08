## Why

The app has no way to say what people actually do with it. Every plugin added so far —
catalog, search, techdocs, kubernetes, scaffolder — ships blind: nobody can tell which
pages are opened, which are dead weight, or whether a feature is worth keeping. Backstage
already has a well-defined vocabulary for exactly this (`AnalyticsApi`, `AnalyticsEvent`,
the additive analytics context), and the app already has an authenticated client to a
Backstage backend. What is missing is the piece in between.

Navigation is the right first instrumentation: it is the one event every plugin produces
without any plugin having to opt in, so a single wiring in the root layout makes the whole
app measurable at once.

## What Changes

- Add **`packages/analytics-api`** as `@backstage-app/analytics-api`, matching the
  source-only package shape `@backstage-app/errors` and `@backstage-app/types`
  established (`private`, `main`/`types` → `src/index.ts`, no build step).
- **Declare the Backstage analytics contract** — `AnalyticsEvent`,
  `AnalyticsEventAttributes`, `AnalyticsContextValue`, `CommonAnalyticsContext`,
  `AnalyticsTracker`, `AnalyticsApi` — field-for-field as `@backstage/core-plugin-api`
  declares them. Unlike the errors and types packages, upstream is **not** re-exported
  here: `@backstage/core-plugin-api` peer-depends on `react-dom` and `react-router-dom`
  and pins React `^17 || ^18`, none of which hold in a React 19 React Native app.
- **Two implementations**: a REST one that batches events and POSTs them to the Backstage
  backend, and a no-op one for demo mode. The REST one never lets a delivery failure reach
  the caller, and flushes when the app is backgrounded so a batch is not lost on suspend.
- **A React layer**: a provider that picks the implementation from the active Backstage
  connection, the additive `AnalyticsContext` component from upstream, and `useAnalytics()`
  returning a tracker any plugin can call.
- **Automatic navigation capture in the app**: the root layout reports every route change
  as a `navigate` event whose subject is the pathname, tagged with the route pattern and
  the owning plugin id read from the plugin registry.
- **Privacy by construction**: only the normalized pathname is sent, never the query
  string, so free-text a user typed (a search term, a docs path) never leaves the device.
  Nothing is sent in demo mode, and `EXPO_PUBLIC_BACKSTAGE_ANALYTICS=false` turns delivery
  off entirely.
- Commit the package's `knip-report.md`, as every workspace now does.

## Non-goals

- **Not** instrumenting individual plugins. Clicks, searches and filters are follow-up
  work; this change delivers the API and the one event that needs no plugin changes.
- **Not** a settings-screen opt-out toggle. Delivery is controlled by the environment
  variable for now; a user-facing switch belongs with the settings plugin.
- **Not** third-party destinations (Segment, GA4, and friends). Events go to the Backstage
  backend, which is the app's only configured server and the one place a token already
  exists.
- **Not** offline persistence of undelivered events. A batch that fails is dropped.

## Capabilities

### New Capabilities

- `analytics-api`: the analytics event contract, how events reach the Backstage backend,
  the analytics context plugins capture events through, and the automatic navigation
  event.

### Modified Capabilities

None. `app-navigation` keeps every requirement it has: the drawer, headers and hidden
routes are untouched, and the new navigation event is specified by `analytics-api`.

## Impact

- **New** `packages/analytics-api/` — `package.json`, `src/`, `src/__tests__/`,
  `knip-report.md`.
- **`packages/app`**: `package.json` gains the workspace dependency;
  `src/app/_layout.tsx` mounts the analytics provider and the navigation reporter.
- **`.env.example`**: documents `EXPO_PUBLIC_BACKSTAGE_ANALYTICS` and
  `EXPO_PUBLIC_BACKSTAGE_ANALYTICS_PATH`.
- **No new third-party dependency.** The package uses only `react`, `react-native`
  (`AppState`), and `expo-router`, all already installed, plus `@backstage-app/core` for
  the connection and the plugin registry.
- **Network**: one batched POST per flush interval while the app is in use, and one on
  backgrounding. No requests at all in demo mode or when disabled.
