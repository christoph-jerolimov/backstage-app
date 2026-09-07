## Why

The app can read the catalog but never write to it. Two operations from Backstage's entity
page are missing and are the ones people reach for when a catalog entry is wrong: asking
the catalog to re-read an entity's source ("Refresh"), and removing an entity that should
no longer be listed ("Unregister").

## What Changes

- Add three calls to the catalog API: `refreshEntity(ref)` (`POST /api/catalog/refresh`
  with `{ entityRef }`), `getLocationByEntity(ref)` (`GET
  /api/catalog/locations/by-entity/<kind>/<namespace>/<name>`), and `deleteLocation(id)`
  (`DELETE /api/catalog/locations/<id>`).
- The entity page gains a **Refresh** action: it asks the catalog to re-read the entity,
  reports the outcome inline, and reloads the page so a changed entity is visible.
- The entity page gains an **Unregister** action, which is destructive and therefore
  **two-step**: pressing it reveals what will be removed (the location type and target that
  produced the entity) and requires a second, explicitly labelled confirmation. Only then
  is the location deleted, after which the page reports success and returns to the catalog.
  Unregister is offered only when the entity has a location the catalog can name.
- Both actions report backend failures in place, including the permission errors these
  endpoints commonly return, without losing the page.
- Demo mode answers both: refresh reports that demo data has no source, unregister removes
  the entity from the in-memory catalog.

## Capabilities

### Modified Capabilities
- `catalog-plugin`: refreshing an entity and unregistering it from the entity page.

## Impact

- `plugins/catalog`: `api.ts` (three calls, REST and demo), `entity-page.tsx` (the two
  actions and their states), a small `unregister-panel.tsx` for the confirmation step.
- No new dependencies, no new routes.
