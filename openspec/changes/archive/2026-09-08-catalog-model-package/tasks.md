## 1. Package

- [x] 1.1 Create `packages/catalog-model/package.json` as `@backstage-app/catalog-model` (`private: true`, `version: 1.0.0`, `main`/`types` → `src/index.ts`) with `@backstage/catalog-model` in `devDependencies` per design D2; verify `npm install` links it and `npm query .workspace` lists 15 workspaces
- [x] 1.2 Create `packages/catalog-model/src/index.ts` exporting `Entity`, `EntityMeta`, `EntityLink`, `EntityRelation` via `export type { … } from '@backstage/catalog-model'` per design D1, with a comment stating why this is type-only and must not become `export *`; verify `npm run typecheck` passes

## 2. Guard

- [x] 2.1 Add `packages/catalog-model/src/__tests__/no-runtime-import.test.ts` per design D3 that `jest.mock`s `@backstage/catalog-model` with a throwing factory and then imports the package; verify it passes as written
- [x] 2.2 Prove the guard is load-bearing: temporarily add a value re-export (e.g. `export { DEFAULT_NAMESPACE } from '@backstage/catalog-model'`) to `src/index.ts`, confirm the guard test now FAILS, then revert and confirm it passes again

## 3. Migrate call sites

- [x] 3.1 Repoint the 12 files in `plugins/catalog` from `@backstage/catalog-model` to `@backstage-app/catalog-model` per design D4, keeping `import type`; verify no file in the plugin still references the upstream package
- [x] 3.2 Repoint the 4 files in `plugins/kubernetes` and the 1 in `plugins/scaffolder`; verify no source file outside `packages/catalog-model` references `@backstage/catalog-model`
- [x] 3.3 Update `plugins/{catalog,kubernetes,scaffolder}/package.json`: drop the `@backstage/catalog-model` devDependency and add `@backstage-app/catalog-model` to `dependencies` per design D4; verify `npm install` succeeds
- [x] 3.4 Remove the unused `@backstage/catalog-model` devDependency from `packages/core/package.json`; verify `packages/core/knip-report.md` regenerates with no findings

## 4. Reports and verification

- [x] 4.1 Run `npm run knip-reports` and commit all changed reports; verify `packages/core`'s report is now empty, the new package's report is clean, and `npm run knip-reports:check` exits zero
- [x] 4.2 Run `npm run typecheck`, `npm run lint -- --max-warnings=0`, and `npm test -- --ci`; verify all pass with the pre-existing plugin tests unchanged, which is what shows the migration was mechanical
- [x] 4.3 Run `cd packages/app && npx expo export --platform web`; verify the export still succeeds
- [x] 4.4 Verify no runtime import reached the bundle: build the iOS bundle and confirm neither `@backstage/catalog-model` nor `ajv` appears in it
