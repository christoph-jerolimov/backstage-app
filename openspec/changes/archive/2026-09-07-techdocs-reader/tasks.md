## 1. Core

- [x] 1.1 Add `fetchText` to `createBackstageClient` and `Backstage` (demo rejects) in `packages/core/src/backstage/client.ts` and `provider.tsx`, export the type; verify client tests cover the auth header, text body, and 404 error

## 2. TechDocs plugin

- [x] 2.1 Add `plugins/techdocs/src/html.ts` (`transformDocsHtml`, `resolveDocsLink`, `docsBasePath`, `docsHref`) and `api.ts` (`TechDocsApi`, `createRestTechDocsApi`, `createDemoTechDocsApi` with `demo-docs.ts`); verify unit tests cover base injection, chrome-hiding style, script stripping, link bridge, internal/external resolution, REST paths, cookie failure tolerance, and demo found/not-found
- [x] 2.2 Add `docs-reader.tsx` (WebView) and `docs-reader.web.tsx` (iframe), `techdocs-page.tsx` (`TechDocsPage` states, toolbar, reader), `techdocs-screen.tsx`, the hidden route in `plugin.ts`, exports, and `packages/app/src/app/docs/[kind]/[namespace]/[name].tsx`; verify render tests cover the demo root page, internal link navigation callback, external link callback, not found, and error retry
- [x] 2.3 Add `onSelectEntity` to `CatalogScreenProps`, make `DocsScreen` open the reader, add `onOpenDocs` to the catalog `EntityPage`/`EntityScreen` with the "Documentation" action; verify tests cover the action for annotated and unannotated entities

## 3. Verification

- [x] 3.1 Run `npm run typecheck`, `npm run lint -- --max-warnings=0`, `npm test -- --ci`; verify all pass
- [x] 3.2 Run `cd packages/app && npx expo export --platform web`; verify the docs route is emitted
