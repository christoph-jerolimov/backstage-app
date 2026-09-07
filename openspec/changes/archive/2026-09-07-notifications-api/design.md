## Context

See proposal.md. Core provides the connection (`useBackstage`), `useRemoteData(fetcher,
key)`, `FilterChips`, `TextFilter`, `StateView`, `ListCard`, `Page`. The catalog and
search plugins established the API-interface + demo-API + page/screen pattern.

Notifications API contract (from `@backstage/plugin-notifications-backend` and the
`Notification` type in `@backstage/plugin-notifications-common`, inspected from the
published package): `GET /api/notifications` with `read=true|false`, `saved=true`,
`search=<text>`, `minimumSeverity=<low|normal|high|critical>`, `limit`, `offset`,
`orderField=created,desc` → `{ totalCount: number; notifications: Notification[] }`;
`GET /api/notifications/status` → `{ unread: number; read: number }`;
`POST /api/notifications/update` with JSON `{ ids: string[]; read?: boolean; saved?:
boolean }`. `Notification = { id, user, created, read?, saved?, updated?, origin,
payload: { title, description?, link?, severity?, topic?, scope?, icon? } }`; dates
arrive as ISO strings over HTTP. The backend requires user credentials: a static
service token yields 401/403, which the page surfaces as an error.

## Goals / Non-Goals

**Goals:** live list with triage actions; deterministic tests via a stub API; demo mode
that behaves like the real thing including persistence of marks during the session.

**Non-Goals:** opening a notification's link (locations shown later with entity
pages), saved/unsaved toggling (filter only), push/real-time signals, user sign-in.

## Decisions

### D1. `NotificationsApi` with REST and demo implementations
```ts
type NotificationFilters = { read?: boolean; saved?: boolean; minSeverity?: Severity; search: string };
type ListQuery = NotificationFilters & { limit: number; offset: number };
interface NotificationsApi {
  list(q: ListQuery, signal?): Promise<{ items: AppNotification[]; totalCount: number }>;
  status(signal?): Promise<{ unread: number; read: number }>;
  update(input: { ids: string[]; read?: boolean; saved?: boolean }): Promise<void>;
}
```
`AppNotification` mirrors the Backstage type with ISO-string dates parsed to `Date`.
The REST client maps query params as listed above. The demo API holds a mutable array
created once per `createDemoNotificationsApi()` call; `useNotificationsApi` memoizes it
so marks persist while the app runs.

### D2. Offset paging with an accumulator
Same pattern as search: first page via `useRemoteData(fetcher, key)` where `key`
serializes the filters; extra pages via `api.list` with `offset = loaded count`,
appended into an accumulator keyed by the filter key.

### D3. Marks reload rather than patch
After `update` resolves, the page calls `reload()` on the list and the status queries.
Simpler than optimistic patching and always consistent with the server; the extra
request is acceptable for a triage action. A failed update sets a transient error shown
above the list.

### D4. Filters
Read state: chips All / Unread / Read → `read` undefined / false / true (default
Unread). Saved: chips All / Saved → `saved` undefined / true. Minimum severity: chips
All / Low / Normal / High / Critical → `minSeverity`. Search: `TextFilter` → `search`.
Local semantics in demo mode: severity rank `low < normal < high < critical`,
unspecified severity counts as `normal` (Backstage's default).

### D5. Core additions
`formatRelativeTime(date, now = new Date())` → "just now", "N min ago", "N h ago",
"yesterday", "N d ago", else a short date. `ActionButton({ label, onPress, disabled })` —
the small pill button already used ad hoc for Retry / Load more, extracted so
`StateView`, search, and notifications share it.

### D6. Page/screen split
`NotificationsPage({ api, demo })` and `NotificationsScreen`; route mounts the screen.

## Risks / Trade-offs

- [Static token is rejected by the notifications backend] → surfaced as the error state
  with the server message; README documents that a user token is required. Sign-in is
  a later feature.
- [Marking read under the Unread filter removes the row] → intended; the count and
  list reload together so the user sees the effect immediately.
- [Reload after every mark costs two requests] → acceptable at this scale; revisit with
  optimistic updates if it feels slow.

## Migration Plan

Single PR. Demo mode continues to work without configuration.
