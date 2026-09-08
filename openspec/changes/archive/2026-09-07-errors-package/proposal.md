## Why

The app talks to a Backstage backend but has no shared vocabulary for the errors that
backend returns. Today `packages/core` defines a single ad-hoc `BackstageApiError` carrying
a numeric `status`, and every caller re-derives meaning from it by hand — the same
`error instanceof BackstageApiError && error.status === 404` check is written out in six
places across the catalog and techdocs plugins.

Backstage already publishes that vocabulary as `@backstage/errors`: typed errors
(`NotFoundError`, `AuthenticationError`, `ConflictError`, …), a `ResponseError` that reads a
Backstage error response, and the serialize/deserialize pair the backend uses on the wire.
Wrapping it in our own package gives the app one import site for error handling and a seam
where app-specific errors can live next to the upstream ones.

`@backstage/errors` is safe to ship here: it pulls only `@backstage/types` and
`serialize-error`, touches no Node builtins, and was measured bundling through Metro for iOS
at roughly 10 KB and nine modules. Its behavior was verified under the React Native runtime,
including `ResponseError.fromResponse` against a real `fetch` `Response`.

## What Changes

- Add **`packages/errors`** as `@backstage-app/errors`, following the existing internal
  package shape (`private`, `main`/`types` → `src/index.ts`, no build step).
- **Re-export everything** from `@backstage/errors` — all eighteen exports — so the app has
  a single place to import error types from, and `@backstage/errors` becomes a real
  runtime dependency rather than a transitive dev-only one.
- Add tests that exercise the re-exports under the jest-expo React Native runtime, so the
  package proves the dependency actually works on the target platforms rather than merely
  re-exporting names.
- Generalize `packages/app/tsconfig.json`'s `include` from the hardcoded `../core/src/**`
  to cover every sibling package, so this package — and the ones features 3-8 add — are
  typechecked without another edit each time.
- Commit the package's `knip-report.md`, as every workspace now does.

## Non-goals

- **Not migrating `BackstageApiError`.** Core's own error type stays exactly where it is and
  keeps its current consumers in `plugins/catalog` and `plugins/techdocs`. Replacing it with
  `ResponseError` means changing every `error.status === 404` call site to `error.response.status`
  (or to `instanceof NotFoundError`), and touching the client's error path. That is a
  behavioral change to error handling and belongs with the core restructuring in features 5
  and 6, not in a change whose job is to stand the package up. Flagged here so it is clearly
  deferred rather than missed.
- **Not** adding app-specific error subclasses yet. The package starts as a pure re-export;
  it earns extra surface when something needs it.

## Capabilities

### New Capabilities

None. This adds an internal library package and changes no behavior the app exposes to a
user — no screen, navigation, or data-fetching behavior differs. The change therefore sets
`skip_specs: true` in its `.openspec.yaml`, matching how the repo treats tooling and
structural work.

### Modified Capabilities

None.

## Impact

- **New** `packages/errors/` — `package.json`, `src/index.ts`, `src/__tests__/`,
  `knip-report.md`.
- **`packages/app/tsconfig.json`**: `include` widened to all sibling packages.
- **Root `package-lock.json`**: `@backstage/errors` promoted from a transitive dev
  dependency to a declared runtime dependency of the new package.
- No existing source file changes; nothing imports the new package yet.
- Bundle impact only once something imports it: about 10 KB.
