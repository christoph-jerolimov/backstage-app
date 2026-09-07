## ADDED Requirements

### Requirement: Refreshing an entity
The entity page SHALL offer a Refresh action that asks the catalog to re-read the entity
from its source (`POST /api/catalog/refresh` with the entity reference) and then reloads the
entity. While the request runs the action SHALL be disabled. Success SHALL be reported in
place, and a failure SHALL show the backend's message without navigating away or clearing
the page.

#### Scenario: Refresh succeeds
- **WHEN** the user presses Refresh and the catalog accepts the request
- **THEN** the page reports that a refresh was requested and re-reads the entity

#### Scenario: Refresh is rejected
- **WHEN** the catalog rejects the request, for example without permission
- **THEN** the page shows the backend's message and the entity stays on screen

### Requirement: Unregistering an entity
The entity page SHALL offer an Unregister action only when the catalog can name the
location that produced the entity. Pressing it SHALL NOT remove anything: it SHALL reveal
the location's type and target and require a second, distinctly labelled confirmation.
Confirming SHALL delete that location, report success, and return to the catalog list. A
cancel action SHALL close the confirmation without any request being sent.

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

#### Scenario: Deletion fails
- **WHEN** the delete request is rejected
- **THEN** the page shows the backend's message and stays on the entity
