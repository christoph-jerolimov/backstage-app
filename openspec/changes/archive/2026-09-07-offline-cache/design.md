## Context

See proposal.md. `useRemoteData(fetcher, key)` is the single read path: 44 call sites across
every plugin, including the TechDocs reader's HTML fetch. It currently keeps one settled
result in component state, drops results whose key was superseded, and exposes
`{ status, data, error, reload }`. Core already owns a `KeyValueStorage` abstraction
(AsyncStorage / localStorage) used by the theme preference and entity preferences.

## Goals / Non-Goals

**Goals:** instant repeat views, useful offline behaviour, no churn in plugins, tests keep
rendering components in isolation.

**Non-Goals:** mutations through React Query (writes stay direct calls), infinite queries,
optimistic updates, a network-status indicator, prefetching.

## Decisions

### D1. Keep the hook's contract, swap its engine
`useRemoteData` becomes a thin adapter over `useQuery`: `queryKey: [key]`, `queryFn: ({ signal }) => fetcher(signal)`,
`reload: () => { refetch() }`. Status maps as: error → `error`, else data present → `success`,
else `loading`. Compared to today, a background refetch now reports `success` with the old
data instead of `loading` — pages that render `status === 'loading' && !data` are unaffected,
and pages keep their content while revalidating, which is the point of the change. Errors are
wrapped so `error` stays an `Error`. Because the contract is unchanged, no plugin file is
touched.

### D2. A provider that persists, and a fallback that does not
`QueryProvider` builds a `QueryClient` (`staleTime` 30 s, `gcTime` 24 h, `retry: false`,
`refetchOnWindowFocus: false`, `refetchOnReconnect: true`) and wraps
`PersistQueryClientProvider` with `createAsyncStoragePersister` over the platform
`KeyValueStorage`, persisting only successful queries with `maxAge` of one day. Outside a
provider, `useRemoteData` creates a private client per component instance (`useState`
initialiser) with `gcTime: 0`, which reproduces today's behaviour exactly: no sharing, no
persistence, no leakage between tests. Presence is detected with React Query's exported
`QueryClientContext`, and the resolved client is passed to `useQuery` explicitly, so no code
path can throw for a missing provider.

### D3. Instance scope through the persister's buster
The app passes the active instance id as `cacheKey`. It is the persister's `buster`, so a
different instance restores nothing, and a `useEffect` clears the in-memory client when it
changes. Signing out (no instance) uses the empty string, which likewise busts. This is
safer than prefixing every query key, because it also drops what is already on disk.

### D4. Retries stay off
`retry: false` keeps a failing read to one attempt: pages already render an error with a
Retry action, tests count attempts, and the polling task page would otherwise multiply
requests. Offline resilience comes from the cache, not from retrying.

## Risks / Trade-offs

- [Behaviour change during refetch] → status is `success` rather than `loading` while
  revalidating; the loading spinner still appears for a first load, and pages keep content
  during a refresh (which the entity page already relies on).
- [Persisted cache holds catalog data on the device] → scoped per instance, expires after a
  day, and holds only what the app already displayed; no tokens are cached, because sessions
  live in the secure store and are never query results.
- [Three new dependencies] → all from one maintained family, already common in Expo apps.

## Migration Plan

Single PR. Plugins are untouched; the app gains one provider. On first run after the update
the cache is empty and behaviour matches today's.
