## 1. Core

- [x] 1.1 Add `packages/core/src/entity-prefs.tsx` (`EntityPrefsProvider`, `useStarredEntities`, `useRecentEntities`, `STARRED_KEY`, `RECENT_KEY`, `RECENT_LIMIT`) with injectable storage per design D1, and export it; verify tests cover starring, un-starring, idempotent starring, visit ordering, the ten-entry cap, persistence round-trips, and a throwing storage
- [x] 1.2 Add `HomeWidget` and `homeWidgets` to `createPlugin` and `createPluginRegistry` per design D2 (duplicate-id rejection, priority sort); verify tests cover ordering by priority, registration-order ties, duplicate rejection, and plugins without widgets

## 2. Plugin widgets

- [x] 2.1 Add `getEntitiesByRefs` to `CatalogApi` (REST `by-refs` and demo) per design D4; verify tests cover the request body, order preservation, dropped unknown refs, and the demo path
- [x] 2.2 Add the star toggle and visit recording to the catalog entity page; verify tests cover toggling the star, the reflected state, and that opening a page records it as most recent
- [x] 2.3 Add `StarredWidget` and `RecentWidget` to the catalog plugin and register them as home widgets with priorities 10 and 20; verify tests cover listing, pressing a row, and the empty states
- [x] 2.4 Add the scaffolder `OpenTasksWidget` (priority 30) filtering to open and processing tasks, at most five, scoped to the session user; verify tests cover a running task, the empty state, and opening the task page
- [x] 2.5 Add the notifications `UnreadWidget` (priority 40); verify tests cover the count, the caught-up state, and opening the notifications page

## 3. Home page

- [x] 3.1 Extend `HomePage` with the quick links card and the widget cards per design D3 and wire `HomeScreen` to the registry, connection, and router; verify tests cover links from nav items, Home being excluded, the Backstage link with an active instance, rendering contributed widgets in order, and one widget's error not affecting the page
- [x] 3.2 Mount `EntityPrefsProvider` in `packages/app/src/app/_layout.tsx`; verify typecheck passes

## 4. Verification

- [x] 4.1 Run `npm run typecheck`, `npm run lint -- --max-warnings=0`, `npm test -- --ci`; verify all pass
- [x] 4.2 Run `cd packages/app && npx expo export --platform web`; verify the export succeeds
