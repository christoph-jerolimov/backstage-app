## Why

Notifications are the plugin a mobile user opens most: they arrive on the phone and need
a quick read/unread triage. The page still shows three static rows, and the connection
layer now exists, so this change makes notifications live and interactive.

## What Changes

- Rework the notifications plugin around a `NotificationsApi` interface with a REST
  implementation for the Backstage Notifications API (`GET /api/notifications`,
  `GET /api/notifications/status`, `POST /api/notifications/update`) and an in-memory
  demo implementation whose read/saved marks persist for the session.
- The page lists notifications newest first with title, description, origin and topic,
  severity, and a relative time. Filters: read state (All / Unread / Read), Saved,
  minimum severity, and a text search. "Load more" pages by offset, 25 at a time.
- An unread count in the header of the list, a per-notification "Mark read" / "Mark
  unread" action, and a "Mark all read" action for the notifications currently listed.
- Loading, empty, and error-with-retry states, the demo banner, and a note that the
  Notifications API needs a user token (a static service token is rejected by Backstage).
- Add a small `formatRelativeTime` helper and an `ActionButton` to core for reuse.

## Capabilities

### New Capabilities
- `notifications-plugin`: listing, filters, paging, unread count, mark read/unread, and
  the demo fallback.

### Modified Capabilities
- `demo-plugins`: the notifications placeholder requirement is removed; every plugin
  page is now specified by its own capability.

## Impact

- `plugins/notifications/src/` rewritten: `api.ts`, `demo-api.ts`, `notifications-page.tsx`,
  `notifications-screen.tsx`, `use-notifications-api.ts`, tests.
- `packages/core/src/utils/relative-time.ts`, `packages/core/src/components/action-button.tsx`.
- `packages/app/src/app/notifications.tsx` mounts `NotificationsScreen`.
- README gains a note about the user token requirement for notifications.
