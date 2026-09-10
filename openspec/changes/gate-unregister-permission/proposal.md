## Why

The entity page offers Unregister to everyone. A user without permission presses it, reads
the confirmation, confirms — and only then gets the backend's rejection. The permission
package added last change makes that question answerable before the action is offered, and
unregister is the right first place to use it: it is destructive, and its rejection is the
most annoying one to discover late.

## What Changes

- Ask the Backstage permission backend whether the signed-in user may delete the entity, and
  **offer Unregister only when the answer is yes**.
- Use the **canonical `catalog.entity.delete` permission** from
  `@backstage/plugin-catalog-common/alpha`, as a **resource** permission scoped to the entity
  on screen, so a user permitted to delete one entity but not another gets the right answer
  for the one they are looking at.
- Keep the split the plugin already has: `EntityScreen` asks, and passes the answer to
  `EntityPage` as a prop. The page stays presentational.
- Leave Refresh ungated. It is a different permission (`catalog.entity.refresh`) and a
  non-destructive one; gating it is the same shape of work and can follow.

## Why the canonical permission, and why it is safe

`@backstage/plugin-catalog-common` declares `catalog.entity.delete` — the same permission the
catalog backend evaluates — so using it means the app asks exactly the question the backend
answers, rather than a locally spelled guess.

It lists `@backstage/catalog-model` as a dependency, which **cannot be imported at runtime on
Hermes**. Verified that this does not matter on the path used here: importing
`@backstage/plugin-catalog-common/alpha` under the `Function`-blocked Hermes simulation
succeeds, and neither `catalog-model` nor `ajv` appears in the resulting module graph. The
tasks verify the same holds in a real iOS bundle, because that is the failure CI cannot see.

## Non-goals

- **Not** gating Refresh, the scaffolder, or anything else. One action, done properly.
- **Not** changing what the backend enforces. This decides what to *offer*; the catalog still
  rejects an unpermitted delete, and that path keeps its existing error handling and test.
- **Not** disabling the button with an explanation instead of hiding it (see design D3).

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `catalog-plugin`: the Unregister action now depends on permission as well as on the catalog
  knowing a location.

## Impact

- `plugins/catalog/src/entity-screen.tsx`: asks with `usePermission`.
- `plugins/catalog/src/entity-page.tsx`: a new prop gates the action; the confirmation flow is
  untouched.
- `plugins/catalog/package.json`: depends on `@backstage-app/permissions-react` and
  `@backstage/plugin-catalog-common`.
- Existing maintenance tests render `EntityPage` without a `BackstageProvider` and keep
  working unchanged, because the page takes the answer as a prop rather than asking for it.
