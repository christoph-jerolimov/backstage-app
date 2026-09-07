# catalog-plugin

## Purpose

The catalog plugin lists entities from the Backstage software catalog with the common
Backstage filters, and falls back to demo data when no backend is configured.

## Requirements

### Requirement: Entity list from the Catalog API
When a backend is configured, the catalog page SHALL load entities from the Backstage
Catalog API (`/api/catalog/entities/by-query`) ordered by name and SHALL show, for each
entity, its name (title when present), kind, type, owner, lifecycle, and tags where
those fields exist. The page SHALL show up to 50 entities per request.

#### Scenario: Entities load
- **WHEN** the backend returns entities for the current filters
- **THEN** the page lists them with name, kind, type, owner, lifecycle, and tags

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
an optional fixed kind, an optional "all kinds" mode, and an optional required
annotation. With a fixed kind the kind selector SHALL be hidden and the kind SHALL not
be changeable. In "all kinds" mode the kind selector SHALL offer an "All" option,
selected by default, under which queries and filter options are not restricted by kind.
With a required annotation only entities carrying that annotation key SHALL be listed,
in both REST and demo modes. All other filters, states, and the demo fallback SHALL
behave as on the catalog page.

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
