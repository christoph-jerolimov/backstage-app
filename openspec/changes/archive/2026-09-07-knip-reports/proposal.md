## Why

Nothing in the repo tells us when a workspace's `package.json` has drifted from what its
code actually imports. Twelve workspaces (`packages/app`, `packages/core`, and ten `plugins/*`)
each carry their own dependency list, and a first run already found real drift: three
unused dependencies in `packages/app`, an unused devDependency in `packages/core`, and five
workspaces importing modules they never declared. Unlisted dependencies are the dangerous
half — they only work today because npm hoists a transitive copy to the root, and they
break the moment that copy moves or disappears.

Backstage solves exactly this problem with a committed `knip-report.md` per package, so a
reviewer sees dependency drift in the diff instead of discovering it at runtime.

## What Changes

- Adopt **`@backstage/repo-tools knip-reports`**, the Backstage-official tool for this, as
  a root devDependency alongside the `knip@^5` it drives. `@backstage/cli` itself has no
  knip support — this command lives in `repo-tools`.
- Commit a **`knip-report.md` to every workspace** — `packages/app`, `packages/core`, and
  all ten `plugins/*` — recording unused and unlisted dependencies.
- Add two npm scripts: `knip-reports` to regenerate the reports and `knip-reports:check`
  to verify committed reports are current.
- Add a **drift check to CI** so a PR that changes imports without regenerating its report
  fails, the same way `lint` and `typecheck` do.
- Resolve every **unlisted** dependency found, because those are latent breakage rather
  than cosmetic noise: declare `expo-symbols` in `plugins/catalog` and `plugins/home`,
  `react-native-safe-area-context` in `plugins/auth`, and `expo-router` in
  `plugins/notifications`; and turn off OTA updates in `app.json`, which is what knip's
  `expo-updates` finding actually reports. Leave the **unused** dependencies recorded in
  the reports rather than removed — see the Non-goals below.

## Non-goals

- **Not** removing the unused dependencies the reports surface. `expo-glass-effect`,
  `expo-status-bar`, and `expo-device` in `packages/app` and `@backstage/catalog-model` in
  `packages/core` each need their own judgment call (some are config-referenced or
  side-effect only), and features 2-6 of the current roadmap will move that code around
  anyway. Recording them is the point of this change; pruning them is separate work.
- **Not** widening knip past `dependencies,unlisted`. Backstage deliberately limits the
  report to dependency findings; unused files and exports would produce a large, noisy
  first report against a codebase that has never been checked.

## Capabilities

### New Capabilities

None. This change adds repository tooling and does not change any behavior the app
exposes to users, so it sets `skip_specs: true` in its `.openspec.yaml`.

### Modified Capabilities

None.

## Impact

- **Root `package.json`**: two devDependencies (`@backstage/repo-tools`, `knip`) and two
  scripts. `@backstage/repo-tools` is heavy — roughly 427 packages, since it also carries
  api-extractor, ts-morph, knex and spectral for its other commands. This is dev-only and
  does not reach the app bundle, but it does grow CI install time.
- **All 12 workspaces**: a new committed `knip-report.md` each.
- **`plugins/{catalog,home,auth,notifications}/package.json`**: declare the four missing
  peer dependencies. **`packages/app/app.json`**: an explicit `updates.enabled: false`.
- **`.github/workflows/ci.yml`**: one added step in the existing `check` job.
- No runtime or app-bundle impact.
