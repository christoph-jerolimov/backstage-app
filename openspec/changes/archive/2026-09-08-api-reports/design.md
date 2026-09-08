## Context

See proposal.md — Why. The constraints that shape the approach:

- npm workspaces, `packages/*` and `plugins/*`, 13 workspaces total. Twelve of them are
  `private` libraries with `main: src/index.ts` and **no build step** — nothing in this repo
  has ever emitted a `.d.ts`. `packages/app` is the Expo application and has no entry module.
- `@backstage/repo-tools@0.19.0` is already a root devDependency, added by the previous
  `knip-reports` change. It bundles API Extractor.
- TypeScript is `~6.0.3`; the root `tsconfig.json` extends `packages/app/tsconfig.json`, which
  extends `expo/tsconfig.base` — and that base sets `noEmit: true`, `jsx: react-jsx`,
  `moduleResolution: bundler`, and `customConditions: ["react-native"]`.
- CI (`.github/workflows/ci.yml`) has one `check` job: install, typecheck, lint, test,
  knip-reports, web export. The repo's convention is that automated checks block, not advise.

Everything below was verified by running the tool against this repo before the plan was
written, not inferred from the documentation.

## Goals / Non-Goals

**Goals:**

- Use the tool Backstage itself uses, so the report format and workflow match upstream and a
  contributor who knows Backstage recognizes the files.
- Make an API change a review-time signal — a diff in a committed file — the same way
  `knip-report.md` made dependency drift one.
- Produce reports that are **byte-identical on any machine**, so the CI check compares content
  rather than environment.

**Non-Goals:**

- Introducing a real build pipeline. Declaration emit exists only to feed API Extractor; the
  app still consumes `src/index.ts` directly through Metro.
- Reports with zero warnings for their own sake. Warnings we suppress are suppressed for a
  stated reason (D4); warnings that point at a real hole get fixed (D5).

## Decisions

### D1. `@backstage/repo-tools api-reports`, driven over all packages

The request asked for the Backstage CLI if possible. As with `knip-reports`, `@backstage/cli`
has no `api-reports` command — it lives in `@backstage/repo-tools`, which is the
Backstage-official tool and what the Backstage monorepo itself runs. It is already installed,
so this change adds no dependency.

Run it with no path arguments. Passing paths makes the tool write a temporary
`tsconfig.tmp.json`; with no paths it uses the root `tsconfig.json` directly for API
Extractor's compiler, which is simpler and leaves no stray file behind.

Report files land in each package root as **`report.api.md`** — the tool's current naming, not
the older `api-report.md`.

### D2. `backstage.role` is the selection mechanism

`repo-tools` decides what to do with a workspace from `package.json`'s `backstage.role`:
a package **without** a role is skipped entirely, and the roles `frontend`, `backend`, and
`cli` are excluded from TypeScript API reports. So the role field is not decoration — it is
how the twelve libraries opt in and how `packages/app` opts out:

| Workspace | Role | Report |
| --- | --- | --- |
| `packages/app` | `frontend` | no — it is the application |
| `packages/core` | `web-library` | yes |
| `packages/errors` | `common-library` | yes |
| `plugins/*` (10) | `frontend-plugin` | yes |

These are the same role assignments the Backstage monorepo uses for the same kinds of package,
including `frontend` for its app. Nothing else in this repo reads `backstage.role`, so the
field is inert beyond this tool.

### D3. Emit declarations ourselves via `tsconfig.api-reports.json`

API Extractor analyses `.d.ts` files, and expects them at
`dist-types/<packageDir>/src/index.d.ts`. `repo-tools` has a `--tsc` flag that would produce
them, but it shells out to **`yarn tsc`** — this repo is npm workspaces, so that flag is
unusable. Emit them with our own config instead and run it as the first half of the script.

`tsconfig.api-reports.json` extends `packages/app/tsconfig.json` and overrides:

- `noEmit: false`, `declaration: true`, `emitDeclarationOnly: true` — undo `expo/tsconfig.base`
- `outDir: "dist-types"`, `rootDir: "."` — produce exactly the layout API Extractor expects
- `types: ["expo/types"]` — **required**: `packages/core/src/theme.ts` has a side-effect import
  of `./global.css`, and without Expo's ambient types that is `TS2882`. `jest` is dropped from
  the inherited list since tests are excluded.
- `include` of `packages/{core,errors}/src` and `plugins/*/src`, `exclude` of `**/__tests__/**`
  — the app is not included, matching D2.

*Alternative — make the root `tsconfig.json` emit declarations:* rejected. It would couple
`npm run typecheck` to the report pipeline and pull `packages/app` into declaration emit for
no benefit.

`dist-types/` is build output and goes in `.gitignore`.

### D4. Suppress three API Extractor messages, for three different reasons

Run with `-o ae-wrong-input-file-type,ae-undocumented,ae-missing-release-tag`.

- **`ae-wrong-input-file-type`** is the one that *must* be suppressed. `resolveJsonModule` pulls
  `expo-symbols/build/android/symbols.json` into the program, and API Extractor reports it with
  an **absolute path** — `/home/user/backstage-app/node_modules/...`. Committing that would make
  every report machine-specific and the CI check would fail for everyone. It reports a file in a
  dependency, not in our code, so there is nothing to fix on our side.
- **`ae-missing-release-tag`** and **`ae-undocumented`** are suppressed by choice: these packages
  are `private` and never published, so `@public`/`@beta`/`@alpha` carry no meaning, and without
  suppression every one of the ~200 exports gets a two-line warning banner in its report,
  drowning the signal the report exists to carry.

Warnings are otherwise **not** allowed: no `--allow-all-warnings`. A new warning should fail,
which is the point of D5.

### D5. Fix the nine `ae-forgotten-export` findings rather than record them

`ae-forgotten-export` means a type appears in an exported signature but is not reachable from
the package entry point — a consumer can call the function and cannot name its argument. That is
a real hole, and it is exactly the class of problem this change exists to surface, so the first
run's findings get fixed rather than baked into the reports:

| Package | Symbol | Fix |
| --- | --- | --- |
| `packages/core` | `Props` in `components/external-link.tsx` | rename to `ExternalLinkProps`, export from module and index |
| `packages/core` | `HintRowProps` | export from module and index |
| `plugins/auth` | `AddInstanceFormProps`, `TokenFormProps` | already exported from their modules; add to index |
| `plugins/catalog` | `FacetsResponse` in `src/api.ts` | export from module and index |
| `plugins/notifications` | `WireNotification` in `src/api.ts` | export from module and index |
| `plugins/kubernetes` | `KubernetesEvent`, `PodRef`, `PodLogQuery` | already exported from `types.ts`; add to index |

The bare name `Props` is renamed because it would otherwise be exported as `Props` from
`@backstage-app/core`, which is meaningless at a package boundary. All other symbols keep their
names. Every change is additive — no existing export is removed or re-typed.

*Alternative — pass `--allow-warnings` and keep the findings in the reports:* rejected. It would
leave the check permanently unable to distinguish "known" from "new" warnings, since
`repo-tools` compares warning **counts** per package.

### D6. Two scripts, one CI step, mirroring `knip-reports`

```
"api-reports":       "tsc -p tsconfig.api-reports.json && backstage-repo-tools api-reports -o <codes>"
"api-reports:check": "tsc -p tsconfig.api-reports.json && backstage-repo-tools api-reports --ci -o <codes>"
```

`--ci` re-runs extraction and fails if a committed report differs from what the source produces.
Both scripts recompile first, since a stale `dist-types/` would silently report the old API. CI
gets one `API reports` step in the existing `check` job, next to `Knip reports`.

## Risks / Trade-offs

- **API Extractor bundles TypeScript 5.9.3 while the repo is on 6.0.3** → it prints a version
  note on every package. Verified harmless: it analyses the emitted `.d.ts` (which our own
  TS 6 compiler produced) and the note goes to stdout, never into a report file. Accepted as
  noise; it disappears when `repo-tools` upgrades its bundled compiler.
- **Declaration emit is a second compile of the whole library surface** → adds a `tsc` run to CI.
  It touches only `packages/{core,errors}` and `plugins/*` sources, no app, so the cost is on the
  order of the existing `typecheck` step.
- **Suppressing `ae-undocumented` hides that nothing is documented** → deliberate (D4). If this
  repo ever publishes a package, the suppression should be lifted for that package first.
- **A report can be regenerated with a stale `dist-types/`** → both scripts recompile, and the
  compile writes into a directory the tool then reads, so the two cannot diverge within a run.

## Migration Plan

No migration. Nothing consumes these files at runtime; adding them cannot break the app. If the
check turns out to be too noisy it can be reverted by dropping one CI step, and the reports
themselves are inert once the script is gone.
