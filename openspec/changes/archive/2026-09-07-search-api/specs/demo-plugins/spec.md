## ADDED Requirements

### Requirement: Notifications page shows placeholder content
The notifications page SHALL show a title, a one-sentence description of what the plugin
will do, and a short static list of example notifications with title and time. The home,
catalog, and search pages are defined by the `home-plugin`, `catalog-plugin`, and
`search-plugin` capabilities. The static page SHALL render on iOS, Android, and web and
SHALL not fetch any network data.

#### Scenario: Notifications page content
- **WHEN** the notifications page is shown
- **THEN** it displays the title "Notifications", a description, and a static list of
  example notifications with title and time

#### Scenario: No network access
- **WHEN** the notifications page is rendered without network connectivity
- **THEN** it renders its static content without errors

## REMOVED Requirements

### Requirement: Static demo pages show placeholder content
**Reason**: The search page now queries the Search API (see `search-plugin`), leaving
notifications as the only static page.
**Migration**: The notifications behavior continues under "Notifications page shows
placeholder content"; search behavior is specified by `search-plugin`.
