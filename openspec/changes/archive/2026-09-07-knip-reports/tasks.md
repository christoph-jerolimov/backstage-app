## 1. Tooling

- [x] 1.1 Add `@backstage/repo-tools` and `knip@^5.42.0` to root `devDependencies` per design D1/D2; verify `node_modules/knip/bin/knip.js` exists at the repo root and `node_modules/.bin/knip --version` reports a 5.x version
- [x] 1.2 Add root scripts `knip-reports` (`backstage-repo-tools knip-reports`) and `knip-reports:check` (`backstage-repo-tools knip-reports --ci`); verify `npm run knip-reports -- --help` is accepted by the CLI

## 2. Fix unlisted dependencies

- [x] 2.1 Declare the four genuinely undeclared imports as `peerDependencies: "*"` per design D4 — `expo-symbols` in `plugins/catalog` and `plugins/home`, `react-native-safe-area-context` in `plugins/auth`, `expo-router` in `plugins/notifications`; verify none of those reports lists an unlisted dependency afterwards
- [x] 2.2 Set `updates.enabled: false` in `packages/app/app.json` per design D4 (knip's Expo plugin infers `expo-updates` from the absent config; the app has no OTA update setup, so declaring it off is the accurate fix rather than adding an unused native module); verify the app report no longer lists `expo-updates` as unlisted and that `npx expo export --platform web` still succeeds

## 3. Generate and commit reports

- [x] 3.1 Run `npm run knip-reports` and commit the generated `knip-report.md` for all 12 workspaces; verify a report file exists in `packages/app`, `packages/core`, and each of the ten `plugins/*`
- [x] 3.2 Confirm the committed reports contain only the expected recorded findings from design D4 (the three unused deps in `packages/app`, the one unused devDep in `packages/core`) and no remaining unlisted ones; verify by reading all 12 reports

## 4. CI

- [x] 4.1 Add a `Knip reports` step running `npm run knip-reports:check` to the existing `check` job in `.github/workflows/ci.yml`, after the test step per design D5; verify the step is placed inside the `check` job and needs no extra install
- [x] 4.2 Verify the check passes against the committed reports by running `npm run knip-reports:check` locally and confirming a zero exit code
- [x] 4.3 Verify the check actually fails on drift: temporarily add an unused dependency to one workspace, confirm `npm run knip-reports:check` exits non-zero, then revert

## 5. Verification

- [x] 5.1 Run `npm run typecheck`, `npm run lint -- --max-warnings=0`, and `npm test -- --ci`; verify all pass
- [x] 5.2 Run `cd packages/app && npx expo export --platform web`; verify the export still succeeds
