/**
 * The Backstage entity model the app works with.
 *
 * IMPORTANT: these are re-exported with `export type`, which TypeScript erases
 * completely, so nothing here reaches the bundle at runtime. That is not a
 * stylistic choice — unlike `@backstage-app/errors` and `@backstage-app/types`,
 * which re-export their upstream with `export *`, this package MUST NOT.
 *
 * `@backstage/catalog-model` cannot be imported at runtime on Hermes at all: it
 * depends on ajv, which compiles the JSON-schema meta-schema with `new Function`
 * while the module is still being evaluated. A plain `import` therefore throws on
 * device before any validator is ever called. An `export *` cannot be erased —
 * the compiler has no way to know which re-exported names are values — so it
 * would emit a real import and the app would die on launch.
 *
 * This is also why `@backstage/catalog-model` is a devDependency here: it is
 * needed to typecheck, never to run. `src/__tests__/no-runtime-import.test.ts`
 * enforces that, because our CI only bundles for web, where `new Function` is
 * legal and the failure would not show up.
 */
export type { Entity, EntityLink, EntityMeta, EntityRelation } from '@backstage/catalog-model';
