## ADDED Requirements

### Requirement: Opening an entity from a listing
Every catalog listing (the catalog page and its fixed-kind and required-annotation
variants) SHALL make each entity row pressable. Pressing a row SHALL open the entity
details page for that entity at the path `/entity/<kind>/<namespace>/<name>` (kind and
namespace lower-cased), so the page is also reachable by deep link on web and native.

#### Scenario: Row opens the details page
- **WHEN** the user presses the "Petstore" row on the catalog page
- **THEN** the entity page for `component:default/petstore` is shown

#### Scenario: Deep link
- **WHEN** the app opens `/entity/api/default/payments-api`
- **THEN** the entity page for that API is shown with a header back action to the catalog

### Requirement: Entity details page
The entity details page SHALL load the entity by kind, namespace, and name and show its
title (name when no title), its full reference `kind:namespace/name`, kind, and, where
present, type, lifecycle, owner, system, description, tags, links (each opening its URL
in the browser), and a collapsible list of annotations. Relations SHALL be listed grouped
by relation type with the target reference, and pressing a target SHALL open that
entity's page. When an instance is active the page SHALL offer an "Open in Backstage"
link to `<baseUrl>/catalog/<namespace>/<kind>/<name>`. In REST mode the entity SHALL be
loaded from `/api/catalog/entities/by-name/<kind>/<namespace>/<name>`; in demo mode it
SHALL be resolved from the bundled demo entities.

#### Scenario: Component details
- **WHEN** the entity page opens for `component:default/petstore` in demo mode
- **THEN** it shows "Petstore", "component:default/petstore", kind Component, type
  service, lifecycle production, owner team-platform, the description, tags java and
  spring, the entity's links, and its relations grouped by type

#### Scenario: Relation opens the target
- **WHEN** the user presses the `group:default/team-platform` relation target
- **THEN** the entity page for that group is shown

#### Scenario: Open in Backstage
- **WHEN** an instance with base URL `https://backstage.example` is active
- **THEN** the page shows an "Open in Backstage" link to
  `https://backstage.example/catalog/default/component/petstore`

### Requirement: Entity page states
The entity page SHALL show a loading indicator while the entity loads, a not-found state
naming the reference when the backend answers 404 (or the demo data has no such entity),
and an error state with the message and a retry action for other failures.

#### Scenario: Unknown entity
- **WHEN** the page opens for `component:default/missing` and the backend answers 404
- **THEN** the page shows that `component:default/missing` was not found

#### Scenario: Backend error retries
- **WHEN** the request fails with a network error
- **THEN** the page shows the error message and a "Retry" action that reloads the entity
