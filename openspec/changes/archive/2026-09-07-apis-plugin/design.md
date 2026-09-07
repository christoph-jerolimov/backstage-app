## Context

See proposal.md. `CatalogPage({ api, demo, initialFilters })` in `plugins/catalog`
renders the title "Catalog", the kind chips, and the rest of the filters; `CatalogScreen`
wires the API. Plugins are workspace packages; nothing prevents one plugin from
depending on another through npm workspaces (`"@backstage-app/plugin-catalog": "*"`).

## Goals / Non-Goals

**Goals:** ship the APIs entry with zero duplicated listing logic; keep the catalog
page's default behavior byte-for-byte.

**Non-Goals:** API definition rendering (OpenAPI viewer), entity detail pages.

## Decisions

### D1. Configurable `CatalogPage`
New optional props: `title` (default "Catalog"), `description` (default current text),
`fixedKind?: string`. When `fixedKind` is set, initial filters become `{ kind: fixedKind,
text: '' }` and the kind `FilterChips` row is not rendered. `CatalogScreen` gets the same
props and passes them through.

*Alternative*: a separate `EntityListPage` extracted from `CatalogPage`. Rejected for
now: props are enough and keep one component to test.

### D2. `plugins/apis` depends on `plugins/catalog`
`apisPlugin` registers route `apis` with `ApisScreen`, which renders
`<CatalogScreen title="APIs" description="APIs registered in the software catalog."
fixedKind="api" />`. Icon: `{ ios: 'network', android: 'api', web: 'api' }`.

### D3. Registration order
`packages/app/src/plugins.ts`: home, catalog, search, notifications, apis. The drawer
picks it up automatically; the app-level Expo UI entry stays last.

## Risks / Trade-offs

- [Plugin-to-plugin dependency creates coupling] → accepted for a thin composition
  plugin; the catalog package's public surface (`CatalogScreen` props) is the contract.
- [Material icon name `api` may not exist in the symbol set] → the type check on
  `PluginIcon` (a literal union from `expo-symbols`) fails the build if it does not;
  fall back to `webhook` or `data_object` if so.

## Migration Plan

Single PR. Adds a route and a drawer entry; nothing else changes for users.
