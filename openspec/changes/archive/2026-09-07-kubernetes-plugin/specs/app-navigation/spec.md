## MODIFIED Requirements

### Requirement: Drawer lists plugin navigation items
The app SHALL present a drawer navigation. The drawer SHALL contain one entry per
navigation item declared by the installed plugins, in plugin registration order, each
showing the item's title and icon. The drawer SHALL also contain an app-level "Expo UI"
entry that opens the component showcase screen.

#### Scenario: Drawer contents
- **WHEN** the home, catalog, search, notifications, apis, techdocs, kubernetes, auth,
  and settings plugins are installed
- **THEN** the drawer lists Home, Catalog, Search, Notifications, APIs, Docs, Kubernetes,
  Account, Settings, and Expo UI, in that order

#### Scenario: Selecting an entry opens the page
- **WHEN** the user selects "Catalog" in the drawer
- **THEN** the catalog plugin's main page is shown and the drawer closes
