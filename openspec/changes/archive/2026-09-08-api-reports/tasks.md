## 1. Package roles

- [x] 1.1 Add `backstage.role` to all 20 workspace `package.json` files per design D2 — `frontend` for `packages/app`, `web-library` for `packages/{core,ui,theme,catalog-api,analytics-api}`, `common-library` for `packages/{errors,types,catalog-model}`, `frontend-plugin` for each of the eleven `plugins/*`; verify by running `npx backstage-repo-tools api-reports --allow-all-warnings` and confirming it processes exactly the nineteen library workspaces and never `packages/app`

## 2. Declaration emit

- [x] 2.1 Add root `tsconfig.api-reports.json` per design D3 (extends `packages/app/tsconfig.json`; `noEmit: false`, `declaration`, `emitDeclarationOnly`, `outDir: dist-types`, `rootDir: "."`, `types: ["expo/types"]`, globs `packages/*/src` and `plugins/*/src`, excludes `packages/app/**` and `**/__tests__/**`); verify `npx tsc -p tsconfig.api-reports.json` exits 0 and produces `dist-types/<workspace>/src/index.d.ts` for all nineteen libraries
- [x] 2.2 Add `dist-types/` to `.gitignore`; verify `git status --short` shows no `dist-types` entry after a compile
- [x] 2.3 Add `dist-types` to the `ignores` list in `eslint.config.js` — the emitted `theme.d.ts` keeps the `./global.css` side-effect import, which `import/no-unresolved` cannot resolve in generated output; verify `npm run lint -- --max-warnings=0` passes with `dist-types/` present

## 3. Fix forgotten exports

- [x] 3.1 `packages/ui`: rename `Props` to `ExternalLinkProps` in `src/external-link.tsx` and export it, and export `HintRowProps` from `src/hint-row.tsx`; add both to `src/index.ts` per design D5
- [x] 3.2 `plugins/auth`: export the existing `AddInstanceFormProps` and `TokenFormProps` types from `src/index.ts`
- [x] 3.3 `packages/catalog-api`: export `FacetsResponse` from `src/api.ts` and from `src/index.ts`
- [x] 3.4 `plugins/notifications`: export `WireNotification` from `src/api.ts` and from `src/index.ts`
- [x] 3.5 `plugins/kubernetes`: export the existing `KubernetesEvent`, `PodRef`, and `PodLogQuery` types from `src/index.ts`
- [x] 3.6 Verify all nine findings are resolved: regenerate reports and confirm `grep -l ae-forgotten-export packages/*/report.api.md plugins/*/report.api.md` matches nothing

## 4. Scripts and reports

- [x] 4.1 Add root scripts `api-reports` and `api-reports:check` per design D6, each compiling `tsconfig.api-reports.json` first and passing `-o ae-wrong-input-file-type,ae-undocumented,ae-missing-release-tag`; verify `npm run api-reports` exits 0 with no `--allow-warnings` flag
- [x] 4.2 Commit the generated `report.api.md` for all nineteen library workspaces; verify a report exists in each of the eight library `packages/*` and each of the eleven `plugins/*`, and that `packages/app` has none
- [x] 4.3 Verify no report contains an absolute path or any `// Warning:` line (design D4/D5): `grep -n "/home/\|// Warning:" packages/*/report.api.md plugins/*/report.api.md` matches nothing
- [x] 4.4 Regenerate the committed `knip-report.md` files — they record `package.json` line numbers, which shift by the `backstage.role` block added in 1.1; verify `npm run knip-reports:check` exits 0

## 5. CI

- [x] 5.1 Add an `API reports` step running `npm run api-reports:check` to the existing `check` job in `.github/workflows/ci.yml`, after the `Knip reports` step; verify the step sits inside the `check` job and needs no extra install
- [x] 5.2 Verify the check passes against the committed reports by running `npm run api-reports:check` locally and confirming a zero exit code
- [x] 5.3 Verify the check actually fails on drift: temporarily add an exported symbol to one package's `src/index.ts`, confirm `npm run api-reports:check` exits non-zero, then revert

## 6. Verification

- [x] 6.1 Run `npm run typecheck`, `npm run lint -- --max-warnings=0`, `npm test -- --ci`, and `npm run knip-reports:check`; verify all pass
- [x] 6.2 Run `cd packages/app && npx expo export --platform web`; verify the export still succeeds
