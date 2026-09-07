## Context

See proposal.md. `@backstage-app/core` now provides `useBackstage()` (`demo`, `fetchJson`),
`useRemoteData(fetcher, key)`, `TextFilter` (debounced), `FilterChips`, `StateView`,
`ListCard`, and `Page`. The catalog plugin established the API-interface + demo-API +
page/screen pattern this change follows.

Search API contract (Backstage search backend): `GET /api/search/query?term=<t>` with
optional repeated `types[]=<type>`, `pageCursor=<cursor>`, `pageLimit=<n>` →
`{ results: { type: string; document: { title: string; text: string; location: string;
… } }[]; nextPageCursor?: string; previousPageCursor?: string; numberOfResults?: number }`.
The sandbox cannot reach backstage.io; this is the contract as shipped in
`@backstage/plugin-search-backend` and consumed by the web search page.

## Goals / Non-Goals

**Goals:** live search with pagination reusing core; deterministic tests with a stub API.

**Non-Goals:** result highlighting, per-type filters (e.g. kind for catalog results),
opening results (locations are shown, navigation to entity pages arrives with entity
detail work), offline caching.

## Decisions

### D1. `SearchApi` interface with REST and demo implementations
```ts
type SearchQuery = { term: string; types: string[]; pageCursor?: string; pageLimit?: number };
type SearchResultItem = { type: string; title: string; text: string; location: string };
type SearchPage = { results: SearchResultItem[]; nextPageCursor?: string; numberOfResults?: number };
interface SearchApi { query(q: SearchQuery, signal?: AbortSignal): Promise<SearchPage> }
```
`createRestSearchApi(fetchJson)` builds the query string with `URLSearchParams` (`types[]`
appended per type) and maps documents to `SearchResultItem`. `createDemoSearchApi(docs)`
filters by case-insensitive substring on title and text, honors `types`, and paginates
with a numeric cursor so "Load more" is exercised in demo mode too.

### D2. Pagination state in the page
The page keeps `{ term, type }` filters and a `pages: SearchPage[]` accumulator. The first
page is fetched with `useRemoteData(fetcher, JSON.stringify({term, types}))`; "Load more"
calls `api.query` directly with the last `nextPageCursor` and appends, tracking its own
loading/error state (`loadingMore`, `moreError`). Changing filters clears the accumulator.
*Alternative*: a generic paginated hook in core. Deferred until a second consumer
(notifications) shows the shape.

### D3. Term input and prompt state
`TextFilter` provides the debounced term. An empty (trimmed) term skips fetching and
shows the prompt state; `useRemoteData` is still called with a fetcher that resolves an
empty page immediately so hook order is stable.

### D4. Type filter as `FilterChips`
Options: All (no `types`), Software Catalog → `['software-catalog']`, TechDocs →
`['techdocs']`. Labels map back from raw types in results; unknown types show the raw
string.

### D5. Page/screen split
`SearchPage({ api, demo })` and `SearchScreen` (reads `useBackstage`, picks the API via
`useSearchApi`). The route mounts `SearchScreen`.

## Risks / Trade-offs

- [Search backends may omit `numberOfResults`] → the count line is shown only when
  present; otherwise the list stands alone.
- [Cursor strings are opaque] → passed through verbatim; the demo API uses numeric
  strings only for itself.
- [Appending pages while filters change] → the accumulator is keyed by the filter key;
  a "Load more" that resolves after a filter change is ignored.

## Migration Plan

Single PR, no config changes; demo mode keeps working without a backend.
