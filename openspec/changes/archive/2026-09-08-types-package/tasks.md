## 1. Package scaffold

- [x] 1.1 Create `packages/types/package.json` as `@backstage-app/types` matching the `@backstage-app/errors` shape (`private: true`, `version: 1.0.0`, `main`/`types` → `src/index.ts`, `@backstage/types` in `dependencies`); verify `npm install` links it and `npm query .workspace` lists 14 workspaces
- [x] 1.2 Create `packages/types/src/index.ts` as a single `export * from '@backstage/types';` with a doc comment naming the export groups, per design D1; verify `npm run typecheck` passes with no tsconfig edit, confirming the previously widened `include` glob covers it

## 2. Runtime behaviour tests

- [x] 2.1 Test `createDeferred` per design D2: the returned value is itself an awaitable promise carrying `resolve`/`reject`, resolving settles it with the value, rejecting rejects it, and settling a second time is a no-op; verify the suite passes under `npx jest packages/types`
- [x] 2.2 Test `durationToMilliseconds` per design D2 across each `HumanDuration` field individually, a multi-field combination, and the empty duration, asserting the documented approximations (365-day years, 30-day months, fixed 24-hour days); verify the computed values are exact numbers, not ranges

## 3. Compile-time assertions

- [x] 3.1 Add assignability assertions for the JSON shapes (`JsonValue`, `JsonObject`, `JsonArray`, `JsonPrimitive`) including `@ts-expect-error` cases for values that must be rejected (e.g. a function or `undefined` as a `JsonValue`) per design D2; verify `npm run typecheck` passes and that removing an `@ts-expect-error` makes it fail
- [x] 3.2 Add assertions covering the remaining type-only exports — `Observable`/`Observer`/`Subscription`, `DeferredPromise`, `HumanDuration`, `Expand`/`ExpandRecursive` — by declaring conforming values or minimal implementations; verify `npm run typecheck` passes
- [x] 3.3 Prove `export *` carries type-only exports per design D3 by importing at least one type solely through `@backstage-app/types` (not from `@backstage/types`) and using it where a missing type is a compile error; verify typecheck passes, and confirm the assertion is load-bearing by temporarily renaming the imported type and seeing typecheck fail

## 4. Reports and verification

- [x] 4.1 Run `npm run knip-reports` and commit `packages/types/knip-report.md`; verify it reports no unlisted dependencies and `npm run knip-reports:check` exits zero
- [x] 4.2 Run `npm run typecheck`, `npm run lint -- --max-warnings=0`, and `npm test -- --ci`; verify all pass and the new suite is picked up by jest's existing `roots`
- [x] 4.3 Run `cd packages/app && npx expo export --platform web`; verify the export still succeeds
