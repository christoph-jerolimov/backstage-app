## Context

See proposal.md — Why. The facts this design is built on, all verified rather than assumed:

- Blocking `new Function` and calling `require('@backstage/catalog-model')` **throws during
  the import itself**, before any validator is called. ajv 8.20 compiles the JSON-schema
  meta-schema at module load (`ajv/dist/compile/index.js:89`). So the problem is not "avoid
  the validators" — it is "never let this module be evaluated".
- Hermes does not support that codegen; `hermesc` warns even about `eval`'s lexical scope,
  and `plugins/catalog/src/entity-ref.ts` already carries a note from someone who hit this
  and reimplemented `parseEntityRef` locally.
- CI cannot catch a regression here: the only bundle it produces is `expo export --platform
  web`, and browsers allow `new Function`. A bad import would pass every check and fail on a
  device.
- The app uses exactly four types from the package — `Entity`, `EntityMeta`, `EntityLink`,
  `EntityRelation` — across 17 files, always with `import type`.
- `Entity`'s own definition depends on `JsonObject` from `@backstage/types`, which the
  previous change packaged as `@backstage-app/types`.

## Goals / Non-Goals

**Goals:**

- One place that defines the app's entity model.
- Make the Hermes hazard structurally impossible rather than a rule people must remember.
- Stay in step with upstream's type definitions instead of forking copies that drift.

**Non-Goals:**

- Providing any of upstream's runtime helpers. That is the next change's problem.
- Changing what any screen does. This is an import-graph change.

## Decisions

### D1. `export type { … } from`, not `export *`

The two preceding packages use `export * from '<upstream>'`. **This one must not**, and the
difference is the whole point of the change.

`export type { Entity, EntityMeta, EntityLink, EntityRelation } from '@backstage/catalog-model'`
is erased completely by the TypeScript transform — Babel emits nothing for it, so no
`require` reaches the bundle. `export *` cannot be erased, because the compiler cannot know
which of the re-exported names are values; it emits a real runtime import, catalog-model is
evaluated at app start, ajv calls `new Function`, and the app dies on launch.

So the deviation from the established pattern is not inconsistency — the pattern is
"re-export upstream in whatever way is actually safe", and for a package whose runtime cannot
load, that is the type-only form.

*Alternative — copy the four type definitions into our own source:* also runtime-safe, and
tempting since they are small. Rejected: copies drift silently from upstream, and `Entity`
transitively pulls in `JsonObject` and `EntityMeta`'s index signature, so a copy is a
maintenance liability for no gain over an erased re-export.

### D2. Upstream stays a devDependency

Because nothing imports it at runtime, `@backstage/catalog-model` belongs in
`devDependencies` — which is also where `packages/core` and the plugins already put it, so
this keeps the repo's existing convention rather than inventing one.

The declaration carries meaning here: `dependencies` would advertise it as safe to import at
runtime, which is exactly the mistake this change exists to prevent.

### D3. A guard test, because a comment is not enforcement

`src/__tests__` contains a test that makes `@backstage/catalog-model` explode if it is ever
evaluated, then imports our package:

```
jest.mock('@backstage/catalog-model', () => {
  throw new Error('must never be imported at runtime — see design D1');
});
```

Jest's module registry only invokes that factory if something actually requires the module.
So the test passes today and fails the moment someone changes `export type` to `export`, adds
a value re-export, or imports a constant. That converts "remember to write `import type`"
from a convention into a build failure.

This matters more than a usual guard because of the CI gap: web export and every other check
would stay green. The guard is the only thing standing between a one-word slip and a crash on
device.

### D4. Migrate every call site now, and drop the plugins' direct dependency

Leaving the 17 existing imports pointing at upstream would give the repo two ways to import
`Entity`, one guarded and one not — worse than before, since the new package would suggest
the problem is handled while the unguarded path stayed open.

Removing `@backstage/catalog-model` from the plugins' `package.json` at the same time is what
makes the guard total: with the dependency undeclared, a stray direct import is also a knip
`unlisted dependency` failure in CI, catching it a second way.

`packages/core` never imported it at all, so its devDependency is simply deleted — that
clears the standing knip finding rather than adding one.

## Risks / Trade-offs

- **Someone adds a value export later and the app crashes on device** → D3's guard fails in
  CI, and D4's undeclared dependency makes knip fail too. Two independent nets, because the
  primary net (the web export) does not cover this.
- **The type-only re-export looks inconsistent with the other two packages** → Deliberate and
  documented in D1; the guard test's message names the reason so a reader who finds it in
  isolation understands why.
- **17 files change at once** → Each change is one import specifier and no logic; the tests
  covering those files already exist and must keep passing unchanged, which is the check
  that the migration was purely mechanical.
- **Upstream could move these types into a runtime-only export shape** → They are plain type
  aliases in a `.d.ts`; a change of that kind would be a major-version event and would fail
  our typecheck loudly.
