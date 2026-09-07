## Context

See proposal.md. The entity page renders generic detail rows and relation groups;
`CatalogFilters` covers kind/type/owner/lifecycle/tag/text/annotation. Backstage's
catalog filter syntax accepts relation filters (`relations.ownedBy=<ref>`,
`relations.memberOf=<ref>`); entities carry `relations[]` with the same data locally.
User entities have `spec.profile.{displayName,email,picture}` and `spec.memberOf`; groups
have `spec.type`, `spec.profile`, `spec.parent`, `spec.children`.

## Goals / Non-Goals

**Goals:** readable people/team pages; navigable ownership; demo data that exercises
them.

**Non-Goals:** an org chart, editing memberships, user search beyond the catalog text
filter, avatar image caching.

## Decisions

### D1. Relation filters
`CatalogFilters` gains `ownedBy?: string` and `memberOf?: string` (entity refs).
`buildFilterParam` emits `relations.ownedBy=<ref>` / `relations.memberOf=<ref>`;
`matchesQuery` checks `entity.relations` case-insensitively. `withKind` keeps them.

### D2. Entity page composition
`entity-page.tsx` gains `profileOf(entity)` (displayName, email, picture, initials from
the display name or entity name), `ProfileCard`, `RelatedEntities({ api, filters, title,
groupByKind, onOpenEntity, emptyMessage })` (a `useRemoteData` list keyed by the filter
JSON, rows with title and `entitySubtitle`), and `refListOf(entity, relationType,
specKey, defaultKind)` returning refs from both `spec` and `relations`. For Users:
`ProfileCard`, "Member of" (`refListOf(memberOf, spec.memberOf, 'group')`), "Owned
entities" (`RelatedEntities` with `ownedBy`). For Groups: `ProfileCard` with parent
(`spec.parent` or `childOf` relation) and children (`spec.children` or `parentOf`),
"Members" (`RelatedEntities` with `kind: 'user', memberOf`), "Owned entities". The
generic relation groups skip types covered by the dedicated sections. `DetailRow` gets
an optional `onPress`; owner → `parseEntityRef(owner, 'group')`, system →
`parseEntityRef(system, 'system')`, both with the entity's namespace as default.
`entitySubtitle` in `catalog-page.tsx` returns the user/group summaries.

### D3. Demo data
Group `engineering` (type department, email, children team-platform/team-payments) and
`parent: engineering` on the teams; users `jane.doe` (team-platform), `priya.patel`
(team-platform, team-payments), `john.smith` (team-payments) with emails and pictures;
relations `hasMember`/`memberOf`, `parentOf`/`childOf`; `ownedBy` on the owned entities
already exists.

## Risks / Trade-offs

- [Facet lists change] → the department type appears in the all-kinds type facet; tests
  updated.
- [Large ownership lists] → limited to the page size (50) like every listing.

## Migration Plan

Single PR, additive.
