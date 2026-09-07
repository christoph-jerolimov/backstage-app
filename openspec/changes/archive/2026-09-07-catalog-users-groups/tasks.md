## 1. Catalog plugin

- [x] 1.1 Add `ownedBy` and `memberOf` to `CatalogFilters`, `buildFilterParam`, `matchesQuery`, and `withKind`; extend the demo data per design D3; verify tests cover the REST filter pairs, local matching, and the new demo users/groups
- [x] 1.2 Add the profile card, "Member of", "Members", and "Owned entities" sections, pressable owner/system rows, the relation-group skipping, and the user/group listing summaries; verify render tests cover the user page, the group page with members and owned entities, parent navigation, the owner row, and the listing subtitles

## 2. Verification

- [x] 2.1 Run `npm run typecheck`, `npm run lint -- --max-warnings=0`, `npm test -- --ci`; verify all pass
