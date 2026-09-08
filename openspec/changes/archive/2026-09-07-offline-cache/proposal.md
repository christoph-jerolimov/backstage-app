## Why

Every screen refetches from scratch. Leaving a page and coming back shows a spinner for
data the app read seconds ago, and with no connection the app shows nothing at all — which
is exactly when a developer on a phone most wants to look something up.

## What Changes

- Reimplement `useRemoteData` on **TanStack React Query** while keeping its signature
  (`(fetcher, key)`) and its `{ status, data, error, reload }` result, so all 44 call sites
  and the docs reader keep working untouched.
- Add a `QueryProvider` to `@backstage-app/core` that creates the query client, keeps
  results fresh for a short window, and **persists the cache** through the same storage as
  the theme and starred entities (AsyncStorage on native, localStorage on web).
- On a **cold start the app renders from the persisted cache** and refetches in the
  background; **offline**, cached data stays on screen instead of an error.
- The persisted cache is **scoped to the active Backstage instance**: switching instances
  or signing out discards it, so one instance's data can never appear under another.
- Only successful results are persisted, entries older than a day are dropped, and failed
  requests are not retried automatically (pages already offer their own retry).
- Outside a provider — in tests and standalone renders — `useRemoteData` keeps its current
  behaviour with a private, non-persisted client.

## Capabilities

### New Capabilities
- `data-caching`: how remote reads are cached, persisted, scoped, and revalidated.

## Impact

- `packages/core`: `query-provider.tsx` (client, persister, scoping), `hooks/use-remote-data.ts`
  reimplemented, exports.
- `packages/app`: mounts `QueryProvider` under the Backstage provider, passing the active
  instance as the cache scope.
- New dependencies: `@tanstack/react-query`, `@tanstack/react-query-persist-client`,
  `@tanstack/query-async-storage-persister`.
- No plugin changes: the hook's contract is unchanged.
