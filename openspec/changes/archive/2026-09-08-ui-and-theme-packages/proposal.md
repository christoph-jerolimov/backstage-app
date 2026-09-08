## Why

`packages/core` is now three unrelated things in one package: the plugin contract and
registry, the Backstage connection, and a small design system — ten shared components plus
the colour tokens, the theme provider and the scheme hooks they all read.

A plugin that only wants a `ThemedText` currently imports the package that also owns the
auth session and the plugin registry, and anything touching the theme drags the whole of
core along. Splitting the design system out gives plugins a dependency the size of what they
actually use, and gives the theme a home that does not depend on how the app talks to a
backend.

## What Changes

- Add **`packages/theme`** as `@backstage-app/theme`: the colour and spacing tokens, the
  `ThemeProvider`, and the `useColorScheme`/`useTheme`/scheme-resolution hooks.
- Add **`packages/ui`** as `@backstage-app/ui`: the ten shared components — `ActionButton`,
  `Collapsible`, `ExternalLink`, `FilterChips`, `HintRow`, `ListCard`, `Page`, `StateView`,
  `TextFilter`, `ThemedText`, `ThemedView`.
- **`ui` depends on `theme`** for its colours and spacing; `theme` depends on neither `ui`
  nor `core`.
- Make **`theme` a leaf package**. Its provider already accepts an injected `storage` prop
  and only falls back to core's `createPlatformStorage()`; that fallback becomes a direct
  AsyncStorage adapter with a locally declared `KeyValueStorage` shape, so the theme no
  longer depends on the Backstage connection package to remember a colour preference.
- Repoint every consumer across the app and all ten plugins.

## What core keeps, and why it is not removed

The change description said to remove `packages/core` if it ends up exporting nothing. It
does not: after this split it still owns the **plugin contract and registry**
(`createPlugin`, `createPluginRegistry`, `PluginRegistryProvider`), the **Backstage
connection** (client, auth, instances, provider, platform storage), `useRemoteData` and
`formatRelativeTime`. None of that is UI or theme, and none of it belongs in a design-system
package, so core survives as a smaller, coherent package. Recorded here so the conditional
does not look overlooked.

## Non-goals

- **Not** redesigning any component or token. Modules move; their props, names and rendering
  are untouched, and their existing tests move with them and must pass unmodified.
- **Not** moving `useRemoteData` or `formatRelativeTime` into `ui`. Neither renders anything;
  a data-fetching hook in a component library would be the same category error this change
  is fixing.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

None. Every screen renders exactly what it rendered before from exactly the same code; only
the package it is imported from changes. Sets `skip_specs: true`.

## Impact

- **New** `packages/theme/` and `packages/ui/`, each with its moved tests and a
  `knip-report.md`.
- **`packages/core`**: `components/`, `theme.ts`, `theme-provider.tsx`, `global.css` and the
  two scheme hooks are deleted; `index.ts` shrinks to the plugin system, the connection and
  the two utilities.
- **`packages/app` and all ten plugins**: imports repointed, `package.json` dependencies
  updated.
- No new third-party dependencies. No behavioural or bundle change beyond module identity.
