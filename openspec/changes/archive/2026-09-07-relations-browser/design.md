## Context

See proposal.md. A catalog entity's payload already carries `relations: { type, targetRef }[]`,
and `entity-page.tsx` groups them with `groupRelations` and labels them with
`relationLabel` (a camelCase splitter), rendering raw refs. `getEntitiesByRefs` (added with
the dashboard change) resolves many refs in one request, and `entityActions` lets a plugin
put a button on the entity page.

## Goals / Non-Goals

**Goals:** answer "what is around this entity and what does it depend on" in one screen;
one hop per tap; no new endpoints.

**Non-Goals:** a drawn node-and-edge graph (unreadable on a phone and a heavy dependency),
transitive dependency closure, filtering the graph, editing relations.

## Decisions

### D1. Grouping is pure and shared
`relation-groups.ts` exports `RELATION_GROUPS` (ordered: Dependencies, APIs, Composition,
Ownership, Membership) mapping each known relation type to a group, plus
`groupRelationsByMeaning(entity)` returning `{ group, rows: { type, targetRef }[] }[]` in
group order with unknown types collected under "Other". Rows keep their relation type so
each is labelled with the existing `relationLabel`, which keeps direction visible
(`Depends on` vs `Dependency of`). Pure, so the grouping is unit-tested without rendering.

### D2. Neighbours resolved in one request
`RelationsPage` loads the centered entity with `getEntityByName` and then resolves every
target ref of that entity with a single `getEntitiesByRefs`. Refs the call does not return
are rendered from the ref itself and marked "not found" — a stale relation is a real
condition in Backstage and hiding it would misrepresent the catalog. Both requests are
keyed by the centered ref through `useRemoteData`, so re-centering refetches.

### D3. The walked path lives in the URL
The route is `relations/[kind]/[namespace]/[name]` with an optional `path` query parameter
holding the previously visited refs, comma-separated. Pressing a neighbour pushes the
neighbour's route with `path` extended by the current ref; the breadcrumb renders `path` in
order and each crumb opens that ref with `path` truncated at it. Keeping the trail in the
URL means the browser's back button, deep links, and the app's own back button all agree,
and no state has to survive unmounting.

### D4. Presentation
Each group renders as a titled section of `ListCard` rows: title = the neighbour's display
name (or the raw ref when unknown), subtitle = `<relation label> · <kind> · <owner>`. The
centered entity sits in a header card with its kind, owner, and an "Open entity page"
action. This reuses the existing card and list primitives, so the page inherits the theme
and needs no new components.

## Risks / Trade-offs

- [A hub entity can have very many relations] → rows are grouped and each group is a plain
  list; the page scrolls. No cap, because hiding relations in a relations browser would
  defeat its purpose.
- [`path` can grow long] → each hop appends one ref; the breadcrumb shows the last few and
  the parameter stays well inside URL limits for realistic walks.

## Migration Plan

Single PR, additive. The entity page keeps its own relation sections; only their subtitles
gain resolved names.
