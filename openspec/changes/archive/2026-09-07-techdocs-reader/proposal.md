## Why

The Docs page lists documented entities but cannot show their documentation; users must
switch to the Backstage web UI. TechDocs sites are static HTML built by MkDocs and served
by the TechDocs backend, so the app can render them in place on every platform.

## What Changes

- Add a TechDocs reader page to `@backstage-app/plugin-techdocs` at the hidden route
  `docs/[kind]/[namespace]/[name]` (with a `path` query parameter for sub-pages). It
  loads the built HTML from the TechDocs backend
  (`/api/techdocs/static/docs/<namespace>/<kind>/<name>/<path>index.html`), strips the
  MkDocs chrome (header, sidebars, tabs, footer), rewrites relative URLs against the
  static docs base, and renders it in a WebView on iOS/Android and an iframe on web.
  Links inside the docs navigate within the reader; external links open in the browser.
- Loading, not-found ("no index.md" hint for the root), and error-with-retry states.
- Demo mode ships a small documentation site (index and a sub-page) for each annotated
  demo entity so the reader works without a backend.
- Rows on the Docs page open the reader instead of the entity page; the entity details
  page gains a "Documentation" action when the entity carries the TechDocs annotation.
- Before loading protected sites in REST mode the plugin requests the TechDocs backend's
  user cookie (`/api/techdocs/.backstage/auth/v1/cookie`) so static assets (CSS, images)
  referenced by the page can load; failures are ignored.
- Core: the Backstage client gains `fetchText` (authenticated text/HTML fetch) next to
  `fetchJson`.

## Capabilities

### New Capabilities
- none

### Modified Capabilities
- `techdocs-plugin`: new requirements for the reader page, its navigation and states,
  demo docs, and Docs rows opening the reader.
- `catalog-plugin`: the entity details page offers a Documentation action for
  documented entities.
- `backstage-connection`: the connection exposes an authenticated text fetch.

## Impact

- `plugins/techdocs/src`: new `api.ts` (`TechDocsApi`, REST + demo), `demo-docs.ts`,
  `html.ts` (`transformDocsHtml`, `resolveDocsLink`), `docs-reader.tsx` /
  `docs-reader.web.tsx`, `techdocs-page.tsx`, `techdocs-screen.tsx`, route in
  `plugin.ts`; `DocsScreen` passes its own row handler.
- `plugins/catalog/src`: `CatalogScreenProps.onSelectEntity` override; entity page
  Documentation action.
- `packages/core/src/backstage/client.ts` and `provider.tsx`: `fetchText`.
- `packages/app/src/app/docs/[kind]/[namespace]/[name].tsx`; `react-native-webview` is
  already a dependency (mocked in Jest).
