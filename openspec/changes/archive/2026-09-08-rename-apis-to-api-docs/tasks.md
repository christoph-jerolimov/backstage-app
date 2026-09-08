## 1. Move the files

- [x] 1.1 `git mv plugins/apis plugins/api-docs` and `git mv plugins/api-docs/src/apis-screen.tsx plugins/api-docs/src/api-docs-screen.tsx` per design D3; verify `git status` shows both as renames (`R`), not delete/add
- [x] 1.2 `git mv packages/app/src/app/apis.tsx packages/app/src/app/api-docs.tsx` per design D2; verify the file is the only route file whose name changed

## 2. Rename the plugin's identity

- [x] 2.1 In `plugins/api-docs/package.json`, set `name` to `@backstage-app/plugin-api-docs`, keeping `backstage.role: frontend-plugin` and every other field unchanged
- [x] 2.2 In `plugins/api-docs/src/api-docs-screen.tsx`, rename the component `ApisScreen` → `ApiDocsScreen` and update its doc comment; the rendered `CatalogScreen` props (title, description, `fixedKind`) MUST NOT change
- [x] 2.3 In `plugins/api-docs/src/plugin.ts`, rename `apisPlugin` → `apiDocsPlugin`, set `id` and the route `name` to `api-docs`, set `navItems[0].route` to `api-docs`, and update the `ApiDocsScreen` import; the nav item `title` MUST stay `APIs` and the icon set MUST NOT change (design D2)
- [x] 2.4 Update `plugins/api-docs/src/index.ts` to export `apiDocsPlugin` and `ApiDocsScreen` from the renamed modules
- [x] 2.5 Update `plugins/api-docs/src/__tests__/plugin.test.tsx` for the new imports, and assert the new id and route (`api-docs`) while still asserting the title `APIs`; verify `npm test -- --ci plugins/api-docs` passes

## 3. Rewire the app

- [x] 3.1 In `packages/app/package.json`, replace the `@backstage-app/plugin-apis` dependency with `@backstage-app/plugin-api-docs`, keeping alphabetical order among the other plugin dependencies
- [x] 3.2 In `packages/app/src/plugins.ts`, import `apiDocsPlugin` from `@backstage-app/plugin-api-docs` and use it in the registry, keeping its position between `notificationsPlugin` and `techdocsPlugin`
- [x] 3.3 Update `packages/app/src/app/api-docs.tsx` to re-export `ApiDocsScreen as default` from `@backstage-app/plugin-api-docs`
- [x] 3.4 Run `npm install` to update `package-lock.json` for the renamed workspace; verify the lockfile diff touches only the renamed package path and name (design D4)

## 4. Docs and generated reports

- [x] 4.1 Update `README.md`: the plugin list entry `-apis` becomes `-api-docs`, and the sentence naming which plugins compose the catalog listing says `plugin-api-docs`; verify no other README line still says `plugin-apis`
- [x] 4.2 Regenerate the reports with `npm run api-reports` and `npm run knip-reports` per design D4; verify `plugins/api-docs/report.api.md` exists with the new package name and the `apiDocsPlugin`/`ApiDocsScreen` symbols, and that `plugins/apis/` no longer exists

## 5. Verification

- [x] 5.1 Verify no code, config, or docs still refer to the old names: `grep -rn "plugin-apis\|plugins/apis\|apisPlugin\|ApisScreen\|apis-screen\|apis-plugin" --include="*.ts" --include="*.tsx" --include="*.json" --include="*.md" . --exclude-dir=node_modules --exclude-dir=dist-types` hits only OpenSpec text: archived history, this change's own artifacts, and `openspec/specs/apis-plugin/spec.md`, which the archive step retires
- [x] 5.2 Run `npm run typecheck`, `npm run lint -- --max-warnings=0`, `npm test -- --ci`, `npm run knip-reports:check`, and `npm run api-reports:check`; verify all pass
- [x] 5.3 Run `cd packages/app && npx expo export --platform web`; verify the export succeeds and its route list contains `/api-docs` and no `/apis`
