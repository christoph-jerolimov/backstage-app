## Context

See proposal.md. Verified against `@backstage/plugin-catalog-backend@3.5.1`: `POST /refresh`
takes `{ entityRef }` (required) and answers 200 with no body; `GET
/locations/by-entity/:kind/:namespace/:name` returns the location record; `DELETE
/locations/:id` removes it. The entity page already renders a row of plugin-contributed
actions and reloads through `useRemoteData`'s `reload`.

## Goals / Non-Goals

**Goals:** the two operations people actually need on a wrong catalog entry, with the
destructive one hard to trigger by accident.

**Non-Goals:** registering new locations, editing entities, bulk operations, deleting an
orphaned entity by uid (a different operation with different semantics).

## Decisions

### D1. Unregister deletes the location, not the entity
Backstage's own "Unregister entity" removes the location that produced the entity; deleting
the entity by uid only hides it until the next processing cycle re-creates it. The app does
the same, so the result matches what the web UI would do. The action is therefore offered
only when `getLocationByEntity` returns a location: without one there is nothing to
unregister, and offering a button that cannot work would be worse than offering none.

### D2. Confirmation is a revealed panel, not a dialog
Pressing Unregister sets local state that reveals a panel naming the location's type and
target, with "Cancel" and a confirm button labelled "Unregister <name>". No request is sent
until the confirm button is pressed. A revealed panel rather than a native alert keeps the
flow testable and identical on iOS, Android, and web, and keeps the destructive label in
view next to what it will remove.

### D3. Action state lives in the page
`entity-page.tsx` holds `busy`, `message`, and `confirming` state around the two calls. On
a successful refresh it calls the existing `reload`, so the page shows the refreshed entity
without a second code path. On a successful unregister it calls `onUnregistered`, which the
screen wires to `router.replace('/catalog')` — replace rather than push, because the entity
page it came from no longer describes anything.

### D4. Demo answers honestly
The demo catalog has no locations, so `getLocationByEntity` resolves to `undefined` (no
Unregister offered) and `refreshEntity` rejects with a message saying demo data has no
source. That keeps demo mode from implying a working write path. `deleteLocation` is
implemented for tests but unreachable in demo mode.

## Risks / Trade-offs

- [A destructive action one tap from a browsing screen] → two steps, a distinct label, and
  the target named in the panel; nothing is sent on the first press.
- [Refresh is asynchronous in the backend] → the reload right after may still show the old
  data; the message says a refresh was requested rather than claiming the entity changed.

## Migration Plan

Single PR, additive. Existing entity page tests keep passing because both actions are extra
buttons in the existing actions row.
