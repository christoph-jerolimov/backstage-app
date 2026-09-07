## ADDED Requirements

### Requirement: Documentation entity action
The TechDocs plugin SHALL contribute an entity action "Documentation" available for
entities carrying the `backstage.io/techdocs-ref` annotation, opening the reader at
`/docs/<kind>/<namespace>/<name>`.

#### Scenario: Annotated entity
- **WHEN** the entity page shows an entity with the TechDocs annotation
- **THEN** the "Documentation" action opens the reader for that entity
