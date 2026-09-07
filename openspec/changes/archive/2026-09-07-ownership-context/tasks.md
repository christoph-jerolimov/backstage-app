## 1. Core

- [x] 1.1 Add `useOwnership()` per design D1 and export it; verify tests cover a signed-in identity with groups, one without groups, a signed-out connection, and an expired session

## 2. Catalog

- [x] 2.1 Widen `CatalogFilters.ownedBy` to `string | string[]` and emit one `filter` parameter per owner in `buildEntitiesQuery` per design D2, including the empty-list short circuit and local matching; verify tests cover two owners (parameter list and OR semantics), the unchanged single-owner query, the empty list, and demo matching
- [x] 2.2 Add the My entities page (`mine-screen.tsx`, hidden route `mine` with `backRoute` catalog) per design D3; verify tests cover the owned listing and the signed-out state with its Account action
- [x] 2.3 Add `MyTeamsWidget` and `MyEntitiesWidget` (priorities 5 and 15) per design D4 and register them; verify tests cover listing teams, opening a team, listing owned entities, the "See all" link, and the signed-out explanations
- [x] 2.4 Add `packages/app/src/app/mine.tsx` and the README plugin note; verify the web export emits `/mine`

## 3. Verification

- [x] 3.1 Run `npm run typecheck`, `npm run lint -- --max-warnings=0`, `npm test -- --ci`; verify all pass
- [x] 3.2 Run `cd packages/app && npx expo export --platform web`; verify `/mine` is emitted
