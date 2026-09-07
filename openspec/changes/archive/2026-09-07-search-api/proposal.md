## Why

The search page still lists three hard-coded results. With the Backstage connection
layer in place (see `backstage-connection`), search is the next plugin to go live: it is
the fastest way for a user to reach an entity or a doc page from a phone.

## What Changes

- Rework the search plugin around a `SearchApi` interface with a REST implementation for
  the Backstage Search API (`GET /api/search/query`) and an in-memory demo implementation
  that searches built-in sample documents when no backend is configured.
- The page has a search term input (debounced), a type filter (All, Software Catalog,
  TechDocs), and a result list showing title, text snippet, type label, and location.
  Results load 25 at a time with a "Load more" action driven by the API's page cursor.
- Loading, empty ("no results"), prompt ("type to search"), and error-with-retry states,
  plus the same demo banner pattern as the catalog page.
- Reuse core's `TextFilter`, `FilterChips`, `StateView`, and `useRemoteData`; no new
  dependencies.

## Capabilities

### New Capabilities
- `search-plugin`: term input, type filter, result presentation, cursor pagination,
  states, and the demo fallback.

### Modified Capabilities
- `demo-plugins`: the static placeholder requirement now covers only the notifications
  page; the search page is defined by `search-plugin`.

## Impact

- `plugins/search/src/` rewritten: `api.ts`, `demo-api.ts`, `search-page.tsx`,
  `search-screen.tsx`, `use-search-api.ts`, tests.
- `packages/app/src/app/search.tsx` mounts `SearchScreen`.
- No changes to core beyond consuming existing exports; no app config changes.
