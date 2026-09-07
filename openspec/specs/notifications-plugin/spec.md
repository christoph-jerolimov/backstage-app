# notifications-plugin

## Purpose

The notifications plugin shows the signed-in user's Backstage notifications, lets them
filter and page through them, and mark them read or unread, with a demo fallback when
no backend is configured.

## Requirements

### Requirement: Notifications list from the Notifications API
When a backend is configured, the notifications page SHALL load the current user's
notifications from the Backstage Notifications API sorted newest first, 25 per page,
and SHALL show for each: title, description when present, origin and topic when present,
severity, and the creation time relative to now (for example "5 min ago", "yesterday").
Unread notifications SHALL be visually distinguished from read ones.

#### Scenario: List loads
- **WHEN** the backend returns notifications
- **THEN** the page lists them newest first with title, description, origin/topic,
  severity, and relative time, and unread rows are marked as unread

#### Scenario: Load more
- **WHEN** more notifications exist than are listed and the user presses "Load more"
- **THEN** the next 25 are appended

### Requirement: Filters
The page SHALL offer a read-state filter (All, Unread, Read; default Unread), a Saved
filter (All, Saved), a minimum-severity filter (All, Low, Normal, High, Critical), and a
text search. Filters SHALL be combined with AND, sent to the API as its `read`, `saved`,
`minimumSeverity`, and `search` parameters, and applied with the same semantics locally
in demo mode. Changing a filter SHALL reset paging to the first page.

#### Scenario: Unread only
- **WHEN** the read-state filter is "Unread"
- **THEN** only notifications without a read timestamp are listed

#### Scenario: Minimum severity
- **WHEN** the minimum-severity filter is "High"
- **THEN** only notifications with severity high or critical are listed

#### Scenario: Text search
- **WHEN** the user types "deploy"
- **THEN** only notifications whose title or description contains "deploy"
  case-insensitively are listed

### Requirement: Unread count
The page SHALL show the number of unread notifications for the user, obtained from the
API's status endpoint (or computed locally in demo mode), and SHALL refresh it after any
mark action.

#### Scenario: Count updates after marking read
- **WHEN** the user has 3 unread notifications and marks one as read
- **THEN** the unread count shows 2

### Requirement: Mark read and unread
Each notification SHALL offer a "Mark read" action when unread and a "Mark unread"
action when read. The page SHALL offer "Mark all read" that marks every currently listed
unread notification as read. Marks SHALL be sent to the API's update endpoint and the
list and count SHALL reflect the result.

#### Scenario: Mark one read
- **WHEN** the user presses "Mark read" on an unread notification
- **THEN** the API is asked to mark that id read and the row shows as read (or leaves
  the list when the Unread filter is active)

#### Scenario: Mark all read
- **WHEN** the user presses "Mark all read" with 3 unread notifications listed
- **THEN** the API is asked to mark those 3 ids read and the unread count drops by 3

### Requirement: Loading, empty, and error states
The page SHALL show a loading indicator while a page loads, "No notifications match the
current filters" when the result is empty, and an error state with the message and a
"Retry" action when loading fails. A failed mark action SHALL show its error without
losing the list.

#### Scenario: Backend rejects the request
- **WHEN** the list request fails (for example 401 because the token is not a user token)
- **THEN** the page shows the error message and a "Retry" action

### Requirement: Demo mode fallback
When no backend is configured, the page SHALL show the demo banner and operate on
built-in notifications kept in memory for the session, so filters, paging, marks, and
the unread count all work without a backend.

#### Scenario: Demo mark persists during the session
- **WHEN** no base URL is configured and the user marks a demo notification read
- **THEN** it stays read when the list reloads until the app restarts
