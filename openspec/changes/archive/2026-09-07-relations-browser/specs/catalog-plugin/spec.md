## ADDED Requirements

### Requirement: Relations entity action
The catalog plugin SHALL contribute a "Relations" entity action, available for every
entity, that opens the relations browser centered on it.

#### Scenario: Action on the entity page
- **WHEN** any entity page is shown
- **THEN** a "Relations" action opens `/relations/<kind>/<namespace>/<name>`
