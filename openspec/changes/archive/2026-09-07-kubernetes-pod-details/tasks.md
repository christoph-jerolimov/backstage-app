## 1. API

- [x] 1.1 Add `proxyPath`, `getPod`, `getPodLogs`, and `getPodEvents` to the Kubernetes API per design D1, with demo implementations for the demo pods; verify tests cover the proxy paths, the cluster header, the log query parameters (container, tailLines, previous), the events field selector, and the demo answers
- [x] 1.2 Add `pod-log.ts` (`logLines`, `TAIL_OPTIONS`, `formatEvent`) per design D4; verify tests cover splitting, the dropped trailing line, an empty log, and event formatting including warnings and counts

## 2. Pod page

- [x] 2.1 Add `pod-page.tsx` (phase and containers, Logs/Events switch, container selector, Previous run toggle, tail selector, Refresh, independent states) per design D3; verify tests cover the log view, the previous-run log, switching container, the empty log, the events list with a warning, no events, and a failing log request leaving events usable
- [x] 2.2 Add `pod-screen.tsx` and the hidden route per design D2, make pod rows on the Kubernetes page open it with their cluster, and add the app route file; verify tests cover the row navigation target and the route registration

## 3. Verification

- [x] 3.1 Run `npm run typecheck`, `npm run lint -- --max-warnings=0`, `npm test -- --ci`; verify all pass
- [x] 3.2 Run `cd packages/app && npx expo export --platform web`; verify the pod route is emitted
