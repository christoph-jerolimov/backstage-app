## 1. Package scaffold

- [x] 1.1 Create `packages/permissions-react/package.json` as `@backstage-app/permissions-react` following the `packages/signals-react` shape — `private`, `backstage.role: web-library`, `main`/`types` → `src/index.ts` — depending on `@backstage-app/core` and `@backstage/plugin-permission-common`, with react/react-native peers; verify `npm install` links it and `npm query .workspace` lists 22 workspaces
- [x] 1.2 Re-export the vocabulary from `@backstage/plugin-permission-common` per design D1; verify `AuthorizeResult`, `createPermission` and the `is*Permission` guards are reachable through `@backstage-app/permissions-react` and that `npm run typecheck` passes

## 2. Authorize client

- [x] 2.1 Implement the authorize client per design D1/D5: takes `fetchJson`, POSTs to `/api/permission/authorize` with `{items:[{id, permission, resourceRef?}]}` and reads `{items:[{id, result}]}`; verify tests assert the exact request body, that `resourceRef` is present when given and absent when not, and that the response is matched back by `id`
- [x] 2.2 Map results per design D4: only `ALLOW` is allowed, `DENY` and `CONDITIONAL` are not; verify a test covers all three and explicitly pins that `CONDITIONAL` is not an allow
- [x] 2.3 Handle a malformed or short response without throwing an unhandled error; verify a test covers a response missing the requested id

## 3. usePermission hook

- [x] 3.1 Add `usePermission({ permission, resourceRef })` returning the verdict plus loading and error, built on `useRemoteData` per design D2, keyed by permission name and `resourceRef`; verify a test shows two components with the same key issue one request and both receive the answer, and that different `resourceRef`s do not share an answer
- [x] 3.2 Implement the unavailable case per design D3: demo mode and signed out resolve to allowed with no request issued; verify tests assert both, including that no fetch is attempted
- [x] 3.3 Implement the failure case per design D3: a failing request surfaces the error and does not report allowed; verify a test asserts both, and that `allowed` is false while loading
- [x] 3.4 Write `src/index.ts` exporting the client, the hook and their types; verify `npm run typecheck` passes

## 4. Reports and verification

- [x] 4.1 Run `npm run api-reports` and commit `packages/permissions-react/report.api.md`; verify the run processes 21 library workspaces including the new one, which confirms the `backstage.role` from 1.1 took effect
- [x] 4.2 Run `npm run knip-reports` and commit `packages/permissions-react/knip-report.md`; verify it lists no unlisted dependencies and `npm run knip-reports:check` exits zero
- [x] 4.3 Run `npm run typecheck`, `npm run lint -- --max-warnings=0`, `npm test -- --ci`, and `npm run api-reports:check`; verify all pass
- [x] 4.4 Run `cd packages/app && npx expo export --platform web`; verify the export succeeds
