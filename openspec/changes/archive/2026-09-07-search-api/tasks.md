## 1. Search API

- [x] 1.1 Add `plugins/search/src/api.ts` (`SearchApi`, `SearchQuery`, `SearchResultItem`, `SearchPage`, `buildSearchQuery`, `typeLabel`, `createRestSearchApi`); verify unit tests cover the query string (term, `types[]`, cursor, limit 25), document mapping, and the type labels
- [x] 1.2 Add `plugins/search/src/demo-api.ts` (`demoDocuments`, `createDemoSearchApi` with substring matching, type filter, and cursor pagination); verify unit tests cover matching, filtering by type, and two-page pagination

## 2. Search page

- [x] 2.1 Rewrite `search-page.tsx` as `SearchPage({ api, demo })` with `TextFilter`, the type `FilterChips`, the prompt/loading/empty/error states, the result list (title, snippet, type label, location), and "Load more" with its own loading and error handling; add `search-screen.tsx`, `use-search-api.ts`, update `plugin.ts` and `index.ts`; verify render tests with the demo API cover prompt state, results for a term, type filtering, load more, empty state, and error with retry via a failing stub
- [x] 2.2 Point `packages/app/src/app/search.tsx` at `SearchScreen`; verify `npm run typecheck` passes

## 3. Verification

- [x] 3.1 Run `npm run typecheck`, `npm run lint -- --max-warnings=0`, `npm test -- --ci`; verify all pass
- [x] 3.2 Run `cd packages/app && npx expo export --platform web`; verify `/search` is emitted
