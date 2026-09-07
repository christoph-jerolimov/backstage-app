## Context

See proposal.md. `BackstageSession` already carries `userEntityRef` and
`ownershipEntityRefs` (parsed from the identity token's `ent` claim), and `useBackstage()`
exposes `session`, `signedIn`, and `sessionExpired`. The catalog gained an `ownedBy` filter
with the users-and-groups change, currently a single reference rendered as
`relations.ownedBy=<ref>` inside the one `filter` parameter. Home widgets and the
`homeWidgets` extension point arrived with the dashboard change.

## Goals / Non-Goals

**Goals:** one definition of "mine" shared by the page, the widgets, and the group pages;
no new backend calls beyond the catalog queries already used.

**Non-Goals:** starring teams, ownership by annotation rather than relation, editing group
membership, an ownership picker for other users.

## Decisions

### D1. `useOwnership()` in core
`packages/core/src/use-ownership.ts` returns `{ signedIn, userRef, ownershipRefs,
groupRefs }` derived from `useBackstage()`: `ownershipRefs` is `session.ownershipEntityRefs`
when `signedIn`, else `[]`; `groupRefs` filters those starting with `group:`. Kept in core
next to the connection so the catalog does not have to reach into the session shape, and so
a future identity source (for example a refreshed token) changes one place. Expired
sessions count as signed out because `useBackstage().signedIn` is already false then.

### D2. Repeated `filter` parameters for several owners
`CatalogFilters.ownedBy` becomes `string | string[]`. `buildFilterParam(filters, owner?)`
takes the owner to embed, so `buildEntitiesQuery` can emit one `filter` parameter per owner
reference while every parameter repeats the other conditions (kind, type, lifecycle, tag,
annotation) — Backstage ORs repeated `filter` parameters and ANDs the pairs inside one.
An empty array emits a filter that matches nothing (`relations.ownedBy=` is not valid, so
the query layer short-circuits and returns an empty page without a request). `matchesQuery`
accepts either shape. This keeps the single-owner query byte-identical to today's.

### D3. My entities page reuses the catalog listing
`MineScreen` renders `CatalogPage` with `allowAllKinds`, `initialFilters` carrying
`ownedBy: ownershipRefs`, and a title of "My entities"; the kind chips and the rest of the
filters work as on the catalog page. Route `mine` is hidden with `backRoute: 'catalog'`, so
it is deep-linkable but does not add a drawer entry. Signed out it renders a `StateView`
with an action opening `/account` instead of the listing.

### D4. Ownership widgets
`MyTeamsWidget` resolves `groupRefs` through `getEntitiesByRefs` (the same batch call the
starred widget uses) and lists them; `MyEntitiesWidget` runs one `queryEntities` with
`ownedBy: ownershipRefs`, shows the first five, and offers "See all" opening `/mine`.
Priorities 5 and 15 place teams above Starred and entities between Starred and Recently
viewed. Signed out, both render an explanatory `StateView` rather than an error, because a
signed-out app is a normal state, not a failure.

## Risks / Trade-offs

- [A long ownership list makes a long query] → the refs come from the identity token, which
  Backstage keeps small; the page passes them straight through.
- [Repeated `filter` parameters are OR, which is easy to get backwards] → covered by a unit
  test asserting the exact parameter list for two owners.

## Migration Plan

Single PR, additive. The single-owner path is unchanged, so the group and user pages keep
working while gaining the shared query.
