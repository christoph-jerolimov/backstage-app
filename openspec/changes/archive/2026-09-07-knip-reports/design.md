## Context

See proposal.md — Why. The constraints that shape the approach:

- npm workspaces, `packages/*` and `plugins/*`, 12 workspaces total (2 packages, 10 plugins). Every workspace
  except `packages/app` is `private` with `main: src/index.ts` (no build step).
- CI (`.github/workflows/ci.yml`) has one `check` job running `npm ci`, typecheck, lint,
  test, then a web export. Lint already runs with `--max-warnings=0`, so the repo's
  convention is that automated checks are blocking, not advisory.
- `packages/app` is the only non-private workspace and the only one with a large runtime
  dependency list; the plugin workspaces mostly depend on `@backstage-app/core` plus peer
  deps.

## Goals / Non-Goals

**Goals:**

- Use the tool Backstage itself uses, so report format and workflow match upstream and a
  contributor who knows Backstage recognizes it.
- Make drift a review-time signal (a diff in a committed file), not a runtime surprise.
- Keep the first reports honest: they should reflect the repo as it actually is, including
  findings we choose not to act on.

**Non-Goals:**

- Any custom knip configuration of our own. The generated config is an implementation
  detail of `repo-tools`; overriding it would fork us from upstream for no gain.
- Making the reports empty. A report with findings in it is still a working report.

## Decisions

### D1. Use `@backstage/repo-tools knip-reports`, not knip directly

The request asked for the Backstage CLI if possible. `@backstage/cli` (0.36.5) has no knip
support — verified by unpacking the tarball plus its `cli-module-build` and `cli-defaults`
modules; the string `knip` does not appear. The command lives in `@backstage/repo-tools`
(0.19.0) instead, which is still the Backstage-official tool and is what the Backstage
monorepo itself runs.

It fits this repo without configuration: it generates a temporary root `knip.json` whose
workspace glob is hardcoded to `"{packages,plugins}/*"` — exactly this repo's layout — with
entry `src/index.{ts,tsx}`, which is exactly how these workspaces are structured. Verified
by running it: it produced a report for all 12 workspaces on the first try.

*Alternative — plain `knip` with a hand-written `knip.json`:* far lighter (D3), but we
would own the config, the report format, and the drift-check script ourselves, and we
would drift from upstream's conventions. Rejected because the request explicitly preferred
Backstage tooling and the fit turned out to be exact.

### D2. Pin knip to v5 explicitly at the root

`repo-tools` invokes knip by **path**, not by resolution: it runs
`./node_modules/knip/bin/knip.js` relative to the repo root. Two consequences:

1. knip must be hoisted to the root `node_modules`. Declaring it as a root devDependency
   guarantees that rather than relying on npm's hoisting of a transitive dep.
2. It must be v5. `repo-tools` pins `knip@^5.42.0` and knip 6 is already released, so an
   unpinned install would eventually pull v6 to the root and break the report format or
   the CLI contract.

So the root declares `knip: ^5.42.0` alongside `@backstage/repo-tools`.

### D3. Accept the dependency weight, dev-only

`@backstage/repo-tools` pulls ~427 packages, because the same package also ships
api-extractor, ts-morph, knex, pglite and spectral for commands we do not use. That is a
lot for one report generator.

It is acceptable because it is confined to root `devDependencies`: it never enters the
Metro graph, never reaches the app bundle, and does not affect what ships to a device. The
cost is CI install time and local disk. Recorded as a trade-off rather than hidden, since
it is the main argument for the plain-knip alternative in D1.

### D4. Fix unlisted dependencies, record unused ones

The two finding classes are not equally urgent:

- **Unlisted** findings are latent breakage, but the two here have different causes and so
  take different fixes:
  - Four are genuine undeclared imports: `expo-symbols` in `plugins/catalog`
    (`src/star-button.tsx`) and `plugins/home` (`src/quick-links.tsx`),
    `react-native-safe-area-context` in `plugins/auth` (`src/sign-in-flow.tsx`), and
    `expo-router` in `plugins/notifications` (`src/home-widget.tsx`). Each resolves today
    purely because npm hoisted it to the root `node_modules`, and nothing guarantees that
    copy stays. Fix: declare each as a `peerDependency: "*"`, which is this repo's existing
    convention for Expo and React Native modules the app supplies (see `packages/core`).
  - `expo-updates` is **not** referenced anywhere. It comes from knip's Expo plugin, which
    does `if (config.updates?.enabled !== false) inputs.add('expo-updates')` — it assumes
    every Expo app ships OTA updates unless `app.json` says otherwise. This app has no
    `updates` block, no EAS update URL, and no `expo-updates` dependency, so OTA updates
    cannot work regardless. Fix: set `updates.enabled: false` in `app.json`, which is the
    accurate statement of intent ("builds only use code and assets bundled at build time")
    and makes the inference go away. **Not** by adding the dependency — that would pull a
    native module the app does not use and would change native build behavior to enable a
    feature nobody configured.
- **Unused** (`expo-glass-effect`, `expo-status-bar`, `expo-device` in `packages/app`;
  `@backstage/catalog-model` in `packages/core`) are noise, not breakage. Each needs its own
  judgment — some are plausibly config-referenced or imported for side effects — and
  features 2-6 of the roadmap will relocate much of this code regardless. They stay in the
  reports as recorded findings.

This keeps the change's blast radius small while still removing the genuinely risky drift.
The committed reports therefore contain findings, deliberately.

### D5. Wire the check into the existing `check` job

Add one step running `npm run knip-reports:check` (which is `backstage-repo-tools
knip-reports --ci`). With `--ci`, the tool writes nothing and exits non-zero if any
committed report differs from what it would generate, printing the expected content.

It goes **after** typecheck/lint/test rather than before: those give sharper errors on a
broken change, and a stale report is the least urgent failure of the four. It needs no
extra install step — `npm ci` at the top of the job already provides the tooling.

## Risks / Trade-offs

- **`repo-tools` is heavy and mostly unused (~427 packages)** → Dev-only, so no bundle
  impact; the alternative is D1's plain-knip path, which we can still fall back to by
  swapping two scripts and adding a `knip.json`.
- **knip v6 exists and `repo-tools` needs v5** → Pinned explicitly at the root (D2), so a
  future `npm update` cannot silently promote it. If `repo-tools` later moves to v6, the
  pin is the one place to change.
- **`repo-tools` invokes knip by hardcoded path** → Breaks if npm ever nests knip under
  `@backstage/repo-tools/node_modules` instead of hoisting. The explicit root devDependency
  (D2) is what prevents this; if it regressed, the failure is loud (file-not-found), not
  silent.
- **The first committed reports contain known findings (D4)** → Intentional and documented
  here and in the proposal's Non-goals, so a future reader does not mistake them for
  something that was overlooked. The CI check pins them, so the set cannot grow unnoticed.
- **Roadmap features 2-8 will move code between packages and churn these reports** →
  Expected, and is the reason the check exists: each of those PRs regenerates and commits
  its own reports, making the dependency effect of each move visible in review.
