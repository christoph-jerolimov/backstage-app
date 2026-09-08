## Purpose

The notifications plugin shows the signed-in user's Backstage notifications, lets them
filter and page through them, and mark them read or unread, with a demo fallback when
no backend is configured.

## ADDED Requirements

### Requirement: Notifications update live while the app is open
While the app is open and a backend is configured, the notifications page and the home
widget's unread count SHALL update when the backend signals that the user's notifications
have changed, without the user refreshing. The signal SHALL cause the current view to be
reloaded from the Notifications API rather than being treated as the notification itself,
so a missed or malformed signal degrades to the previously specified manual-refresh
behaviour rather than showing wrong data.

#### Scenario: New notification arrives
- **WHEN** the backend signals a change while the notifications page is open
- **THEN** the list reloads from the first page and shows the change, with the user's
  current filters still applied. Additional pages the user had loaded are discarded rather
  than kept, because the list is ordered newest-first and retaining stale later pages
  beneath a freshly loaded first page could show a notification twice.

#### Scenario: Unread count follows
- **WHEN** the backend signals a change while the home widget is visible
- **THEN** the unread count reloads

#### Scenario: No backend
- **WHEN** the app is in demo mode or signed out
- **THEN** the page behaves exactly as previously specified, refreshing only when asked
