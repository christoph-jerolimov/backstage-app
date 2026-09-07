## ADDED Requirements

### Requirement: Static demo pages show placeholder content
The search and notifications pages SHALL show a title, a one-sentence description of
what the plugin will do, and a short static list of example items representative of the
future data (for example three search results, three notifications). The home page's
content is defined by the `home-plugin` capability and the catalog page's content by the
`catalog-plugin` capability. Static pages SHALL render on iOS, Android, and web and SHALL
not fetch any network data.

#### Scenario: Notifications page content
- **WHEN** the notifications page is shown
- **THEN** it displays the title "Notifications", a description, and a static list of
  example notifications with title and time

#### Scenario: Search page content
- **WHEN** the search page is shown
- **THEN** it displays the title "Search", a description, and a static list of example
  results with title and source

#### Scenario: No network access
- **WHEN** any static demo page is rendered without network connectivity
- **THEN** it renders its static content without errors

## REMOVED Requirements

### Requirement: Demo pages show static placeholder content
**Reason**: The catalog page now loads real data (see `catalog-plugin`), so the
requirement that lumped catalog together with the static pages no longer describes the
system.
**Migration**: The static behavior for search and notifications continues under "Static
demo pages show placeholder content"; catalog behavior is specified by `catalog-plugin`.
