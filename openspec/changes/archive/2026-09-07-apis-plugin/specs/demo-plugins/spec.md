## ADDED Requirements

### Requirement: Bundled plugins are installed
The app SHALL install the home, catalog, search, notifications, and apis plugins. Each
plugin SHALL contribute exactly one navigation item and one main page, and each package
SHALL build, lint, and typecheck as part of the repository checks.

#### Scenario: Plugins are registered
- **WHEN** the app starts
- **THEN** the drawer shows Home, Catalog, Search, Notifications, and APIs entries
  contributed by the respective plugin packages

## REMOVED Requirements

### Requirement: Four demo plugins are installed
**Reason**: The bundled set is no longer four plugins.
**Migration**: Replaced by "Bundled plugins are installed", which lists the current set.
