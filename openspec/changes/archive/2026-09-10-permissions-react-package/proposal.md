## Why

The app offers every action to everyone. A user who cannot unregister a catalog entity is
still shown "Unregister"; one who cannot run a template still sees the button. The backend
rejects the call, so nothing unsafe happens — but the user only discovers that after trying,
and the app has no way to ask "may this person do this?" before offering it.

Backstage answers exactly that question through its permission API, and nothing in the app
talks to it.

## What Changes

- Add **`packages/permissions-react`** as `@backstage-app/permissions-react`: an authorize
  client for the Backstage permission backend and a `usePermission` hook, mirroring the shape
  of upstream's `@backstage/plugin-permission-react`.
- **Re-export `@backstage/plugin-permission-common`** for the vocabulary — `AuthorizeResult`,
  `createPermission`, the `is*Permission` guards and the permission types — so a permission is
  spelled here exactly as the backend spells it.
- Support **resource permissions** via a `resourceRef`, so the backend can decide about one
  specific entity rather than the permission in general.
- Build the hook on the app's existing `useRemoteData`, so identical checks share one request
  and one cache entry.

## Why the vocabulary is reused but neither client is

`@backstage/plugin-permission-common` is safe to ship: under a Hermes simulation (the
`Function` constructor blocked) it imports cleanly and every helper works — unlike
`@backstage/catalog-model`, which throws on import. Measured on a real iOS Metro build it
costs **+154 KB and 25 modules**.

Neither client transfers. `@backstage/plugin-permission-react` depends on
`@backstage/core-plugin-api`, `swr` and `dataloader`; upstream's own `PermissionClient` needs
a `DiscoveryApi`, a `Config` and `cross-fetch`. The client here speaks the same wire protocol
through the app's already-authenticated `fetchJson`.

## Non-goals

- **Not** gating any existing UI. This change makes the question askable and proves it is
  answered correctly. Deciding which of the app's actions to hide is per-plugin work, and
  doing it here would bury a security-shaped decision inside an infrastructure change.
- **Not** batching distinct permissions into one request. Upstream uses a dataloader for that;
  here React Query already coalesces identical checks, which covers the common case. The wire
  format is the batch one, so real batching can be added later without changing callers.
- **Not** evaluating conditional decisions. `CONDITIONAL` means the backend cannot decide
  without applying rules to a resource; the app does not guess (see the spec).

## Capabilities

### New Capabilities

- `permissions`: how the app asks the Backstage backend whether the signed-in user may do
  something, and what it concludes when it cannot ask.

### Modified Capabilities

None. No existing screen changes behaviour in this change.

## Impact

- **New** `packages/permissions-react/` — client, hook, tests, `knip-report.md`,
  `report.api.md`, and a `backstage.role` so API reports cover it.
- `@backstage/plugin-permission-common` becomes a runtime dependency of that package
  (+154 KB once something imports it).
- No existing source file changes.
