## Context

See proposal.md — Why, and specs/todo-plugin/spec.md for the behaviour contract. What
shapes the approach:

- The backend contract was read from the published package
  (`@backstage-community/plugin-todo-backend@0.25.0`), not from memory:
  `GET /v1/todos` mounted at `/api/todo`, with `entity` (required — the service throws
  `InputError: Entity filter is required to list TODOs` without it), `offset`, `limit`,
  `orderBy` as a single `field=asc|desc` string, and `filter` as a **repeatable**
  `field=value` string where `*` is a wildcard. Sortable and filterable fields are exactly
  `text | tag | author | viewUrl | repoFilePath`. The response is
  `{ items, totalCount, offset, limit }` and `TodoItem` is
  `{ text, tag, author?, viewUrl?, repoFilePath?, lineNumber? }`.
- `TodoReaderService.listTodos` resolves the entity through `getEntitySourceLocation` and
  rejects any location whose type is not `url`. It also clamps `limit` to a server-side
  maximum and `offset` to zero, so the client cannot rely on getting exactly what it asked
  for — only on the `offset`/`limit`/`totalCount` echoed back.
- The repo has an established shape for an entity-scoped plugin page: TechDocs and
  Kubernetes each pair a hidden `<name>/[kind]/[namespace]/[name]` route with an entity
  action, a `create<Rest|Demo>XApi` pair, and a `useXApi()` hook that picks between them.
- Since the last two changes the shared code is split: `@backstage-app/core` (plugin
  contract, connection, `useRemoteData`), `@backstage-app/catalog-api` (entity refs, entity
  actions, `useCatalogApi`), `@backstage-app/ui` (components) and `@backstage-app/theme`.

## Goals / Non-Goals

**Goals:**

- Speak the backend's documented contract exactly, including the parts that are easy to get
  subtly wrong (repeated `filter`, `orderBy` as one string, wildcards).
- Offer the action only where it can work, so the app never routes someone to a page whose
  only possible outcome is a 400.
- Be usable on a phone: a text filter and tag chips rather than a sortable, filterable
  table.

**Non-Goals:**

- Reimplementing the upstream table UI. The mobile page is a list.
- Client-side sorting. Ordering is the backend's, for the reason in D4.

## Decisions

### D1. Availability is `url:`-shaped location, not "has an annotation"

`hasAnnotation(entity, ANNOTATION_SOURCE_LOCATION) || hasAnnotation(entity, ANNOTATION_LOCATION)`
is the obvious predicate and it is wrong. The catalog stamps
`backstage.io/managed-by-location` onto essentially every ingested entity, so that predicate
puts a Todos action on nearly the whole catalog — and the backend then rejects every entity
whose location is not `url` type (a `file:` location from a local catalog file, for
instance). The action would mostly lead to an error page.

So the predicate parses the annotation value and requires the `url` type, mirroring
`getEntitySourceLocation` plus the service's own type check. The parse is a local helper
rather than `@backstage/catalog-model`'s `parseLocationRef`, for the reason
`@backstage-app/catalog-model` documents at length: that package cannot be imported at
runtime on Hermes, and this predicate runs on every entity page render.

*Alternative — offer the action always and let the page explain:* rejected. An action that
usually fails trains people to ignore actions.

### D2. `TodoApi` is a `createRestTodoApi` / `createDemoTodoApi` pair behind `useTodoApi()`

Exactly the shape of `useTechDocsApi()` and `useKubernetesApi()`. The REST implementation
builds the query string; the demo one filters, orders and pages an in-memory list with the
same semantics, which is what makes the spec's "same meaning locally in demo mode"
testable rather than aspirational.

The query builder is a separate pure function so the contract details have direct tests:
one `filter` parameter **appended per filter** (not joined), `orderBy` as
`repoFilePath=asc`, and the text filter wrapped in `*…*` because the backend treats `*` as
the wildcard and an unwrapped value is an exact match. That last one is the difference
between "search" and "search that silently returns nothing".

### D3. Paging is driven by the echoed response, not by what was asked for

The service clamps `limit` to a server maximum. So the page appends `items` and decides
whether more remain by comparing the number of todos it now holds against `totalCount`,
rather than assuming it received the page size it requested. Requesting the next page uses
the count held as the next `offset`.

### D4. Ordered by `repoFilePath` ascending, with no sort control

Two reasons, one of which is correctness. Without `orderBy` the backend returns items in
scan order, which is stable in practice but not contractually — and paging over an
unstable order duplicates and drops rows. Fixing the order makes paging sound. Grouping a
file's todos together is also the most useful reading order on a small screen. A sort
control is a table affordance the mobile list does not have room for.

### D5. Tag chips are built from the todos already loaded

The backend offers no "list the distinct tags" endpoint, and inventing a fixed
`TODO | FIXME` list would be wrong for any deployment that configured
`additionalTags` in its `createTodoParser`. So the chips are derived from the tags present
in what has been loaded, always including "All".

The honest limitation: a tag that appears only in a not-yet-loaded page has no chip until
that page is loaded. The alternative — a request that pages through everything just to
collect tags — costs the whole list to populate a filter. Documented rather than hidden.

### D6. The page has no back route, and that is a constraint rather than a choice

`createPlugin` validates that a route's `backRoute` is one of **that plugin's own** routes,
and the app's header back button falls back to `/` when there is none. The natural fallback
for a todo page opened by deep link is the catalog, which the catalog plugin owns, so the
todo plugin cannot name it. Rather than widen `createPlugin` in core for one plugin, the
route omits `backRoute`: with history the back button behaves normally, and a cold deep
link backs out to Home.

Widening the contract — letting `backRoute` name any installed plugin's route, validated
against the registry rather than at module load — is a reasonable follow-up for core, but
it is a core change and does not belong in a plugin's first commit.

### D7. Demo todos live with the plugin; the annotation lives with the demo entities

`createDemoTodoApi` carries the built-in todos, keyed by entity ref, as
`createDemoTechDocsApi` carries the demo docs. The two demo entities that get todos also
need `backstage.io/source-location` in `packages/catalog-api`'s `demoEntities`, or D1's
predicate hides the action and the demo path is unreachable. That is a one-line annotation
per entity read by nothing else.

## Risks / Trade-offs

- **The backend may not be installed** → An app pointed at a Backstage without the todo
  backend gets a 404 for every request. The page surfaces the backend's message and a
  retry, the same as every other plugin page against a missing backend; there is no way to
  detect it more cheaply than asking.
- **The action's predicate can disagree with the backend** → It checks the location's
  *shape*, not whether the backend can actually read that URL (a private repository with no
  integration configured still parses as `url:`). The page's error state is the backstop.
  The predicate's job is to remove the certainly-impossible, not to guarantee success.
- **`totalCount` is computed over the filtered set** → The backend applies filters before
  counting, so the "Load more" decision stays correct under a filter; but it means the
  count shown is the count matching the filter, not the entity's total. The page labels it
  as the number of todos listed rather than the entity's todo count.
- **Demo entities gain an annotation that suggests a real source** → The demo
  `url:` targets point at the same `example/...` GitHub paths the demo entities already use
  in `github.com/project-slug`, so nothing new is implied about where the demo data comes
  from.
