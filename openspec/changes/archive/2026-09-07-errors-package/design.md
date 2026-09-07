## Context

See proposal.md — Why. The constraints that shape the approach:

- Internal packages here are source-only: `private: true`, `main` and `types` both pointing
  at `src/index.ts`, consumed directly as TypeScript through npm workspace links. There is
  no build step and no `dist`, so whatever `src/index.ts` exports is what consumers get.
- `packages/app/tsconfig.json` is the single tsconfig the repo typechecks through (the root
  one just extends it). Its `include` names `../core/src/**` explicitly and globs
  `../../plugins/*/src/**`, so plugins are covered by a wildcard but sibling packages are
  not.
- `expo/tsconfig.base` sets `module: preserve` and `moduleResolution: bundler`, so
  `export *` re-exports both values and types without needing `export type` splits.
- CI now runs `npm run knip-reports:check`, so a new workspace without a committed report
  fails the build.

## Goals / Non-Goals

**Goals:**

- One import site for error handling, whose surface is exactly upstream's and stays that way
  across upgrades without manual maintenance.
- Prove the dependency works on the target runtime rather than assuming it, since the whole
  point of the package is that this dependency is safe to ship to a device.
- Leave the repo ready for features 3-8 to add packages without repeating boilerplate edits.

**Non-Goals:**

- Curating or narrowing upstream's export surface. "Re-export everything" is the
  requirement; deciding which errors the app deserves is a different change.
- Any change to how errors are currently produced or caught (see proposal Non-goals).

## Decisions

### D1. `export *` rather than an explicit re-export list

`src/index.ts` is a single `export * from '@backstage/errors';`.

The requirement is "re-export everything", and `export *` is the only spelling that stays
true to that automatically. An explicit list of the current eighteen exports would silently
go stale the first time upstream adds an error type — the package would claim to re-export
everything while quietly not doing so, and nothing would fail to tell us.

The usual argument for an explicit list is greppability and control over surface area. That
argument applies to a curated facade; it does not apply here, where matching upstream
exactly *is* the contract. `module: preserve` carries types through `export *` without an
`export type` split, so there is no type-erasure caveat.

*Alternative — explicit named re-exports:* rejected as above. If the package later grows
app-specific errors, those get added as ordinary named exports alongside the star; the star
does not prevent that.

### D2. Test behavior, not the export list

The tests assert that the re-exported classes actually *work* under jest-expo's React Native
runtime — that `NotFoundError` carries its name through a `serializeError`/`deserializeError`
round trip, that `ResponseError.fromResponse` reads a real `fetch` `Response`, that
`assertError`/`isError` narrow correctly.

A test that merely asserts eighteen names are truthy would restate D1's star export and pass
even if the module were fundamentally broken on Hermes. The risk worth covering is "this
upstream package misbehaves on React Native", because that is the premise the package rests
on. It also gives features 5-8 a regression net if the re-export style ever changes.

Deliberately **not** asserting an exact export-count snapshot: that would fail on every
harmless upstream addition, which is precisely the maintenance burden D1 avoids.

### D3. Widen the app tsconfig to all sibling packages

Replace the hardcoded `../core/src/**/*.ts{,x}` pair with `../*/src/**/*.ts{,x}`.

Without this the new package is invisible to `npm run typecheck` — its code would compile
only incidentally, when the app imports it, and a package nothing imports yet (which this one
is, by design) would not be typechecked at all. Since the roadmap adds six more packages,
generalizing once is better than six more edits, each of which could be forgotten and would
fail silently rather than loudly.

The glob is `../*/src/**`, matching the existing `../../plugins/*/src/**` treatment. It picks
up `packages/app` itself, which is harmless — those files are already covered by the leading
`**/*.ts` entries.

### D4. `@backstage/errors` as a real dependency of the new package

It is declared in `packages/errors/package.json` `dependencies`, not `peerDependencies` and
not at the root. Peer dependencies are this repo's convention for things *the app supplies*
— React, React Native, Expo modules — where a second copy would break. `@backstage/errors`
is an ordinary library with no such constraint, so the package that needs it declares it.

It is currently in the lockfile only as a transitive dev dependency of
`@backstage/catalog-model`; this promotes it to a declared runtime dependency, which is what
makes it legitimate to import at runtime rather than relying on hoisting — the exact class of
problem the knip work in the previous change fixed.

## Risks / Trade-offs

- **`export *` obscures what the package exports at a glance** → Accepted deliberately per
  D1: the surface is upstream's by definition, and upstream's own API docs are the reference.
  The tests in D2 name the exports that matter in practice.
- **An upstream major bump could change or remove exports without any local signal** →
  The D2 behavior tests fail if the specific errors the app relies on change semantics, and
  the version range is a caret on 1.x, so a major bump is a deliberate act.
- **A package nothing imports yet looks like dead weight** → It is a deliberate step: the
  roadmap's later features consume it, and the alternative (introducing it mid-restructure)
  would mix "does this dependency work on React Native" with "does this refactor work".
  Knip's `dependencies,unlisted` scope does not flag unused workspaces, so it will not fight
  us here.
- **Widening the tsconfig glob pulls future packages into typecheck automatically** →
  Intended. The failure mode it replaces (a package silently not typechecked) is worse than
  the one it creates (a broken new package fails typecheck immediately).
