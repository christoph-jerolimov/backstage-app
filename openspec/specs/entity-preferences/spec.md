# entity-preferences

## Purpose

The app remembers which catalog entities the user starred and which ones they opened
recently, so plugins can surface both without asking the backend.

## Requirements

### Requirement: Starred entities are remembered
The app SHALL keep a list of starred entity references. Starring an entity SHALL add its
reference (`kind:namespace/name`, lower-cased kind and namespace) to the list and
un-starring SHALL remove it. The list SHALL survive an app restart on iOS, Android, and
web, and SHALL be readable and changeable by any plugin through a shared hook.

#### Scenario: Star and restart
- **WHEN** the user stars `component:default/petstore` and restarts the app
- **THEN** `component:default/petstore` is still starred

#### Scenario: Un-star
- **WHEN** the user un-stars an entity
- **THEN** it is removed from the list and the change is persisted

#### Scenario: Starring is idempotent
- **WHEN** the same entity is starred twice
- **THEN** the list contains it once

### Requirement: Recently viewed entities are recorded
The app SHALL record the entities whose pages the user opens, most recent first, keeping
at most ten. Re-opening an entity already in the list SHALL move it to the front rather
than duplicate it. The list SHALL be persisted like the starred list.

#### Scenario: Visit order
- **WHEN** the user opens A, then B, then A again
- **THEN** the recent list reads A, B

#### Scenario: Capped at ten
- **WHEN** the user opens eleven different entities
- **THEN** the list holds the ten most recent and drops the oldest

### Requirement: Preferences load without blocking the UI
Reading the stored preferences SHALL be asynchronous and SHALL start from empty lists, so
a page renders before the store is read and updates once it is. A storage failure SHALL be
logged and SHALL leave the app usable with empty lists.

#### Scenario: Storage unavailable
- **WHEN** the underlying storage throws on read
- **THEN** the app renders with empty starred and recent lists and does not crash
