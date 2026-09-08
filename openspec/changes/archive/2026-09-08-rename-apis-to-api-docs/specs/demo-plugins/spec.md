## MODIFIED Requirements

### Requirement: Bundled plugins are installed
The app SHALL install the home, catalog, search, notifications, api-docs, techdocs,
kubernetes, scaffolder, todo, auth, and settings plugins. Each plugin SHALL contribute at
least one page, and each package SHALL build, lint, and typecheck as part of the repository
checks. Every bundled plugin except todo SHALL contribute exactly one navigation item and
one main page; the todo plugin SHALL contribute an entity action and a hidden entity page
and no navigation item, because a "browse entities with todos" page would list nearly the
whole catalog.

#### Scenario: Plugins are registered
- **WHEN** the app starts
- **THEN** the drawer shows Home, Catalog, Search, Notifications, APIs, Docs, Kubernetes,
  Create, Account, and Settings entries contributed by the respective plugin packages

#### Scenario: The todo plugin is installed without a drawer entry
- **WHEN** the app starts with the todo plugin installed
- **THEN** the drawer shows no Todos entry, and the todo route is mounted and reachable by
  deep link and from the entity page's Todos action
