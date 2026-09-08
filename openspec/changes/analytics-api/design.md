## Context

See proposal.md — Why, and specs/analytics-api/spec.md for the behaviour contract. What
shapes the approach:

- `@backstage-app/errors` and `@backstage-app/types` set the source-only package pattern
  this one follows: `private`, `main`/`types` → `src/index.ts`, no build step, covered by
  the app tsconfig's `../*/src/**` include glob.
- Those two packages re-export upstream verbatim. This one cannot: `@backstage/core-plugin-api`
  peer-depends on `react-dom` `^17 || ^18` and `react-router-dom` `^6.30`, and pins
  `react` to `^17 || ^18`. The app is React 19.2.3 on React Native 0.86 with no DOM and no
  react-router. Its dependency `@backstage/frontend-plugin-api` pulls in `zod` and
  `history` on top.
- The app already owns everything the delivery path needs: `useBackstage()` exposes an
  authenticated `fetchJson` bound to the active instance, and the plugin registry
  (`usePluginRegistry()`) knows which plugin declares which route.
- Expo Router SDK 57 (`expo-router@57.0.19`, read from the installed package, not from
  memory) offers three relevant reads of route state: `usePathname()` returns the
  normalized path with the query string already stripped, `useSegments()` returns the
  *un-normalized* file segments (`['entity','[kind]','[namespace]','[name]']`), and
  `useGlobalSearchParams()` returns the params. It also ships an
  `unstable_navigationEvents` emitter — see D5.
- React Native's `AppState` is the only signal available for "the app is going away", and
  on iOS it is the last callback before suspension.

## Goals / Non-Goals

**Goals:**

- An event shape a Backstage analytics implementation would accept unchanged, so events
  the app produces are not a private dialect.
- One wiring point. Adding the provider and the reporter to the root layout instruments
  every current and future plugin page with no plugin-side change.
- Delivery that is invisible when it works and invisible when it fails.
- Privacy that comes from the data flow, not from a promise: the code path that would
  carry a query string must not exist.

**Non-Goals:**

- Multiplexing to several analytics implementations at once (upstream's
  `MultipleAnalyticsApi`). One destination, added when a second one exists.
- A generic offline queue. See D4.
- Instrumenting anything but navigation. The tracker exists so plugins *can*; none is
  changed here.

## Decisions

### D1. Declare the contract; do not re-export `@backstage/core-plugin-api`

`src/types.ts` declares `AnalyticsEvent`, `AnalyticsEventAttributes`,
`CommonAnalyticsContext`, `AnalyticsContextValue`, `AnalyticsTracker` and `AnalyticsApi`
field-for-field as upstream declares them, with the doc comments that explain what belongs
in `action` versus `subject` versus `attributes` — the part that is easy to get wrong and
expensive to correct once events are being collected.

*Alternative — depend on `@backstage/core-plugin-api` and re-export, as the errors and
types packages do:* rejected on facts, not taste. Its peer dependencies (`react-dom`,
`react-router-dom`) do not exist in this app and its `react` peer excludes React 19. The
errors and types packages are re-exported precisely because they are dependency-free and
runtime-agnostic; this one is neither.

*Alternative — invent a simpler, app-shaped event:* rejected. The upstream shape is the
reason a Backstage analytics module can consume these events at all, and the six types
erase at compile time, so matching it costs nothing at runtime.

The trade-off is that upstream could add a field without this file noticing. That is
acceptable: the types are additive by nature, and a stale field is a missing feature
rather than a wrong one.

### D2. The analytics context is a React context holding a frozen merged object

`AnalyticsContext({ attributes, children })` merges its `attributes` over the value it
inherits and provides the result. Merging at *provide* time rather than walking a chain at
*capture* time means `useAnalytics()` reads one object, and "innermost wins" falls out of
ordinary object spread instead of needing its own rule. `useAnalytics()` returns a tracker
memoized on `[api, context]`, so passing it to a `useCallback` dependency array is stable.

The default value — used when no `AnalyticsContext` encloses the component — is
`{ pluginId: 'app', routeRef: 'unknown', extension: 'App' }`. Those three are non-optional
in `CommonAnalyticsContext`, so the default has to name *something*; these are upstream's
own defaults for the same situation, which keeps events from an un-contexted component
distinguishable rather than malformed.

### D3. `AnalyticsApi` implementations are factory functions, not classes

`createRestAnalyticsApi(options)` and `createNoopAnalyticsApi()` match how every other API
in this repo is built (`createRestTechDocsApi`, `createDemoCatalogApi`, …). The REST one
takes `path`, `batchSize`, `flushIntervalMs` and an injectable `AppState` so the batching
rules in the spec are testable with fake timers and without a device.

It takes the connection's **`fetchText`, not `fetchJson`** — a deviation from what every
other API in the repo uses, found while implementing. `fetchJson` calls `response.json()`
unconditionally, so an analytics endpoint answering 202 or 204 with an empty body (the
normal case for a fire-and-forget ingest) would reject while parsing, and D4 would turn
every *successful* flush into a console warning. `fetchText` reads the body as text and
discards it while still raising `BackstageApiError` for a non-2xx status, which is the only
part of the response this cares about. The repo's other write calls (`refreshEntity`,
`cancelTask`) have the same latent issue against a 204; fixing those is not this change's
business, but repeating the bug here would have been.

Provider selection lives in `AnalyticsProvider`: it reads `useBackstage()` and picks the
no-op implementation when `demo` is true or `EXPO_PUBLIC_BACKSTAGE_ANALYTICS` is `false`,
and the REST one otherwise, memoized on the connection. This is the same shape as
`useTechDocsApi()` and `useCatalogApi()` — a plugin author already knows how to read it.

### D4. A failed batch is dropped, deliberately

`captureEvent` is synchronous and returns `void` (upstream's signature), so there is
nowhere to surface a rejection even if we wanted to. The queue is flushed into a detached
promise whose rejection is caught and logged with `console.warn`.

*Alternative — retry with backoff, or persist to storage and resend:* rejected for this
change. A retry queue that outlives a process needs an eviction policy, a size cap,
migration of stored events across releases, and a story for events captured while signed
out — all of which is more machinery than the first analytics event in the app has earned.
Losing a batch loses a datapoint; keeping one incorrectly costs storage and trust. Noted
as a non-goal in the proposal so the omission is a decision rather than an oversight.

### D5. Navigation is read from `usePathname()` + `useSegments()`, not from `unstable_navigationEvents`

Expo Router 57 exports `unstable_navigationEvents`, which emits `pageFocused` /
`pageBlurred` / `pagePreloaded` / `pageRemoved` with `pathname`, `params`, `segments` and
`screenId`. It is richer — `pageBlurred` would give time-on-page for free — but it is
rejected here for two concrete reasons read from the installed source
(`expo-router/build/useScreens.js`):

1. The listeners are only rendered when `unstable_navigationEvents.isEnabled()` is true
   **at the moment each screen renders**, and `isEnabled()` is read during render with no
   subscription. Enabling it therefore has to happen at module-load time, before the
   router mounts, and enabling it late silently yields no events at all — a failure mode
   with no symptom.
2. It is explicitly unstable. Wiring the app's only instrumentation to it means a future
   Expo upgrade can turn analytics off without failing a build.

`usePathname()` and `useSegments()` are stable, are already used elsewhere in the app's
dependency set, and both read the same route info the emitter does. A `useEffect` keyed on
the pathname captures one event per distinct route, which is exactly the spec's
"repeated navigation to the same route produces no second event" — the de-duplication is
the effect's dependency array, not code.

Revisiting this once the API stabilizes is a cheap change: the reporter is one component.

### D6. Privacy is structural — the query string is never read

The reporter component reads `usePathname()` and `useSegments()` and nothing else. It does
**not** call `useGlobalSearchParams()`. There is consequently no code path along which a
search term or a docs path could reach an event, which is a stronger guarantee than
filtering params on the way out, and it survives someone later adding an attribute without
thinking about it. The spec's two scenarios (`/search?query=…`, `/docs/…?path=…`) are
written as tests against this.

`routeRef` uses the un-normalized segments joined with `/` — `entity/[kind]/[namespace]/[name]` —
which is both the plugin's declared route name (making D7's lookup a plain map hit) and
inherently free of user data.

### D7. `pluginId` comes from the existing plugin registry

The reporter resolves the owning plugin by matching the joined segments against
`registry.routes()`, whose `name` is that same pattern (`plugin.ts` in every plugin
declares e.g. `'docs/[kind]/[namespace]/[name]'`). No plugin declares anything new, and a
route no plugin owns — the app-level `components` screen — reports `pluginId: 'app'`, the
same unknown-marker as D2's default.

*Alternative — add an `analyticsId` to the plugin contract:* rejected. It would be a
`@backstage-app/core` change for information the registry already holds exactly.

### D8. Where the wiring goes in `_layout.tsx`

`AnalyticsProvider` goes inside `BackstageProvider` (it reads the connection) and inside
`PluginRegistryProvider`; the `<NavigationAnalytics />` reporter renders inside
`NavigationChrome`, because `usePathname()` needs the router's store context, which the
root layout's children have. The reporter renders `null`, so it adds a component to the
tree and nothing to the screen.

## Risks / Trade-offs

- **The default endpoint may not exist on a given Backstage backend** → Backstage core has
  no standardized analytics HTTP endpoint; a deployment serves one through an analytics
  backend module or the proxy plugin. Mitigated by making the path configurable
  (`EXPO_PUBLIC_BACKSTAGE_ANALYTICS_PATH`, default `/api/analytics/v1/events`) and by D4:
  against a backend with no such route, every batch 404s, is logged once per flush, and
  the app is otherwise unaffected. The failure is loud in the console and silent in the UI,
  which is the right way round.
- **Analytics are on by default once an instance is configured** → A user who configures a
  backend has connected to their own organization's Backstage, which is where the events
  go; nothing is sent to a third party, and D6 bounds what is sent to a route pattern.
  `EXPO_PUBLIC_BACKSTAGE_ANALYTICS=false` is the escape hatch, and a settings toggle is
  named as follow-up work rather than left implicit.
- **A flush timer that outlives the provider leaks** → The REST API exposes a disposer the
  provider calls on unmount, clearing the timer and removing the `AppState` subscription;
  a test asserts no send happens after disposal.
- **`AppState` behaves differently on web** → On web `AppState` reports `active` and
  transitions are unreliable, so the interval flush is what actually delivers there. The
  background flush is an addition for native, not the only path, so the web case degrades
  to "flush on interval" rather than "never flush".
- **Events captured before the session loads are attributed to demo mode** → The provider
  re-derives the implementation when the connection changes, so the first navigation on a
  cold start may be dropped while instances are still loading. Losing the very first event
  of a session is acceptable; queueing across a provider swap would mean holding events
  captured under one instance and sending them to another, which is worse.
