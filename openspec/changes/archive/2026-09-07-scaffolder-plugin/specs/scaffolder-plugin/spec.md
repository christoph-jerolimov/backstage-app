## Purpose

The Scaffolder plugin lets users browse software templates, start one with a form
generated from its parameter schema, follow the resulting tasks, and look up the
installed scaffolder actions.

## ADDED Requirements

### Requirement: Create entry lists templates
The app SHALL install a Scaffolder plugin that contributes one "Create" navigation item,
listed after Kubernetes, opening the templates page at route `create`. The page SHALL
list catalog entities of kind Template using the catalog listing fixed to that kind
(type, owner, lifecycle, tag, and text filters), SHALL offer "Tasks" and "Actions"
actions above the filters, and pressing a template row SHALL open the template page.

#### Scenario: Drawer entry
- **WHEN** the app starts
- **THEN** the drawer shows a "Create" entry after "Kubernetes"

#### Scenario: Templates listed
- **WHEN** the Create page is shown in demo mode
- **THEN** the demo templates are listed with their type and owner, and "Tasks" and
  "Actions" are offered

### Requirement: Template page with generated form
The template page at `/create/templates/<namespace>/<name>` SHALL show the template's
title, description, type, owner, tags, and the list of its steps (name and action). It
SHALL load the template's parameter schema (REST:
`/api/scaffolder/v2/templates/<namespace>/template/<name>/parameter-schema`; demo: the
entity's `spec.parameters`) and render one section per schema step containing one field
per property: text input for strings, a chip row for strings with `enum`, numeric input
for numbers and integers, a switch for booleans, and a comma-separated text input for
arrays of strings. Fields SHALL show their title (property name when missing),
description, and a required marker, and SHALL start from the schema's defaults. Fields
whose type is not supported SHALL be listed as unsupported rather than hidden. A "Create"
action SHALL be disabled while required fields are empty.

#### Scenario: Form from schema
- **WHEN** the template page opens for a template whose schema has a required string
  `name`, an enum `visibility` with values public/private (default private), an integer
  `replicas` (default 1), and a boolean `monitoring`
- **THEN** the page shows a text field "Name *", chips Public/Private with Private
  selected, a numeric field with 1, and a switch for monitoring, and "Create" is
  disabled until a name is entered

### Requirement: Starting a template
Pressing "Create" SHALL submit the task with the template reference
`template:<namespace>/<name>` and the form values (REST: `POST /api/scaffolder/v2/tasks`
with `{ templateRef, values }`), then open the task page for the returned task id. A
failed submission SHALL show the error message and keep the form values.

#### Scenario: Task created
- **WHEN** the user completes the form and presses "Create"
- **THEN** a task is created with the entered values and its task page is shown

#### Scenario: Submission fails
- **WHEN** the backend rejects the request
- **THEN** the error message is shown and the entered values remain

### Requirement: Tasks list
The tasks page at `/create/tasks` SHALL list scaffolder tasks newest first (REST: `GET
/api/scaffolder/v2/tasks` with `limit` and `offset`; `createdBy` set to the signed-in
user's entity ref when "Mine" is selected) with status, template title (or reference),
creator, and relative creation time, offering "Mine" / "All" chips ("Mine" default when
signed in, otherwise "All"), a "Load more" action while more tasks exist, and a
"Refresh" action. Pressing a task SHALL open its page. Loading, empty, and error states
SHALL be shown as on other pages.

#### Scenario: Tasks listed
- **WHEN** the tasks page opens in demo mode
- **THEN** the demo tasks are listed with their status, template, and age

### Requirement: Task page
The task page at `/create/tasks/<id>` SHALL load the task (REST: `GET
/api/scaffolder/v2/tasks/<id>`) and its events (REST: `GET
/api/scaffolder/v2/tasks/<id>/events?after=<last id>`), and show the task status,
template, creator, creation time, the parameters, one row per step with a status derived
from the events (pending, processing, completed, failed, skipped, cancelled), the log
messages, and the output links and text when completed. While the task is open or
processing the page SHALL keep polling for new events. It SHALL offer "Cancel" while the
task is open or processing (REST: `POST …/cancel`) and "Retry" when it failed or was
cancelled (REST: `POST …/retry`, opening the new task when the backend returns a new id).

#### Scenario: Running task
- **WHEN** the task page opens for a processing task whose events mark step "fetch" as
  completed and step "publish" as processing
- **THEN** the page shows the task as processing, "fetch" completed, "publish"
  processing, the log so far, and a "Cancel" action, and refreshes as events arrive

#### Scenario: Failed task retried
- **WHEN** the user presses "Retry" on a failed task
- **THEN** the retry request is sent and the page shows the task that runs again

### Requirement: Actions page
The actions page at `/create/actions` SHALL list the installed scaffolder actions (REST:
`GET /api/scaffolder/v2/actions`) sorted by id, each with its id and description, and
for each a collapsible section listing the input and output schema properties (name,
type, required, description) and the usage examples. A text field SHALL filter actions by
id or description.

#### Scenario: Actions listed
- **WHEN** the actions page opens in demo mode
- **THEN** the demo actions are listed and expanding one shows its input properties and
  examples

#### Scenario: Filter actions
- **WHEN** the user types "publish" in the filter
- **THEN** only actions whose id or description contains "publish" remain

### Requirement: Demo mode
Without an active instance the plugin SHALL use bundled demo templates (also present in
the demo catalog), tasks with events, and actions. Starting a demo template SHALL create
an in-memory task whose steps progress on each events poll until it completes.

#### Scenario: Demo task progresses
- **WHEN** a demo template is started and its task page is polled
- **THEN** the task moves from processing to completed with its steps marked in order

### Requirement: Start template entity action
The plugin SHALL contribute an entity action "Start template" available for entities of
kind Template, opening the template page.

#### Scenario: Template entity
- **WHEN** the entity page shows a Template entity
- **THEN** a "Start template" action opens `/create/templates/<namespace>/<name>`
