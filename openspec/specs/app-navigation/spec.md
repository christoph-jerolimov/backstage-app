# app-navigation

## Purpose

The app's primary navigation is a drawer that lists every installed plugin's navigation
items plus app-level entries, and opens the matching page when an item is chosen.

## Requirements

### Requirement: Drawer lists plugin navigation items
The app SHALL present a drawer navigation. The drawer SHALL contain one entry per
navigation item declared by the installed plugins, in plugin registration order, each
showing the item's title and icon. The drawer SHALL also contain an app-level "Expo UI"
entry that opens the component showcase screen.

#### Scenario: Drawer contents
- **WHEN** the home, catalog, search, notifications, apis, techdocs, and auth plugins
  are installed
- **THEN** the drawer lists Home, Catalog, Search, Notifications, APIs, Docs, Account,
  and Expo UI, in that order

#### Scenario: Selecting an entry opens the page
- **WHEN** the user selects "Catalog" in the drawer
- **THEN** the catalog plugin's main page is shown and the drawer closes

### Requirement: Drawer is reachable on every platform
The drawer SHALL open from a header toggle button on iOS, Android, and web, and on iOS
and Android additionally by swiping from the leading edge. The screen header SHALL show
the title of the current plugin page.

#### Scenario: Toggle button opens drawer
- **WHEN** the user presses the header toggle button on any platform
- **THEN** the drawer opens

#### Scenario: Header title
- **WHEN** the search page is active
- **THEN** the header shows "Search"

### Requirement: Home is the initial route
The app SHALL open on the home plugin's page when launched or when the root URL is
visited on web.

#### Scenario: App launch
- **WHEN** the app starts with no deep link
- **THEN** the home plugin's page is shown

#### Scenario: Deep link to a plugin page
- **WHEN** the app opens the `/search` path (web URL or app scheme link)
- **THEN** the search plugin's page is shown and the drawer marks Search as active
