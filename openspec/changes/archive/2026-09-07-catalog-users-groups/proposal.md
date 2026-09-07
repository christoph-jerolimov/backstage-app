## Why

Users and groups are catalog entities, but the entity page treats them like components:
a kind row and raw relation references. Backstage's org views show who a person is, which
teams they belong to, who is in a team, and what a team owns; the app needs the same to
be useful for finding owners and teammates.

## What Changes

- Entity page views for kind User: a profile card (display name, email, avatar initials
  or picture), a "Member of" list of the user's groups, and an "Owned entities" list.
- Entity page views for kind Group: a profile card (display name, email, type, parent
  group, child groups), a "Members" list of users with names and emails, and an "Owned
  entities" list grouped by kind.
- "Owned entities" and "Members" are loaded from the catalog (`relations.ownedBy` and
  `relations.memberOf` filters; the same semantics locally in demo mode) and every row
  opens the entity's page.
- Owner and system rows on any entity page become pressable and open the referenced
  entity (owners default to kind group, systems to kind system).
- Catalog listing rows for users show the display name and email, and for groups the
  type and email, instead of the component-oriented summary.
- Demo data gains an `engineering` department group with two child teams, three users
  with profiles and memberships, and the matching relations.

## Capabilities

### New Capabilities
- none

### Modified Capabilities
- `catalog-plugin`: new requirements for user and group views, navigable owner/system
  rows, and user/group listing summaries; the entity list requirement's row summary is
  modified.

## Impact

- `plugins/catalog/src`: `filters.ts` (`ownedBy`, `memberOf`), `entity-page.tsx`
  (profile card, members, owned entities, pressable rows), `catalog-page.tsx`
  (`entitySubtitle`), `demo-api.ts`, tests.
- No new dependencies; no app changes.
