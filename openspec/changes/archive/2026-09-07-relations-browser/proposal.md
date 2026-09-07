## Why

The entity page lists relations as raw references (`component:default/payments-frontend`)
grouped by type. That is enough to see what exists but not to explore: the reader cannot
tell what kind a target is, cannot see how far a dependency chain goes, and every hop costs
a return trip through the entity page.

## What Changes

- Add a **relations browser** to the catalog plugin at the hidden route
  `relations/[kind]/[namespace]/[name]`: the centered entity, its relations grouped into
  meaningful sections, and every neighbour resolved to a real entity (title, kind, owner)
  rather than a bare reference.
- Group relation types by **direction and meaning** rather than raw name: dependencies
  (`dependsOn` / `dependencyOf`), APIs (`providesApi` / `consumesApi` and their inverses),
  composition (`partOf` / `hasPart`), ownership (`ownedBy` / `ownerOf`), membership
  (`memberOf` / `hasMember`, `parentOf` / `childOf`), and anything else under "Other".
  Each section names both directions so the arrow is never ambiguous.
- **Walking the graph**: pressing a neighbour re-centers the browser on it, so a chain can
  be followed without leaving the page. The centered entity offers an action that opens its
  entity page, and the page shows the path walked so far so the reader can jump back.
- Every entity page gains a **"Relations" action** that opens the browser, and the entity
  page's own relation rows now show the neighbour's name and kind when the catalog knows
  it.
- Entities without relations explain that the catalog records none.

## Capabilities

### New Capabilities
- `relations-browser`: how relations are grouped, how neighbours are resolved and shown,
  and how the reader walks and retraces the graph.

### Modified Capabilities
- `catalog-plugin`: the Relations entity action.

## Impact

- `plugins/catalog`: new `relation-groups.ts` (pure grouping and labels), `relations-page.tsx`
  and `relations-screen.tsx`, the plugin's route and entity action, and the entity page's
  relation rows resolving names through the existing `by-refs` call.
- `packages/app`: the `relations/[kind]/[namespace]/[name]` route file.
- No new dependencies; no new backend endpoints (the entity payload already carries its
  relations and `by-refs` resolves the neighbours).
