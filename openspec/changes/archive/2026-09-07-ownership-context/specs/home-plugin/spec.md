## ADDED Requirements

### Requirement: Ownership widgets on the dashboard
The dashboard SHALL show a "My teams" widget listing the groups the signed-in user belongs
to and a "My entities" widget listing the first entities they own, each row opening the
matching page and the entities widget offering a link to the full My entities page. Signed
out, both SHALL explain that signing in shows this information rather than showing an
error.

#### Scenario: Teams listed
- **WHEN** the user belongs to two groups
- **THEN** the My teams widget lists both and pressing one opens that group's entity page

#### Scenario: Signed out dashboard
- **WHEN** no session exists
- **THEN** both widgets say that signing in shows the user's teams and entities
