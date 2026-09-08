## Context

See proposal.md — Why. The constraints that shape the approach:

- The plugin is one of the smallest in the repo: `plugin.ts`, a one-component screen that
  delegates to `CatalogScreen`, an `index.ts`, and one test file. It has no state, no API client,
  and no other plugin depends on it.
- The app mounts plugin pages by **file name**: `packages/app/src/app/<route>.tsx` is a one-line
  re-export, and Expo Router derives the URL from that file's name. The `route` in the plugin's
  `navItems` must match it.
- A search across the repo for `/apis`, `plugin-apis`, `apisPlugin`, and `ApisScreen` found
  references in exactly six files plus the generated `report.api.md`, `knip-report.md`, and
  `package-lock.json`. Nothing constructs the `/apis` path dynamically.
- The repo now commits an API report per workspace, so renaming an exported symbol shows up as a
  reviewable diff in `report.api.md` rather than silently.

## Goals / Non-Goals

**Goals:**

- End with a workspace whose directory, package name, plugin id, route, and exported symbols all
  say the same thing, and which matches what upstream Backstage calls this plugin.
- Keep the rename a rename: no behavior, styling, or copy changes riding along.

**Non-Goals:**

- Preserving the `/apis` path in any form (see proposal — Non-goals).
- Touching the `report.api.md` files of any other workspace. The rename is contained.

## Decisions

### D1. Rename the capability rather than editing `apis-plugin` in place

The spec capability is named after the plugin, so leaving `openspec/specs/apis-plugin/` behind
while the code says `api-docs` would reintroduce exactly the naming split this change removes.

OpenSpec delta specs cannot move a capability directory, so the rename is expressed the way the
schema supports: `api-docs-plugin` is an **ADDED** capability carrying both requirements, and
`apis-plugin` has both of its requirements **REMOVED**, which retires the old spec on archive.
Requirement text carries over verbatim except for the route.

*Alternative — keep `apis-plugin` and MODIFY the route requirement:* a smaller delta, rejected
because the capability name is the thing being corrected.

### D2. The route file name is the URL

`packages/app/src/app/apis.tsx` → `app/api-docs.tsx` is what actually changes the path; the
`route: 'api-docs'` in `navItems` only has to agree with it. Both must move together — a mismatch
produces a drawer entry that navigates nowhere, which typecheck will not catch because
`navItems.route` is a plain string.

The plugin's `id` moves to `api-docs` as well. It is not user-visible, but it is the plugin's
identity in the registry and in the two spec capabilities that list installed plugins by id.

### D3. Use `git mv` for the directory and the route file

Renaming through `git mv` keeps the file history attached, which matters most for the screen
component and the test — the two files with content worth blaming later. Content edits happen
after the move, as a separate step, so the diff reads as "renamed, then edited" rather than
"deleted and added".

### D4. Regenerate the reports rather than hand-editing them

`report.api.md` names the package in its header and both exported symbols in its body;
`knip-report.md` is keyed to the workspace path. Both are generated artifacts with a CI check
(`api-reports:check`, `knip-reports:check`), so they are regenerated with `npm run api-reports`
and `npm run knip-reports` and the result committed. Hand-editing them would drift from what the
generator produces and fail CI.

`package-lock.json` likewise regenerates from `npm install`, which rewrites the workspace path
and package name.

## Risks / Trade-offs

- **A saved `/apis` bookmark breaks** → accepted and stated in the proposal. The app is not
  published and nothing in the repo links to that path.
- **A stale `dist/` or `.expo/` cache can keep serving the old route locally** → both are
  gitignored build output; a fresh `npx expo export --platform web` in the verification step
  proves the new path is what actually builds.
- **`npm install` may reorder unrelated parts of `package-lock.json`** → check the lockfile diff
  covers only the renamed workspace before committing.

## Migration Plan

No data or configuration migration. The change is a single commit; reverting it restores the old
path in full.
