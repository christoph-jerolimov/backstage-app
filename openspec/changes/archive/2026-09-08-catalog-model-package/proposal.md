## Why

Three plugins import `Entity` and friends straight from `@backstage/catalog-model`, each
declaring it as their own devDependency, while `packages/core` declares it and never uses it
at all — knip already flags that as an unused devDependency. There is no single place that
says what the app's entity model is.

Worse, the dependency is a loaded gun. `@backstage/catalog-model` **cannot be imported at
runtime on Hermes**: ajv compiles the JSON-schema meta-schema with `new Function` at module
load, so a plain `import` throws on device. Today that is avoided only by every call site
independently remembering to write `import type`. Nothing enforces it, and CI would not
catch a slip — the pipeline only exports for web, where `new Function` is legal.

## What Changes

- Add **`packages/catalog-model`** as `@backstage-app/catalog-model`, exporting the entity
  model the app actually uses: `Entity`, `EntityMeta`, `EntityLink`, `EntityRelation`.
- Export them with **`export type { … } from`**, which TypeScript erases entirely. Upstream
  therefore stays a **devDependency** and never becomes a runtime import — the danger above
  is designed out rather than remembered. **This is deliberately not the `export *` that
  `@backstage-app/errors` and `@backstage-app/types` use**; a star here would emit a real
  runtime import and crash the app on launch.
- Add a **guard test** that fails if anything in the package ever pulls
  `@backstage/catalog-model` in at runtime, so the constraint is enforced rather than
  documented.
- **Migrate all 17 call sites** across `plugins/catalog`, `plugins/kubernetes`, and
  `plugins/scaffolder` to import from the new package, and drop their direct
  `@backstage/catalog-model` devDependency.
- **Remove the unused `@backstage/catalog-model` devDependency from `packages/core`**,
  clearing the standing knip finding.

## Non-goals

- **Not** re-exporting upstream's runtime surface — the `RELATION_*` and `ANNOTATION_*`
  constants, `parseEntityRef`, the `isXEntity` guards, the validators. None of it can be
  imported here. The relation strings are currently hardcoded 82 times across the repo and
  deserve constants, but those must be *declared locally* rather than re-exported, and
  relation semantics belong with the catalog API extraction that follows this change.
- **Not** touching `plugins/catalog/src/entity-ref.ts`, which reimplements
  `parseEntityRef`/`stringifyEntityRef` locally for exactly the Hermes reason above. It stays
  until the catalog API package gives it a home.
- **Not** widening the exported model beyond what the app uses. The kind-specific types
  (`ComponentEntity`, `UserEntity`, …) are not imported anywhere today.

## Capabilities

### New Capabilities

None. This is a structural change: the same types, imported from a different place, with no
difference in what the app does. It sets `skip_specs: true`, as the preceding package
changes did.

### Modified Capabilities

None.

## Impact

- **New** `packages/catalog-model/` — `package.json`, `src/index.ts`, `src/__tests__/`,
  `knip-report.md`.
- **17 files** across three plugins change one import line each.
- **`packages/core/package.json`**: unused devDependency removed.
- **`plugins/{catalog,kubernetes,scaffolder}/package.json`**: swap the upstream
  devDependency for a dependency on `@backstage-app/catalog-model`.
- Knip reports regenerate; `packages/core`'s report should become clean.
- **Zero runtime and bundle impact by construction** — the exports erase at compile time.
