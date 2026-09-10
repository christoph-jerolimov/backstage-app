## Context

See proposal.md — Why, and the `permissions` spec for the behaviour. What shapes the approach:

- Upstream's `PermissionClient` defines the wire protocol to match: `POST` to
  `<baseUrl>/api/permission/authorize` with `{ items: [{ id, permission, resourceRef? }] }`,
  answered with `{ items: [{ id, result }] }` where `result` is `ALLOW`, `DENY` or
  `CONDITIONAL`, authenticated with a bearer token.
- The app's `fetchJson` from `useBackstage()` is already bound to the base URL and already
  sends that token, and rejects in demo mode.
- `useRemoteData` is now backed by React Query: identical keys share one in-flight request and
  one cache entry, and it returns `{ status, data, error, reload }`.
- `packages/signals-react` is the closest precedent — client plus hook plus an injectable
  transport so tests need no network.
- Every library workspace needs a `backstage.role`, or `api-reports` skips it silently.

## Goals / Non-Goals

**Goals:**

- Ask the real Backstage permission API, in its own vocabulary, so permissions declared by a
  backend plugin work unmodified.
- Make the unavailable and undecidable cases explicit and tested, since both are easy to get
  quietly wrong in a way that either over-permits or breaks the demo.
- Make one request per distinct question, not per component.

**Non-Goals:**

- Any UI decision (proposal Non-goals).
- Reimplementing conditional rule evaluation, which is a backend concern.

## Decisions

### D1. Re-export the vocabulary, write our own transport

`@backstage/plugin-permission-common` is re-exported wholesale: `AuthorizeResult`,
`createPermission`, the `is*Permission` guards and every type. A permission is then spelled
identically in this app and in the backend plugin that declares it, and a plugin author can
copy a permission definition across without translation.

That is safe here — verified, not assumed: with the `Function` constructor blocked (a Hermes
stand-in) it imports cleanly and every helper runs, and a real iOS Metro build measured the
cost at +154 KB and 25 modules. This is the same test that proved `@backstage/catalog-model`
*cannot* be imported, so the difference is established rather than hoped for.

The clients do not transfer: upstream's `PermissionClient` wants a `DiscoveryApi`, a `Config`
and `cross-fetch`, and `@backstage/plugin-permission-react` wants `@backstage/core-plugin-api`,
`swr` and `dataloader`. Ours issues the same request through `fetchJson`, which already holds
the base URL and the token.

### D2. Build the hook on `useRemoteData` instead of a dataloader

Upstream batches concurrent checks with a dataloader. Here `useRemoteData` is React Query
backed, so two components asking the same question with the same key already share one
in-flight request and one cache entry — which is the case that actually occurs, a list where
every row asks about the same permission.

The cache key is the permission name plus the `resourceRef`, so a question about one resource
never answers for another. Batching *distinct* permissions into a single HTTP call is left out
(proposal Non-goals); the request body is already the batch shape, so adding it later changes
no caller.

This also inherits revalidation and the existing error handling rather than growing a second,
subtly different fetching path in the app.

### D3. Unavailable means allowed; failure does not

Two situations look alike and must not be treated alike.

**No backend to ask** — demo mode, or signed out — resolves to **allowed**. This is not a
convenience: Backstage's permission framework is opt-in, and a deployment that has not enabled
it permits everything. Reporting "allowed" is what asking such a deployment would actually
return. Denying instead would make demo mode look broken by hiding every action, and would
misrepresent an unconfigured backend as a restrictive one. No request is made in this case.

**The request fails** — the backend exists but the call errored — surfaces the error and
reports **not allowed**. Here an answer was expected and did not arrive, so assuming
permission would be inventing one.

The hook therefore exposes loading and error alongside the verdict, so a caller can tell "not
allowed" from "could not tell", and `allowed` is never true on the strength of an answer that
never came.

A third case is deliberately *not* handled: used outside a `BackstageProvider`, the hook
throws, because `useBackstage` does. That is a wiring bug rather than a permission question
with a sensible default, so the hook inherits core's contract instead of papering over it.

### D4. `CONDITIONAL` is not an allow

A conditional decision means the backend cannot decide without applying rules to a specific
resource. Only `ALLOW` maps to allowed; `DENY` and `CONDITIONAL` both map to not allowed.

Mapping `CONDITIONAL` to allowed would show actions the backend may well refuse, and it is a
plausible mistake because a conditional decision is "not a denial". Pinned by a test.

### D5. An injectable transport, as `signals-react` does

The client takes its `fetchJson` as a parameter rather than reaching for one, so tests assert
the exact request body — including that a `resourceRef` is sent when given and omitted when
not — and drive `ALLOW`/`DENY`/`CONDITIONAL`/failure without a network. The request shape is
the contract with the backend; a test that cannot see it is not testing the contract.

## Risks / Trade-offs

- **Treating "no backend" as allowed could look like a security hole** → It matches what an
  unconfigured Backstage answers, is confined to the case where no backend exists to ask, and
  is stated in the spec rather than buried. A deployment that enables the framework gets real
  answers; one that has not, has not asked for restrictions.
- **This package cannot enforce anything** → Correct, and worth being explicit: the backend
  enforces. This only decides what to *offer*, and a client-side check is a usability
  improvement, never a security boundary.
- **+154 KB for a vocabulary** → Measured rather than guessed, and paid only once something
  imports it. The alternative — hand-declaring permission types — would drift from the backend
  and lose the property that makes D1 worth having.
- **Per-question requests could still be chatty across *distinct* permissions** → The common
  case is covered by D2; the wire format leaves real batching available without a caller
  change.
