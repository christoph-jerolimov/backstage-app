## Why

APIs are a first-class thing people look up in Backstage, and the catalog plugin already
knows how to list and filter entities of any kind. An "APIs" entry in the drawer gives
that view a direct, discoverable home without duplicating the catalog code.

## What Changes

- Make the catalog page configurable: an optional fixed kind that hides the kind selector,
  plus custom title and description. The default catalog page keeps today's behavior.
- Add a new `plugins/apis` package (`@backstage-app/plugin-apis`) that registers an "APIs"
  navigation item and mounts the catalog page fixed to kind `api` with the title "APIs".
  It depends on `@backstage-app/plugin-catalog` for the page and data layer.
- Register the plugin in the app after Notifications; add the `apis` route file.
- README: plugin list updated.

## Capabilities

### New Capabilities
- `apis-plugin`: the APIs navigation entry and the fixed-kind API listing.

### Modified Capabilities
- `catalog-plugin`: new requirement for the configurable fixed-kind mode (ADDED).
- `app-navigation`: drawer contents scenario now includes APIs.
- `demo-plugins`: the bundled-plugins requirement now lists apis as well.

## Impact

- `plugins/catalog/src/catalog-page.tsx` (props `title`, `description`, `fixedKind`),
  `plugins/catalog/src/catalog-screen.tsx` (pass-through props).
- New `plugins/apis/` package with `plugin.ts`, `apis-screen.tsx`, `index.ts`, tests.
- `packages/app/package.json`, `packages/app/src/plugins.ts`, `packages/app/src/app/apis.tsx`.
- No new external dependencies.
