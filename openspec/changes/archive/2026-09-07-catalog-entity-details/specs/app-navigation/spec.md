## ADDED Requirements

### Requirement: Hidden plugin routes
The app SHALL mount every plugin route that is marked hidden as a screen that is
reachable by navigation and deep link but not listed in the drawer. Its header SHALL show
the route's title and a back button; the back button SHALL return to the previous screen
when there is one and otherwise open the route's declared back route.

#### Scenario: Hidden route absent from drawer
- **WHEN** the catalog plugin declares the hidden entity route
- **THEN** the drawer still lists only Home, Catalog, Search, Notifications, APIs, Docs,
  Account, Settings, and Expo UI

#### Scenario: Back from a deep link
- **WHEN** the app was opened directly at `/entity/component/default/petstore` and the
  user presses the header back button
- **THEN** the catalog page is shown
