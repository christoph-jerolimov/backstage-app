## 1. Catalog listing extensions

- [x] 1.1 Make `kind` optional and add `requiredAnnotation` in `plugins/catalog/src/filters.ts` (`buildFilterParam`, `matchesQuery`, `withKind` preserving the annotation); verify unit tests cover the bare annotation pair, omitted kind, and annotation matching in `matchesQuery`
- [x] 1.2 Update `api.ts` (`getFacets(kind?, requiredAnnotation?)`, `buildFacetsQuery` without kind and with the annotation) and `demo-api.ts` (annotations on petstore, shared-ui, payments-api, payments; facets across all kinds when kind is unset); verify unit tests cover the facets query variants and the demo facets for all kinds
- [x] 1.3 Add `allowAllKinds` and `requiredAnnotation` props to `CatalogPage` (All chip, initial kind unset, annotation flowing through the query key) and `CatalogScreen`; verify render tests show "All" selected and mixed kinds for the annotation, and narrowing to API when the API chip is pressed

## 2. TechDocs plugin

- [x] 2.1 Create `plugins/techdocs` (`@backstage-app/plugin-techdocs`, depends on core and plugin-catalog) with `docs-screen.tsx`, `plugin.ts` (route `docs`, nav item "Docs"), `index.ts`, and tests for the plugin definition and the demo listing; verify `npm install` links it and `npm run typecheck` passes
- [x] 2.2 Register `techdocsPlugin` after apis in `packages/app/src/plugins.ts`, add `packages/app/src/app/docs.tsx`, the app dependency, the registry test expectation, and the README plugin list; verify the registry test passes and the README mentions `plugin-techdocs`

## 3. Verification

- [x] 3.1 Run `npm run typecheck`, `npm run lint -- --max-warnings=0`, `npm test -- --ci`; verify all pass
- [x] 3.2 Run `cd packages/app && npx expo export --platform web`; verify `/docs` is emitted
