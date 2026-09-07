# plugin-system

## Purpose

Defines the contract a plugin fulfils to contribute pages and navigation entries to the
app, and the workspace layout that keeps the app, shared core, and plugins in separate
packages that build and typecheck together.

## Requirements

### Requirement: Workspace layout separates app, core, and plugins
The repository SHALL be an npm-workspaces monorepo in which the Expo app lives in
`packages/app` (source under `packages/app/src`), shared plugin infrastructure lives in
`packages/core`, and every plugin lives in its own `plugins/<name>` package (source under
`plugins/<name>/src`). Installing dependencies once at the repository root SHALL link all
workspaces so the app can import any plugin package by name.

#### Scenario: Fresh install links workspaces
- **WHEN** a developer runs `npm install` at the repository root
- **THEN** every package under `packages/*` and `plugins/*` is resolvable by its package
  name from the app without a build step

#### Scenario: Root scripts drive the app
- **WHEN** a developer runs `npm start`, `npm run web`, `npm run ios`, `npm run android`,
  `npm run lint`, `npm run typecheck`, or `npm test` at the repository root
- **THEN** the command runs against the app workspace and covers plugin source where the
  command is a check (lint, typecheck, test)

### Requirement: Plugin definition contract
The shared core SHALL expose a `createPlugin` factory that produces a plugin definition
from an id, a display name, a list of routes, a list of navigation items, and an optional
list of entity actions. Each route SHALL declare a route name (the path segment the app
mounts it at, which MAY contain nested and dynamic segments such as
`entity/[kind]/[namespace]/[name]`) and the page component to render, and MAY declare a
title, whether it is hidden from the main navigation, and the route to go back to when
the page was opened directly. Each navigation item SHALL declare a title, the route name
it opens, and an icon. Each entity action SHALL declare an id, a title, a predicate
deciding whether it applies to a given entity (kind, name, namespace, annotations), and a
function producing the in-app path to open for an entity reference. The factory SHALL
reject definitions whose navigation items reference a route name the plugin does not
declare, and SHALL reject hidden routes whose back route the plugin does not declare.

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

#### Scenario: Entity action
- **WHEN** a plugin declares an entity action "Documentation" applying to entities with
  the TechDocs annotation
- **THEN** the definition exposes the action and the registry lists it among all
  plugins' entity actions in registration order

### Requirement: App registers installed plugins in one place
The app SHALL keep a single ordered list of installed plugin definitions. Navigation
entries, mounted pages, and entity actions SHALL be derived from that list, so adding a
plugin requires adding it to the list and mounting its route files, and nothing else.
The app SHALL provide the registry to every page through a context so plugin pages can
discover other plugins' contributions.

#### Scenario: Plugin appears after registration
- **WHEN** a plugin definition is added to the app's plugin list and its route is mounted
- **THEN** the plugin's navigation items appear in the drawer and its page opens from them

#### Scenario: Duplicate plugin ids are rejected
- **WHEN** two plugin definitions with the same id are registered
- **THEN** the registry throws an error naming the duplicated id

#### Scenario: Pages read the registry
- **WHEN** a plugin page calls the registry hook inside the app
- **THEN** it receives the app's registry, and outside the app it receives an empty
  registry

### Requirement: Shared UI primitives live in core
Themed text, themed view, hint row, collapsible, external link, the theme tokens, and the
color scheme hooks SHALL be exported from the shared core package so plugins and the app
render with the same primitives and colors on iOS, Android, and web.

#### Scenario: Plugin renders with shared primitives
- **WHEN** a plugin page imports themed text and theme tokens from the shared core
- **THEN** the page renders with the same light and dark colors as app-level screens

### Requirement: Plugins contribute home widgets
A plugin definition MAY declare home widgets, each with a unique id, a title, a component,
and an optional priority (lower sorts first, default 100). The registry SHALL expose every
contributed widget sorted by priority and then by plugin registration order, so the home
page can render them without depending on the contributing plugins.

#### Scenario: Widgets are collected in order
- **WHEN** one plugin contributes a widget with priority 10 and a later plugin contributes
  one with priority 5
- **THEN** the registry lists the priority 5 widget first

#### Scenario: Plugin without widgets
- **WHEN** a plugin declares no home widgets
- **THEN** it contributes none and the registry still lists the others
