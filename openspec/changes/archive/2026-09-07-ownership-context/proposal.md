## Why

Signing in already yields the user's ownership references (their own entity ref plus the
groups they belong to), but nothing in the app uses them. A portal is most useful when it
answers "what am I responsible for" without the user having to remember team names or
build a filter by hand.

## What Changes

- Add `useOwnership()` to `@backstage-app/core`: the signed-in user's entity ref, the
  ownership refs from their session, and the subset that are groups, plus whether an
  identity is known at all.
- Let the catalog filter by **several owners at once**: `CatalogFilters.ownedBy` accepts a
  list, sent as one `filter` parameter per reference (Backstage ORs repeated `filter`
  parameters) and matched the same way in demo mode.
- Add a **"My entities" page** to the catalog plugin (route `mine`, reachable from the
  home widget and from the drawer entry's page): the catalog listing restricted to the
  entities owned by the signed-in user or their groups, with the usual filters. Signed out,
  it explains that signing in is required.
- Add two **home widgets**: "My teams" (the group entities from the ownership refs) and
  "My entities" (the first owned entities, with a link to the full page).
- Group and user pages already list owned entities; they now use the same multi-owner
  query so a page for one of the user's groups and the "My entities" page agree.

## Capabilities

### New Capabilities
- `ownership-context`: what the app derives from the signed-in identity and how "mine"
  is defined.

### Modified Capabilities
- `catalog-plugin`: owner filtering accepts several references; the My entities page.
- `home-plugin`: two more contributed widgets are expected on the dashboard.

## Impact

- `packages/core`: `use-ownership.ts` reading the connection's session.
- `plugins/catalog`: `filters.ts` (`ownedBy: string | string[]`), `api.ts`
  (`buildEntitiesQuery` emitting repeated `filter` parameters), `mine-screen.tsx`,
  `ownership-widgets.tsx`, plugin registration of the route and widgets.
- `packages/app`: the `mine` route file.
- No new dependencies.
