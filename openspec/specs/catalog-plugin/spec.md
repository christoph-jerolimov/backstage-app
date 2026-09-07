# catalog-plugin

## Purpose

The catalog plugin lists entities from the Backstage software catalog with the common
Backstage filters, and falls back to demo data when no backend is configured.

## Requirements

### Requirement: Entity list from the Catalog API
When a backend is configured, the catalog page SHALL load entities from the Backstage
Catalog API (`/api/catalog/entities/by-query`) ordered by name and SHALL show, for each
entity, its name (title when present) and a summary: kind, type, owner, lifecycle, and
tags where those fields exist; for users the display name and email, and for groups the
kind, type, and email. The page SHALL show up to 50 entities per request.

#### Scenario: Entities load
- **WHEN** the backend returns entities for the current filters
- **THEN** the page lists them with name, kind, type, owner, lifecycle, and tags

#### Scenario: User and group rows
- **WHEN** a user with display name "Jane Doe" and email `jane.doe@example.com` and a
  group of type team with email `platform@example.com` are listed
- **THEN** the user row reads "User · Jane Doe · jane.doe@example.com" and the group row
  reads "Group · team · platform@example.com"

### Requirement: Common Backstage filters
The catalog page SHALL offer filters for kind (default: Component), type, owner,
lifecycle, tag, and a free-text term. Kind, type, owner, lifecycle, and tag SHALL be
single-select with an "All" option (kind excepted: it always has a value), and their
options SHALL come from the catalog's facets for the current kind. Filters SHALL be
combined with AND. In REST mode the filters SHALL be sent to the API using Backstage's
filter syntax (`kind`, `spec.type`, `spec.owner`, `spec.lifecycle`, `metadata.tags`)
and `fullTextFilter`; in demo mode the same semantics SHALL be applied locally.

#### Scenario: Filter by kind and type
- **WHEN** the user selects kind "API" and type "openapi"
- **THEN** only entities with kind API and spec.type openapi are listed

#### Scenario: Text filter
- **WHEN** the user types "pay" in the text filter
- **THEN** only entities whose name, title, or description contains "pay"
  case-insensitively are listed

#### Scenario: Changing kind resets dependent options
- **WHEN** the user changes the kind
- **THEN** type, owner, lifecycle, and tag selections reset to "All" and their options
  reload for the new kind

### Requirement: Loading, empty, and error states
The catalog page SHALL show a loading indicator while entities load, an empty-state
message when the filters match nothing, and an error state with the error message and a
retry action when loading fails.

#### Scenario: Backend unreachable
- **WHEN** the request fails
- **THEN** the page shows the error message and a "Retry" action that reloads

#### Scenario: No matches
- **WHEN** the backend returns zero entities
- **THEN** the page shows "No entities match the current filters"

### Requirement: Demo mode fallback
When no backend is configured, the catalog page SHALL show a banner explaining that demo
data is shown and how to configure a backend, and SHALL list built-in demo entities with
the same filters applied locally.

#### Scenario: Demo banner
- **WHEN** no base URL is configured
- **THEN** the page shows the demo banner and demo entities, and filters work locally

### Requirement: Catalog page can be fixed to one kind
The catalog listing SHALL support a configuration with a custom title and description,
an optional fixed kind, an optional "all kinds" mode, an optional required annotation,
and an optional toolbar rendered between the description and the filters. With a fixed
kind the kind selector SHALL be hidden and the kind SHALL not be changeable. In "all
kinds" mode the kind selector SHALL offer an "All" option, selected by default, under
which queries and filter options are not restricted by kind. With a required annotation
only entities carrying that annotation key SHALL be listed, in both REST and demo modes.
All other filters, states, and the demo fallback SHALL behave as on the catalog page.

#### Scenario: Fixed kind hides the selector
- **WHEN** the listing is configured with fixed kind `api`
- **THEN** no kind selector is shown and every query uses kind api

#### Scenario: Default page unchanged
- **WHEN** the listing is used without a fixed kind
- **THEN** the kind selector is shown with Component selected by default

#### Scenario: All kinds with a required annotation
- **WHEN** the listing is configured in all-kinds mode requiring
  `backstage.io/techdocs-ref`
- **THEN** the kind selector shows "All" selected and every listed entity, of any kind,
  carries that annotation

#### Scenario: Toolbar slot
- **WHEN** the listing is configured with a toolbar
- **THEN** the toolbar is rendered above the filters

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

### Requirement: Plugin entity actions on the entity page
The entity details page SHALL show one action button per entity action, contributed by
the installed plugins through the registry, whose predicate accepts the loaded entity,
in plugin registration order. Pressing an action SHALL open the path it produces for the
entity's reference. Without a registry no actions are shown.

#### Scenario: Documented entity
- **WHEN** the TechDocs plugin is installed and the entity page shows
  `component:default/petstore`, which carries the TechDocs annotation
- **THEN** a "Documentation" action is shown and opens `/docs/component/default/petstore`

#### Scenario: Undocumented entity
- **WHEN** the entity page shows an entity without any action's annotation
- **THEN** no action buttons are shown

### Requirement: User view on the entity page
For entities of kind User the entity page SHALL show a profile card with the display
name, email, and an avatar (the profile picture when set, otherwise initials), a "Member
of" section listing the user's groups (from `spec.memberOf` and `memberOf` relations)
where each row opens the group, and an "Owned entities" section listing the entities
whose `ownedBy` relation targets the user, grouped by kind, each row opening the entity.
The generic relation groups `memberOf` and `ownerOf` SHALL not be repeated.

#### Scenario: User profile
- **WHEN** the entity page opens for `user:default/jane.doe` in demo mode
- **THEN** it shows "Jane Doe", her email, initials "JD", "Member of" with Platform Team,
  and the entities she owns

### Requirement: Group view on the entity page
For entities of kind Group the entity page SHALL show a profile card with the display
name, email, type, the parent group (pressable), and child groups (pressable), a
"Members" section listing users whose `memberOf` relation targets the group (loaded from
the catalog with `relations.memberOf=<group ref>`, kind user) with display name and email,
each row opening the user, and an "Owned entities" section listing entities whose
`ownedBy` relation targets the group (loaded with `relations.ownedBy=<group ref>`),
grouped by kind, each row opening the entity. Members and owned entities SHALL show a
loading indicator while loading, an empty message when none exist, and the error with a
retry action when loading fails. The generic relation groups `hasMember`, `ownerOf`,
`parentOf`, and `childOf` SHALL not be repeated.

#### Scenario: Group profile
- **WHEN** the entity page opens for `group:default/team-platform` in demo mode
- **THEN** it shows "Platform Team", type team, parent Engineering, members Jane Doe and
  Priya Patel with their emails, and owned entities grouped by kind including Petstore

#### Scenario: Parent group opens
- **WHEN** the user presses the parent group on the Platform Team page
- **THEN** the entity page for `group:default/engineering` is shown

### Requirement: Owner and system rows open their entities
On every entity page the owner row SHALL open the owner entity (a bare name defaults to
kind group in the entity's namespace) and the system row SHALL open the system entity
(bare names default to kind system).

#### Scenario: Owner opens
- **WHEN** the user presses owner "team-platform" on the Petstore page
- **THEN** the entity page for `group:default/team-platform` is shown

### Requirement: Entities can be loaded by reference
The catalog API SHALL load several entities by their references in one request (REST:
`POST /api/catalog/entities/by-refs` with `{ entityRefs }`, demo: locally), preserving the
requested order and omitting references the catalog does not know.

#### Scenario: Batch load
- **WHEN** three references are requested and one is unknown
- **THEN** the two known entities are returned in the requested order

### Requirement: Entity page stars and records visits
The entity page SHALL offer a star toggle that reflects and changes the entity's starred
state, and SHALL record the entity as recently viewed when it loads.

#### Scenario: Star from the entity page
- **WHEN** the user presses the star on an unstarred entity
- **THEN** the entity becomes starred and the control shows the starred state

#### Scenario: Visit recorded
- **WHEN** an entity page loads successfully
- **THEN** that entity is the most recent entry in the recently viewed list

### Requirement: Catalog contributes starred and recent widgets
The catalog plugin SHALL contribute two home widgets: "Starred" listing the starred
entities and "Recently viewed" listing the recently viewed ones, both resolved through the
catalog and both opening the entity page when a row is pressed. Each SHALL show an
explanatory empty state when its list is empty.

#### Scenario: Starred widget
- **WHEN** two entities are starred
- **THEN** the Starred card lists both with their kind and owner, and pressing one opens
  its entity page

#### Scenario: Empty starred widget
- **WHEN** nothing is starred
- **THEN** the card explains how to star an entity

### Requirement: Owner filter accepts several references
The catalog's owner filter SHALL accept either one owner reference or a list. With a list,
entities owned by any of the references SHALL match: in REST mode one `filter` parameter
per reference (which Backstage combines with OR), each carrying the other active
conditions; in demo mode the same semantics applied locally. An empty list SHALL match
nothing.

#### Scenario: Entities of two teams
- **WHEN** the owner filter holds `group:default/team-platform` and
  `group:default/team-payments`
- **THEN** entities owned by either team are listed, and the request carries one filter
  parameter per team

#### Scenario: Single owner unchanged
- **WHEN** the owner filter holds one reference
- **THEN** the request carries one filter parameter, as before

#### Scenario: No owners
- **WHEN** the owner filter holds an empty list
- **THEN** no entities are listed

### Requirement: My entities page
The catalog plugin SHALL offer a "My entities" page at route `mine` listing the entities
owned by the signed-in user or any of their groups, across kinds, with the catalog's usual
filters and rows that open the entity page. Signed out, the page SHALL explain that signing
in shows the user's entities and SHALL offer to open the Account page.

#### Scenario: Owned entities listed
- **WHEN** the signed-in user owns entities through `group:default/team-platform`
- **THEN** the page lists those entities and pressing one opens its page

#### Scenario: Signed out
- **WHEN** no session exists
- **THEN** the page explains that signing in is required and offers the Account page
