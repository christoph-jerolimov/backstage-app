## Context

See proposal.md — Why. What constrains the approach:

- `packages/core` owns the Backstage *connection* (client, auth, instances, provider,
  storage) as well as the plugin contract and shared UI. Only the catalog parts leave here;
  the connection stays, so `catalog-api` will depend on `core`, not the other way round.
- Three plugins declare `entityActions` (catalog, techdocs, kubernetes) and one place reads
  them: `plugins/catalog/src/entity-screen.tsx`, via `registry.entityActions()`.
- `hasAnnotation` has four callers across techdocs and kubernetes.
- `useOwnership` reads `useBackstage()`; `EntityPrefsProvider` reads core's `KeyValueStorage`
  and `createPlatformStorage`. Both keep working from another package as long as it depends
  on core.
- `plugins/catalog/src/entity-ref.ts` also defines cross-plugin href builders
  (`entityDocsHref`, `entityKubernetesHref`, `entityTemplateHref`). They are pure string
  builders with no imports.

## Goals / Non-Goals

**Goals:**

- Core stops knowing what a catalog entity is — verifiably, not by convention.
- Other plugins can use catalog logic without depending on catalog UI.
- Behaviour is bit-for-bit unchanged, and the existing test suite is what proves it.

**Non-Goals:**

- Redesigning the catalog API surface. Modules move; their exports keep their names and
  signatures.
- Solving the same problem for home widgets (see proposal Non-goals).

## Decisions

### D1. The catalog owns its extension point; core provides no hook for it

The hard part is `entityActions`. It is a genuine extension point — techdocs and kubernetes
contribute actions that the catalog's entity screen renders — but its type and its reader
both currently live in core, which is exactly the coupling to remove.

The move:

- `createPlugin` becomes `createPlugin<T extends BackstagePlugin>(definition: T): T`. Because
  `T` is inferred from the argument, a plugin literal carrying extra fields keeps them in the
  type and does not trip excess-property checking. Core validates only what it defines
  (routes, nav items, widget ids) and passes the rest through untouched.
- `catalog-api` declares `interface EntityActionsPlugin extends BackstagePlugin { entityActions?: EntityAction[] }`
  and `entityActionsOf(registry): EntityAction[]`, which reads the field off the registry's
  plugins.

So the contributing plugins keep writing `entityActions: [...]` exactly as before, the
consuming screen swaps `registry.entityActions()` for `entityActionsOf(registry)`, and core
contains no catalog vocabulary at all.

*Alternative — a generic `extensions: Record<string, unknown[]>` bag in core:* more
"correct" in the abstract, and it would serve home widgets too. Rejected as over-built for
one extension point: it erases the type safety plugins have today at the declaration site,
forces every contributor through a helper, and would rewrite far more than this change needs.
A generic bag is worth revisiting if a third extension point appears.

*Alternative — declaration merging from `catalog-api` into core's interface:* keeps call
sites untouched, but makes the contract depend on which packages happen to be imported, which
is worse than an explicit type.

### D2. Split `plugins/catalog` by "is it a screen", not by file size

Moving to `catalog-api`: `entity-ref.ts`, `api.ts`, `demo-api.ts`, `filters.ts`,
`relation-groups.ts`, `use-catalog-api.ts`. Staying: everything that renders — the pages,
screens, widgets and `StarButton`.

The test is whether another plugin could want it without wanting the catalog's UI. All six
qualify: kubernetes needs `entityRefOf`/`stringifyEntityRef`, scaffolder and techdocs need
`EntityRef` and `useCatalogApi`, and `demoEntities` is used as a fixture by two plugins'
tests. `relation-groups.ts` is pure grouping logic over `EntityRelation` with no React.

The href builders move with `entity-ref.ts` even though they name other plugins' routes. They
are string builders over an `EntityRefLike`, they have no imports, and splitting them across
packages to satisfy a naming instinct would leave one file's worth of logic in three places.

### D3. `useOwnership` and `EntityPrefsProvider` move as-is

Both are catalog concepts wearing generic names: ownership is a set of *entity refs*, and the
preferences are starred and recently viewed *entities*. Neither means anything without a
catalog, so both leave core under the requirement.

They keep their implementations and their tests; only the import of core's storage and
provider changes direction (now cross-package rather than relative). `packages/app` updates
where it mounts `EntityPrefsProvider`.

### D4. Repoint consumers directly, do not re-export from `plugins/catalog`

`plugins/catalog` could re-export the moved modules so no other plugin changes. That would
leave the coupling in place while appearing to fix it, and knip would not flag it.

Instead every consumer imports from `@backstage-app/catalog-api` and declares the dependency.
The plugins keep their `@backstage-app/plugin-catalog` dependency only where they genuinely
use a screen (`CatalogScreen`), which makes the remaining coupling visible and intentional in
each `package.json`.

## Risks / Trade-offs

- **A move this size hides a behavioural change** → The moved modules' existing tests move
  with them and must pass unmodified; the plugin tests that exercise them are untouched. Any
  edit beyond an import specifier is a signal to stop, so the diff is reviewable as
  "renames plus import churn".
- **`createPlugin` becoming generic loosens core's validation** → It does not: core still
  validates every field it defines. What it gains is indifference to fields it does not,
  which is the point. Unknown fields were previously rejected by excess-property checking —
  a check that only ever fired on legitimate extensions.
- **`entityActionsOf` reads a field core does not declare** → It is typed through
  `EntityActionsPlugin`, so a plugin that misspells `entityActions` gets no action rather
  than a type error. Mitigated by the existing per-plugin tests that assert each plugin's
  action is present, which is where such a typo would surface.
- **Circular dependency risk between core and catalog-api** → One direction only:
  `catalog-api` → `core`. Removing the catalog members from core is what guarantees it, and
  the typecheck fails loudly if the reverse is ever introduced.
- **Core keeps shrinking; is it still a package?** → Yes: the Backstage connection, plugin
  registry, theme and shared components remain. The next change decides what of that stays.
