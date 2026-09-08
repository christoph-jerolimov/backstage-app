## Why

`packages/core` is meant to be the plugin contract and shared primitives, but it has become
partly a catalog package. Its plugin contract hardcodes `EntityAction`, `EntityLike` and
`EntityRefLike`; its registry exposes `entityActions()`; and it ships `hasAnnotation`,
`useOwnership` and the starred/recent `EntityPrefsProvider` — all of which are meaningless
without a catalog.

Meanwhile the catalog's *non-UI* logic lives inside `plugins/catalog`, so four other plugins
(techdocs, kubernetes, scaffolder, apis) depend on a whole UI plugin just to parse an entity
ref or call the catalog API. A plugin should not have to import screens to get a client.

## What Changes

- Add **`packages/catalog-api`** as `@backstage-app/catalog-api`, holding the catalog logic
  other plugins actually need: the entity-ref helpers, the catalog client and its demo
  implementation, filters, relation grouping, and the ownership and entity-preference hooks.
- **Remove every catalog-specific member from `packages/core`.** `EntityLike`,
  `EntityRefLike`, `EntityAction`, `hasAnnotation`, `useOwnership` and the entity-preferences
  module move out; `BackstagePlugin.entityActions` and `PluginRegistry.entityActions()` are
  deleted from the contract.
- Keep entity actions working by making the extension point **owned by the catalog** instead
  of by core: `createPlugin` becomes generic so a plugin may declare extra fields, and
  `catalog-api` supplies the `EntityActionsPlugin` type plus an `entityActionsOf(registry)`
  reader. Core no longer knows the catalog exists; the catalog defines its own extension
  point.
- **Repoint the four dependent plugins** at `@backstage-app/catalog-api` for the non-UI
  pieces. `plugins/catalog` keeps only the screens, pages, widgets and `StarButton`.

## Non-goals

- **Not** moving catalog UI. `CatalogScreen`, `EntityPage`, the home widgets and `StarButton`
  stay in `plugins/catalog`; other plugins still import `CatalogScreen` from there, which is
  correct — it is a screen, not an API.
- **Not** generalizing `homeWidgets` the same way. It has the same shape of problem (it is
  really the home plugin's extension point), but the requirement here is about catalog code
  in core, and converting both at once would make an already large change harder to review.
- **Not** changing any behavior. Every screen, route and API call does exactly what it did;
  the existing tests must pass unchanged, which is the evidence for that.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

None. This moves code between packages and changes no requirement: the same entity actions
appear on the same page, the catalog API issues the same requests, and ownership and
starred/recent entities behave identically. It sets `skip_specs: true` accordingly.

## Impact

- **New** `packages/catalog-api/` — entity refs, catalog API, demo API, filters, relation
  groups, ownership, entity preferences, plus its tests and `knip-report.md`.
- **`packages/core`**: `plugin.ts` and `registry.ts` lose their catalog members;
  `use-ownership.ts` and `entity-prefs.tsx` are deleted; `index.ts` shrinks. Two core test
  files move with the code they cover.
- **`plugins/catalog`**: six modules move out; the plugin re-points its own imports and keeps
  its UI.
- **`plugins/{techdocs,kubernetes,scaffolder,apis}`**: imports repointed; a
  `@backstage-app/catalog-api` dependency added.
- **`packages/app`**: the provider wiring for entity preferences moves its import.
- No new third-party dependencies; no bundle impact beyond the moved modules.
