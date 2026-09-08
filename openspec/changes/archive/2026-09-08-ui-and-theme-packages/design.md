## Context

See proposal.md — Why. What shapes the approach:

- All ten components in `packages/core/src/components` already read theme tokens
  (`useTheme`, `Colors`, `Spacing`, `Fonts`), so the `ui → theme` direction is what the code
  already does; the split makes it explicit rather than creating it.
- `theme.ts` imports `./global.css`, which only exists for the web target and must travel
  with it.
- `useColorScheme` ships as `use-color-scheme.ts` plus a `.web.ts` variant, resolved by
  Metro's platform extensions — the pair has to stay together and keep the same basenames.
- `ThemeProvider` already takes an optional `storage: KeyValueStorage`; it calls core's
  `createPlatformStorage().instances` only as a fallback.
- Nothing left in core imports a component or a theme token, so no reverse dependency needs
  breaking.

## Goals / Non-Goals

**Goals:**

- Three packages whose names describe what is in them, with a dependency direction that runs
  one way.
- A theme package a plugin can depend on without inheriting the Backstage connection.
- Zero behavioural change, evidenced by moved tests passing unmodified.

**Non-Goals:**

- Touching component APIs or token values.
- Splitting `ui` further (primitives vs. composites). Ten components do not need two packages.

## Decisions

### D1. Two packages, not one `ui` package containing the theme

The tokens could live inside `ui` — fewer packages, and every component uses them. Kept
separate because they have different audiences: screens in `packages/app` and the plugins
consume `ThemeProvider`, `useTheme` and `Colors` directly to style their own views, without
necessarily using a shared component. Folding the theme into `ui` would mean depending on a
component library to read a colour.

This also matches the requested shape — `ui` depends on `theme` to pick up colours — and
keeps the direction unambiguous: `theme` never imports from `ui`.

### D2. Make `theme` a leaf package rather than let it depend on `core`

The only thing tying the theme to core is the storage fallback for persisting the preference.

Rather than carry a dependency on the whole Backstage-connection package for that,
`theme` declares its own `KeyValueStorage` (the same three-method shape) and defaults to a
small AsyncStorage adapter. Structural typing means callers can still pass core's storage
object; nothing at any call site changes.

This is the right default on its own merits, not just for the dependency graph: core's
`createPlatformStorage()` returns *two* stores, one of them backed by the platform secure
store for auth sessions. A colour preference is not a secret and has no business reaching for
that machinery.

*Alternative — `theme` depends on `core`:* one less type declaration, but it would make the
design system depend on the networking package, which is the coupling this change exists to
remove. Rejected.

One honest caveat: `theme`'s own test injects core's `createMemoryStorage` helper, so core is
a **devDependency** of `theme`. The leaf claim is about the runtime graph — at runtime the
theme's only dependency is AsyncStorage — and swapping a twelve-line test helper for a
duplicate of itself would be worse than the coupling it removes.

*Alternative — extract a third `storage` package:* correct in the abstract and worth doing if
a third consumer appears. Today there would be two (`theme` and core's own connection code),
and a package for one interface plus one adapter is not worth its own `package.json`.

### D3. Move whole modules with their tests; change only import paths

Every moved file keeps its name, its exports and its implementation. The only edits are
import specifiers and the D2 storage default.

The moved tests are the check: `packages/core/src/components/__tests__` and the theme tests
move alongside their subjects and must pass **unmodified**. If a moved component needed a
test edit, something about it changed, and that is a signal to stop rather than to fix the
test.

### D4. Repoint consumers directly; core re-exports nothing

Core could re-export `ui` and `theme` so no plugin changes. That would leave every plugin
still depending on core for its components — the coupling this change removes — while
looking like it had been fixed, and knip would not flag it.

So every consumer imports from `@backstage-app/ui` or `@backstage-app/theme` and declares
the dependency. Plugins that end up needing nothing from core drop it from their
`package.json`, which is how the split shows up as a real reduction rather than a rename.

## Risks / Trade-offs

- **A large mechanical diff hides a real change** → Same protection as the previous split:
  moved tests must pass unmodified, and the full suite's test count must be accounted for
  exactly. Any edit beyond an import specifier is a signal to stop.
- **The `.web.ts` platform variant breaks if the pair is separated or renamed** → Both files
  move together into the same directory with the same basenames; the web export is what
  proves the resolution still works, since that is the only build that picks the `.web`
  variant.
- **`global.css` is easy to leave behind** → It is imported by `theme.ts`, so leaving it
  would fail the build immediately rather than silently.
- **`theme` declaring its own `KeyValueStorage` duplicates a type** → Three methods, and
  structural typing keeps core's storage assignable to it. The alternative was a dependency
  on the entire connection package (D2).
- **Core keeps shrinking** → It is now a coherent package (plugin system plus connection)
  rather than a grab bag, which is the point. It still exports plenty, so the "remove it if
  empty" condition does not apply.
