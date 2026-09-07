## Why

The catalog, APIs, and Docs listings are dead ends: an entity row shows a one-line
summary and nothing more. Backstage users expect to open an entity and see its
description, ownership, links, annotations, and relations, and the upcoming TechDocs,
Kubernetes, and users/groups features all need a page to hang off.

## What Changes

- Add an entity details page to `@backstage-app/plugin-catalog`, reachable by pressing a
  row on the Catalog, APIs, and Docs listings and by deep link at
  `/entity/<kind>/<namespace>/<name>`. It shows the entity's title and name, kind, type,
  lifecycle, owner, system, description, tags, links (opened in the browser), a
  collapsible list of annotations, its relations grouped by type with each target opening
  that entity's page, and an "Open in Backstage" link when an instance is active.
- Load the entity from the Backstage Catalog API (`/api/catalog/entities/by-name/…`)
  with loading, not-found, and error-with-retry states; in demo mode resolve it from the
  bundled demo entities (which gain a few relations and links).
- Extend the plugin contract so a plugin can declare routes that are mounted but not
  listed in the drawer (`hidden`), with a title and a back destination; the app mounts
  them as hidden drawer screens with a header back button.
- `ListCard` rows become pressable when an `onPress` is given.

## Capabilities

### New Capabilities
- none

### Modified Capabilities
- `catalog-plugin`: new requirements for opening an entity from a listing and for the
  entity details page (content, states, demo mode).
- `plugin-system`: the route contract gains hidden routes with a title and back route.
- `app-navigation`: hidden plugin routes are mounted with a header back button and are
  reachable by deep link but absent from the drawer.

## Impact

- `plugins/catalog/src`: new `entity-ref.ts` (parsing and hrefs), `entity-page.tsx`,
  `entity-screen.tsx`, `CatalogApi.getEntityByName`, demo data, `CatalogPage` gets an
  `onSelectEntity` prop, plugin declares the hidden `entity/[kind]/[namespace]/[name]` route.
- `packages/core`: `PluginRoute` gains `title`, `hidden`, `backRoute`; `ListCard` rows
  accept `onPress`; `plugin-catalog` peer-depends on `expo-router` for navigation.
- `packages/app/src/app/_layout.tsx` mounts hidden routes; new route file
  `packages/app/src/app/entity/[kind]/[namespace]/[name].tsx`.
- No new dependencies.
