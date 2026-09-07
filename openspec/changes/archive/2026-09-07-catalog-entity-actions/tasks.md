## 1. API

- [x] 1.1 Add `refreshEntity`, `getLocationByEntity`, and `deleteLocation` to `CatalogApi` (REST paths and bodies, demo behaviour per design D4); verify tests cover the refresh body, the location path, the delete path, a missing location resolving to undefined, and the demo refusal

## 2. Entity page

- [x] 2.1 Add the Refresh action with its busy, success, and error states per design D3; verify tests cover a successful refresh reloading the entity, the disabled state while running, and a rejected refresh keeping the page
- [x] 2.2 Add the Unregister action and its confirmation panel per designs D1 and D2, wired to the router in `entity-screen.tsx`; verify tests cover that the first press sends nothing, confirming deletes and leaves for the catalog, cancelling sends nothing, an entity without a location offering no action, and a failed deletion keeping the page

## 3. Verification

- [x] 3.1 Run `npm run typecheck`, `npm run lint -- --max-warnings=0`, `npm test -- --ci`; verify all pass
- [x] 3.2 Run `cd packages/app && npx expo export --platform web`; verify the export succeeds
