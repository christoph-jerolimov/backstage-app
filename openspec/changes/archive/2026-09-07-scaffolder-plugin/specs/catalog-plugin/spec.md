## MODIFIED Requirements

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
