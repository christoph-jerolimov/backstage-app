# techdocs-plugin

## Purpose

The TechDocs plugin gives documented catalog entities their own entry point in the main
navigation, listing every entity that carries the TechDocs annotation across kinds.

## Requirements

### Requirement: Docs entry in the main navigation
The app SHALL install a TechDocs plugin that contributes one "Docs" navigation item,
listed after APIs, opening the Docs page at route `docs`.

#### Scenario: Drawer entry
- **WHEN** the app starts
- **THEN** the drawer shows a "Docs" entry after "APIs" that opens the Docs page

### Requirement: Docs page lists documented entities
The Docs page SHALL show the title "Docs" and list catalog entities of any kind that
carry the `backstage.io/techdocs-ref` annotation, using the catalog listing with the
kind (including "All", selected by default), type, owner, lifecycle, tag, and text
filters. In demo mode it SHALL list the annotated demo entities with the demo banner.

#### Scenario: Only documented entities are listed
- **WHEN** the Docs page is shown
- **THEN** every listed entity carries the TechDocs annotation, and entities of
  different kinds appear together

#### Scenario: Narrow by kind
- **WHEN** the user selects kind "API" on the Docs page
- **THEN** only documented API entities are listed
