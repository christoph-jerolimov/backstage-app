## ADDED Requirements

### Requirement: Unread notifications home widget
The notifications plugin SHALL contribute an "Unread notifications" home widget showing
the number of unread notifications from the status endpoint, with an action that opens the
notifications page. Zero unread SHALL read as "You are all caught up".

#### Scenario: Unread count
- **WHEN** the backend reports three unread notifications
- **THEN** the widget shows "3 unread notifications" and opens the notifications page when
  pressed

#### Scenario: Nothing unread
- **WHEN** the backend reports no unread notifications
- **THEN** the widget shows that the user is all caught up
