## Purpose

The catalog plugin lists entities from the Backstage software catalog with the common
Backstage filters, and falls back to demo data when no backend is configured.

## ADDED Requirements

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
