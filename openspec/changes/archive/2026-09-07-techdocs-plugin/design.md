## Context

See proposal.md. The catalog listing's filter model has a required `kind`; the REST
filter is `kind=<k>[,spec.type=…]`, facets are requested per kind, and the demo matcher
compares kind. Backstage's catalog filter syntax treats a bare key (no `=value`) as an
existence check, so `filter=metadata.annotations.backstage.io/techdocs-ref` selects
documented entities. `CatalogScreen` already accepts `title`, `description`, `fixedKind`.

## Goals / Non-Goals

**Goals:** documented-entities listing across kinds with zero duplicated listing logic;
the default catalog and APIs pages keep their behavior.

**Non-Goals:** rendering TechDocs content (a reader arrives with entity details), doc
search (the search plugin covers `techdocs` results).

## Decisions

### D1. `kind` becomes optional in `CatalogFilters`
`buildFilterParam` emits `kind=` only when set; `matchesQuery` skips the kind check when
unset. `withKind(filters, kind | undefined)` resets dependent selections either way.
`getFacets(kind | undefined)` requests facets with no `kind` filter when unset (REST:
omit `filter`), and the demo API derives facets from all entities.

### D2. `requiredAnnotation` in `CatalogFilters`
A string annotation key. REST: appended as a bare pair `metadata.annotations.<key>` to the
`filter` param (both for entities and facets). Demo: `entity.metadata.annotations?.[key]
!== undefined`. It is part of the filters object so it flows through the same query key
and is never lost on kind changes (`withKind` preserves it).

### D3. `CatalogPage` props
`allowAllKinds?: boolean` (kind chips gain an "All" chip via `allLabel`, initial kind
`undefined`), `requiredAnnotation?: string`. `fixedKind` still wins when set.
`CatalogScreen` passes all through.

### D4. `plugins/techdocs`
`techdocsPlugin`: route `docs`, nav item "Docs" after APIs, icon `{ ios: 'book',
android: 'menu_book', web: 'menu_book' }` (verified against the symbol union at build
time), `DocsScreen` → `<CatalogScreen title="Docs" description="Entities with TechDocs."
allowAllKinds requiredAnnotation="backstage.io/techdocs-ref" />`.

### D5. Demo data
Add `backstage.io/techdocs-ref: dir:.` to petstore, shared-ui, payments-api, and the
payments system so the Docs page shows components, an API, and a system together.

## Risks / Trade-offs

- [Facet requests without a kind filter can be large on big catalogs] → only when the
  All chip is active; bounded by the facet endpoint's aggregation, not entity count.
- [Bare-key filter syntax varies by Backstage version] → existence filters have been
  supported since the catalog's `by-query` endpoint shipped; the demo matcher covers the
  same semantics for tests.

## Migration Plan

Single PR; adds a route and a drawer entry.
