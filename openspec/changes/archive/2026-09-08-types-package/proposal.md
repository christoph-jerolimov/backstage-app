## Why

The app has no shared vocabulary for the shapes Backstage passes around. JSON payloads are
typed ad hoc, and the subscription contract the roadmap's signals work needs
(`Observable`/`Observer`/`Subscription`) does not exist here at all — it would otherwise be
invented locally and drift from what the backend actually speaks.

`@backstage/types` is the upstream definition of exactly that vocabulary, and it is the
cheapest dependency available: zero dependencies, no Node builtins, and effectively zero
bundle cost, because eleven of its thirteen exports erase at compile time and the two
runtime helpers are tiny. Adding it as a package now, alongside `@backstage-app/errors`,
gives the later features a place to import from instead of each inventing its own.

## What Changes

- Add **`packages/types`** as `@backstage-app/types`, matching the shape
  `@backstage-app/errors` established last change (`private`, `main`/`types` →
  `src/index.ts`, upstream in `dependencies`, no build step).
- **Re-export everything** from `@backstage/types` with a single `export *`: the JSON
  shapes (`JsonValue`, `JsonObject`, `JsonArray`, `JsonPrimitive`), the observable trio
  (`Observable`, `Observer`, `Subscription`), the deferred pair (`DeferredPromise`,
  `createDeferred`), the duration pair (`HumanDuration`, `durationToMilliseconds`), and the
  type utilities (`Expand`, `ExpandRecursive`).
- Add tests split by what is actually testable: real behavioural tests for the two runtime
  helpers, and **compile-time** assertions for the eleven type-only exports — including one
  that proves `export *` carries type-only exports through, which is the single assumption
  this package rests on.
- Commit the package's `knip-report.md`, as every workspace now does.

## Non-goals

- **Not** consuming the types anywhere yet. No existing file changes; the signals and
  permissions features are what will import `Observable` and friends.
- **Not** replacing hand-rolled JSON typings that already exist in plugin code. Migrating
  those is a separate, reviewable change.
- **Not** adding app-specific types. The package starts as a pure re-export, as the errors
  package did.

## Capabilities

### New Capabilities

None. This adds an internal library package with no consumers and changes nothing the app
exposes to a user, so it sets `skip_specs: true` in its `.openspec.yaml` — the same
treatment the errors package and the knip tooling received.

### Modified Capabilities

None.

## Impact

- **New** `packages/types/` — `package.json`, `src/index.ts`, `src/__tests__/`,
  `knip-report.md`.
- **Root `package-lock.json`**: `@backstage/types` promoted from a transitive dev
  dependency to a declared runtime dependency.
- **No tsconfig change needed** — the previous change widened `include` to `../*/src/**`,
  so this package is typechecked automatically. That generalization paying off here is the
  intended outcome.
- No existing source file changes. Bundle impact effectively zero even once imported.
