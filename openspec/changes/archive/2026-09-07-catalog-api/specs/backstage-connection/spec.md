## Purpose

Defines how the app connects to a Backstage backend: where the base URL and token come
from, how plugins access them, how requests are authenticated, and the loading states
plugins expose while fetching.

## ADDED Requirements

### Requirement: Connection is configured through public environment variables
The app SHALL read the Backstage base URL from `EXPO_PUBLIC_BACKSTAGE_URL` and an
optional bearer token from `EXPO_PUBLIC_BACKSTAGE_TOKEN` at build time. A trailing slash
on the base URL SHALL be ignored. When the base URL is absent or empty the app SHALL be
in demo mode.

#### Scenario: Configured backend
- **WHEN** `EXPO_PUBLIC_BACKSTAGE_URL` is `https://backstage.example.com/`
- **THEN** the connection reports base URL `https://backstage.example.com` and demo mode off

#### Scenario: No backend configured
- **WHEN** `EXPO_PUBLIC_BACKSTAGE_URL` is unset
- **THEN** the connection reports demo mode on and no requests are sent

### Requirement: Plugins read the connection from a shared provider
The app SHALL mount one connection provider at the root, and any plugin component SHALL
be able to read the base URL, token, and demo-mode flag from it. Tests SHALL be able to
render a component with an explicit connection value without environment variables.

#### Scenario: Plugin reads connection
- **WHEN** a plugin component is rendered inside the app
- **THEN** it can obtain the configured base URL, token, and demo-mode flag

#### Scenario: Explicit value in tests
- **WHEN** a test renders a component inside a provider with a given connection value
- **THEN** the component uses that value regardless of the environment

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
