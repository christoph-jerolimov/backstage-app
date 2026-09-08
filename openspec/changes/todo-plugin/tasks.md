## 1. Package scaffold and API contract

- [ ] 1.1 Create `plugins/todo/package.json` as `@backstage-app/plugin-todo` matching the `@backstage-app/plugin-techdocs` shape (`private: true`, `main`/`types` → `src/index.ts`), depending on `@backstage-app/catalog-api`, `@backstage-app/core`, `@backstage-app/theme`, `@backstage-app/ui`, with `expo-router`, `expo-web-browser`, `react`, `react-native` as `peerDependencies`; verify `npm install` links it and `npm query .workspace` lists the new workspace
- [ ] 1.2 Create `src/types.ts` declaring `TodoItem` (`text`, `tag`, optional `author`, `viewUrl`, `repoFilePath`, `lineNumber`), `TodoPage` (`items`, `totalCount`, `offset`, `limit`), `TodoQuery` and the `TODO_FIELDS` union, matching the backend contract in design's Context; verify `npm run typecheck` passes with no tsconfig edit
- [ ] 1.3 Implement `buildTodosQuery()` in `src/query.ts` per design D2: `entity` as the stringified ref, `offset`/`limit`, `orderBy` as `repoFilePath=asc`, and one **appended** `filter` parameter per filter with the text filter wrapped in `*…*`; verify unit tests assert two filters produce two `filter` parameters rather than one joined value, and that a text filter is wildcard-wrapped

## 2. Todo API implementations

- [ ] 2.1 Implement `createRestTodoApi()` in `src/api.ts` calling `GET /api/todo/v1/todos` through the connection's `fetchJson` with the query from 1.3, returning the page as the backend sends it; verify a test asserts the exact request path and that the parsed page is passed through unchanged
- [ ] 2.2 Implement `createDemoTodoApi()` in `src/demo-api.ts` over built-in todos keyed by entity ref, applying the same filtering, `repoFilePath` ascending ordering and offset/limit paging as the backend, and returning an empty page for an entity with no demo todos; verify tests assert demo filtering and paging match the REST semantics, including a case-insensitive text match
- [ ] 2.3 Add `useTodoApi()` in `src/use-todo-api.ts` picking the demo API in demo mode and the REST API otherwise, mirroring `useTechDocsApi()`; verify a test renders it under a demo and a live provider and asserts which implementation is returned

## 3. Entity availability

- [ ] 3.1 Implement `entitySourceUrl()` in `src/source-location.ts` per design D1: read `backstage.io/source-location` falling back to `backstage.io/managed-by-location`, parse `<type>:<target>` locally (not via `@backstage/catalog-model`, which cannot be imported at runtime on Hermes), and return the target only for type `url`; verify unit tests cover a url source location, a url managed-by fallback, a `file:` location, a malformed value and no annotation at all
- [ ] 3.2 Add `entityTodoHref()` for the in-app path `/todo/<kind>/<namespace>/<name>` following the `entityDocsHref` style; verify a test asserts the encoded path for a ref with a non-default namespace

## 4. The todo page

- [ ] 4.1 Implement `TodoPage` in `src/todo-page.tsx` taking an entity and an api: list rows showing text, tag, `repoFilePath:lineNumber` and author where present, using `ListCard` and the theme tokens; verify tests cover the spec's "Todos load for an entity" and "Entity has no todos" scenarios
- [ ] 4.2 Add paging per design D3 — append `items`, offer "Load more" only while the number held is below `totalCount`, and use the number held as the next `offset`; verify tests cover "Load more appends the next page" and "No more to load", including a backend that returns fewer items than the requested limit
- [ ] 4.3 Add the text filter and tag chips per design D5 — chips built from tags in the loaded todos plus "All", filters combined with AND, and paging reset when either changes; verify tests cover the spec's four filtering scenarios
- [ ] 4.4 Open a todo's `viewUrl` with `expo-web-browser` when present, and make a row without one inert; verify tests cover both "Opening a todo's source" scenarios
- [ ] 4.5 Implement `TodoScreen` in `src/todo-screen.tsx` for the routed page: load the entity via `useCatalogApi()`, then render the page; show loading, not-found, backend error with retry, and the "no url source location" explanation without sending a todo request, per the spec's "Todo page states"; verify tests cover all four scenarios

## 5. Plugin definition and app wiring

- [ ] 5.1 Define `todoPlugin` in `src/plugin.ts` with the hidden route `todo/[kind]/[namespace]/[name]`, no navigation items, and the "Todos" entity action gated on `entitySourceUrl()` per design D1 and D6 (no `backRoute`, since `createPlugin` only accepts the plugin's own routes); verify tests assert the action is offered for a `url:` location and withheld for a `file:` location and for no annotation
- [ ] 5.2 Create `src/index.ts` exporting the plugin, screen, page, api factories, types and helpers following the export style of `plugins/techdocs/src/index.ts`; verify `npm run typecheck` passes
- [ ] 5.3 Register the plugin in `packages/app/src/plugins.ts`, add the workspace dependency to `packages/app/package.json`, and mount `packages/app/src/app/todo/[kind]/[namespace]/[name].tsx` as a one-line re-export; verify the existing `packages/app/src/__tests__/plugins.test.ts` still passes unchanged, proving the drawer is untouched
- [ ] 5.4 Add `backstage.io/source-location` with a `url:` target to the demo entities that have demo todos in `packages/catalog-api/src/demo-api.ts` per design D7; verify a test asserts the Todos action is offered for those demo entities and the demo page lists their todos

## 6. Reports and verification

- [ ] 6.1 Run `npm run knip-reports` and commit `plugins/todo/knip-report.md`; verify it reports no unlisted dependencies and `npm run knip-reports:check` exits zero
- [ ] 6.2 Run `npm run typecheck`, `npm run lint -- --max-warnings=0`, and `npm test -- --ci`; verify all pass and the new suites are picked up by jest's existing `roots`
- [ ] 6.3 Run `cd packages/app && npx expo export --platform web`; verify the export succeeds and lists the new `/todo/[kind]/[namespace]/[name]` route
