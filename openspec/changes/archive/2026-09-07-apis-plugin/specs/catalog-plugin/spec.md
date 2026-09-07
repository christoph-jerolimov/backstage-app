## ADDED Requirements

### Requirement: Catalog page can be fixed to one kind
The catalog listing SHALL support a configuration with a fixed kind, a custom title, and
a custom description. With a fixed kind the kind selector SHALL be hidden, the kind
SHALL not be changeable by the user, and all other filters, states, and the demo fallback
SHALL behave as on the catalog page.

#### Scenario: Fixed kind hides the selector
- **WHEN** the listing is configured with fixed kind `api`
- **THEN** no kind selector is shown and every query uses kind api

#### Scenario: Default page unchanged
- **WHEN** the listing is used without a fixed kind
- **THEN** the kind selector is shown with Component selected by default
