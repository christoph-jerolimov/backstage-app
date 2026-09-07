## Context

See proposal.md. The home plugin (`plugins/home`) renders a `Page` from
`@backstage-app/core` with one static card. Tests use `@testing-library/react-native`
(async `render`) through the root Jest config with the `jest-expo` preset, so fake timers
and focus hooks are available. The app mounts the page through Expo Router, which exposes
`useFocusEffect` for screen focus.

## Goals / Non-Goals

**Goals:**
- Pure, unit-testable period logic separated from React.
- Minimal re-render cost: one interval per mounted page, cleared on unmount.
- No new dependencies.

**Non-Goals:**
- Personalization (user name, timezone preference) — the clock injection point leaves
  room for it.
- Localization of the strings; English only for now.

## Decisions

### D1. Pure `getGreeting(date)` in `plugins/home/src/greeting.ts`
Returns `{ period: 'morning' | 'afternoon' | 'evening' | 'night', headline, message }`
from `date.getHours()` using the ranges in the spec. Pure function → table-driven tests
for each boundary.

*Alternative*: compute inside the component. Rejected: harder to test boundaries and
would couple time math to rendering.

### D2. `useNow` hook with injectable clock
`useNow({ now = () => new Date(), refreshMs = 60_000 })` keeps a `Date` in state,
re-reads `now()` on an interval and inside `useFocusEffect`, and clears the interval on
unmount. `HomePage` accepts an optional `now` prop and passes it through; tests pass a
fixed clock and use Jest fake timers to advance the interval.

*Alternative*: `useSyncExternalStore` with a shared ticker. Rejected as over-engineered
for one consumer; can be revisited if more plugins need a clock.

### D3. Split `HomePage` (pure) from `HomeScreen` (wired)
`useFocusEffect` from `expo-router` requires a navigator, which render tests do not
provide. So the plugin exports two components: `HomePage({ now?: Date })` renders the
greeting for a given instant with no navigation dependency, and `HomeScreen` wires
`useNow` and `useFocusEffect` (refresh on focus) and renders `HomePage`. The route file
mounts `HomeScreen`; unit tests cover `HomePage` with fixed dates and `useNow` with fake
timers.

## Risks / Trade-offs

- [Interval drift across a minute boundary] → 60 s cadence is the spec's minimum; the
  focus refresh covers the common "come back later" case.
- [`useFocusEffect` outside a navigator in tests] → covered by the `HomePage` /
  `HomeScreen` split in D3; `HomeScreen` is exercised by the typecheck and the web
  export, `HomePage` and `useNow` by unit tests.
- [Timers leaking in tests] → tests use `jest.useFakeTimers()` and unmount; the hook
  clears its interval.

## Migration Plan

Single PR; no data or config migration. Rollback is reverting the PR.
