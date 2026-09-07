## ADDED Requirements

### Requirement: Owner filter accepts several references
The catalog's owner filter SHALL accept either one owner reference or a list. With a list,
entities owned by any of the references SHALL match: in REST mode one `filter` parameter
per reference (which Backstage combines with OR), each carrying the other active
conditions; in demo mode the same semantics applied locally. An empty list SHALL match
nothing.

#### Scenario: Entities of two teams
- **WHEN** the owner filter holds `group:default/team-platform` and
  `group:default/team-payments`
- **THEN** entities owned by either team are listed, and the request carries one filter
  parameter per team

#### Scenario: Single owner unchanged
- **WHEN** the owner filter holds one reference
- **THEN** the request carries one filter parameter, as before

#### Scenario: No owners
- **WHEN** the owner filter holds an empty list
- **THEN** no entities are listed

### Requirement: My entities page
The catalog plugin SHALL offer a "My entities" page at route `mine` listing the entities
owned by the signed-in user or any of their groups, across kinds, with the catalog's usual
filters and rows that open the entity page. Signed out, the page SHALL explain that signing
in shows the user's entities and SHALL offer to open the Account page.

#### Scenario: Owned entities listed
- **WHEN** the signed-in user owns entities through `group:default/team-platform`
- **THEN** the page lists those entities and pressing one opens its page

#### Scenario: Signed out
- **WHEN** no session exists
- **THEN** the page explains that signing in is required and offers the Account page
