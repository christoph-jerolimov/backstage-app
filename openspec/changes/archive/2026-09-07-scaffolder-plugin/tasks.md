## 1. Catalog hooks

- [x] 1.1 Add the `toolbar` slot to `CatalogPage`/`CatalogScreen`, `entityTemplateHref` to `entity-ref.ts`, and two Template entities to the demo catalog; verify tests cover the toolbar rendering, the href, and that templates appear under kind Template

## 2. Scaffolder plugin

- [x] 2.1 Create `plugins/scaffolder` with `types.ts`, `api.ts` (REST paths and bodies, demo API with progressing tasks), `demo-data.ts`, `schema-form.ts`, `task-events.ts`; verify unit tests cover REST requests (schema path, task creation body, tasks query, events `after`, cancel, retry, actions), demo task progression, field derivation and completeness, and step statuses from events
- [x] 2.2 Add `schema-form.tsx`, `template-page.tsx`/`template-screen.tsx`, `tasks-page.tsx`/`tasks-screen.tsx`, `task-page.tsx`/`task-screen.tsx` (with `useTaskEvents`), `actions-page.tsx`/`actions-screen.tsx`, `templates-screen.tsx`, `plugin.ts` (nav, hidden routes, entity action), `index.ts`; verify render tests cover the generated form and Create gating, task creation navigation and submission error, tasks list with Mine/All and load more, task page step statuses, cancel and retry, polling to completion in demo mode, and the actions list with filter and expansion
- [x] 2.3 Register the plugin after kubernetes, add the route files under `packages/app/src/app/create/`, the dependency, the registry test expectation, and the README plugin list; verify the registry test passes

## 3. Verification

- [x] 3.1 Run `npm run typecheck`, `npm run lint -- --max-warnings=0`, `npm test -- --ci`; verify all pass
- [x] 3.2 Run `cd packages/app && npx expo export --platform web`; verify the create routes are emitted
