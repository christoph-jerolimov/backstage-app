## Why

Software templates are how Backstage users create new components, and the roadmap asks
for a mobile way to browse them, start one, follow the resulting task, and look up the
installed actions. Nothing in the app talks to the Scaffolder backend yet.

## What Changes

- Add `plugins/scaffolder` (`@backstage-app/plugin-scaffolder`) with a "Create"
  navigation entry after Kubernetes. Its page lists Template entities from the catalog
  (catalog listing fixed to kind `template`, with the usual filters) and links to the
  Tasks and Actions pages.
- Template page (hidden route `create/templates/[namespace]/[name]`): shows the
  template's description, type, owner, tags, and steps, and renders a form generated
  from the template's parameter schema (`GET
  /api/scaffolder/v2/templates/<namespace>/template/<name>/parameter-schema`; the
  entity's `spec.parameters` in demo mode) supporting string (free text, enum choices),
  number/integer, boolean, and string-array fields with defaults, required markers, and
  multi-step sections. "Create" posts the task (`POST /api/scaffolder/v2/tasks` with
  `{ templateRef, values }`) and opens the task page.
- Tasks page (hidden route `create/tasks`): lists tasks (`GET /api/scaffolder/v2/tasks`,
  "Mine"/"All" chips using the signed-in user's entity ref, newest first) with status,
  template, and age; a row opens the task.
- Task page (hidden route `create/tasks/[taskId]`): status, template, parameters,
  per-step status derived from the task events (`GET
  /api/scaffolder/v2/tasks/<id>/events?after=<n>`, polled while the task is open or
  processing), the log, output links, and Cancel / Retry actions
  (`POST …/cancel`, `POST …/retry`).
- Actions page (hidden route `create/actions`): lists installed actions (`GET
  /api/scaffolder/v2/actions`) with id, description, collapsible input/output schema
  properties and examples, filtered by a text field.
- Demo mode ships two demo templates (added to the demo catalog), sample tasks with
  events, and a small action catalog; starting a demo template creates an in-memory task
  that progresses on each poll.
- The catalog listing gains an optional toolbar slot (used for the Tasks/Actions links);
  Template entities get a "Start template" entity action.

## Capabilities

### New Capabilities
- `scaffolder-plugin`: navigation entry and templates list, template page and form,
  task creation, tasks list, task page with events and actions, actions page, demo mode.

### Modified Capabilities
- `catalog-plugin`: the listing accepts a toolbar slot rendered above the filters.
- `app-navigation`: drawer contents gain Create after Kubernetes.
- `demo-plugins`: bundled plugin list gains scaffolder.

## Impact

- New `plugins/scaffolder/src`: `api.ts` (REST + demo), `demo-data.ts`, `schema-form.ts`
  (schema → fields) and `schema-form.tsx` (renderer), `task-events.ts` (step status from
  events), pages and screens, `plugin.ts`.
- `plugins/catalog`: `CatalogPage`/`CatalogScreen` `toolbar` prop; demo entities gain two
  templates; `entityTemplateHref` helper.
- `packages/app`: registration, routes `create.tsx`, `create/templates/[namespace]/[name].tsx`,
  `create/tasks/index.tsx`, `create/tasks/[taskId].tsx`, `create/actions.tsx`.
- No new third-party dependencies.
