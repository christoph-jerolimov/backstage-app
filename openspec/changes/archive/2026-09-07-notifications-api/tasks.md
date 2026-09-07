## 1. Core additions

- [x] 1.1 Add `packages/core/src/utils/relative-time.ts` (`formatRelativeTime`) and export it; verify unit tests cover just now, minutes, hours, yesterday, days, and older dates
- [x] 1.2 Add `packages/core/src/components/action-button.tsx` (`ActionButton`), use it inside `StateView` for Retry, and export it; verify the existing StateView test still passes and a render test presses the button

## 2. Notifications API

- [x] 2.1 Add `plugins/notifications/src/api.ts` (types, `SEVERITIES`, `severityRank`, `buildListQuery`, `parseNotification`, `createRestNotificationsApi` with `list`, `status`, `update`); verify unit tests cover the query string for each filter, ISO date parsing, and the update request body
- [x] 2.2 Add `plugins/notifications/src/demo-api.ts` (`createDemoNotifications`, `createDemoNotificationsApi` with local filtering, offset paging, status, and persistent marks); verify unit tests cover unread/read/saved/severity/search filtering, paging, and that `update` changes subsequent `list` and `status` results

## 3. Notifications page

- [x] 3.1 Rewrite `notifications-page.tsx` as `NotificationsPage({ api, demo })` with the filters, unread count, list rows (title, description, origin · topic, severity, relative time, unread marker, Mark read/unread action), "Mark all read", "Load more", and the loading/empty/error states; add `notifications-screen.tsx`, `use-notifications-api.ts`, update `plugin.ts` and `index.ts`; verify render tests with the demo API cover the default Unread list, switching to All/Read, severity and search filters, marking one read (count drops, row leaves the Unread list), mark all read, load more, and the error state with retry via a failing stub
- [x] 3.2 Point `packages/app/src/app/notifications.tsx` at `NotificationsScreen` and add the user-token note to the README; verify `npm run typecheck` passes and the README mentions the notifications token requirement

## 4. Verification

- [x] 4.1 Run `npm run typecheck`, `npm run lint -- --max-warnings=0`, `npm test -- --ci`; verify all pass
- [x] 4.2 Run `cd packages/app && npx expo export --platform web`; verify `/notifications` is emitted
