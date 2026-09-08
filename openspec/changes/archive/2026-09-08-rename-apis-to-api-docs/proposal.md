## Why

The plugin that lists API entities lives at `plugins/apis` and calls itself `apis`. Upstream
Backstage calls the same plugin `api-docs` (`@backstage/plugin-api-docs`, mounted at
`/api-docs`), and this repo otherwise follows upstream's plugin names — `catalog`, `techdocs`,
`scaffolder`, `kubernetes`, `search`, `notifications`, `todo` all match. `apis` is the one that
does not, so a contributor who knows Backstage looks for `api-docs` and does not find it.

The bare name is also the weaker one: `apis` reads as "the APIs of this app" — which, since the
previous change added an `report.api.md` to every workspace, is now a real and separate thing in
this repo.

## What Changes

- Rename the workspace directory `plugins/apis` → **`plugins/api-docs`** and the package
  `@backstage-app/plugin-apis` → **`@backstage-app/plugin-api-docs`**.
- Rename the plugin's identity to match: id `apis` → **`api-docs`**, route `apis` →
  **`api-docs`**, exports `apisPlugin` → **`apiDocsPlugin`** and `ApisScreen` →
  **`ApiDocsScreen`**, and the module `src/apis-screen.tsx` → `src/api-docs-screen.tsx`.
- Rename the app's route file `packages/app/src/app/apis.tsx` → **`app/api-docs.tsx`**, which is
  what moves the page's URL.
- **BREAKING (user-visible):** the page's path changes from `/apis` to **`/api-docs`**. An
  existing `/apis` deep link or bookmark stops resolving. Nothing in the repo links to `/apis` —
  verified by search — so this affects only saved external links.
- The **drawer label stays "APIs"**, as upstream keeps it. Only the identity and the path change,
  not what the user reads.
- Regenerate `plugins/api-docs/report.api.md` (the package name and both exported symbols appear
  in it) and update the README's plugin list.

## Non-goals

- **No change to what the page does.** It remains the catalog listing fixed to kind `api`, with
  the same title, description, and filters.
- **No `/apis` redirect.** Expo Router would need a dedicated stub route to serve one, and a
  demo app with no external consumers does not warrant carrying a permanent alias for a path
  that has never been published.
- **Not renaming any other plugin.** The rest already match upstream.

## Capabilities

### New Capabilities

- `api-docs-plugin`: the API-docs plugin — an "APIs" entry in the main navigation opening the
  catalog listing fixed to API entities, at route `api-docs`. This replaces `apis-plugin`; its
  two requirements carry over unchanged apart from the route.

### Modified Capabilities

- `apis-plugin`: both requirements are REMOVED — the capability is retired and replaced by
  `api-docs-plugin` above.
- `app-navigation`: the drawer-contents scenario names the installed plugins by id, so `apis`
  becomes `api-docs`. The drawer's rendered contents do not change.
- `demo-plugins`: the bundled-plugins requirement names the installed plugins by id, so `apis`
  becomes `api-docs`. The set of bundled plugins does not change.

## Impact

- **`plugins/api-docs/`**: the whole workspace — `package.json`, `src/plugin.ts`,
  `src/api-docs-screen.tsx`, `src/index.ts`, `src/__tests__/plugin.test.tsx`, `report.api.md`,
  `knip-report.md`.
- **`packages/app`**: `package.json` dependency, `src/plugins.ts` import and registry entry, and
  the route file `src/app/apis.tsx` → `src/app/api-docs.tsx`.
- **`package-lock.json`**: the workspace path and package name.
- **`README.md`**: the plugin list and the sentence describing which plugins compose the catalog
  listing.
- No change to any other plugin, to `packages/core`, or to the app's behavior beyond the path.
