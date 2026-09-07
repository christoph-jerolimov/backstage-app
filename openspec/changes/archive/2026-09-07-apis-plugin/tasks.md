## 1. Catalog page configuration

- [x] 1.1 Add `title`, `description`, and `fixedKind` props to `CatalogPage` (hide the kind chips and seed the kind when fixed) and pass them through `CatalogScreen`; verify render tests show no "Kind" row and only API entities for `fixedKind="api"`, and that the default page still shows the Kind row with Component selected

## 2. APIs plugin

- [x] 2.1 Create `plugins/apis` (`@backstage-app/plugin-apis`, depends on core and plugin-catalog) with `apis-screen.tsx`, `plugin.ts` (route `apis`, nav item "APIs" after Notifications), `index.ts`, and a test asserting the plugin definition; verify `npm install` links the package and `npm run typecheck` passes (including the icon name)
- [x] 2.2 Register `apisPlugin` in `packages/app/src/plugins.ts` after notifications, add `packages/app/src/app/apis.tsx`, add the dependency to `packages/app/package.json`; verify the registry test expects `["Home", "Catalog", "Search", "Notifications", "APIs"]`
- [x] 2.3 Update README plugin list; verify it mentions `plugin-apis`

## 3. Verification

- [x] 3.1 Run `npm run typecheck`, `npm run lint -- --max-warnings=0`, `npm test -- --ci`; verify all pass
- [x] 3.2 Run `cd packages/app && npx expo export --platform web`; verify `/apis` is emitted
