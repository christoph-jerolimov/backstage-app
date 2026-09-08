## 1. Package scaffold and contract

- [x] 1.1 Create `packages/analytics-api/package.json` as `@backstage-app/analytics-api` matching the `@backstage-app/errors` shape (`private: true`, `version: 1.0.0`, `main`/`types` → `src/index.ts`), with `@backstage-app/core` in `dependencies` and `expo-router`, `react`, `react-native` as `peerDependencies`; verify `npm install` links it and `npm query .workspace` lists 15 workspaces
- [x] 1.2 Create `src/types.ts` declaring `AnalyticsEvent`, `AnalyticsEventAttributes`, `CommonAnalyticsContext`, `AnalyticsContextValue`, `AnalyticsTracker` and `AnalyticsApi` field-for-field as `@backstage/core-plugin-api` declares them, per design D1, with a comment naming why upstream is declared rather than re-exported; verify `npm run typecheck` passes with no tsconfig edit

## 2. Delivery implementations

- [x] 2.1 Implement `createNoopAnalyticsApi()` in `src/noop-api.ts` — accepts events and discards them; verify a test captures an event through it without throwing and without any fetch
- [x] 2.2 Implement `createRestAnalyticsApi()` in `src/rest-api.ts` per design D3: queue events, POST `{ events }` to the configured path via the injected `fetchText` (not `fetchJson`, which rejects on the empty 202/204 body an ingest endpoint normally returns — see design D3), and expose a disposer; verify with fake timers that a batch is sent when it reaches `batchSize`, when `flushIntervalMs` elapses since the oldest queued event, and never one request per event
- [x] 2.3 Flush on backgrounding: subscribe to `AppState` and send the queue when the state leaves `active`, unsubscribing in the disposer; verify a test that emits an `AppState` change flushes immediately, and that no send occurs after the disposer runs
- [x] 2.4 Make delivery failures invisible per design D4 and the spec's "Analytics never disrupt the app": catch the rejection, `console.warn` once, drop the batch; verify tests where the request rejects with a network error and where it rejects with a 500 leave `captureEvent` returning normally and enqueue no retry

## 3. React layer

- [x] 3.1 Implement `AnalyticsContext` and `useAnalytics()` in `src/analytics-context.tsx` per design D2 — merge attributes over the inherited value at provide time, memoize the tracker on `[api, context]`, default to `{ pluginId: 'app', routeRef: 'unknown', extension: 'App' }`; verify tests cover the spec's four capture scenarios (enclosing context attached, nested contexts combine, inner overrides outer, no enclosing context)
- [x] 3.2 Implement `AnalyticsProvider` in `src/analytics-provider.tsx` selecting the implementation from `useBackstage()` per design D3 — no-op in demo mode or when `EXPO_PUBLIC_BACKSTAGE_ANALYTICS` is `false`, REST otherwise, path from `EXPO_PUBLIC_BACKSTAGE_ANALYTICS_PATH` defaulting to `/api/analytics/v1/events` — and dispose the previous api when the connection changes; verify tests assert no request in demo mode, no request when disabled, and a request against a configured instance
- [x] 3.3 Add `readAnalyticsConfigFromEnv()` alongside the provider mirroring `readBackstageConfigFromEnv()`'s full-name env reads; verify unit tests for the enabled/disabled and default/custom path cases

## 4. Automatic navigation capture

- [x] 4.1 Implement `NavigationAnalytics` in `src/navigation-analytics.tsx` per design D5/D6/D7: read `usePathname()` and `useSegments()` only, resolve `pluginId` from `usePluginRegistry().routes()` by joined segments, capture `navigate` in an effect keyed on the pathname, render `null`; verify tests cover the spec's four navigation scenarios including that returning to the same route captures nothing further
- [x] 4.2 Add tests proving the privacy requirement per design D6 — a `/search?query=…` route and a `/docs/…?path=…` route produce events whose subject is the bare pathname and whose serialized event contains neither the query string nor its values; verify the component never calls `useGlobalSearchParams`
- [x] 4.3 Create `src/index.ts` exporting the contract types, both api factories, `AnalyticsProvider`, `AnalyticsContext`, `useAnalytics`, `NavigationAnalytics` and the env reader, following the export style of `packages/core/src/index.ts`; verify `npm run typecheck` passes

## 5. App wiring

- [x] 5.1 Add `@backstage-app/analytics-api` to `packages/app/package.json` dependencies and mount `AnalyticsProvider` inside `BackstageProvider` in `src/app/_layout.tsx` per design D8; verify `npm run typecheck` passes and the app still renders in the existing app tests
- [x] 5.2 Render `<NavigationAnalytics />` inside `NavigationChrome` so it sits within the router's store context per design D8; verify a test mounts the reporter against the app's real plugin registry and asserts a `navigate` event for the initial route attributed to the owning plugin (the root layout itself is not rendered: it pulls in the drawer, splash screen and gesture handler, and the repo has no root-layout render test to build on)
- [x] 5.3 Document `EXPO_PUBLIC_BACKSTAGE_ANALYTICS` and `EXPO_PUBLIC_BACKSTAGE_ANALYTICS_PATH` in `.env.example` with the defaults and what each turns off; verify the file states that analytics are on once a backend is configured

## 6. Reports and verification

- [x] 6.1 Run `npm run knip-reports` and commit `packages/analytics-api/knip-report.md`; verify it reports no unlisted dependencies and `npm run knip-reports:check` exits zero
- [x] 6.2 Run `npm run typecheck`, `npm run lint -- --max-warnings=0`, and `npm test -- --ci`; verify all pass and the new suites are picked up by jest's existing `roots`
- [x] 6.3 Run `cd packages/app && npx expo export --platform web`; verify the export still succeeds with the provider and reporter mounted
