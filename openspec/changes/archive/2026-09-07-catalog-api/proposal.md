## Why

The catalog page still shows three hard-coded entities. Connecting it to the Backstage
Catalog API turns the app into a real portal client, and the connection layer it needs
(base URL, token, HTTP client, remote-data hook) is the foundation every later plugin
(search, notifications, APIs, TechDocs) will reuse.

## What Changes

- Add a Backstage connection layer to `@backstage-app/core`: configuration from the
  public Expo environment variables `EXPO_PUBLIC_BACKSTAGE_URL` and
  `EXPO_PUBLIC_BACKSTAGE_TOKEN`, a `BackstageProvider`/`useBackstage()` context the app
  mounts once, a small authenticated JSON fetch client, and a `useRemoteData` hook with
  loading, success, and error states plus reload.
- Add shared filter UI to core: a horizontal chip row for single-select filters and a
  text filter input, plus loading, empty, and error state views.
- Rework the catalog plugin: a `CatalogApi` interface with a REST implementation
  (`/api/catalog/entities/by-query`, `/api/catalog/entity-facets`) and an in-memory demo
  implementation used when no base URL is configured. The page lists entities (name,
  kind, type, owner, lifecycle, tags) with filters for kind, type, owner, lifecycle, tag,
  and free text, and shows loading, empty, and error states. A banner explains demo mode.
- Use `@backstage/catalog-model` for entity types only (type-level import, no runtime
  code) so entity shapes match Backstage.
- Filters are applied server-side in REST mode (Backstage filter syntax and
  `fullTextFilter`) and client-side in demo mode through one shared matcher.

## Capabilities

### New Capabilities
- `backstage-connection`: how the app learns the Backstage base URL and token, the
  provider plugins read it from, the authenticated fetch behavior, and the remote-data
  states plugins expose.
- `catalog-plugin`: the entity list, the filter set and their semantics, the loading,
  empty, and error states, and the demo fallback.

### Modified Capabilities
- `demo-plugins`: the static placeholder requirement now covers only search and
  notifications; the catalog page is defined by `catalog-plugin`.

## Impact

- `packages/core/src/backstage/` (config, provider, client, `useRemoteData`),
  `packages/core/src/components/` (`FilterChips`, `TextFilter`, `StateView`).
- `plugins/catalog/src/` rewritten: `api.ts` (interface + REST), `demo-api.ts`,
  `filters.ts` (matcher, filter-string builder), `catalog-page.tsx`, `catalog-screen.tsx`.
- `packages/app/src/app/_layout.tsx` mounts `BackstageProvider`.
- New dependency: `@backstage/catalog-model` (types only). No other runtime deps.
- Env vars documented in README; `.env.example` added.
