## 1. Core

- [x] 1.1 Add the three TanStack dependencies to the app and core's peer dependencies, and add `packages/core/src/query-provider.tsx` (client defaults, async-storage persister, `cacheKey` busting and in-memory clear) per designs D2 and D3; verify tests cover persistence of a successful result, restoring it into a fresh client, discarding it under a different cache key, and not persisting failures
- [x] 1.2 Reimplement `useRemoteData` on `useQuery` per designs D1, D2, and D4, keeping its signature and result shape; verify tests cover loading then success, error after one attempt, `reload` refetching, key changes not showing the previous key's data, abort on unmount, cache hits inside a provider, and the private-client fallback outside one

## 2. App

- [x] 2.1 Mount `QueryProvider` in `packages/app/src/app/_layout.tsx` under the Backstage provider, passing the active instance id as the cache scope; verify typecheck passes and the web export succeeds

## 3. Verification

- [x] 3.1 Run `npm run typecheck`, `npm run lint -- --max-warnings=0`, `npm test -- --ci`; verify all pass, including the existing plugin tests that use the hook unchanged
- [x] 3.2 Run `cd packages/app && npx expo export --platform web`; verify the export succeeds
