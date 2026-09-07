## MODIFIED Requirements

### Requirement: Entity list from the Catalog API
When a backend is configured, the catalog page SHALL load entities from the Backstage
Catalog API (`/api/catalog/entities/by-query`) ordered by name and SHALL show, for each
entity, its name (title when present) and a summary: kind, type, owner, lifecycle, and
tags where those fields exist; for users the display name and email, and for groups the
kind, type, and email. The page SHALL show up to 50 entities per request.

#### Scenario: Entities load
- **WHEN** the backend returns entities for the current filters
- **THEN** the page lists them with name, kind, type, owner, lifecycle, and tags

#### Scenario: User and group rows
- **WHEN** a user with display name "Jane Doe" and email `jane.doe@example.com` and a
  group of type team with email `platform@example.com` are listed
- **THEN** the user row reads "User · Jane Doe · jane.doe@example.com" and the group row
  reads "Group · team · platform@example.com"

## ADDED Requirements

### Requirement: User view on the entity page
For entities of kind User the entity page SHALL show a profile card with the display
name, email, and an avatar (the profile picture when set, otherwise initials), a "Member
of" section listing the user's groups (from `spec.memberOf` and `memberOf` relations)
where each row opens the group, and an "Owned entities" section listing the entities
whose `ownedBy` relation targets the user, grouped by kind, each row opening the entity.
The generic relation groups `memberOf` and `ownerOf` SHALL not be repeated.

#### Scenario: User profile
- **WHEN** the entity page opens for `user:default/jane.doe` in demo mode
- **THEN** it shows "Jane Doe", her email, initials "JD", "Member of" with Platform Team,
  and the entities she owns

### Requirement: Group view on the entity page
For entities of kind Group the entity page SHALL show a profile card with the display
name, email, type, the parent group (pressable), and child groups (pressable), a
"Members" section listing users whose `memberOf` relation targets the group (loaded from
the catalog with `relations.memberOf=<group ref>`, kind user) with display name and email,
each row opening the user, and an "Owned entities" section listing entities whose
`ownedBy` relation targets the group (loaded with `relations.ownedBy=<group ref>`),
grouped by kind, each row opening the entity. Members and owned entities SHALL show a
loading indicator while loading, an empty message when none exist, and the error with a
retry action when loading fails. The generic relation groups `hasMember`, `ownerOf`,
`parentOf`, and `childOf` SHALL not be repeated.

#### Scenario: Group profile
- **WHEN** the entity page opens for `group:default/team-platform` in demo mode
- **THEN** it shows "Platform Team", type team, parent Engineering, members Jane Doe and
  Priya Patel with their emails, and owned entities grouped by kind including Petstore

#### Scenario: Parent group opens
- **WHEN** the user presses the parent group on the Platform Team page
- **THEN** the entity page for `group:default/engineering` is shown

### Requirement: Owner and system rows open their entities
On every entity page the owner row SHALL open the owner entity (a bare name defaults to
kind group in the entity's namespace) and the system row SHALL open the system entity
(bare names default to kind system).

#### Scenario: Owner opens
- **WHEN** the user presses owner "team-platform" on the Petstore page
- **THEN** the entity page for `group:default/team-platform` is shown
