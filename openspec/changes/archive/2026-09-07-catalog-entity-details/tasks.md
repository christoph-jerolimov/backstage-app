## 1. Core

- [x] 1.1 Extend `PluginRoute` in `packages/core/src/plugin.ts` with optional `title`, `hidden`, and `backRoute`, validate `backRoute` in `createPlugin`, and add `onPress` to `ListCardItem` (pressable row with `accessibilityRole="button"`); verify tests cover the hidden-route validation and that a pressed row calls its handler
- [x] 1.2 Mount hidden routes in `packages/app/src/app/_layout.tsx` as drawer screens hidden from the list with the route title and a header back button per design D1; verify `npm run typecheck` passes

## 2. Catalog plugin

- [x] 2.1 Add `plugins/catalog/src/entity-ref.ts` (`parseEntityRef`, `stringifyEntityRef`, `entityRefOf`, `entityHref`) and `CatalogApi.getEntityByName` (REST by-name endpoint, demo lookup throwing a 404 `BackstageApiError`), add relations and links to demo entities; verify unit tests cover ref parsing forms, the REST path, and demo found/not-found
- [x] 2.2 Add `entity-page.tsx` (`EntityPage`) with the details card, description, tags, links, annotations, relations, "Open in Backstage", and loading/not-found/error states, plus `entity-screen.tsx`; declare the hidden route in `plugin.ts`, export from `index.ts`, add the `expo-router` peer dependency; verify render tests cover the component details scenario, relation press, the Backstage link, not found, and error retry
- [x] 2.3 Make catalog rows pressable through `CatalogPage`'s `onSelectEntity` and wire `CatalogScreen` to navigate; add `packages/app/src/app/entity/[kind]/[namespace]/[name].tsx`; verify a test asserts pressing a row reports the entity

## 3. Verification

- [x] 3.1 Run `npm run typecheck`, `npm run lint -- --max-warnings=0`, `npm test -- --ci`; verify all pass
- [x] 3.2 Run `cd packages/app && npx expo export --platform web`; verify the export succeeds and the entity route is included
