## Context

See proposal.md. Relevant current state:

- `@backstage-app/core` has the plugin contract, `Page`, `ListCard`, theme, and hooks; no
  networking or configuration yet.
- The catalog plugin is a static `ListCard`. Tests render with RNTL 14 (async `render`)
  under the root Jest config.
- Expo inlines `EXPO_PUBLIC_*` variables at build time (`@expo/env` is installed).
- The sandbox cannot reach backstage.io; the Catalog REST contract below is from the
  Backstage catalog backend as shipped in `@backstage/plugin-catalog-backend` (endpoints
  `GET /api/catalog/entities/by-query` with `filter`, `fullTextFilter[term]`, `limit`,
  `orderField`, `cursor` → `{ items, totalItems, pageInfo }`, and
  `GET /api/catalog/entity-facets?facet=…` → `{ facets: { [facet]: { value, count }[] } }`).
  Filter syntax: one `filter` param is an AND of `key=value` pairs joined by commas;
  repeated `filter` params are ORed.
- Hermes does not support `new Function`; `@backstage/catalog-model` pulls in `ajv` at
  runtime, so only its types are safe to use.

## Goals / Non-Goals

**Goals:**
- One connection layer every plugin reuses; catalog is its first consumer.
- Deterministic tests: fetch is injectable, demo API is pure and in-memory.
- Cross-platform filter UI with no native-only components.

**Non-Goals:**
- Entity detail pages, pagination beyond the first 50, or OAuth sign-in. Cursor
  pagination is left as a follow-up; the client already reads `pageInfo`.
- A settings screen for the base URL; environment variables suffice for now.

## Decisions

### D1. Configuration from `EXPO_PUBLIC_*` env vars, exposed through a provider
`packages/core/src/backstage/config.ts` exports `readBackstageConfigFromEnv()` (trims,
strips trailing slash, `demo = !baseUrl`). `BackstageProvider` takes an optional `value`
(tests, future settings screen) and otherwise reads the env once. `useBackstage()`
returns `{ baseUrl, token, demo, fetchJson }`.

*Alternative*: `app.json` `extra`. Rejected: env vars keep secrets out of committed
config and are the Expo-documented way to pass build-time values.

### D2. Minimal fetch client, injectable `fetch`
`createBackstageClient({ baseUrl, token, fetch = globalThis.fetch })` returns
`fetchJson<T>(path, init?)`. Non-2xx → `BackstageApiError { status, message }`, message
taken from `error.message` or `message` in the JSON body when present.

*Alternative*: `@backstage/catalog-client`. Rejected for now: it drags in
`cross-fetch`, `lodash`, `uri-template`, and `catalog-model` runtime code (ajv), which
is a Hermes risk and a bundle cost for two endpoints.

### D3. `useRemoteData(fetcher, key)` in core
State machine `{ status: 'loading' | 'success' | 'error', data?, error?, reload }`. The
inputs are described by a string `key` (for example `JSON.stringify(filters)`); the
request id is `key + reload tick`, and results whose id no longer matches are dropped.
Loading is derived from "settled id !== current id" rather than set in an effect, which
keeps the hook clean under the React Compiler lint rules. Consumers pass a `useCallback`
fetcher; a changed fetcher identity also re-runs the request.

### D4. Catalog API abstraction
```ts
interface CatalogApi {
  queryEntities(q: CatalogQuery): Promise<{ items: Entity[]; totalItems: number }>;
  getFacets(kind: string): Promise<CatalogFacets>; // { types, owners, lifecycles, tags }
}
```
`createRestCatalogApi(fetchJson)` builds the query string (`buildFilter(q)` →
`kind=component,spec.type=service`, `fullTextFilter[term]=…`, `limit=50`,
`orderField=metadata.name,asc`). `createDemoCatalogApi(entities = demoEntities)` applies
`matchesQuery(entity, q)` locally and derives facets by counting. `useCatalogApi()` picks
one from `useBackstage().demo`. `Entity` is `import type { Entity } from
'@backstage/catalog-model'`.

### D5. Filter state and UI
`CatalogFilters = { kind, type?, owner?, lifecycle?, tag?, text }`, default `{ kind:
'component', text: '' }`. Changing `kind` resets the four dependent fields. UI is a
vertical stack of labelled `FilterChips` rows (horizontal `ScrollView` of `Pressable`
chips, "All" chip first where applicable) and a `TextFilter` (`TextInput` with 300 ms
debounce). Options for type/owner/lifecycle/tag come from `getFacets(kind)`; kind options
are a fixed list of common kinds (Component, API, System, Domain, Resource, Group, User,
Location, Template).

*Alternative*: `@expo/ui` `Picker`. Rejected for the list filters: native pickers need a
development build and are not exercised by Jest, while chips render everywhere and are
plainly testable.

### D6. Page/screen split as in the home plugin
`CatalogPage` takes `api: CatalogApi` and `demo: boolean` props (pure data flow, testable
with the demo API or a stub); `CatalogScreen` reads the connection and passes them in.
`StateView` in core renders loading (ActivityIndicator), empty, and error (+ retry).

## Risks / Trade-offs

- [Facet endpoint shape differs across Backstage versions] → parse defensively (missing
  facet → empty list) and cover with a fixture test.
- [Debounced text + changing kind can interleave requests] → `useRemoteData` drops stale
  results by request id.
- [Bearer static tokens are long-lived] → documented as a development convenience; auth
  flows are a later feature.
- [`@backstage/catalog-model` runtime import by accident] → ESLint
  `@typescript-eslint/consistent-type-imports` is not configured; guard with a test that
  the plugin bundle does not reference `ajv` is overkill — instead the package is added
  as a devDependency of core so a runtime import fails to resolve in the app bundle.

## Migration Plan

Single PR. `.env.example` documents the variables; without them the app runs in demo mode
exactly like today, so nothing breaks for existing checkouts.
