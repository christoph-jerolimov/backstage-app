## Why

`TODO` and `FIXME` comments are the backlog a team actually writes down, and they are
invisible from the catalog. Backstage already solves this: the community
`@backstage-community/plugin-todo-backend` scans an entity's source location and serves the
comments it finds over a stable HTTP contract. Nothing in this app reads it, so a service's
outstanding work is one tab away in the Backstage web UI and nowhere at all on a phone.

The entity page is where someone already goes to ask "what is the state of this service?",
and it already has an extension point for exactly this — the entity actions the TechDocs and
Kubernetes plugins use. A Todo plugin is a small addition that makes a real backend the app
can already reach useful.

## What Changes

- Add **`plugins/todo`** as `@backstage-app/plugin-todo`, matching the plugin package shape
  the other ten plugins share (`private`, `main`/`types` → `src/index.ts`, no build step).
- **A Todo API** over the community backend's documented contract:
  `GET /api/todo/v1/todos` with `entity`, `offset`, `limit`, `orderBy` and repeatable
  `filter` parameters, returning `{ items, totalCount, offset, limit }` where each item has
  `text`, `tag`, and optional `author`, `viewUrl`, `repoFilePath` and `lineNumber`.
- **An entity Todo page** at the hidden route `todo/[kind]/[namespace]/[name]`, listing the
  entity's todos with a text filter, a tag filter, and "Load more" paging, each row opening
  its `viewUrl` in the browser when the backend supplied one.
- **A "Todos" entity action** on the catalog entity page, available only for entities the
  backend can actually serve — see the availability rule below.
- **A demo Todo API** so the page works with no backend configured, as every other plugin
  does, plus a source-location annotation on the demo entities that carry demo todos.

## The availability rule is the interesting part

The backend resolves an entity's source through `getEntitySourceLocation`, which reads
`backstage.io/source-location` and falls back to `backstage.io/managed-by-location`, then
**rejects anything whose location type is not `url`**. The catalog stamps
`backstage.io/managed-by-location` onto essentially every ingested entity, so "has a
location annotation" would put a Todos action on almost everything, much of it leading to a
page that can only fail.

The action is therefore offered only when the entity carries a location annotation whose
value parses as `url:…` — the same condition the backend enforces, checked client-side.

## Non-goals

- **No drawer entry.** Unlike Docs and Kubernetes, whose annotations mark a genuine subset
  of the catalog, nearly every entity has a `url:` location — so a "browse entities with
  todos" page would be the catalog again under a different name. The entity action is the
  entry point.
- **Not creating, editing or completing todos.** The backend is read-only; it scans source.
- **No column sorting UI.** The list is ordered by file path so paging is deterministic and
  the reading order groups a file's todos together.
- **Not adding the todo backend to any Backstage deployment.** This is the client half.

## Capabilities

### New Capabilities

- `todo-plugin`: the Todo API over the community todo backend, the entity todo page and its
  filtering and paging, the entity action and when it is offered, and the demo behavior.

### Modified Capabilities

- `demo-plugins`: the bundled-plugin list gains the todo plugin, and the requirement's
  claim that every bundled plugin contributes exactly one navigation item no longer holds —
  the todo plugin contributes an entity action and a hidden route instead.

## Impact

- **New** `plugins/todo/` — `package.json`, `src/`, `src/__tests__/`, `knip-report.md`.
- **`packages/app`**: `package.json` gains the workspace dependency, `src/plugins.ts`
  registers the plugin, and a one-line route file mounts
  `src/app/todo/[kind]/[namespace]/[name].tsx`.
- **`packages/catalog-api`**: `demoEntities` gain `backstage.io/source-location` on the
  entities that have demo todos. No behavior change for any other plugin — the annotation is
  read by nothing else.
- **No new third-party dependency.** The plugin uses the existing connection client and the
  shared UI and theme packages.
