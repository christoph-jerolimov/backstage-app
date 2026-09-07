## Context

See proposal.md. The Docs page reuses `CatalogScreen`, whose rows open the entity page
(`/entity/...`) since feature 3. Hidden routes with a back button exist in the plugin
contract. `react-native-webview` is installed (auth flow) with a Jest mock. The
TechDocs backend serves `/static/docs/<ns>/<kind>/<name>/<path>` (protected by a user
cookie policy in recent releases; the cookie is issued by the backend's
`/.backstage/auth/v1/cookie` endpoint), `/metadata/techdocs/...`, and an SSE `/sync/...`
endpoint. Backstage's own reader fetches `index.html`, removes `.md-header`,
`.md-sidebar`, `.md-tabs`, `.md-footer`, rewrites relative URLs to the static base, and
intercepts anchor clicks.

## Goals / Non-Goals

**Goals:** read built docs on all platforms; in-site navigation; auth for the HTML
document itself; a demo site.

**Non-Goals:** triggering builds (`/sync` SSE), search inside docs, a table of contents
sidebar, offline caching.

## Decisions

### D1. Core `fetchText`
`createBackstageClient` returns `{ fetchJson, fetchText }` sharing the auth/error logic;
`Backstage.fetchText` is added (demo rejects like `fetchJson`).

### D2. TechDocs API
`TechDocsApi { getEntityDocs(ref, path, signal): Promise<string>; ensureCookie?(): Promise<void> }`.
`createRestTechDocsApi(fetchText, fetchJson)`: `getEntityDocs` fetches
`${docsBase(ref)}/${path}index.html` where `docsBase` =
`/api/techdocs/static/docs/<ns>/<kind>/<name>`; `ensureCookie` calls
`fetchJson('/api/techdocs/.backstage/auth/v1/cookie', { credentials: 'include' })` and
swallows errors. `createDemoTechDocsApi()` serves `demo-docs.ts`: a map from entity ref
to `{ '': html, 'getting-started/': html }` with MkDocs-material-like markup, throwing
`BackstageApiError(404)` for unknown refs or paths.

### D3. HTML transformation (pure, tested)
`transformDocsHtml(html, { baseUrl })` in `html.ts`: injects `<base href="<baseUrl>">`
(the page's own directory, with trailing slash), a `<style>` hiding
`.md-header, .md-sidebar, .md-tabs, .md-footer, .md-top` and letting `.md-content`
fill the width, and a `<script>` that intercepts anchor clicks and posts
`{ type: 'techdocs-link', href: <absolute href> }` to the host (via
`window.ReactNativeWebView.postMessage` or `window.parent.postMessage`). Also removes
`<script>` tags from the source (MkDocs search/instant-loading), keeping the page static.
`resolveDocsLink(href, siteBase)` returns `{ kind: 'internal', path }` when `href` is
inside `siteBase` (path = directory of the target, without `index.html`; hash kept
separately) or `{ kind: 'external', url }`.

### D4. Reader component
`DocsReader({ html, baseUrl, onLink })` — native: `WebView` with `source={{ html,
baseUrl }}`, `onMessage` parsing `techdocs-link`, `originWhitelist={['*']}`;
`docs-reader.web.tsx`: `<iframe srcDoc sandbox="allow-scripts allow-same-origin">` with
a `message` listener filtered to the iframe's `contentWindow`. `TechDocsPage({ entityRef,
path, api, siteBaseUrl, onNavigate, onOpenExternal })` handles states with
`useRemoteData` keyed by ref+path and renders `DocsReader`; a small toolbar shows the
current path and a "Site root" action when `path` is non-empty.
`TechDocsScreen` reads `kind/namespace/name/path` params, builds the API via
`useBackstage()` (demo vs REST), calls `ensureCookie` once per instance, and maps
`onNavigate(path)` to `router.setParams({ path })`, `onOpenExternal` to
`expo-web-browser`'s `openBrowserAsync` (web: `window.open`).

### D5. Wiring
Route `docs/[kind]/[namespace]/[name]` (hidden, title "Docs", backRoute `docs`), file
`packages/app/src/app/docs/[kind]/[namespace]/[name].tsx`. `docsHref(ref, path?)` in
techdocs. `CatalogScreenProps` gains `onSelectEntity` (overrides the default entity
navigation); `DocsScreen` passes `router.push(docsHref(entityRefOf(entity)))`. The
catalog entity page shows a "Documentation" `ActionButton` when annotated, via a new
`EntityPage` prop `onOpenDocs?: (ref) => void` that `EntityScreen` wires to
`router.push('/docs/...')` (the path convention is documented; no package dependency
from catalog to techdocs).

## Risks / Trade-offs

- [Assets on protected instances] → the cookie request is best effort; on web it is
  cross-site and may be dropped by the browser, leaving unstyled but readable content.
- [Scripts stripped] → MkDocs features needing JS (search, tabs) are not available.
- [`<base>` changes hash links] → the injected script handles same-page hashes by
  scrolling instead of posting.

## Migration Plan

Single PR, additive.
