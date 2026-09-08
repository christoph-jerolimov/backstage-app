## 1. Package scaffold

- [x] 1.1 Create `packages/errors/package.json` as `@backstage-app/errors` following the internal package shape (`private: true`, `version: 1.0.0`, `main`/`types` → `src/index.ts`) with `@backstage/errors` in `dependencies` per design D4; verify `npm install` links it and `npm query .workspace` lists the new workspace
- [x] 1.2 Create `packages/errors/src/index.ts` containing `export * from '@backstage/errors';` per design D1; verify `node -e` resolving `@backstage-app/errors` is unnecessary but that `npm run typecheck` sees the file

## 2. Typecheck coverage

- [x] 2.1 Replace the hardcoded `../core/src/**/*.ts` and `../core/src/**/*.tsx` entries in `packages/app/tsconfig.json` `include` with `../*/src/**/*.ts` and `../*/src/**/*.tsx` per design D3; verify `npm run typecheck` still passes and that deliberately introducing a type error in `packages/errors/src` is now caught (then revert it)

## 3. Tests

- [x] 3.1 Add `packages/errors/src/__tests__/errors.test.ts` exercising behavior per design D2: a `serializeError`/`deserializeError` round trip preserving a `NotFoundError`'s name and message, `ResponseError.fromResponse` against a real `fetch` `Response` carrying a Backstage-shaped error body, and `assertError`/`isError`/`toError` narrowing; verify `npm test -- --ci` passes and the new suite is picked up by jest's existing `roots`
- [x] 3.2 Verify the suite covers at least one member of each upstream export group (a typed error, the response error, the serialization pair, the assertion helpers) without asserting an exact export count per design D2

## 4. Reports and verification

- [x] 4.1 Run `npm run knip-reports` and commit `packages/errors/knip-report.md`; verify the report lists no unlisted dependencies and that `npm run knip-reports:check` exits zero
- [x] 4.2 Run `npm run typecheck`, `npm run lint -- --max-warnings=0`, and `npm test -- --ci`; verify all pass
- [x] 4.3 Run `cd packages/app && npx expo export --platform web`; verify the export still succeeds
