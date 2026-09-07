## MODIFIED Requirements

### Requirement: Plugin definition contract
The shared core SHALL expose a `createPlugin` factory that produces a plugin definition
from an id, a display name, a list of routes, and a list of navigation items. Each route
SHALL declare a route name (the path segment the app mounts it at, which MAY contain
nested and dynamic segments such as `entity/[kind]/[namespace]/[name]`) and the page
component to render, and MAY declare a title, whether it is hidden from the main
navigation, and the route to go back to when the page was opened directly. Each
navigation item SHALL declare a title, the route name it opens, and an icon. The factory
SHALL reject definitions whose navigation items reference a route name the plugin does
not declare, and SHALL reject hidden routes whose back route the plugin does not declare.

#### Scenario: Valid plugin definition
- **WHEN** a plugin calls `createPlugin` with id `catalog`, one route named `catalog`, and
  one navigation item pointing at `catalog`
- **THEN** the returned definition exposes the id, name, routes, and navigation items
  unchanged

#### Scenario: Navigation item references unknown route
- **WHEN** a plugin calls `createPlugin` with a navigation item whose route name is not in
  the plugin's routes
- **THEN** `createPlugin` throws an error naming the plugin id and the missing route

#### Scenario: Hidden route with a back route
- **WHEN** a plugin declares a hidden route `entity/[kind]/[namespace]/[name]` with back
  route `catalog`
- **THEN** the definition exposes the route with `hidden` set and `backRoute` `catalog`

#### Scenario: Hidden route references unknown back route
- **WHEN** a plugin declares a hidden route whose back route is not in the plugin's routes
- **THEN** `createPlugin` throws an error naming the plugin id and the missing route
