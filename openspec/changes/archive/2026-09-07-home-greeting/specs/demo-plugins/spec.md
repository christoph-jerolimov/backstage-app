## MODIFIED Requirements

### Requirement: Demo pages show static placeholder content
The catalog, search, and notifications pages SHALL show a title, a one-sentence
description of what the plugin will do, and a short static list of example items
representative of the future data (for example three catalog entities, three search
results, three notifications). The home page's content is defined by the `home-plugin`
capability. Pages SHALL render on iOS, Android, and web and SHALL not fetch any network
data.

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
