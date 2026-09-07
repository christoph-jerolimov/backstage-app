## 1. Core: Backstage connection

- [x] 1.1 Add `packages/core/src/backstage/config.ts` (`BackstageConfig`, `readBackstageConfigFromEnv`) and `client.ts` (`createBackstageClient`, `BackstageApiError`); verify unit tests cover trailing-slash trimming, demo detection, bearer header, JSON parsing, and non-2xx → error with status and body message
- [x] 1.2 Add `packages/core/src/backstage/provider.tsx` (`BackstageProvider`, `useBackstage`) and export the backstage module from the core index; verify a test renders a consumer with an explicit provider value
- [x] 1.3 Add `packages/core/src/hooks/use-remote-data.ts` (`useRemoteData`); verify tests cover loading→success, error→reload→success, and stale-result dropping when deps change mid-flight
- [x] 1.4 Add `@backstage/catalog-model` as a devDependency of core (types only) and verify `npm run typecheck` resolves `import type { Entity }`

## 2. Core: shared filter and state UI

- [x] 2.1 Add `FilterChips` (label, options, selected, onSelect, optional "All") and `TextFilter` (debounced `TextInput`) to core and export them; verify render tests select a chip and fire the debounced change with fake timers
- [x] 2.2 Add `StateView` (loading / empty / error with retry) to core and export it; verify a render test shows the error message and calls retry

## 3. Catalog plugin

- [x] 3.1 Add `plugins/catalog/src/filters.ts` (`CatalogFilters`, `defaultFilters`, `withKind` reset, `buildFilterParam`, `matchesQuery`); verify unit tests cover the filter string for each field, AND semantics, case-insensitive text matching on name/title/description, and kind reset
- [x] 3.2 Add `plugins/catalog/src/api.ts` (`CatalogApi`, `createRestCatalogApi`) and `demo-api.ts` (`demoEntities`, `createDemoCatalogApi`); verify tests assert the REST query string and facet parsing against fixtures and the demo API's filtering and facet counts
- [x] 3.3 Add `use-catalog-api.ts` (`useCatalogApi` choosing REST or demo from `useBackstage`) and rewrite `catalog-page.tsx` (`CatalogPage({ api, demo })` with filter rows, entity list via `ListCard`, `StateView` states, demo banner) plus `catalog-screen.tsx`; verify render tests with the demo API cover the list, kind+type filtering, text filtering, the empty state, and the error state with retry using a failing stub API
- [x] 3.4 Point the plugin route and `packages/app/src/app/catalog.tsx` at `CatalogScreen`, export the new API from the plugin index; verify `npm run typecheck` passes

## 4. App and docs

- [x] 4.1 Mount `BackstageProvider` in `packages/app/src/app/_layout.tsx`; verify the web export succeeds and `/catalog` is emitted
- [x] 4.2 Add `.env.example` with the two variables and document configuration and demo mode in the README; verify the README mentions `EXPO_PUBLIC_BACKSTAGE_URL`

## 5. Verification

- [x] 5.1 Run `npm run typecheck`, `npm run lint -- --max-warnings=0`, `npm test -- --ci`; verify all pass
- [x] 5.2 Run `cd packages/app && npx expo export --platform web`; verify success
