# relations-browser

## Purpose

The relations browser turns an entity's relations into a navigable neighbourhood: what it
depends on, what depends on it, which APIs it provides or consumes, what it belongs to, and
who owns it, with every neighbour resolved to a real catalog entity.

## Requirements

### Requirement: Relations are grouped by meaning
The browser SHALL group an entity's relations into sections: Dependencies (`dependsOn`,
`dependencyOf`), APIs (`providesApi`, `apiProvidedBy`, `consumesApi`, `apiConsumedBy`),
Composition (`partOf`, `hasPart`), Ownership (`ownedBy`, `ownerOf`), Membership
(`memberOf`, `hasMember`, `parentOf`, `childOf`), and Other for any remaining type. Each
section SHALL name the relation type of every row so the direction is unambiguous, and
SHALL be omitted when the entity has no relation of that group.

#### Scenario: Component with dependencies and APIs
- **WHEN** a component declares `dependsOn` and `providesApi` relations
- **THEN** the browser shows a Dependencies section and an APIs section, each row labelled
  with its relation type

#### Scenario: Unknown relation type
- **WHEN** an entity has a relation of a type the app does not know
- **THEN** the relation appears under "Other" with its type spelled out

### Requirement: Neighbours are resolved
The browser SHALL resolve every related reference through the catalog in one request and
show each neighbour's display name, kind, and owner where known. A reference the catalog
does not know SHALL still be listed, showing the raw reference and marked as not found, so
a stale relation is visible rather than silently dropped.

#### Scenario: Neighbour details
- **WHEN** an entity relates to `component:default/petstore`
- **THEN** the row shows "Petstore" with its kind and owner

#### Scenario: Dangling reference
- **WHEN** a relation points at an entity the catalog does not have
- **THEN** the row shows the raw reference and says it was not found

### Requirement: Walking and retracing the graph
Pressing a neighbour SHALL re-center the browser on that entity. The page SHALL show the
path walked, with each earlier step opening the browser centered on that step again. The
centered entity SHALL offer an action that opens its entity page.

#### Scenario: Following a dependency
- **WHEN** the reader presses a neighbour
- **THEN** the browser re-centers on it and its own relations are shown

#### Scenario: Retracing
- **WHEN** the reader has walked from A to B to C
- **THEN** the path shows A and B, and pressing A re-centers the browser on A

### Requirement: Loading, empty, and error states
The browser SHALL show a loading indicator while the centered entity loads, an explanation
when the entity records no relations, a not-found state for an unknown entity, and an error
with retry when a request fails.

#### Scenario: No relations
- **WHEN** the centered entity has no relations
- **THEN** the page explains that the catalog records none for it

#### Scenario: Request fails
- **WHEN** loading the centered entity fails
- **THEN** the page shows the error and a retry action
