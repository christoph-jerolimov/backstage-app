## MODIFIED Requirements

### Requirement: Bundled plugins are installed
The app SHALL install the home, catalog, search, notifications, apis, techdocs,
kubernetes, scaffolder, auth, and settings plugins. Each plugin SHALL contribute exactly
one navigation item and one main page, and each package SHALL build, lint, and typecheck
as part of the repository checks.

#### Scenario: Plugins are registered
- **WHEN** the app starts
- **THEN** the drawer shows Home, Catalog, Search, Notifications, APIs, Docs, Kubernetes,
  Create, Account, and Settings entries contributed by the respective plugin packages
