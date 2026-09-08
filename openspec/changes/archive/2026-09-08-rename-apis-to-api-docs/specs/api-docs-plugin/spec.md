## Purpose

The API-docs plugin gives API entities from the Backstage catalog their own entry point in
the main navigation, reusing the catalog listing fixed to the API kind.

## ADDED Requirements

### Requirement: APIs entry in the main navigation
The app SHALL install an API-docs plugin that contributes one "APIs" navigation item, listed
after Notifications, opening the APIs page at route `api-docs`.

#### Scenario: Drawer entry
- **WHEN** the app starts
- **THEN** the drawer shows an "APIs" entry after "Notifications" that opens the APIs page

#### Scenario: Deep link to the APIs page
- **WHEN** the app opens the `/api-docs` path (web URL or app scheme link)
- **THEN** the APIs page is shown and the drawer marks APIs as active

### Requirement: APIs page lists API entities
The APIs page SHALL show the title "APIs" and list catalog entities of kind `api` using
the catalog listing with the type, owner, lifecycle, tag, and text filters, and SHALL
not show a kind selector. In demo mode it SHALL list the demo API entities with the demo
banner.

#### Scenario: Only APIs are listed
- **WHEN** the APIs page is shown
- **THEN** every listed entity has kind API and no kind filter is offered

#### Scenario: Filters apply
- **WHEN** the user selects type "openapi" on the APIs page
- **THEN** only API entities with spec.type openapi are listed
