# analytics-api

## Purpose

Defines the analytics event the app speaks, how events reach the Backstage backend, the
contextual metadata carried with them, and the navigation event the app reports on its own
so every plugin page is measured without the plugin doing anything.

## Requirements
### Requirement: Analytics event shape
An analytics event SHALL carry an `action` naming what happened, a `subject` naming what it
happened to, an optional numeric `value`, optional `attributes` whose values are strings,
booleans or numbers, and a `context` object. The `context` SHALL always carry `pluginId`,
`routeRef` and `extension`, and MAY carry further string, boolean or numeric entries. The
shape SHALL match the event Backstage's own analytics API defines, so an event produced by
the app is one a Backstage analytics implementation already understands.

#### Scenario: Event carries the required fields
- **WHEN** a `navigate` event for the catalog page is captured
- **THEN** the event has action `navigate`, subject `/catalog`, and a context with
  `pluginId`, `routeRef` and `extension`

#### Scenario: Optional fields are omitted
- **WHEN** an event is captured with neither a value nor attributes
- **THEN** the event carries no `value` and no `attributes`

### Requirement: Capturing events through the analytics context
Any component in the app SHALL be able to obtain a tracker and capture an event by naming
an action, a subject, and optionally a value and attributes. The tracker SHALL fill the
event's `context` from the analytics contexts enclosing the component. Contexts SHALL be
additive: a nested context adds to and overrides the attributes of the contexts around it,
and the innermost value wins. A component outside any analytics context SHALL still be able
to capture events, with `pluginId`, `routeRef` and `extension` reported as unknown.

#### Scenario: Enclosing context is attached
- **WHEN** a component inside a context declaring `pluginId: "catalog"` captures a `click`
  event
- **THEN** the captured event's context reports `pluginId` as `catalog`

#### Scenario: Nested contexts combine
- **WHEN** a context declaring `pluginId: "catalog"` encloses one declaring
  `extension: "EntityPage"` and a component inside both captures an event
- **THEN** the event's context reports both `pluginId` `catalog` and `extension`
  `EntityPage`

#### Scenario: Inner context overrides outer
- **WHEN** a context declaring `routeRef: "catalog"` encloses one declaring
  `routeRef: "entity"`
- **THEN** an event captured inside both reports `routeRef` as `entity`

#### Scenario: No enclosing context
- **WHEN** a component with no analytics context around it captures an event
- **THEN** the event is still captured and its context reports `pluginId`, `routeRef` and
  `extension` as unknown

### Requirement: Delivery to the Backstage backend
When a Backstage instance is configured and analytics are enabled, captured events SHALL be
delivered to the analytics endpoint of that instance as an authenticated JSON POST whose
body is a batch of events. Events SHALL be batched rather than sent one request per event:
a batch SHALL be sent once it reaches the batch size, once the flush interval has elapsed
since the oldest queued event, or when the app leaves the foreground. The endpoint path
SHALL default to the Backstage analytics path and SHALL be configurable.

#### Scenario: Batch is sent when full
- **WHEN** the batch size is 10 and a tenth event is captured
- **THEN** one request is sent carrying all 10 events and the queue is emptied

#### Scenario: Batch is sent when the interval elapses
- **WHEN** 3 events are queued and the flush interval elapses
- **THEN** one request is sent carrying those 3 events

#### Scenario: Batch is sent when the app is backgrounded
- **WHEN** events are queued and the app moves to the background
- **THEN** the queued events are sent immediately rather than waiting for the interval

#### Scenario: Request is authenticated
- **WHEN** a batch is sent for an instance with a valid session
- **THEN** the request carries that session's bearer token

### Requirement: Analytics never disrupt the app
Capturing an event SHALL NOT block the caller, and a delivery failure SHALL NOT surface as
an error to the component that captured the event, nor produce a visible error state. A
batch that fails to send SHALL be dropped rather than retried indefinitely, and the failure
SHALL be reported only as a warning on the developer console.

#### Scenario: Backend rejects the batch
- **WHEN** the analytics endpoint responds with 500
- **THEN** the app continues normally, nothing is shown to the user, and the failed batch
  is not resent

#### Scenario: Backend is unreachable
- **WHEN** the request rejects because the device is offline
- **THEN** capturing further events still succeeds and no error is raised to any component

### Requirement: Automatic navigation event
The app SHALL capture a `navigate` event whenever the active route changes, without any
plugin declaring or requesting it. The subject SHALL be the pathname of the route that
became active. The event's context SHALL report `routeRef` as the route's file pattern and
`pluginId` as the id of the plugin that declares that route, or unknown when no installed
plugin declares it. Arriving at the route the app is already on SHALL NOT produce a second
event.

#### Scenario: Navigating to a plugin page
- **WHEN** the user opens Catalog from the drawer
- **THEN** a `navigate` event with subject `/catalog`, `routeRef` `catalog` and `pluginId`
  `catalog` is captured

#### Scenario: Navigating to a dynamic route
- **WHEN** the user opens the entity page for `component:default/petstore`
- **THEN** a `navigate` event with subject `/entity/component/default/petstore` and
  `routeRef` `entity/[kind]/[namespace]/[name]` is captured

#### Scenario: Route not owned by a plugin
- **WHEN** the user opens the app-level "Expo UI" page
- **THEN** a `navigate` event is captured with `pluginId` reported as unknown

#### Scenario: Repeated navigation to the same route
- **WHEN** the user is on `/catalog` and selects Catalog in the drawer again
- **THEN** no further `navigate` event is captured

### Requirement: Free text is never sent
An automatically captured navigation event SHALL carry only the normalized pathname as its
subject. The query string SHALL NOT be included in the subject, in the attributes, or in
the context, so text the user typed — a search term, a requested documentation path — never
leaves the device.

#### Scenario: Search page with a query
- **WHEN** the user searches for `payment secrets` and the route becomes
  `/search?query=payment%20secrets`
- **THEN** the captured event's subject is `/search` and neither the term nor the query
  string appears anywhere in the event

#### Scenario: Docs page with a path parameter
- **WHEN** the route becomes `/docs/component/default/petstore?path=internal/runbook`
- **THEN** the captured event's subject is `/docs/component/default/petstore`

### Requirement: Analytics are off unless a backend is configured
In demo mode no analytics request SHALL be sent. Delivery SHALL additionally be disabled
when `EXPO_PUBLIC_BACKSTAGE_ANALYTICS` is set to `false`, in which case no request is sent
even with an instance configured. Capturing an event SHALL remain safe in both cases: the
call succeeds and the event is discarded.

#### Scenario: Demo mode
- **WHEN** no Backstage instance is configured and the user navigates between pages
- **THEN** no analytics request is sent and navigation works normally

#### Scenario: Disabled by configuration
- **WHEN** an instance is configured and `EXPO_PUBLIC_BACKSTAGE_ANALYTICS` is `false`
- **THEN** no analytics request is sent

#### Scenario: Capturing while disabled
- **WHEN** a component captures an event while analytics are disabled
- **THEN** the call returns normally and nothing is queued or sent
