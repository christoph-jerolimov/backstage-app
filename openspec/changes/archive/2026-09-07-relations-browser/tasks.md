## 1. Grouping

- [x] 1.1 Add `plugins/catalog/src/relation-groups.ts` with `RELATION_GROUPS` and `groupRelationsByMeaning` per design D1; verify tests cover the group order, a component with dependencies and APIs, unknown types landing under Other, and an entity without relations

## 2. Browser

- [x] 2.1 Add `relations-page.tsx` (centered entity card, grouped sections, resolved neighbours, breadcrumb, loading/empty/not-found/error states) per designs D2 and D4; verify tests cover grouped sections with resolved names, a dangling reference marked not found, the empty state, the not-found state, and the error with retry
- [x] 2.2 Add `relations-screen.tsx` reading the route parameters and the `path` trail per design D3, register the hidden route and the "Relations" entity action, and add `packages/app/src/app/relations/[kind]/[namespace]/[name].tsx`; verify tests cover re-centering on a neighbour with the extended trail, retracing from a crumb, and the action's availability and target

## 3. Verification

- [x] 3.1 Run `npm run typecheck`, `npm run lint -- --max-warnings=0`, `npm test -- --ci`; verify all pass
- [x] 3.2 Run `cd packages/app && npx expo export --platform web`; verify the relations route is emitted
