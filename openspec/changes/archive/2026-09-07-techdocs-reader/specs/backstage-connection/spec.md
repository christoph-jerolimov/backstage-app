## ADDED Requirements

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
