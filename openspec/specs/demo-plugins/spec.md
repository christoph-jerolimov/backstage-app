# demo-plugins

## Purpose

The set of plugins bundled with the app (home, catalog, search, notifications) and the
guarantee that each one is registered, navigable, and covered by the repository checks.
Each plugin's page behavior is specified by its own capability.

## Requirements

### Requirement: Four demo plugins are installed
The app SHALL install the home, catalog, search, and notifications plugins. Each plugin
SHALL contribute exactly one navigation item and one main page, and each package SHALL
build, lint, and typecheck as part of the repository checks.

#### Scenario: Plugins are registered
- **WHEN** the app starts
- **THEN** the drawer shows Home, Catalog, Search, and Notifications entries contributed
  by the respective plugin packages
