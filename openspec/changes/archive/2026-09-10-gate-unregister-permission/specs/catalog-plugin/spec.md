## MODIFIED Requirements

### Requirement: Unregistering an entity
The entity page SHALL offer an Unregister action only when the catalog can name the
location that produced the entity **and** the signed-in user is permitted to delete that
entity. Permission SHALL be decided for the entity on screen, not for entities in general,
so a user permitted to delete one entity but not another is offered the action only where it
applies. Where there is no permission backend to ask — demo mode, or signed out — the action
SHALL be offered, matching what an unconfigured Backstage permits.

Pressing it SHALL NOT remove anything: it SHALL reveal the location's type and target and
require a second, distinctly labelled confirmation. Confirming SHALL delete that location,
report success, and return to the catalog list. A cancel action SHALL close the confirmation
without any request being sent.

Offering the action is a convenience, not a control: the catalog still rejects an
unpermitted deletion, and the page SHALL continue to report that rejection.

#### Scenario: Confirmation is required
- **WHEN** the user presses Unregister
- **THEN** the page shows the location that would be removed and no request has been sent

#### Scenario: Confirming removes the location
- **WHEN** the user confirms the unregistration
- **THEN** the location is deleted and the app returns to the catalog list

#### Scenario: Cancelling
- **WHEN** the user cancels the confirmation
- **THEN** nothing is deleted and the entity page is unchanged

#### Scenario: Entity without a location
- **WHEN** the catalog does not know a location for the entity
- **THEN** no Unregister action is offered

#### Scenario: Not permitted to delete this entity
- **WHEN** the permission backend says the user may not delete the entity on screen
- **THEN** no Unregister action is offered, and the rest of the page is unchanged

#### Scenario: Permitted for one entity but not another
- **WHEN** the user may delete one entity and not another
- **THEN** the action is offered on the first entity's page and not on the second's

#### Scenario: While the permission answer is still unknown
- **WHEN** the answer has not arrived yet
- **THEN** no Unregister action is offered, so nothing is offered on the strength of an
  answer that has not arrived

#### Scenario: No permission backend
- **WHEN** the app is in demo mode or signed out
- **THEN** the action is offered exactly as before

#### Scenario: Deletion fails
- **WHEN** the delete request is rejected
- **THEN** the page shows the backend's message and stays on the entity
