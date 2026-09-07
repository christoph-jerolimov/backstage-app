## ADDED Requirements

### Requirement: Documentation action on the entity page
When the entity carries the `backstage.io/techdocs-ref` annotation, the entity details
page SHALL offer a "Documentation" action that opens `/docs/<kind>/<namespace>/<name>`.

#### Scenario: Documented entity
- **WHEN** the entity page shows `component:default/petstore`, which is annotated
- **THEN** a "Documentation" action is shown and opens the TechDocs reader for it

#### Scenario: Undocumented entity
- **WHEN** the entity page shows an entity without the annotation
- **THEN** no "Documentation" action is shown
