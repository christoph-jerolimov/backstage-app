## Why

The home page only greets the user. As the app's landing screen it should answer "what
is mine and what needs me" at a glance: the entities I care about, what I opened
recently, tasks I started that are still running, and whether notifications are waiting.

## What Changes

- Add **starred and recently viewed entities** to `@backstage-app/core`: a persisted
  store (same storage as the theme preference) holding a list of starred entity refs and
  a capped list of recently viewed refs, with `useStarredEntities()` and
  `useRecentEntities()` hooks and an `EntityPrefsProvider` mounted by the app.
- Add a **home widget extension point** to the plugin contract (`homeWidgets`, alongside
  `entityActions`): a plugin contributes a titled card with a priority; the home page
  renders every contributed widget in order. This keeps the home plugin from depending on
  every other plugin.
- The **home page** becomes a dashboard: the greeting, a **Quick links** card derived from
  the plugin registry's navigation items, and the contributed widgets.
- **Catalog** contributes two widgets ("Starred" and "Recently viewed"), resolves refs
  through the catalog's `by-refs` endpoint, adds a star toggle to the entity page, and
  records a visit when an entity page opens.
- **Scaffolder** contributes "My open tasks" (open and processing tasks of the signed-in
  user, or all tasks when signed out).
- **Notifications** contributes "Unread notifications" (the count from the status
  endpoint, opening the notifications page).
- Widgets show their own loading, empty, and error states and never block the greeting.

## Capabilities

### New Capabilities
- `entity-preferences`: starred and recently viewed entity refs, their persistence, and
  the hooks plugins use to read and change them.

### Modified Capabilities
- `plugin-system`: plugins may contribute home widgets.
- `home-plugin`: the home page renders quick links and the contributed widgets.
- `catalog-plugin`: entities can be loaded by reference; the entity page has a star
  toggle and records visits.

## Impact

- `packages/core`: new `entity-prefs.tsx` (store, provider, hooks), `homeWidgets` in
  `plugin.ts` and `registry.ts`, exports.
- `plugins/home`: `HomePage` renders quick links and widgets; new `quick-links.tsx`.
- `plugins/catalog`: `getEntitiesByRefs` in the API (REST `POST
  /api/catalog/entities/by-refs` and demo), `StarButton`, visit recording, two widgets.
- `plugins/scaffolder`, `plugins/notifications`: one widget each.
- `packages/app`: mounts `EntityPrefsProvider`.
- No new dependencies.
