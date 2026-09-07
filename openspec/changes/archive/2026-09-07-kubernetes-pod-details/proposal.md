## Why

The Kubernetes page shows that a pod is in `CrashLoopBackOff` but not why. The next
question is always the same — what did it log, and what did the cluster say about it — and
today that means leaving the app.

## What Changes

- Add three calls to the Kubernetes API, all through the backend's cluster proxy
  (`/api/kubernetes/proxy/...` with the `Backstage-Kubernetes-Cluster` header):
  `getPod` (the pod, for its containers), `getPodLogs` (the container log as text), and
  `getPodEvents` (the cluster events about that pod).
- Add a **pod page** at the hidden route `kubernetes/pod/[cluster]/[namespace]/[name]`:
  the pod's phase and containers, a **Logs** view and an **Events** view, a container
  selector when the pod has more than one, a **Previous run** toggle (the log of the
  container instance that crashed, which is what a crash loop needs), a tail-length
  selector, and a Refresh action.
- **Pod rows** on the Kubernetes page open that page, carrying the cluster they were listed
  under.
- Events show reason, message, type, count, and age, newest first; a warning event is
  visually distinct from a normal one.
- Demo mode ships a log and events for the crash-looping demo pod, including a previous-run
  log that shows the crash.

## Capabilities

### Modified Capabilities
- `kubernetes-plugin`: the pod page with logs and events, and pods being pressable.

## Impact

- `plugins/kubernetes`: `api.ts` (three proxy calls, demo implementations), `demo-objects.ts`
  (logs and events), `pod-page.tsx` / `pod-screen.tsx`, `pod-log.ts` (pure helpers for log
  lines and event formatting), the plugin's route, and pressable pod rows in
  `kubernetes-page.tsx`.
- `packages/app`: the pod route file.
- No new dependencies; `fetchText` already exists for the TechDocs reader.
