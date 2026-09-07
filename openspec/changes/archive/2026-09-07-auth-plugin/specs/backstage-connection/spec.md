## MODIFIED Requirements

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
