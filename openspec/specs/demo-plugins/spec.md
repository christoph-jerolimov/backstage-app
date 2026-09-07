# demo-plugins

## Purpose

Placeholder plugins for home, catalog, search, and notifications that prove the plugin
infrastructure end to end with static content until real Backstage data replaces it.

## Requirements

### Requirement: Four demo plugins are installed
The app SHALL install the home, catalog, search, and notifications plugins. Each plugin
SHALL contribute exactly one navigation item and one main page, and each package SHALL
build, lint, and typecheck as part of the repository checks.

#### Scenario: Plugins are registered
- **WHEN** the app starts
- **THEN** the drawer shows Home, Catalog, Search, and Notifications entries contributed
  by the respective plugin packages

### Requirement: Demo pages show static placeholder content
Each demo page SHALL show a title, a one-sentence description of what the plugin will do,
and a short static list of example items representative of the future data (for example
three catalog entities, three search results, three notifications, a welcome card for
home). Pages SHALL render on iOS, Android, and web and SHALL not fetch any network data.

#### Scenario: Catalog page content
- **WHEN** the catalog page is shown
- **THEN** it displays the title "Catalog", a description, and a static list of example
  entities with name and kind

#### Scenario: Notifications page content
- **WHEN** the notifications page is shown
- **THEN** it displays the title "Notifications", a description, and a static list of
  example notifications with title and time

#### Scenario: No network access
- **WHEN** any demo page is rendered without network connectivity
- **THEN** it renders its static content without errors
