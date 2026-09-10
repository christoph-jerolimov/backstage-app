## Context

See proposal.md — Why, and the `catalog-plugin` delta for the behaviour. What constrains the
approach:

- The plugin already separates a **connected screen** from a **presentational page**:
  `EntityScreen` calls `useBackstage`, `usePluginRegistry` and `useCatalogApi`, then passes
  plain props — `api`, `baseUrl`, `actionsFor`, `onUnregistered` — into `EntityPage`.
- Because of that split, `plugins/catalog/src/__tests__/maintenance.test.tsx` renders
  `EntityPage` directly with **no `BackstageProvider`**. `usePermission` throws outside one,
  by design.
- `usePermission` reports `allowed: false` while loading, and `allowed: true` when there is no
  backend to ask.
- `MaintenanceActions` already renders Unregister conditionally, only once the location has
  loaded.
- `catalog.entity.delete` is a resource permission (`resourceType: 'catalog-entity'`), so it
  takes a `resourceRef`.

## Goals / Non-Goals

**Goals:**

- Ask the question the backend actually answers, for the entity actually on screen.
- Do it without breaking the plugin's screen/page separation or the tests that rely on it.
- Keep the "no backend" and "still loading" cases behaving sensibly and testably.

**Non-Goals:**

- Gating other actions (proposal Non-goals).
- Any change to the confirmation flow or the rejection path.

## Decisions

### D1. The screen asks; the page receives a prop

`EntityScreen` calls `usePermission` and passes the verdict to `EntityPage` as
`canUnregister?: boolean`; `EntityPage` forwards it to `MaintenanceActions`.

Calling the hook inside `EntityPage` would be the shorter diff and is the wrong shape here.
`EntityPage` is the presentational half of an established split — it takes even its `api` as a
prop — and a hook reaching for the Backstage connection would break that. It would also break
`maintenance.test.tsx`, which renders the page with no provider; "wrap the existing tests in a
provider" would be paying for the wrong design with churn in tests that are not about
permissions.

The prop **defaults to allowed** when omitted. That keeps every existing caller and test
rendering exactly what it renders today, and it is the same principle the permissions spec
already sets: absence of an answer about permission is not evidence of denial.

*Alternative — make `usePermission` tolerate a missing provider:* rejected. That contract was
decided, documented and tested one change ago; reversing it to avoid touching a component
boundary would be the tail wagging the dog.

### D2. The canonical permission, scoped to the entity

`catalogEntityDeletePermission` comes from `@backstage/plugin-catalog-common/alpha` rather
than being re-declared locally with `createPermission`. The app then asks the *same*
permission object the catalog backend evaluates, and a reader can follow the name straight
into Backstage's own policy.

It is passed with `resourceRef` set to the entity's stringified ref, which is what makes the
answer specific to the entity on screen rather than to deletion in general — and is the first
real use of the `resourceRef` path in `usePermission`.

The safety question is real and was checked, not assumed: `@backstage/plugin-catalog-common`
depends on `@backstage/catalog-model`, which **cannot be imported at runtime on Hermes**.
Under the `Function`-blocked simulation, importing the `/alpha` subpath succeeds and neither
`catalog-model` nor `ajv` enters the module graph. A task verifies the same in a real iOS
bundle, because a web-only CI cannot catch a regression here.

*Alternative — declare the permission locally:* removes the dependency and the subpath
question entirely. Rejected because the name is a contract with the backend; a local copy
looks identical until the day it is not, and the verified evidence says the dependency is
safe on this path.

### D3. Hide the action rather than disable it

When not permitted, the action is not rendered.

A disabled button with an explanation is the usual advice, and is what Backstage's web UI
tends to do — but it does not fit here. `MaintenanceActions` **already** hides Unregister when
the catalog knows no location, so hiding is the established meaning of "not applicable to this
entity" on this page, and introducing a second, different treatment for "not applicable to
this user" would be the inconsistency, not the hiding.

It also avoids a flash: `allowed` is false while loading, so a disabled-then-enabled button
would visibly change state on every page load. Hidden-then-shown is the behaviour the page
already has for this exact button while the location loads, so the gating adds no new
motion.

The cost is that a user cannot tell "I may not do this" from "this does not apply". That is
accepted for a destructive action, where the safer failure is not advertising it.

### D4. What the existing tests must show

The three existing maintenance tests — confirmation required, confirm deletes, cancel — must
pass **unmodified**. They render `EntityPage` with no provider and no new prop, so they
exercise the default-allowed path, and their continuing to pass is the evidence that the
gating did not disturb the flow it wraps.

New tests cover the gate itself at both levels: the page given `canUnregister={false}`, and
the screen against a backend that denies, allows, and denies-one-but-allows-another.

## Risks / Trade-offs

- **A future edit calls `usePermission` inside `EntityPage`** → It would throw immediately in
  `maintenance.test.tsx`, which has no provider. The failure is loud and local.
- **The default-allowed prop could silently ungate a new caller** → Deliberate (D1), and
  bounded: `EntityScreen` is the only caller, the backend still enforces, and the spec states
  the default.
- **`catalog-model` reaching the bundle through the new dependency** → Checked in the module
  graph and re-checked in the iOS bundle by a task (D2). This is the one risk here that CI
  cannot see, which is why it gets a bundle-level check rather than a unit test.
- **Hiding hides the reason** → Accepted and argued in D3; revisit if users report confusion,
  at which point the fix is a shared treatment for both hidden cases, not just this one.
