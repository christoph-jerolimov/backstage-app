## Context

See proposal.md. Verified against `@backstage/plugin-scaffolder-backend@3.3.1` and
`@backstage/plugin-scaffolder-common@2.0.1`: routes `GET /v2/actions`, `GET /v2/tasks`
(`createdBy[]`, `limit`, `offset` → `{ tasks, totalTasks? }`), `GET /v2/tasks/:id`,
`GET /v2/tasks/:id/events?after=`, `POST /v2/tasks` (`{ templateRef, values, secrets? }`
→ `{ id }`), `POST /v2/tasks/:id/cancel`, `POST /v2/tasks/:id/retry` (`{ id }`), and
`GET /v2/templates/:namespace/:kind/:name/parameter-schema` → `{ title, description?,
steps: [{ title, description?, schema }] }`. Tasks carry `spec.templateInfo.entityRef`,
`spec.parameters`, `spec.steps[{ id, name, action }]`, `spec.user.ref`, `spec.output`
(after completion the output is exposed on the task as `output`), and events are
`{ id, type: 'log' | 'completion' | 'cancelled' | 'recovered', body: { message,
stepId?, status?, output? }, createdAt }`. Templates are catalog entities of kind
Template with `spec.parameters` (one JSON schema or an array) and `spec.steps`.

## Goals / Non-Goals

**Goals:** browse/start/follow/inspect on a phone; the common parameter field types; a
usable demo.

**Non-Goals:** custom `ui:field` extensions (EntityPicker, RepoUrlPicker render as text
fields), secrets, dry-run, log streaming over SSE (polling only), autocomplete,
templating-extension docs.

## Decisions

### D1. API surface
`ScaffolderApi { getParameterSchema(ref), createTask(templateRef, values), listTasks({
createdBy?, limit, offset }), getTask(id), getEvents(id, after?), cancelTask(id),
retryTask(id), listActions() }`. REST via `fetchJson` on `/api/scaffolder/v2/...`.
Demo: `demo-data.ts` holds two templates (`template:default/nodejs-service` with a
two-step schema, `template:default/docs-site`), three tasks with events (completed
with output links, failed at a step, processing), and six actions. `createDemoScaffolderApi()`
keeps mutable state: `createTask` appends a processing task; each `getEvents` call
advances it one step (log + step completion) and finally emits completion.

### D2. Schema → fields (pure)
`schema-form.ts`: `fieldsFromSchema(schema) → SchemaField[]` reading `properties`,
`required`, `title`, `description`, `type`, `enum`, `default`, `items.type`; kinds
`text`, `select`, `number`, `boolean`, `list`, `unsupported`. `initialValues(steps)`,
`isComplete(steps, values)` (required fields non-empty), `coerce(field, raw)`.
`SchemaForm` renders sections and fields with testIDs `field-<name>`.

### D3. Task events → step status
`task-events.ts`: `stepStatuses(task, events)`: every step starts `pending`; a log event
with `stepId` and `body.status` sets that step's status; a `completion` event sets the
remaining pending steps to `skipped` when the task completed, or leaves them pending
when it failed; `cancelled` marks processing/pending steps cancelled. Log lines are
events of type `log` (message, stepId, time). Output comes from `task.output` or the
completion event's `body.output`.

### D4. Polling
`TaskPage` uses `useRemoteData` for the task and a `useTaskEvents(api, id, active)` hook
that appends events every 2 s while `active` (task open/processing) using `setTimeout`
chaining in an effect (state updates only in callbacks), then reloads the task when a
completion/cancelled event arrives.

### D5. Routes and wiring
Plugin routes: `create` (nav "Create", icon `plus.square.on.square` / `add_box`),
hidden `create/templates/[namespace]/[name]`, `create/tasks/index`, `create/tasks/[taskId]`,
`create/actions` (all backRoute `create`). `CatalogPage`/`CatalogScreen` gain `toolbar?:
ReactNode`. `entityTemplateHref(ref)` in catalog's `entity-ref.ts`. Entity action "Start
template" for kind Template. The tasks list uses `useBackstage().session?.userEntityRef`
for "Mine".

## Risks / Trade-offs

- [Long-poll events endpoint] → requests use the shared abort signal and a 2 s cadence;
  the backend answers immediately when events exist.
- [Complex schemas] → unsupported kinds are listed, not silently dropped, so the user
  knows to use the web UI.

## Migration Plan

Single PR, additive.
