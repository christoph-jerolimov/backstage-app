## 1. Package scaffold

- [x] 1.1 Create `packages/catalog-api/package.json` as `@backstage-app/catalog-api` (`private: true`, `main`/`types` → `src/index.ts`) depending on `@backstage-app/core` and `@backstage-app/catalog-model`, with the same peer dependencies the moved code needs (react, react-native, expo-router, async-storage); verify `npm install` links it and lists 16 workspaces

## 2. Core sheds its catalog vocabulary

- [x] 2.1 Make `createPlugin` generic (`<T extends BackstagePlugin>(definition: T): T`) per design D1, keeping every existing validation; verify `npm test -- --ci packages/core` still passes and a plugin literal with extra fields keeps them in its inferred type
- [x] 2.2 Delete `EntityLike`, `EntityRefLike`, `EntityAction`, `hasAnnotation` and `BackstagePlugin.entityActions` from `packages/core/src/plugin.ts`, and `entityActions()` from `PluginRegistry`/`createPluginRegistry`; verify no `packages/core/src` file mentions "entity" outside the route-name example comment
- [x] 2.3 Move `use-ownership.ts` and `entity-prefs.tsx` (and their tests) out of `packages/core` into `packages/catalog-api` per design D3; verify they are deleted from core and its `index.ts` no longer exports them
- [x] 2.4 Move the entity-action assertions out of core's `registry.test.ts` and `registry-context.test.tsx` into `packages/catalog-api`, keeping the non-catalog assertions in core; verify both packages' suites pass

## 3. Move catalog logic out of the UI plugin

- [x] 3.1 Move `entity-ref.ts`, `api.ts`, `demo-api.ts`, `filters.ts`, `relation-groups.ts` and `use-catalog-api.ts` from `plugins/catalog/src` into `packages/catalog-api/src` per design D2, together with their existing tests, changing nothing but import paths; verify each moved file's exports keep their names and signatures
- [x] 3.2 Add `EntityAction`, `EntityLike`, `EntityRefLike`, `hasAnnotation`, `EntityActionsPlugin` and `entityActionsOf(registry)` to `packages/catalog-api` per design D1; verify `entityActionsOf` returns actions in plugin registration order, matching the deleted `registry.entityActions()` behaviour
- [x] 3.3 Write `packages/catalog-api/src/index.ts` exporting the moved surface; verify every name previously exported from `plugins/catalog/src/index.ts` for these modules is still exported from somewhere

## 4. Repoint consumers

- [x] 4.1 Update `plugins/catalog` to import the moved modules from `@backstage-app/catalog-api`, keep re-exporting nothing that moved (per design D4), and switch `entity-screen.tsx` from `registry.entityActions()` to `entityActionsOf(registry)`; verify the catalog plugin's tests pass unchanged
- [x] 4.2 Update `plugins/{techdocs,kubernetes,scaffolder,apis}` imports and `package.json` dependencies; verify each still depends on `@backstage-app/plugin-catalog` only where it genuinely uses a screen
- [x] 4.3 Update `packages/app` where it mounts `EntityPrefsProvider` and any other moved import; verify the app's own tests pass
- [x] 4.4 Verify no source file outside `packages/catalog-api` and `plugins/catalog` imports catalog logic from `@backstage-app/core`, and that `@backstage-app/core` exports no catalog names

## 5. Reports and verification

- [x] 5.1 Run `npm run knip-reports` and commit all changed reports; verify no unlisted dependencies appear and `npm run knip-reports:check` exits zero
- [x] 5.2 Run `npm run typecheck`, `npm run lint -- --max-warnings=0`, and `npm test -- --ci`; verify the full suite passes and that the test-count delta is fully accounted for by tests that moved or were added for the new extension point (no test silently dropped), which is the evidence the move was behaviour-preserving
- [x] 5.3 Run `cd packages/app && npx expo export --platform web`; verify the export succeeds and emits the same routes as before
