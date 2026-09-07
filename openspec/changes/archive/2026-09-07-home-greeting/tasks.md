## 1. Greeting logic

- [x] 1.1 Add `plugins/home/src/greeting.ts` exporting `getGreeting(date)` with the four periods and their headline/message; verify with a table test covering 05:00, 11:59, 12:00, 16:59, 17:00, 21:59, 22:00, and 04:59
- [x] 1.2 Add `plugins/home/src/use-now.ts` exporting `useNow({ now, refreshMs })` that returns the current `Date`, refreshes on an interval, and exposes `refresh()`; verify with a hook test using fake timers that the value advances after the interval and the interval is cleared on unmount

## 2. Home page

- [x] 2.1 Replace the static card in `home-page.tsx` with a greeting card driven by `getGreeting(now)`, where `HomePage` takes an optional `now: Date` prop (default: device clock); verify render tests show "Good evening" for a fixed 20:00 clock and "Good night" for 02:15
- [x] 2.2 Add `HomeScreen` in `plugins/home/src/home-screen.tsx` that uses `useNow` and `useFocusEffect` (refresh on focus) and renders `HomePage`; export it from the plugin index and use it as the plugin route component; verify `npm run typecheck` passes
- [x] 2.3 Point `packages/app/src/app/index.tsx` at `HomeScreen`; verify `npm run typecheck` passes and the web export still emits `/`
- [x] 2.4 Declare `expo-router` as a peer dependency of `@backstage-app/plugin-home`; verify `npm install` reports no missing peers

## 3. Verification

- [x] 3.1 Run `npm run typecheck`, `npm run lint -- --max-warnings=0`, and `npm test -- --ci`; verify all pass and the home tests cover greeting periods, interval refresh, and fixed-clock rendering
- [x] 3.2 Run `cd packages/app && npx expo export --platform web`; verify it succeeds and the `/` route is emitted
