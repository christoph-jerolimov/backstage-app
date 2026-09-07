# backstage-connection

## Purpose

Defines how the app connects to a Backstage backend: where the base URL and token come
from, how plugins access them, how requests are authenticated, and the loading states
plugins expose while fetching.

## Requirements

### Requirement: Connection is configured through public environment variables
The app SHALL derive its connection from the active Backstage instance in the instance
store: base URL, auth provider, and the instance's session token when present and not
expired. On a fresh install with no stored instances, `EXPO_PUBLIC_BACKSTAGE_URL` (and
optionally `EXPO_PUBLIC_BACKSTAGE_TOKEN` as its session) SHALL seed the first instance,
named "Default", which becomes active. A trailing slash on any base URL SHALL be
ignored. When there is no active instance the app SHALL be in demo mode.

#### Scenario: Configured backend
- **WHEN** the active instance has base URL `https://backstage.example.com/`
- **THEN** the connection reports base URL `https://backstage.example.com` and demo mode off

#### Scenario: No backend configured
- **WHEN** there are no instances and `EXPO_PUBLIC_BACKSTAGE_URL` is unset
- **THEN** the connection reports demo mode on and no requests are sent

#### Scenario: Environment seeds the first instance
- **WHEN** the store is empty and `EXPO_PUBLIC_BACKSTAGE_URL` is set
- **THEN** an instance "Default" with that base URL is created and active

### Requirement: Plugins read the connection from a shared provider
The app SHALL mount one connection provider at the root, and any plugin component SHALL
be able to read the base URL, token, demo-mode flag, active instance, session identity,
and whether the session is valid from it. Changing the active instance or its session
SHALL update every consumer. Tests SHALL be able to render a component with an explicit
connection value without environment variables or storage.

#### Scenario: Plugin reads connection
- **WHEN** a plugin component is rendered inside the app
- **THEN** it can obtain the configured base URL, token, demo-mode flag, and identity

#### Scenario: Explicit value in tests
- **WHEN** a test renders a component inside a provider with a given connection value
- **THEN** the component uses that value regardless of the environment

#### Scenario: Active instance changes
- **WHEN** the active instance changes while a plugin page is open
- **THEN** the page's data reloads against the new instance

### Requirement: Requests are authenticated JSON calls
Requests to the backend SHALL be sent to `<baseUrl><path>`, SHALL include
`Authorization: Bearer <token>` when a token is configured, SHALL request JSON, and
SHALL surface a non-2xx response as an error carrying the HTTP status and any message
from the response body.

#### Scenario: Authenticated request
- **WHEN** a token is configured and a plugin requests `/api/catalog/entities/by-query`
- **THEN** the request carries the bearer token and the parsed JSON body is returned

#### Scenario: Server error
- **WHEN** the backend responds with status 500
- **THEN** the caller receives an error that includes the status 500

### Requirement: Remote data exposes loading, success, and error states with reload
Plugins SHALL fetch through a shared remote-data hook that reports `loading`, `success`
with data, or `error` with the failure, re-runs when its inputs change, ignores results
from superseded requests, and offers a reload action.

#### Scenario: Inputs change
- **WHEN** the filter inputs change while a request is in flight
- **THEN** the hook reports loading again and only the latest request's result is shown

#### Scenario: Reload after error
- **WHEN** a request failed and the user triggers reload
- **THEN** the hook re-requests and reports the new outcome

### Requirement: Authenticated text fetch
The connection SHALL expose `fetchText(path, init)` next to `fetchJson`: it SHALL send
the same authorization header, accept HTML and text, reject with the API error (status
and message) on non-2xx responses, resolve with the response body as a string, and
reject in demo mode.

#### Scenario: HTML page
- **WHEN** a plugin calls `fetchText('/api/techdocs/static/docs/default/component/petstore/index.html')`
- **THEN** the request carries the session token and resolves with the HTML body

#### Scenario: Not found
- **WHEN** the backend answers 404
- **THEN** the call rejects with an API error whose status is 404
