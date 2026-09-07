## ADDED Requirements

### Requirement: Entities can be loaded by reference
The catalog API SHALL load several entities by their references in one request (REST:
`POST /api/catalog/entities/by-refs` with `{ entityRefs }`, demo: locally), preserving the
requested order and omitting references the catalog does not know.

#### Scenario: Batch load
- **WHEN** three references are requested and one is unknown
- **THEN** the two known entities are returned in the requested order

### Requirement: Entity page stars and records visits
The entity page SHALL offer a star toggle that reflects and changes the entity's starred
state, and SHALL record the entity as recently viewed when it loads.

#### Scenario: Star from the entity page
- **WHEN** the user presses the star on an unstarred entity
- **THEN** the entity becomes starred and the control shows the starred state

#### Scenario: Visit recorded
- **WHEN** an entity page loads successfully
- **THEN** that entity is the most recent entry in the recently viewed list

### Requirement: Catalog contributes starred and recent widgets
The catalog plugin SHALL contribute two home widgets: "Starred" listing the starred
entities and "Recently viewed" listing the recently viewed ones, both resolved through the
catalog and both opening the entity page when a row is pressed. Each SHALL show an
explanatory empty state when its list is empty.

#### Scenario: Starred widget
- **WHEN** two entities are starred
- **THEN** the Starred card lists both with their kind and owner, and pressing one opens
  its entity page

#### Scenario: Empty starred widget
- **WHEN** nothing is starred
- **THEN** the card explains how to star an entity
