## Context

See proposal.md — Why. What shapes the approach:

- `@backstage-app/errors`, merged last change, set the pattern this one follows: source-only
  internal package, upstream in `dependencies`, a single `export *`, and tests that assert
  behaviour under the React Native runtime rather than that names exist.
- The important structural difference: `@backstage/errors` is almost entirely runtime
  classes, so "test the behaviour" was straightforward. `@backstage/types` is the opposite —
  eleven of thirteen exports are types that erase completely at compile time, leaving only
  `createDeferred` and `durationToMilliseconds` executable.
- `expo/tsconfig.base` sets `module: preserve` and `moduleResolution: bundler`; the repo
  typechecks through `packages/app/tsconfig.json`, whose `include` already globs
  `../*/src/**` after the previous change.

## Goals / Non-Goals

**Goals:**

- Match upstream's surface exactly and keep matching it without maintenance.
- Give each export a check proportional to what it actually is, so the suite means something
  rather than performing coverage.
- Prove the one assumption the package depends on: that `export *` really does carry
  type-only exports to consumers.

**Non-Goals:**

- Testing TypeScript itself. The compile-time assertions exist to catch a broken re-export,
  not to re-derive language semantics.
- Runtime assertions about types. A type has no runtime existence; asserting one is
  `undefined` proves nothing and would be noise.

## Decisions

### D1. `export *`, matching the errors package

`src/index.ts` is a single `export * from '@backstage/types';`. Same reasoning as last change:
"re-export everything" is the contract, and only the star stays true to it when upstream adds
an export. Two consistent packages also make the pattern obvious to whoever adds the third.

### D2. Split the tests by what each export actually is

The suite has two halves, because the exports divide cleanly and a single approach would be
dishonest about one of them:

**Runtime half — real behavioural tests.** `createDeferred` gets its actual contract
exercised: that `resolve` settles it with the value (adopting a promise if given one), that
`reject` rejects it, and that settling a second time is a no-op rather than an error.

One finding worth pinning: the declared type is `Promise<T> & { resolve, reject }`, but the
runtime value is **not** a `Promise` instance. Upstream returns a `Deferred` object that
merely delegates `then`/`catch`/`finally` to a private promise, so `x instanceof Promise` is
`false` while `await x`, `Promise.all([x])` and friends all work. Code branching on
`instanceof Promise` would silently take the wrong path, so the tests assert both halves of
that — the negative and the fact that the Promise machinery still adopts it. `durationToMilliseconds` gets checked across each `HumanDuration` field and a
combination of fields, including the documented approximations (365-day years, 30-day months,
fixed 24-hour days) — which are exactly the kind of thing a caller would otherwise guess at.

**Type-only half — compile-time assertions.** For the eleven erased exports, the typecheck
*is* the test. Assignability assertions (a helper that only accepts a value of the named type,
plus `@ts-expect-error` on values that must be rejected) fail the build if the type is missing,
renamed, or structurally wrong. `@ts-expect-error` is doubly useful: it fails not only when a
bad value is accepted, but also when the error stops occurring, so it cannot rot silently.

*Alternative — assert the type-only exports at runtime:* impossible by construction, and the
nearest thing (`expect(SomeType).toBeUndefined()`) would pass whether or not the type exists.
Rejected as theatre.

### D3. Explicitly prove `export *` carries types

One assertion imports a type-only export *through this package* rather than from upstream, and
uses it in a position where a missing type is a compile error.

This is the single load-bearing assumption of the whole package: if `export *` dropped types,
every type-only export would silently vanish for consumers while the package still built and
its runtime tests still passed. It is cheap to pin and expensive to discover later, and it is
what makes D1's star defensible for a mostly-type package rather than merely inherited from
the errors package.

### D4. No export-count snapshot

As with the errors package, the tests do not assert "there are exactly thirteen exports". Such
an assertion fails on every harmless upstream addition — the precise maintenance burden D1
exists to avoid — while catching nothing a targeted assertion misses.

## Risks / Trade-offs

- **A package with no consumers looks like dead weight** → Deliberate, and the same call as
  the errors package: features 7 and 8 consume it, and introducing it mid-feature would
  entangle "does this dependency work here" with "does this feature work". Knip's
  `dependencies,unlisted` scope does not flag unused workspaces.
- **Compile-time assertions are invisible in the jest output** → The file still runs under
  jest so its runtime half reports normally, and the type half fails `npm run typecheck`,
  which CI runs before tests. Both halves are therefore enforced; only one is *reported* as a
  test count. Documented here so a future reader does not mistake the type assertions for
  dead code and delete them.
- **`@ts-expect-error` suppresses whatever error occurs, not the one intended** → Kept
  narrow: one expression per directive, each on a value that is wrong for exactly one reason.
- **Upstream could turn a type-only export into a runtime one (or vice versa)** → The
  compile-time assertions still hold, since they only assert assignability. A type becoming a
  value is additive and harmless; a value becoming type-only would fail the runtime half
  loudly.
