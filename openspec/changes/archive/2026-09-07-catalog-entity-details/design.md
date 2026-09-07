## Context

See proposal.md. Routes are Expo Router files under `packages/app/src/app/`; the drawer in
`_layout.tsx` creates one `Drawer.Screen` per plugin navigation item. `CatalogApi` has
`queryEntities` and `getFacets`; `CatalogPage` renders rows through `ListCard`, which is
not pressable. `@backstage/catalog-model` is used for types only (its runtime pulls in
ajv, which is not Hermes-safe), so reference parsing is implemented locally. The APIs and
Docs plugins reuse `CatalogScreen`, so they inherit row navigation.

## Goals / Non-Goals

**Goals:** a details page reachable from every listing and by URL; the same page in demo
and REST mode; a generic way for plugins to mount non-drawer pages (needed again by
TechDocs, Kubernetes, and Scaffolder).

**Non-Goals:** entity editing, refresh/unregister actions, per-kind layouts (users and
groups come with feature 7), TechDocs/Kubernetes content (their own features).

## Decisions

### D1. Route shape and hidden drawer screens
The route is `entity/[kind]/[namespace]/[name]` (file
`packages/app/src/app/entity/[kind]/[namespace]/[name].tsx`), declared by the catalog
plugin as `{ name, component, title: 'Entity', hidden: true, backRoute: 'catalog' }`.
`_layout.tsx` maps `registry.routes().filter(r => r.hidden)` to `Drawer.Screen`s with
`drawerItemStyle: { display: 'none' }`, `title`, and a `headerLeft` back button that
calls `router.back()` when `router.canGoBack()` and otherwise `router.replace('/' +
backRoute)`. Alternative considered: a nested Stack per plugin folder; rejected because it
duplicates headers and the drawer toggle for one page.

### D2. Entity references
`plugins/catalog/src/entity-ref.ts`: `EntityRef = { kind, namespace, name }`,
`parseEntityRef(ref, defaultKind?)` for `kind:namespace/name`, `kind:name`, and
`namespace/name` forms (lower-cases kind and namespace, defaults namespace to `default`),
`stringifyEntityRef`, `entityRefOf(entity)`, and `entityHref(ref)` returning
`/entity/<kind>/<namespace>/<name>`.

### D3. API
`CatalogApi.getEntityByName(ref, signal)` → `Promise<Entity>`; REST calls
`/api/catalog/entities/by-name/{kind}/{namespace}/{name}` and rethrows; the page treats a
`BackstageApiError` with status 404 as not found. The demo API throws a
`BackstageApiError(404, …)` for unknown refs. Demo entities gain `relations`
(ownedBy/ownerOf, partOf/hasPart, providesApi/apiProvidedBy) and `links` on a few items
so the page has content.

### D4. Page and screen
`EntityPage({ ref, api, baseUrl?, onOpenEntity })` uses `useRemoteData` keyed by the
stringified ref; renders `Page` with the title, a details card (`HintRow`-like label/value
rows), description, tags, links via `ExternalLink`, annotations inside `Collapsible`, and
one card per relation type whose rows are pressable. `EntityScreen` reads the params with
`useLocalSearchParams`, wires `useCatalogApi`, `useBackstage().instance?.baseUrl`, and
`router.push(entityHref(target))`. `CatalogPage` gets `onSelectEntity?: (entity) => void`
and `CatalogScreen` supplies `router.push(entityHref(entityRefOf(entity)))`.
`ListCardItem` gets `onPress?: () => void`; rows with it render as `Pressable` with
`accessibilityRole="button"`.

## Risks / Trade-offs

- [`expo-router` in the plugin package] → already a peer dependency for home/core; tests
  render `EntityPage`/`CatalogPage` with callbacks, not the screens.
- [Hidden screens still receive drawer gestures] → acceptable; the drawer toggle stays
  available from the header.
- [Relations to entities the user cannot see] → the target page shows not found.

## Migration Plan

Single PR, additive. Existing routes and tests are unchanged.
