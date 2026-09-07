## Why

The home plugin currently shows a fixed "Welcome to Backstage" card that promises a
time-based greeting "in a later iteration". This change delivers that iteration so the
first screen a user sees feels alive and the plugin has real, testable behavior.

## What Changes

- Replace the static welcome card on the home page with a greeting that depends on the
  local time of day: morning, afternoon, evening, or night, each with its own headline
  and supporting sentence.
- Keep the greeting current while the page is open: it re-evaluates once a minute and
  whenever the page regains focus, so a user who leaves the app open across a boundary
  (for example 11:59 to 12:00) sees the new period without restarting.
- Make the time source injectable so the greeting is deterministic in tests and can
  later be driven by a user's configured timezone or a server clock.
- Keep the page title, description, and the plugin's navigation item unchanged.

## Capabilities

### New Capabilities
- `home-plugin`: the home page's greeting behavior — time-of-day periods, headline and
  message per period, refresh cadence, and the injectable clock.

### Modified Capabilities
- `demo-plugins`: the "Demo pages show static placeholder content" requirement no longer
  covers home; the home page's content is defined by `home-plugin` while catalog,
  search, and notifications remain static placeholders.

## Impact

- `plugins/home/src/home-page.tsx` (greeting UI), new `plugins/home/src/greeting.ts`
  (period logic) and `plugins/home/src/use-now.ts` (clock hook), tests under
  `plugins/home/src/__tests__/`.
- No new dependencies. Focus handling uses `useFocusEffect` from `expo-router`, which
  the app already depends on; the plugin declares it as a peer dependency.
- No changes to the app package, the drawer, or other plugins.
