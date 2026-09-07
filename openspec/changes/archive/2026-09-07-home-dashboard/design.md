## Context

See proposal.md. `packages/core` already persists the theme preference through
`KeyValueStorage` (`createPlatformStorage().instances`: AsyncStorage on native,
localStorage on web) and already has one extension point, `entityActions`, collected by
`createPluginRegistry` and provided to pages through `PluginRegistryProvider`. The home
plugin currently renders one greeting card and depends only on core.

## Goals / Non-Goals

**Goals:** a landing screen that answers "what is mine, what needs me"; dependencies that
keep pointing from plugins to core; widgets that fail independently.

**Non-Goals:** server-side starred entities (Backstage stores them per user in the web app's
local storage too), widget reordering by the user, configurable quick links, a home for
signed-out instances beyond what the APIs allow.

## Decisions

### D1. Entity preferences live in core, not in the catalog
`packages/core/src/entity-prefs.tsx` holds `EntityPrefsProvider`, `useStarredEntities()`
(`{ refs, isStarred, toggle, loaded }`) and `useRecentEntities()` (`{ refs, record }`),
persisted under `app.starredEntities` and `app.recentEntities` as JSON arrays of
`kind:namespace/name` strings, with an injectable `KeyValueStorage` for tests. Core owns
them because both the catalog (which writes) and the home page (which reads through
widgets) need them, and core must not depend on a plugin. Refs are opaque strings here;
parsing stays in the catalog. Recent is capped at `RECENT_LIMIT = 10`, most recent first.
Reads are asynchronous and start from `[]`, mirroring `ThemeProvider`; write failures are
logged, matching the theme preference's behavior.

### D2. Home widgets as a plugin extension point
`plugin.ts` gains `HomeWidget = { id, title, priority?, component, testID? }` and
`BackstagePlugin.homeWidgets?: HomeWidget[]`; `createPlugin` rejects duplicate widget ids
within a plugin, and `createPluginRegistry` rejects duplicates across plugins (same rule as
plugin ids) and exposes `homeWidgets()` sorted by `priority ?? 100`, ties broken by
registration order (a stable sort). This mirrors `entityActions` exactly, so the home page
depends only on core while scaffolder, notifications, and catalog own their widgets.
Priorities: starred 10, recent 20, open tasks 30, unread notifications 40.

### D3. Home page composition
`HomePage({ now, widgets, navItems, baseUrl, onOpen })` stays pure: greeting card, a
`QuickLinks` card built from `navItems` (registry nav items minus route `index`) plus an
"Open Backstage" external link when `baseUrl` is set, then one `ThemedView` card per widget
rendering `widget.component`. `HomeScreen` wires `usePluginRegistry()`, `useBackstage()`,
and the router. Widgets render themselves, so each owns its loading/empty/error state via
`StateView`; nothing in the page awaits them.

### D4. Catalog: by-refs, star toggle, visit recording
`CatalogApi.getEntitiesByRefs(refs, signal)` posts `{ entityRefs }` to
`/api/catalog/entities/by-refs`; the response's `items` is positional with `null` for
unknown refs, so the client drops nulls and keeps order. The demo API resolves against
`demoEntities`. `EntityPage` gains a `StarButton` (a pressable star with
`accessibilityState.selected`) and calls `record(ref)` in an effect once the entity has
loaded. The widgets (`StarredWidget`, `RecentWidget`) call `getEntitiesByRefs` through
`useCatalogApi()` and `useRemoteData` keyed by the joined refs, so changing a star
refetches.

### D5. Scaffolder and notifications widgets
`OpenTasksWidget` calls `listTasks({ createdBy: session?.userEntityRef, limit: 20, offset: 0 })`
and filters to `open`/`processing`, showing the first five (the backend has no status
filter, and the list is already newest-first). `UnreadWidget` calls `status()`. Both use
`useRemoteData` and the existing `StateView`.

## Risks / Trade-offs

- [`by-refs` is a POST with a body] → `fetchJson` already supports `RequestInit`; the demo
  path needs no network.
- [Widget count grows the home page] → priorities keep the order intentional and each card
  is short (at most five rows).
- [Starred refs can go stale when an entity is removed] → `by-refs` drops unknown refs, so
  the widget silently shows fewer rows rather than erroring.

## Migration Plan

Single PR, additive. Existing home tests keep passing because the greeting card is
unchanged and the new sections are absent when no widgets are contributed.
